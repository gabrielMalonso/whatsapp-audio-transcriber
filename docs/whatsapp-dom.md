# WhatsApp Web DOM research

Observations made in the current WhatsApp Web interface with sent and received voice messages.

## Stable signals used

- Virtualized container `div[role="row"]`;
- Message identifier in `[data-id]`;
- Message bubble in `[data-testid="msg-container"]`;
- Voice marker `svg title` with text `ic-keyboard-voice-filled`, or the legacy `[data-icon="ptt-status"]`, inside the message bubble;
- Progress in `[role="slider"]`;
- Playback button located structurally before the slider.

Generated CSS classes and localized `aria-label` text are not used as primary selectors. The playback speed button's text is only an auxiliary filter in Portuguese, English, and Spanish.

## Findings

- On October 26, 2026, a received five-second voice message used the SVG title `ic-keyboard-voice-filled` and no longer exposed `data-icon="ptt-status"`. The row, message ID, bubble, slider, and playback button were still present. Requiring only the legacy marker caused the scanner to skip the message.
- The updated production build was loaded in Chrome on Linux and validated against that message: one widget appeared, Groq returned a transcript, playback stayed at `0:00`, and the transcript was restored from the local cache after reloading WhatsApp. Sent messages and the legacy markup are covered by unit tests; this browser check did not validate Firefox or Zen.
- Sent and received messages share the same essential structure.
- `tail-in` and `tail-out` appear only in some grouped messages and are unreliable.
- There is no persistent `<audio>` element in the DOM while idle.
- When the control is triggered, WhatsApp creates or reuses a media element with a `blob:` URL.
- Intercepting `HTMLMediaElement.play()` in the MAIN context allows capture of a valid `audio/ogg` Blob starting with `OggS` without playing sound.
- Controlled capture kept the slider at zero and the button in the play state.

## Resilience strategy

The `MutationObserver` only schedules one scan per frame. The scan reconciles widgets by `data-id`, removes roots attached to old virtualized rows, and keeps the UI isolated in Shadow DOM.

If WhatsApp changes its structure, the popup will continue to serve as a host diagnostic tool; `voiceMessages.test.ts` protects the combination of structural signals currently used.
