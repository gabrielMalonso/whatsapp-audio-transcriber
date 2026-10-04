<div align="center">
  <img src="apps/extension/assets/icon.png" alt="Ícone do WhatsApp Audio Transcriber" width="112" />
  <h1>WhatsApp Audio Transcriber</h1>
  <p>Transcreva mensagens de voz do WhatsApp Web sem sair da conversa.</p>

  <p>
    <a href="https://chromewebstore.google.com/detail/transcri%C3%A7%C3%A3o-de-%C3%A1udios-do/dnfdcckllipjhijlddogocihdabnbblp"><img src="https://img.shields.io/badge/Chrome%20Web%20Store-instalar-4285f4.svg" alt="Instalar pela Chrome Web Store" /></a>
    <a href="https://github.com/gabrielMalonso/whatsapp-audio-transcriber/actions/workflows/ci.yml"><img src="https://github.com/gabrielMalonso/whatsapp-audio-transcriber/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/licen%C3%A7a-MIT-2f6f65.svg" alt="Licença MIT" /></a>
    <a href="https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3"><img src="https://img.shields.io/badge/Chrome-Manifest%20V3-caa66b.svg" alt="Chrome Manifest V3" /></a>
    <a href="https://groq.com/"><img src="https://img.shields.io/badge/Groq-Whisper%20%2B%20GPT--OSS-f2ede3.svg" alt="Groq" /></a>
  </p>

  <p>
    <a href="#instalação">Instalação</a> ·
    <a href="#como-funciona">Como funciona</a> ·
    <a href="PRIVACY.md">Privacidade</a> ·
    <a href="#desenvolvimento">Desenvolvimento</a> ·
    <a href="CONTRIBUTING.md">Contribuição</a>
  </p>
</div>

## Sobre

O WhatsApp Audio Transcriber é uma extensão open source para Chrome, Firefox e Zen Browser que adiciona transcrições diretamente às mensagens de voz do WhatsApp Web. O áudio é processado pela API da Groq com `whisper-large-v3-turbo`; depois, `openai/gpt-oss-20b` aplica as preferências de formatação escolhidas no popup.

Tudo acontece entre o navegador e a Groq: o projeto não opera servidor intermediário, não armazena os áudios e mantém a API key e as transcrições apenas no armazenamento local da extensão.

> [!IMPORTANT]
> Este é um projeto independente, sem vínculo com WhatsApp, Meta ou Groq. Mudanças no WhatsApp Web podem afetar temporariamente o funcionamento da extensão.

## Recursos

- transcrição integrada à interface do WhatsApp Web;
- detecção automática do idioma do áudio;
- tom coloquial, natural ou formal;
- ajustes opcionais de parágrafos, datas, horas e listas;
- formatação sem responder, resumir ou traduzir o conteúdo;
- captura sem reprodução audível da mensagem de voz;
- fila local com cancelamento e indicação de progresso;
- cache local para evitar o reprocessamento de mensagens;
- onboarding guiado para criar e configurar a API key da Groq;
- uma base de código, com builds para Chrome e Firefox/Zen no macOS, Windows e Linux;
- nenhum Python, FFmpeg, Whisper local ou host nativo.

## Como funciona

```mermaid
flowchart LR
    A[Mensagem de voz] --> B[Extensão no WhatsApp Web]
    B -->|áudio OGG/Opus| C[Background]
    C -->|HTTPS| D[Whisper na Groq]
    D --> E[GPT-OSS na Groq]
    E --> F[Transcrição formatada]
    F --> G[(Cache local)]
    F --> B
```

1. A extensão identifica mensagens de voz por atributos estruturais do WhatsApp Web.
2. Ao solicitar a transcrição, um script no contexto MAIN captura os bytes do áudio e bloqueia sua reprodução.
3. O background envia o áudio diretamente à Groq e processa uma transcrição por vez.
4. A transcrição bruta é formatada com regras estritas e exibida em um componente isolado por Shadow DOM.
5. O resultado fica em cache local para as próximas visitas à conversa.

Os detalhes estão em [Arquitetura](docs/architecture.md) e [Pesquisa do DOM do WhatsApp](docs/whatsapp-dom.md).

## Instalação

### Usando um pacote pronto

