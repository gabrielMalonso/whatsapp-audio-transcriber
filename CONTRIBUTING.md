# Contributing

Thank you for considering a contribution to WhatsApp Audio Transcriber. Bug fixes, documentation improvements, tests, and proposals for new features are welcome.

When participating, follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- Search [existing issues](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/issues) to avoid duplicates.
- For small fixes, open a pull request directly.
- For larger changes, open an issue first to agree on the scope and approach.
- Never include API keys, private audio, real transcripts, or other personal data in code, tests, or logs.

Report vulnerabilities according to the [Security Policy](SECURITY.md), never in a public issue.

## Local environment

Requirements:

- Node.js 22 or later;
- pnpm 11;
- Google Chrome.

```bash
git clone https://github.com/gabrielMalonso/whatsapp-audio-transcriber.git
cd whatsapp-audio-transcriber
corepack enable
pnpm install
pnpm dev
```

Load `apps/extension/.output/chrome-mv3` in `chrome://extensions` with Developer mode enabled.

## Project organization

- `apps/extension`: Manifest V3 extension built with WXT and React;
- `packages/protocol`: Shared contracts, limits, and types;
- `docs`: Architecture decisions and WhatsApp DOM research;
- `release`: Artifacts and manual installation instructions.

Read [docs/architecture.md](docs/architecture.md) before changing capture, messaging, or the transcription pipeline.

## Submitting a change

1. Create a short-lived branch from `main`.
2. Make focused changes and add tests when behavior changes.
3. Update the documentation if the interface, installation, privacy, or architecture changes.
4. Run the local checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

5. Open a pull request explaining the problem, the solution, and how the change was validated.

For changes to WhatsApp selectors, include anonymized fixtures and tests for sent and received messages. Prefer stable structural attributes over generated CSS classes or localized text.

## Pull requests

A pull request should:

- Address a well-defined problem or goal;
- Keep the scope small whenever possible;
- Pass continuous integration;
- Avoid increasing extension permissions without explicit justification;
- Preserve the conservative formatting and privacy described in the README.

By submitting a contribution, you agree to license it under this project's [MIT License](LICENSE).
