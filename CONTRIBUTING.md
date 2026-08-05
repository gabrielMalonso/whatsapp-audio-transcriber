# Contribuindo

Obrigado por considerar uma contribuição para o WhatsApp Audio Transcriber. Correções, melhorias de documentação, testes e propostas de novos recursos são bem-vindos.

Ao participar, siga o [Código de Conduta](CODE_OF_CONDUCT.md).

## Antes de começar

- Pesquise as [issues existentes](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/issues) para evitar duplicidade.
- Para correções pequenas, abra diretamente um pull request.
- Para mudanças grandes, abra uma issue primeiro para alinhar escopo e abordagem.
- Nunca inclua API keys, áudios privados, transcrições reais ou outros dados pessoais em código, testes ou logs.

Vulnerabilidades devem ser relatadas conforme a [Política de Segurança](SECURITY.md), nunca em uma issue pública.

## Ambiente local

Requisitos:

- Node.js 22 ou superior;
- pnpm 11;
- Google Chrome.

```bash
git clone https://github.com/gabrielMalonso/whatsapp-audio-transcriber.git
cd whatsapp-audio-transcriber
corepack enable
pnpm install
pnpm dev
```

Carregue `apps/extension/.output/chrome-mv3` em `chrome://extensions` com o modo de desenvolvedor habilitado.

## Organização do projeto

- `apps/extension`: extensão Manifest V3 construída com WXT e React;
- `packages/protocol`: contratos, limites e tipos compartilhados;
- `docs`: decisões de arquitetura e pesquisa sobre o DOM do WhatsApp;
- `release`: artefatos e instruções de instalação manual.

Leia [docs/architecture.md](docs/architecture.md) antes de alterar a captura, a mensageria ou o pipeline de transcrição.

## Enviando uma mudança

1. Crie uma branch curta a partir de `main`.
2. Faça mudanças focadas e adicione testes quando houver alteração de comportamento.
3. Atualize a documentação se a interface, instalação, privacidade ou arquitetura mudar.
4. Execute as verificações locais:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

5. Abra o pull request explicando o problema, a solução e como a mudança foi validada.

Para alterações nos seletores do WhatsApp, inclua fixtures anonimizadas e testes para mensagens enviadas e recebidas. Prefira atributos estruturais estáveis a classes CSS geradas ou textos localizados.

## Pull requests

Um pull request deve:

- tratar um problema ou objetivo bem definido;
- manter o escopo pequeno sempre que possível;
- passar pela integração contínua;
- não aumentar permissões da extensão sem justificativa explícita;
- preservar a formatação conservadora e a privacidade descritas no README.

Ao enviar uma contribuição, você concorda em licenciá-la sob os termos da [licença MIT](LICENSE) deste projeto.
