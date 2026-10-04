# Reviewer instructions

## Prerequisites

- Google Chrome on desktop;
- An active WhatsApp Web session;
- A valid Groq API key with access to `whisper-large-v3-turbo` and `openai/gpt-oss-20b`.

The project has no account system, login, or server of its own. The extension uses the existing WhatsApp Web session and the API key provided by the reviewer.

The current extension interface is in Portuguese. The steps below include the displayed labels where needed.

## Test procedure

1. Install the extension without configuring a key.
2. Open or refresh `https://web.whatsapp.com/`, enter a conversation with a voice message, and click the transcription button. Confirm that the panel offers links to create a key on Groq and open the extension settings without capturing audio.
3. In the popup, paste a Groq API key and select **Save and test** (**Salvar e testar**). The status should change to **Ready** (**Pronto**).
4. Click the transcription button next to the message again.
5. On the first use, confirm the notice that audio will be sent directly to Groq.
6. Wait for capture, queuing, transcription, and formatting.
7. Confirm that the text appears beside the message and can be copied.
8. In the popup, test the tone and formatting options, clearing saved transcripts, and removing the API key.

## Notes

- No audio is sent before an explicit action and acknowledgment of the initial notice.
- WhatsApp may mark the message as played during capture, but the extension blocks sound.
- The project does not receive the API key, audio, or transcript; the browser communicates directly with `api.groq.com`.
- If the review team requires a temporary credential, provide it only in the dashboard's private **Test instructions** field. Never include a key in the ZIP, repository, or public description.
