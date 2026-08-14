# Changelog

As mudanças relevantes deste projeto serão documentadas neste arquivo. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## Não publicado

### Adicionado

- ESLint com regras tipadas para TypeScript e validação oficial dos Hooks do React;
- verificação de lint na integração contínua;
- links para a Chrome Web Store e o repositório no popup;
- metadados localizados em português e inglês para a Chrome Web Store;
- onboarding no WhatsApp para criar e configurar a API key da Groq antes da captura do áudio.

### Corrigido

- cancelamento imediato durante a captura e a montagem do áudio;
- validação do arquivo capturado e isolamento do canal acionado pela página;
- timeout, ownership e limpeza dos trabalhos ainda incompletos;
- exibição do resultado mesmo quando a persistência no cache falha;
- tratamento de falhas assíncronas no popup e pré-liberação do cache.

## 0.2.0 - 2026-08-04

### Adicionado

- extensão Manifest V3 para transcrição de mensagens de voz do WhatsApp Web;
- captura silenciosa de áudio OGG/Opus no contexto da página;
- transcrição com Whisper Large v3 Turbo pela Groq;
- formatação conservadora com GPT-OSS 20B e saída estruturada;
- fila serial, cancelamento, progresso e tratamento de erros;
- cache local de transcrições e gerenciamento da API key;
- popup de configuração e widgets isolados com Shadow DOM;
- testes do protocolo, provider e identificação de mensagens de voz;
- pacote de distribuição manual para Chrome no macOS e Windows.
