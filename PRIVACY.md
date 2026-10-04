# Privacy Policy — WhatsApp Audio Transcriber

Last updated: August 5, 2026.

This policy describes how the **WhatsApp Audio Transcriber** extension handles data. The extension is an independent project, not affiliated with WhatsApp, Meta, or Groq.

## Purpose

The extension's sole purpose is to let users transcribe voice messages they select in WhatsApp Web and format the resulting text for reading within the conversation.

## Data processed

The extension processes only the data necessary for this purpose:

- **Groq API key:** Provided by the user, stored in the extension's local storage, and sent to Groq in the authentication header of requests.
- **Selected audio:** Captured only when the user requests a transcription and sent directly from the browser to the Groq API.
- **Transcript:** The raw text returned by Groq may be sent to Groq again to apply formatting preferences. Both the raw and formatted text are kept in the extension's local cache.
- **Local technical data:** Hash of the message identifier, language, duration, models used, creation and access dates, formatting preferences, and acknowledgment of the initial notice.

The extension does not separately request or extract names, email addresses, phone numbers, location, financial information, browsing history, or contacts. A selected message may contain personal data within its content. The extension contains no advertising, analytics, or trackers.

## When data is sent

Audio is not captured or sent automatically. Before the first transcription, the extension informs the user that the selected audio will be sent to Groq and requires an affirmative action to continue. Each new transcription depends on a user action.

## Recipients and third-party processing

The project runs no intermediary server, and its maintainers do not receive the API key, audio, or transcripts. Requests are made over HTTPS directly from the browser to Groq, which processes:

- The API key, to authenticate requests and query available models;
- The selected audio, to produce the transcript;
- The raw text, to produce the formatted version when applicable.

This processing is also subject to [Groq's Privacy Policy](https://groq.com/privacy-policy/) and [Groq's information about data in GroqCloud](https://console.groq.com/docs/your-data). According to Groq's documentation, inference data is not retained by default, but inputs and outputs may be temporarily logged for up to 30 days for platform reliability or abuse investigations. Groq provides retention controls, including Zero Data Retention, in the user's account.

## Local storage and retention

Local data is stored through `chrome.storage.local`:

- The API key remains saved until it is removed in the extension popup or the extension is uninstalled;
- Preferences remain saved until they are changed or the extension is uninstalled;
- The cache keeps at most 500 transcripts or approximately 8 MB and automatically removes the least-accessed records when a limit is reached;
- The original audio is not stored by the extension after processing.

Users can delete all transcripts through **Saved transcripts → Clear** (shown as **Transcrições salvas → Limpar** in the current Portuguese interface), remove the API key in the popup, or uninstall the extension.

## Sharing, sale, and advertising

Data is not sold, licensed, or shared for advertising, credit analysis, or other purposes unrelated to the requested transcription. No person accesses the data except when necessary for security, abuse prevention, legal compliance, or with the user's explicit consent.

## Security

The extension uses HTTPS to communicate with Groq, limits permissions to the necessary domains and resources, validates API responses, and keeps persistent data in the extension's isolated local storage. No system is entirely immune to risk; users should protect their API key and revoke it in the Groq dashboard if they suspect exposure.

## Limited Use

The use of information received from Google and Chrome APIs complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data), including the Limited Use requirements. Processing is limited to the functionality presented to the user and is not used for advertising, commercial transfer, credit assessment, or profile enrichment.

## Changes and contact

This policy may be updated when functionality or legal requirements change. The date at the beginning of this document indicates the most recent revision.

Privacy questions can be raised in the [project's public repository](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/issues). Vulnerabilities should be reported according to the [security policy](SECURITY.md).
