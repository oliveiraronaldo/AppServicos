'use strict';

/* ===== Armazenamento local (somente no aparelho) ===== */
const STORAGE_KEY = 'servicos.v1';

function carregar() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function gravar(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  agendarBackupAuto();
}
let servicos = carregar();

// Pede ao navegador para não apagar os dados automaticamente.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

/* ===== Utilidades de data ===== */
const pad = n => String(n).padStart(2, '0');
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const mesAtual = () => hojeISO().slice(0, 7);
function dataBR(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function nomeMes(ym) {
  const [a, m] = ym.split('-');
  return `${MESES[Number(m) - 1]} de ${a}`;
}
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
// Valores guardados em centavos (inteiro) para não ter erro de arredondamento.
const moeda = c => BRL.format((c || 0) / 100);
// Retorna centavos, null (vazio = sem valor) ou NaN (inválido).
function lerValor(txt) {
  if (!String(txt).trim()) return null;
  let t = String(txt).replace(/[R$\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(parseFloat(t) * 100);
}
const somar = itens => itens.reduce((t, s) => t + (s.valor || 0), 0);
// Formas de pagamento
const PAGAMENTOS = { pix: 'Pix', dinheiro: 'Dinheiro', credito: 'Cartão de crédito', debito: 'Cartão de débito' };
const MAX_PARCELAS = 12;
function textoPagamento(s) {
  if (!s.pagamento) return '';
  const nome = PAGAMENTOS[s.pagamento] || s.pagamento;
  return s.pagamento === 'credito' ? `${nome} ${s.parcelas || 1}x` : nome;
}
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ===== Elementos ===== */
const $ = id => document.getElementById(id);
const form = $('form'), editId = $('editId');
const fData = $('data'), fCliente = $('cliente'), fEndereco = $('endereco'), fServico = $('servico'), fValor = $('valor');
const fPagamento = $('pagamento'), fParcelas = $('parcelas'), boxParcelas = $('boxParcelas');
fParcelas.innerHTML = Array.from({ length: MAX_PARCELAS }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('');
function atualizarParcelas() {
  boxParcelas.hidden = fPagamento.value !== 'credito';
}
fPagamento.addEventListener('change', atualizarParcelas);
const mesInput = $('mes'), busca = $('busca'), lista = $('lista'), resumo = $('resumo');

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ===== Formulário ===== */
function limparForm() {
  form.reset();
  editId.value = '';
  fData.value = hojeISO(); // data do dia já preenchida, pode ser alterada
  $('formTitle').textContent = 'Novo serviço';
  $('btnSalvar').textContent = 'Salvar';
  $('btnCancelar').hidden = true;
  atualizarParcelas();
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const reg = {
    data: fData.value,
    cliente: fCliente.value.trim(),
    endereco: fEndereco.value.trim(),
    servico: fServico.value.trim(),
    valor: lerValor(fValor.value),
    pagamento: fPagamento.value,
    parcelas: fPagamento.value === 'credito' ? Number(fParcelas.value) : null,
  };
  if (Number.isNaN(reg.valor)) {
    toast('Valor inválido. Ex.: 150 ou 150,50');
    fValor.focus();
    return;
  }
  if (!reg.data || !reg.cliente || !reg.endereco || !reg.servico) return;

  if (editId.value) {
    const i = servicos.findIndex(s => s.id === editId.value);
    if (i >= 0) servicos[i] = { ...servicos[i], ...reg };
    toast('Serviço atualizado');
  } else {
    servicos.push({ id: novoId(), ...reg, criadoEm: new Date().toISOString() });
    toast('Serviço salvo');
  }
  gravar(servicos);
  mesInput.value = reg.data.slice(0, 7); // mostra o mês do serviço salvo
  limparForm();
  render();
});

$('btnCancelar').addEventListener('click', limparForm);

function editar(id) {
  const s = servicos.find(x => x.id === id);
  if (!s) return;
  editId.value = s.id;
  fData.value = s.data;
  fCliente.value = s.cliente;
  fEndereco.value = s.endereco;
  fServico.value = s.servico;
  fValor.value = s.valor != null ? (s.valor / 100).toFixed(2).replace('.', ',') : '';
  fPagamento.value = s.pagamento || '';
  fParcelas.value = String(s.parcelas || 1);
  atualizarParcelas();
  $('formTitle').textContent = 'Editar serviço';
  $('btnSalvar').textContent = 'Atualizar';
  $('btnCancelar').hidden = false;
  $('formCard').scrollIntoView({ behavior: 'smooth' });
}

function excluir(id) {
  const s = servicos.find(x => x.id === id);
  if (!s || !confirm(`Excluir o serviço de ${s.cliente} (${dataBR(s.data)})?`)) return;
  servicos = servicos.filter(x => x.id !== id);
  gravar(servicos);
  if (editId.value === id) limparForm();
  render();
  toast('Serviço excluído');
}

/* ===== Histórico ===== */
function servicosDoMes(ym) {
  return servicos
    .filter(s => s.data.startsWith(ym))
    .sort((a, b) => a.data.localeCompare(b.data) || (a.criadoEm || '').localeCompare(b.criadoEm || ''));
}

function esc(t) {
  return t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render() {
  const ym = mesInput.value || mesAtual();
  const termo = busca.value.trim().toLowerCase();
  const doMes = servicosDoMes(ym);
  const filtrados = termo
    ? doMes.filter(s => `${s.cliente} ${s.endereco} ${s.servico}`.toLowerCase().includes(termo))
    : doMes;

  resumo.textContent = `${nomeMes(ym)}: ${doMes.length} serviço(s) · Total ${moeda(somar(doMes))}` +
    (termo ? ` · ${filtrados.length} encontrado(s) (${moeda(somar(filtrados))})` : '');

  if (!filtrados.length) {
    lista.innerHTML = `<li class="vazio">Nenhum serviço ${termo ? 'encontrado' : 'neste mês'}.</li>`;
  } else {
    // Mais recentes primeiro na tela
    lista.innerHTML = filtrados.slice().reverse().map(s => `
      <li class="item">
        <div class="item-top">
          <span class="item-cliente">${esc(s.cliente)}</span>
          <span class="item-data">${dataBR(s.data)}</span>
        </div>
        <p class="item-end">📍 ${esc(s.endereco)}</p>
        <p class="item-serv">${esc(s.servico)}</p>
        ${s.valor != null || s.pagamento ? `<p class="item-valor">${s.valor != null ? moeda(s.valor) : ''}${s.pagamento ? ` <span class="item-pag">· ${esc(textoPagamento(s))}</span>` : ''}</p>` : ''}
        <div class="item-acoes">
          <button data-acao="editar" data-id="${s.id}">Editar</button>
          <button data-acao="excluir" data-id="${s.id}" class="del">Excluir</button>
        </div>
      </li>`).join('');
  }
}

lista.addEventListener('click', e => {
  const b = e.target.closest('button[data-acao]');
  if (!b) return;
  if (b.dataset.acao === 'editar') editar(b.dataset.id);
  else excluir(b.dataset.id);
});
mesInput.addEventListener('change', render);
busca.addEventListener('input', render);

// Ao escolher um cliente conhecido, sugere o último endereço dele
fCliente.addEventListener('change', () => {
  if (fEndereco.value) return;
  const ult = servicos.filter(s => s.cliente === fCliente.value.trim())
    .sort((a, b) => b.data.localeCompare(a.data))[0];
  if (ult) fEndereco.value = ult.endereco;
});

/* ===== PDF ===== */
$('btnPdf').addEventListener('click', () => {
  const ym = mesInput.value || mesAtual();
  const itens = servicosDoMes(ym);
  if (!itens.length) { toast('Nenhum serviço neste mês'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const AZUL = [31, 111, 235];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório de Serviços', 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(nomeMes(ym), 14, 25);
  doc.text(`Serviços: ${itens.length}   ·   Total: ${moeda(somar(itens))}`, W - 14, 25, { align: 'right' });

  const rodape = () => {
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${dataBR(hojeISO())}`, 14, H - 8);
    doc.text(`Página ${doc.internal.getNumberOfPages()}`, W - 14, H - 8, { align: 'right' });
    doc.setTextColor(0);
  };

  doc.autoTable({
    startY: 31,
    head: [['Data', 'Cliente', 'Endereço', 'Serviço realizado', 'Pagamento', 'Valor']],
    body: itens.map(s => [dataBR(s.data), s.cliente, s.endereco, s.servico, textoPagamento(s) || '-', s.valor != null ? moeda(s.valor) : '-']),
    foot: [[{ content: 'TOTAL DO MÊS', colSpan: 5, styles: { halign: 'right' } }, moeda(somar(itens))]],
    showFoot: 'lastPage',
    footStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 1.8, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: AZUL, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 249] },
    columnStyles: {
      0: { cellWidth: 19 }, 1: { cellWidth: 28 }, 2: { cellWidth: 36 },
      3: { cellWidth: 'auto' }, 4: { cellWidth: 26 }, 5: { cellWidth: 24, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: rodape,
  });

  // Resumo por forma de pagamento
  const grupos = {};
  for (const s of itens) {
    const k = textoPagamento(s) || 'Não informado';
    grupos[k] = grupos[k] || { qtd: 0, total: 0 };
    grupos[k].qtd++;
    grupos[k].total += s.valor || 0;
  }
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Forma de pagamento', 'Serviços', 'Total']],
    body: Object.entries(grupos).sort((a, b) => b[1].total - a[1].total)
      .map(([k, g]) => [k, String(g.qtd), moeda(g.total)]),
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: AZUL, textColor: 255 },
    columnStyles: { 1: { halign: 'center', cellWidth: 22 }, 2: { halign: 'right', cellWidth: 30 } },
    tableWidth: 110,
    margin: { left: 14, right: 14 },
    rowPageBreak: 'avoid',
    didDrawPage: rodape,
  });

  salvarArquivo(doc.output('blob'), `servicos-${ym}.pdf`, `Serviços - ${nomeMes(ym)}`);
});

/* ===== Salvar / compartilhar arquivos ===== */
const nativo = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

function blobParaBase64(blob) {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = erro;
    r.readAsDataURL(blob);
  });
}

async function salvarArquivo(blob, nome, titulo) {
  if (nativo) {
    // App instalado (APK): grava o arquivo e abre o menu de compartilhar do Android.
    try {
      const cap = window.Capacitor;
      const { uri } = await cap.nativePromise('Filesystem', 'writeFile', { path: nome, data: await blobParaBase64(blob), directory: 'CACHE' });
      await cap.nativePromise('Share', 'share', { title: titulo, files: [uri], dialogTitle: titulo });
    } catch (e) {
      if (!/cancel/i.test(String(e && e.message))) toast('Não foi possível gerar o arquivo');
    }
    return;
  }
  const file = new File([blob], nome, { type: blob.type });
  // No navegador do celular, abre o menu de compartilhar. Senão, baixa.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: titulo })
      .catch(err => { if (err.name !== 'AbortError') baixar(blob, nome); });
  } else {
    baixar(blob, nome);
  }
}

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ===== Backup ===== */
$('btnMenu').addEventListener('click', () => { mostrarStatusBackup(); $('menu').showModal(); });

$('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ app: 'meus-servicos', versao: 1, servicos }, null, 2)], { type: 'application/json' });
  salvarArquivo(blob, `backup-servicos-${hojeISO()}.json`, 'Backup Meus Serviços');
});

// No app instalado, alguns seletores do Android escondem .json; mostra todos os arquivos.
if (nativo) $('fileImport').removeAttribute('accept');
$('btnImport').addEventListener('click', () => $('fileImport').click());
$('fileImport').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const novos = importarDados(JSON.parse(await f.text()));
    $('menu').close();
    toast(`${novos} serviço(s) importado(s)`);
  } catch {
    toast('Arquivo de backup inválido');
  }
});

// Junta os serviços de um backup aos atuais (sem duplicar). Retorna quantos entraram.
function importarDados(dados) {
  const recebidos = Array.isArray(dados) ? dados : dados && dados.servicos;
  if (!Array.isArray(recebidos)) throw new Error('formato');
  const validos = recebidos.filter(s => s && /^\d{4}-\d{2}-\d{2}$/.test(s.data) && s.cliente && s.endereco && s.servico);
  const ids = new Set(servicos.map(s => s.id));
  let novos = 0;
  for (const s of validos) {
    if (s.id && ids.has(s.id)) continue; // não duplica
    servicos.push({ id: s.id || novoId(), data: s.data, cliente: String(s.cliente), endereco: String(s.endereco), servico: String(s.servico), valor: Number.isInteger(s.valor) ? s.valor : null,
      pagamento: PAGAMENTOS[s.pagamento] ? s.pagamento : '', parcelas: s.pagamento === 'credito' ? (Number(s.parcelas) || 1) : null, criadoEm: s.criadoEm });
    novos++;
  }
  gravar(servicos);
  render();
  return novos;
}

/* ===== Backup automático (só no app Android) =====
 * Grava em Documentos/MeusServicos:
 *   backup-automatico.json  -> sempre o estado mais recente
 *   backup-AAAA-MM.json     -> estado no fim de cada mês (o do mês atual vai sendo atualizado)
 * Essa pasta não é apagada ao limpar os dados ou desinstalar o app.
 * O app só sobrescreve arquivos que ele mesmo criou nesta instalação; se já existir um arquivo
 * com o nome (de antes de limpar os dados/reinstalar), grava com outro nome para não perder o antigo.
 */
const PASTA_BACKUP = 'MeusServicos';
const NOMES_KEY = 'backupAuto.nomes';
const STATUS_KEY = 'backupAuto.status';
let timerBackup = null;

function lerJSON(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch { return padrao; }
}
const fs = (metodo, opcoes) => window.Capacitor.nativePromise('Filesystem', metodo, { directory: 'DOCUMENTS', ...opcoes });

function agendarBackupAuto() {
  if (!nativo) return;
  clearTimeout(timerBackup);
  timerBackup = setTimeout(fazerBackupAuto, 800);
}

async function existe(caminho) {
  try { await fs('stat', { path: caminho }); return true; } catch { return false; }
}

// Grava no arquivo desta instalação para a "chave" (principal ou mês). Escolhe outro nome se preciso.
async function gravarArquivoBackup(chave, base, conteudo) {
  const nomes = lerJSON(NOMES_KEY, {});
  const tentar = async nome => {
    await fs('writeFile', { path: `${PASTA_BACKUP}/${nome}`, data: conteudo, encoding: 'utf8', recursive: true });
    nomes[chave] = nome;
    localStorage.setItem(NOMES_KEY, JSON.stringify(nomes));
    return nome;
  };
  if (nomes[chave]) {
    try { return await tentar(nomes[chave]); } catch { /* perdeu acesso: escolhe outro nome */ }
  }
  for (let i = 0; i < 50; i++) {
    const nome = i === 0 ? `${base}.json` : `${base} (${i}).json`;
    if (nome === nomes[chave] || await existe(`${PASTA_BACKUP}/${nome}`)) continue;
    try { return await tentar(nome); } catch { /* tenta o próximo */ }
  }
  throw new Error('sem nome disponível');
}

async function fazerBackupAuto() {
  const conteudo = JSON.stringify({ app: 'meus-servicos', versao: 1, geradoEm: new Date().toISOString(), servicos }, null, 2);
  try {
    const principal = await gravarArquivoBackup('principal', 'backup-automatico', conteudo);
    await gravarArquivoBackup(mesAtual(), `backup-${mesAtual()}`, conteudo);
    localStorage.setItem(STATUS_KEY, JSON.stringify({ ok: true, quando: new Date().toISOString(), arquivo: principal }));
  } catch (e) {
    localStorage.setItem(STATUS_KEY, JSON.stringify({ ok: false, quando: new Date().toISOString(), erro: String(e && e.message || e) }));
  }
  mostrarStatusBackup();
}

function mostrarStatusBackup() {
  const el = $('statusBackup');
  if (!nativo) {
    el.textContent = 'Backup automático disponível apenas no app Android. Aqui, use Exportar backup.';
    return;
  }
  const st = lerJSON(STATUS_KEY, null);
  if (!st) { el.textContent = `Backup automático: será criado em Documentos/${PASTA_BACKUP} ao salvar um serviço.`; return; }
  const hora = new Date(st.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  el.textContent = st.ok
    ? `✅ Backup automático em Documentos/${PASTA_BACKUP}/${st.arquivo} (atualizado ${hora}) e uma cópia por mês na mesma pasta.`
    : `⚠️ Falha no backup automático (${hora}). Use Exportar backup.`;
}

// App vazio (instalado de novo ou dados limpos): oferece restaurar o backup automático.
async function oferecerRestauracao() {
  if (!nativo || servicos.length) return;
  for (const nome of ['backup-automatico.json']) {
    try {
      const { data } = await fs('readFile', { path: `${PASTA_BACKUP}/${nome}`, encoding: 'utf8' });
      const dados = JSON.parse(data);
      const qtd = Array.isArray(dados.servicos) ? dados.servicos.length : 0;
      if (qtd && confirm(`Encontrei um backup automático com ${qtd} serviço(s) em Documentos/${PASTA_BACKUP}. Deseja restaurar?`)) {
        // Restaurou: continua usando os mesmos arquivos (só se este app ainda tiver acesso a eles).
        const nomes = { principal: nome };
        const mensal = `backup-${mesAtual()}.json`;
        try { await fs('readFile', { path: `${PASTA_BACKUP}/${mensal}`, encoding: 'utf8' }); nomes[mesAtual()] = mensal; } catch { /* usa outro nome */ }
        localStorage.setItem(NOMES_KEY, JSON.stringify(nomes));
        toast(`${importarDados(dados)} serviço(s) restaurado(s)`);
      }
      return;
    } catch { /* sem acesso ou não existe: o usuário pode usar Importar backup */ }
  }
}

/* ===== Início ===== */
limparForm();
mesInput.value = mesAtual();
render();
oferecerRestauracao();

if (!nativo && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  // Quando sair uma versão nova do app, recarrega uma vez para aplicá-la.
  const tinhaVersao = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (tinhaVersao && !location.hash.includes('atualizado')) {
      location.hash = 'atualizado';
      location.reload();
    }
  });
  navigator.serviceWorker.register('sw.js');
  if (location.hash.includes('atualizado')) history.replaceState(null, '', location.pathname);
}
