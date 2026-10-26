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

## How it works

The extension adds a **Transcribe** button to voice messages in WhatsApp Web. Selected audio is sent to Groq for transcription with Whisper, and the text appears in the conversation.

- Transcribe without playing the audio aloud.
- Choose a colloquial, natural, or formal tone and adjust text formatting.
- Reopen saved transcripts from a local cache.

Supports Chrome, Firefox, and Zen Browser. Requires your own Groq API key; API usage is subject to Groq's limits and pricing. Changes to WhatsApp Web may require an extension update.

## Installation

### Chrome

1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/transcri%C3%A7%C3%A3o-de-%C3%A1udios-do/dnfdcckllipjhijlddogocihdabnbblp).
2. Open the extension popup, enter a [Groq API key](https://console.groq.com/keys), and click **Salvar e testar**.
3. Open or refresh [WhatsApp Web](https://web.whatsapp.com/) and click **Transcrever** on a voice message.

For manual installation, extract a package from [Releases](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/releases), enable **Developer mode** in `chrome://extensions`, and select its folder with **Load unpacked**.

### Firefox and Zen

After [setting up the project](#development), run `pnpm build:firefox` (Zen uses the same build). Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…**, and select `apps/extension/.output/firefox-mv3/manifest.json`. Configure the API key in the popup and refresh WhatsApp Web.

Temporary installations are removed when the browser closes. Permanent installation requires a Mozilla-signed XPI; the project does not currently provide one.

## Privacy

Audio and transcript text are sent directly to Groq for transcription and formatting. The project runs no intermediary server. Your API key, preferences, and cached transcripts are stored locally in the extension; audio is not saved by the extension. You can clear transcripts from the popup.

See the [privacy policy](PRIVACY.md) for details about processing and retention, including Groq's handling of data.

## Development

Requires **Node.js 22+** and **pnpm 11**. To run the Firefox/Zen build, use Firefox 140+ or a Zen version based on it.

```bash
git clone https://github.com/gabrielMalonso/whatsapp-audio-transcriber.git
cd whatsapp-audio-transcriber
corepack enable
pnpm install
pnpm build
```

In Chrome, enable **Developer mode** at `chrome://extensions` and **Load unpacked** from `apps/extension/.output/chrome-mv3`.

| Command              | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `pnpm dev`           | Develop for Chrome with rebuilds on changes    |
| `pnpm dev:firefox`   | Develop for Firefox or Zen                     |
| `pnpm build:firefox` | Build for Firefox or Zen                       |
| `pnpm check`         | Run tests, types, lint, formatting, and builds |

Development builds are in `apps/extension/.output/chrome-mv3-dev` and `apps/extension/.output/firefox-mv3-dev`. Load them using the same browser steps above.

The extension lives in `apps/extension` (WXT + React); shared contracts live in `packages/protocol`. See the [architecture](docs/architecture.md) for the capture and transcription flow.

## Contributing

See the [contribution guide](CONTRIBUTING.md) for setup and pull request guidelines. Report bugs through [issues](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/issues) and vulnerabilities through the [security policy](SECURITY.md).

## License

[MIT](LICENSE). Independent project, not affiliated with WhatsApp, Meta, or Groq.
