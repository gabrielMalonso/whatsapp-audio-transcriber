<div align="center">
  <img src="apps/extension/assets/icon.png" alt="WhatsApp Audio Transcriber icon" width="112" />
  <h1>WhatsApp Audio Transcriber</h1>
  <p>Transcribe WhatsApp Web voice messages without leaving the conversation.</p>

  <p>
    <a href="https://chromewebstore.google.com/detail/transcri%C3%A7%C3%A3o-de-%C3%A1udios-do/dnfdcckllipjhijlddogocihdabnbblp"><img src="https://img.shields.io/badge/Chrome%20Web%20Store-install-4285f4.svg" alt="Install from the Chrome Web Store" /></a>
    <a href="https://github.com/gabrielMalonso/whatsapp-audio-transcriber/actions/workflows/ci.yml"><img src="https://github.com/gabrielMalonso/whatsapp-audio-transcriber/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2f6f65.svg" alt="MIT License" /></a>
    <a href="https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3"><img src="https://img.shields.io/badge/Chrome-Manifest%20V3-caa66b.svg" alt="Chrome Manifest V3" /></a>
    <a href="https://groq.com/"><img src="https://img.shields.io/badge/Groq-Whisper%20%2B%20GPT--OSS-f2ede3.svg" alt="Groq" /></a>
  </p>

  <p>
    <a href="#installation">Installation</a> ·
    <a href="#how-it-works">How it works</a> ·
    <a href="PRIVACY.md">Privacy</a> ·
    <a href="#development">Development</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>

## About

WhatsApp Audio Transcriber is an open-source Google Chrome extension that adds transcripts directly to WhatsApp Web voice messages. Audio is processed through the Groq API with `whisper-large-v3-turbo`; then `openai/gpt-oss-20b` applies the formatting preferences selected in the popup.

Everything happens between the browser and Groq: the project runs no intermediary server, does not store audio, and keeps the API key and transcripts only in the extension's local storage.

> [!IMPORTANT]
> This is an independent project, not affiliated with WhatsApp, Meta, or Groq. Changes to WhatsApp Web may temporarily affect the extension.

## Features

- Transcription integrated into the WhatsApp Web interface;
- Automatic detection of the audio's language;
- Colloquial, natural, or formal tone;
- Optional formatting for paragraphs, dates, times, and lists;
- Formatting without answering, summarizing, or translating the content;
- Audio capture without audible playback of the voice message;
- Local queue with cancellation and progress indicators;
- Local cache to avoid reprocessing messages;
- Guided onboarding to create and configure a Groq API key;
- The same extension for Chrome on macOS, Windows, and Linux;
- No Python, FFmpeg, local Whisper, or native host required.

## How it works

```mermaid
flowchart LR
    A[Voice message] --> B[Extension in WhatsApp Web]
    B -->|OGG/Opus audio| C[Service worker]
    C -->|HTTPS| D[Whisper on Groq]
    D --> E[GPT-OSS on Groq]
    E --> F[Formatted transcript]
    F --> G[(Local cache)]
    F --> B
```

1. The extension identifies voice messages using structural attributes in WhatsApp Web.
2. When you request a transcript, an isolated script captures the audio `Blob` and blocks playback.
3. The service worker sends the audio directly to Groq and processes one transcription at a time.
4. The raw transcript is formatted with strict rules and displayed in a component isolated by Shadow DOM.
5. The result is cached locally for subsequent visits to the conversation.

See [Architecture](docs/architecture.md) and [WhatsApp DOM research](docs/whatsapp-dom.md) for details.

## Installation

### Using a ready-made package

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/transcri%C3%A7%C3%A3o-de-%C3%A1udios-do/dnfdcckllipjhijlddogocihdabnbblp), open the extension popup, enter a [Groq API key](https://console.groq.com/keys), and click **Save and test** (shown as **Salvar e testar** in the current Portuguese interface).

To install a specific version manually:

1. Download and extract the package from the [Releases](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/releases) page.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder containing `manifest.json`.

If no package has been published yet, create a local build by following the development section.

### Updating

Extract the new version into the same folder, click **Reload** in `chrome://extensions`, and refresh WhatsApp Web. Do not remove the extension before updating if you want to preserve your local settings and cache.

## Privacy

| Data                         | Destination                    | Persistence                         |
| ---------------------------- | ------------------------------ | ----------------------------------- |
| API key                      | Groq, to authenticate requests | `chrome.storage.local`              |
| Selected audio               | Groq, for transcription        | Not saved by the project            |
| Raw and formatted transcript | Only the extension             | Local cache, cleared from the popup |

The extension requests access only to local storage, WhatsApp Web, and the Groq API. API usage is subject to Groq's own terms, limits, and any applicable charges.

See the [Privacy Policy](PRIVACY.md) for all data processed, recipients, retention periods, and available controls.

Current limits:

- Up to 25 MB per audio file;
- Up to 10 queued jobs and one active transcription at a time;
- Up to 500 transcripts or approximately 8 MB in the local cache.

## Known limitations

- The extension requires a Groq account and API key;
- Automatic transcripts may contain errors, especially in important names and numbers;
- Only WhatsApp Web voice messages are supported;
- Changes to the WhatsApp interface may require an extension update;
- Manual installations are not automatically updated by Chrome.

## Development

### Requirements

- Node.js 22 or later;
- pnpm 11;
- Google Chrome;
- A Groq API key to test the actual workflow.

```bash
git clone https://github.com/gabrielMalonso/whatsapp-audio-transcriber.git
cd whatsapp-audio-transcriber
corepack enable
pnpm install
pnpm dev
```

The development environment is generated by WXT. For a production build:

```bash
pnpm build
```

Load this folder in Chrome:

```text
apps/extension/.output/chrome-mv3
```

### Commands

| Command                        | Action                                             |
| ------------------------------ | -------------------------------------------------- |
| `pnpm dev`                     | Starts the extension development environment       |
| `pnpm build`                   | Builds the protocol and extension                  |
| `pnpm test`                    | Runs tests with Vitest                             |
| `pnpm typecheck`               | Checks TypeScript types                            |
| `pnpm lint`                    | Checks code with ESLint                            |
| `pnpm format:check`            | Checks formatting with Prettier                    |
| `pnpm format`                  | Formats project files                              |
| `pnpm check`                   | Runs all checks and the build                      |
| `pnpm store:package`           | Generates the Chrome Web Store ZIP and its SHA-256 |
| `pnpm version:extension X.Y.Z` | Synchronizes the extension version                 |

### Structure

```text
apps/extension/       WXT + React extension
packages/protocol/    Shared Zod contracts
docs/                 Architecture and technical research
release/              Packages and manual distribution instructions
```

## Contributing

Contributions are welcome. Before submitting a pull request, read the [contribution guide](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md). For vulnerabilities, follow the [security policy](SECURITY.md) instead of opening a public issue.

## License

Distributed under the [MIT License](LICENSE). Copyright © 2026 Gabriel Alonso.
