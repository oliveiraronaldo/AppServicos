# Meus Serviços

App para celular que registra os serviços realizados (data, cliente, endereço, serviço, valor e forma de pagamento)
e gera um **relatório mensal em PDF**. Funciona **100% offline**: os dados ficam salvos
apenas no próprio celular, sem banco de dados externo e sem login.

## Funcionalidades
- Cadastro de serviço com a **data de hoje já preenchida** (pode ser alterada).
- Valor (opcional, aceita `150`, `150,50` ou `1.250,00`) e total do mês.
- Forma de pagamento (opcional): Pix, Dinheiro, Cartão de crédito (1x a 12x) ou Cartão de débito.
- PDF com coluna de pagamento e resumo de totais por forma de pagamento.
- Histórico por mês, com busca por cliente, endereço ou serviço.
- Editar e excluir registros.
- Autocompletar de clientes/endereços já usados (ao escolher um cliente, sugere o último endereço dele).
- **Gerar PDF do mês** selecionado (no celular abre o menu de compartilhar: salvar, WhatsApp, e-mail...).
- Backup: exportar/importar os dados em arquivo `.json` (menu ⋮).

## Instalar como app Android (APK) — recomendado
1. No celular, abra https://github.com/oliveiraronaldo/AppServicos/releases/latest
2. Toque em **MeusServicos.apk** para baixar e depois abra o arquivo.
3. Se o Android pedir, permita **instalar apps desta fonte** (o navegador/Arquivos) e toque em **Instalar**.
4. O app **Meus Serviços** aparece na lista de apps. Funciona sem internet.

Para atualizar, baixe o APK mais novo e instale por cima: os dados são mantidos.
O APK é gerado automaticamente pelo GitHub Actions (`.github/workflows/android.yml`) a cada alteração.

> A chave de assinatura (`android-keystore/`) está no repositório para simplificar. Como o repositório
> é público, para mais segurança dá para movê-la para um *secret* do GitHub.

## Usar como PWA pelo navegador
O app é um PWA (aplicativo web instalável). Ele precisa ser aberto **uma única vez** por um
endereço `https` para ser instalado; depois disso funciona sem internet.

1. No GitHub, abra **Settings → Pages** deste repositório.
2. Em *Build and deployment*, escolha **Deploy from a branch**, selecione a branch e a pasta `/ (root)` e salve.
3. Aguarde 1–2 minutos e abra no celular o endereço mostrado (ex.: `https://SEU-USUARIO.github.io/AppServicos/`).
4. **Android (Chrome):** menu ⋮ → *Instalar app* / *Adicionar à tela inicial*.
   **iPhone (Safari):** botão Compartilhar → *Adicionar à Tela de Início*.
5. Pronto: abra pelo ícone. Pode desligar a internet que continua funcionando.

> O GitHub Pages só hospeda os arquivos do app. Os seus dados **nunca** saem do celular.

## Importante sobre os dados
Os registros ficam no armazenamento do navegador do celular. Se você desinstalar o app ou
limpar os dados do navegador, eles são apagados. Use **⋮ → Exportar backup** de vez em quando
e guarde o arquivo (Drive, WhatsApp para você mesmo, etc.).

## Estrutura
- `index.html`, `styles.css`, `app.js` — o app
- `sw.js`, `manifest.webmanifest`, `icons/` — instalação e funcionamento offline
- `vendor/` — jsPDF e jsPDF-AutoTable (licença MIT) para gerar o PDF localmente

**Endereço do app:** https://oliveiraronaldo.github.io/AppServicos/

Ao alterar arquivos do app, aumente a versão em `CACHE` no `sw.js` para o celular baixar a atualização.