Instale pela [Chrome Web Store](https://chromewebstore.google.com/detail/transcri%C3%A7%C3%A3o-de-%C3%A1udios-do/dnfdcckllipjhijlddogocihdabnbblp), abra o popup da extensão, informe uma [API key da Groq](https://console.groq.com/keys) e clique em **Salvar e testar**.

Para instalar manualmente uma versão específica:

1. Baixe e descompacte o pacote na página de [Releases](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/releases).
2. Abra `chrome://extensions` no Google Chrome.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta que contém `manifest.json`.

Se ainda não houver um pacote publicado, gere o build local seguindo a seção de desenvolvimento.

### Firefox e Zen Browser: instalação temporária

O Zen usa o mesmo build do Firefox. Gere `pnpm build:firefox` (ou `pnpm build:zen`) e, no navegador desejado:

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária… / Load Temporary Add-on…**.
3. Selecione `apps/extension/.output/firefox-mv3/manifest.json`.
4. Abra o popup, configure a API key e clique em **Salvar e testar**.
5. Recarregue o WhatsApp Web. Verifique em `about:addons` que o acesso a `web.whatsapp.com` e `api.groq.com` está permitido.

A instalação temporária aceita o build sem assinatura e termina quando o navegador é fechado. Não conte com ela para persistir configuração ou cache entre sessões. Recarregar uma extensão temporária na mesma sessão preserva os dados locais.

### Firefox e Zen Browser: instalação permanente e assinatura

`pnpm zip:firefox` (ou `pnpm zip:zen`) gera `apps/extension/.output/watextension-0.2.3-firefox.zip`. Esse ZIP **não é assinado**; renomeá-lo para `.xpi` não o torna instalável permanentemente.

Para distribuição, envie o pacote ao [portal de desenvolvedores da Mozilla](https://addons.mozilla.org/developers/) e escolha publicação no AMO ou distribuição própria (**unlisted / On your own**). Ambas passam por assinatura e validação da Mozilla. O WXT também gera `watextension-0.2.3-sources.zip` com o workspace, protocolo e lockfile para revisão. Como o código é compilado, forneça esse código-fonte e as instruções para reproduzir o build quando solicitados. Use Node 22+, pnpm 11, `pnpm install --frozen-lockfile` e `pnpm zip:firefox`.

Depois de obter o `.xpi` assinado, abra `about:addons`, use a engrenagem → **Instalar extensão de um arquivo…** e selecione o XPI, tanto no Firefox quanto no Zen. Não é necessário desativar verificações de assinatura. Ainda não há pacote Firefox assinado ou publicação AMO neste projeto.

O Firefox release/beta exige [assinatura da Mozilla](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/). Para Zen, distribua também o XPI assinado. O manifesto declara ID fixo `whatsapp-audio-transcriber@gabrielalonso.dev`, mínimo Firefox 140 e [consentimento nativo de transmissão de dados](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/): chave de autenticação, comunicação pessoal e gravação de voz enviados à Groq. O aviso da extensão antes da primeira transcrição continua presente.

### Atualizando

Descompacte a nova versão sobre a mesma pasta, clique em **Recarregar** em `chrome://extensions` e atualize o WhatsApp Web. Não remova a extensão antes da atualização se quiser preservar a configuração e o cache locais.

No Firefox/Zen temporário, gere o build novamente, clique em **Recarregar** no cartão da extensão em `about:debugging` e recarregue o WhatsApp Web. Para instalações permanentes, aumente a versão com `pnpm version:extension X.Y.Z`, gere e assine o novo pacote com o **mesmo ID** e instale o novo XPI sem desinstalar o anterior. AMO permite atualização automática; distribuição própria só atualiza automaticamente se houver um `update_url` e manifesto de atualização configurados (não incluídos neste projeto). Caso contrário, instale o novo XPI manualmente.

## Privacidade

| Dado                          | Destino                              | Persistência                      |
| ----------------------------- | ------------------------------------ | --------------------------------- |
| API key                       | Groq, para autenticar as requisições | `browser.storage.local` via WXT   |
| Áudio selecionado             | Groq, para transcrição               | não é salvo pelo projeto          |
| Transcrição bruta e formatada | somente a extensão                   | cache local, removível pelo popup |

A extensão solicita acesso apenas ao armazenamento local, ao WhatsApp Web e à API da Groq. A utilização da API está sujeita aos termos, limites e eventual cobrança da própria Groq.

Consulte a [Política de Privacidade](PRIVACY.md) para conhecer todos os dados tratados, destinatários, prazos e controles disponíveis.

Limites atuais:

- até 25 MB por áudio;
- até 10 trabalhos na fila e uma transcrição ativa por vez;
- até 500 transcrições ou aproximadamente 8 MB no cache local.

## Limitações conhecidas

- a extensão depende de uma conta e de uma API key da Groq;
- transcrições automáticas podem conter erros, especialmente em nomes e números importantes;
- somente mensagens de voz do WhatsApp Web são suportadas;
- alterações na interface do WhatsApp podem exigir uma atualização da extensão;
- instalações manuais não são atualizadas automaticamente pelo Chrome.

## Desenvolvimento

### Requisitos

- Node.js 22 ou superior;
- pnpm 11;
- Chrome ou Firefox 140+ (Zen com base Firefox 140+);
- API key da Groq para testar o fluxo real.

```bash
git clone https://github.com/gabrielMalonso/whatsapp-audio-transcriber.git
cd whatsapp-audio-transcriber
corepack enable
pnpm install
pnpm dev
```

O ambiente de desenvolvimento é gerado por WXT. `pnpm dev:firefox` e `pnpm dev:zen` usam o target `firefox` em MV3; carregue `apps/extension/.output/firefox-mv3-dev/manifest.json` temporariamente. Os comandos Zen são aliases do Firefox: não existe um terceiro bundle. Sem um runner de navegador instalado, o WXT gera os arquivos e mantém o servidor de desenvolvimento; abra o navegador e carregue a extensão manualmente, sem adicionar dependências.

Para uma compilação de produção:

```bash
pnpm build
```

Carregue no Chrome a pasta:

```text
apps/extension/.output/chrome-mv3
```

### Comandos

| Comando                                 | Ação                                             |
| --------------------------------------- | ------------------------------------------------ |
| `pnpm dev`                              | inicia o ambiente de desenvolvimento da extensão |
| `pnpm build`                            | compila o protocolo e a extensão                 |
| `pnpm test`                             | executa os testes com Vitest                     |
| `pnpm typecheck`                        | verifica os tipos TypeScript                     |
| `pnpm lint`                             | verifica o código com ESLint                     |
| `pnpm format:check`                     | verifica a formatação com Prettier               |
| `pnpm format`                           | formata os arquivos do projeto                   |
| `pnpm dev:chrome`                       | alias de `pnpm dev` para Chrome                  |
| `pnpm dev:firefox` / `pnpm dev:zen`     | desenvolvimento Firefox/Zen, MV3                 |
| `pnpm build:chrome`                     | build Chrome em `.output/chrome-mv3`             |
| `pnpm build:firefox` / `pnpm build:zen` | build Firefox/Zen em `.output/firefox-mv3`       |
| `pnpm zip:chrome`                       | build e ZIP Chrome em `.output`                  |
| `pnpm zip:firefox` / `pnpm zip:zen`     | build e ZIP Firefox/Zen sem assinatura           |
| `pnpm check`                            | executa todas as verificações e os dois builds   |
| `pnpm store:package`                    | gera o ZIP da Chrome Web Store e seu SHA-256     |
| `pnpm version:extension X.Y.Z`          | sincroniza a versão da extensão                  |

### Validação em navegador

Testes automatizados e builds não comprovam sozinhos compatibilidade com a versão atual do WhatsApp. Em Chrome e Firefox/Zen, valide com sua conta e uma chave Groq:

Em 4 de outubro de 2026, o build 0.2.3 foi instalado temporariamente no Zen 1.23b (Firefox 157, macOS). Um áudio enviado de 5 segundos na conversa de teste foi capturado, transcrito pela Groq e exibido; o controle de reprodução permaneceu em 0:00. A transcrição foi recuperada do cache após recarregar o WhatsApp, e as preferências do popup persistiram. Esse teste não comprova qualidade da transcrição nem compatibilidade completa. Continuam pendentes os cenários abaixo, exceto essas verificações pontuais, e o fluxo real no Chrome e no Firefox separado.

- abrir popup, salvar/testar chave e verificar persistência das preferências ao fechar e abrir o popup;
- transcrever áudio recebido e enviado, já baixado e ainda não baixado, **sem som**; confirmar texto bruto/formatado, cache e chamadas Groq;
- ouvir normalmente uma mensagem depois da captura; cancelar a captura e um trabalho da fila, repetir após erro e após reconectar o background;
- recarregar a página, mudar de conversa, reutilizar o cache e conferir preservação dos dados após atualização;
- negar acesso aos sites e verificar recuperação ao conceder novamente as permissões.

### Estrutura

```text
apps/extension/       extensão WXT + React
packages/protocol/    contratos Zod compartilhados
docs/                 arquitetura e pesquisa técnica
release/              pacotes e instruções de distribuição manual
```

## Contribuindo

Contribuições são bem-vindas. Antes de enviar um pull request, leia o [guia de contribuição](CONTRIBUTING.md) e o [código de conduta](CODE_OF_CONDUCT.md). Para vulnerabilidades, siga a [política de segurança](SECURITY.md) em vez de abrir uma issue pública.

## Licença

Distribuído sob a licença [MIT](LICENSE). Copyright © 2026 Gabriel Alonso.
