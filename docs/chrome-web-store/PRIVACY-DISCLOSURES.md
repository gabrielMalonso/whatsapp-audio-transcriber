# Privacy tab responses

Use these responses in the dashboard and confirm the exact labels shown by the Chrome Web Store.

## Single purpose

Allow users to transcribe voice messages they select in WhatsApp Web and format the resulting text for reading and copying within the conversation.

## Permission justifications

### `storage`

Locally stores the user-provided API key, formatting preferences, acknowledgment of the initial notice, and a bounded transcript cache. This data keeps settings between sessions, avoids reprocessing, and enables controls to remove the key and clear the cache.

### `https://web.whatsapp.com/*`

Required to identify voice messages in WhatsApp Web, insert transcription controls, and capture only the selected audio after an explicit user action. The extension does not operate on other websites.

### `https://api.groq.com/*`

Required to validate the user's own API key, send selected audio over HTTPS for transcription, and send raw text for formatting. Communication happens directly between the browser and Groq, with no intermediary server operated by the project.

## Remote code

**No.** All executable JavaScript is included in the package submitted to the store. The extension does not use `eval`, external scripts, remote WebAssembly, or download code for execution. Groq supplies only data responses to requests made by the extension.

## Declared data

Select the categories below using the equivalent option shown in the dashboard:

| Category                   | Reason                                 | Use                                          |
| -------------------------- | -------------------------------------- | -------------------------------------------- |
| Authentication information | Groq API key                           | Authenticate requests initiated by the user  |
| Personal communications    | Voice message and its transcript       | Produce and display the requested transcript |
| User-generated content     | Audio and text of the selected message | Transcribe and apply the selected formatting |
| Website content            | Voice message accessed in WhatsApp Web | Provide the feature within the conversation  |

Do not select location, financial information, health, browsing history, user activity, or personal identifiers: the extension does not collect this data for its functionality.

## Certifications

Confirm that:

- Data is used only for the described single purpose;
- Data is not sold or transferred for advertising;
- Data is not used for credit, loans, or insurance;
- Data is not used for purposes unrelated to the advertised feature;
- There is no human access except for security, abuse prevention, legal obligations, or explicit consent;
- Processing complies with the Limited Use policy;
- The public privacy policy is `https://github.com/gabrielMalonso/whatsapp-audio-transcriber/blob/main/PRIVACY.md`.

## Short disclosure statement

When you request a transcription, the extension sends your API key and selected audio directly to Groq. The raw text may also be sent for formatting. The key and transcripts remain in the extension's local storage and can be deleted in the popup. The project runs no server, displays no ads, and does not sell data.
