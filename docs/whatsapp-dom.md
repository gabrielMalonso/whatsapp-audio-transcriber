# WhatsApp Web DOM research

Observations made in the current WhatsApp Web interface with sent and received voice messages.

## Stable signals used

- Virtualized container `div[role="row"]`;
- Message identifier in `[data-id]`;
- Message bubble in `[data-testid="msg-container"]`;
- Voice marker `[data-icon="ptt-status"]`;
- Progress in `[role="slider"]`;
- Playback button located structurally before the slider.

Generated CSS classes and localized `aria-label` text are not used as primary selectors. The playback speed button's text is only an auxiliary filter in Portuguese, English, and Spanish.

## Findings

- Sent and received messages share the same essential structure.
- `tail-in` and `tail-out` appear only in some grouped messages and are unreliable.
- There is no persistent `<audio>` element in the DOM while idle.
- When the control is triggered, WhatsApp creates or reuses a media element with a `blob:` URL.
- Intercepting `HTMLMediaElement.play()` in the MAIN context allows capture of a valid `audio/ogg` Blob starting with `OggS` without playing sound.
- Controlled capture kept the slider at zero and the button in the play state.

## Resilience strategy

The `MutationObserver` only schedules one scan per frame. The scan reconciles widgets by `data-id`, removes roots attached to old virtualized rows, and keeps the UI isolated in Shadow DOM.

If WhatsApp changes its structure, the popup will continue to serve as a host diagnostic tool; `voiceMessages.test.ts` protects the combination of structural signals currently used.
