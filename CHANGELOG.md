# Changelog

As mudanças relevantes deste projeto serão documentadas neste arquivo. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## Não publicado

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
