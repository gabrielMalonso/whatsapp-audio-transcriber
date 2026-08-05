import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureVoiceAudio, validateCapturedAudio } from './pageBridge';

describe('WhatsApp page bridge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts an Ogg payload and normalizes its MIME type', async () => {
    const audio = new Blob([new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 1])], {
      type: 'application/octet-stream',
    });

    const validated = await validateCapturedAudio(audio);

    expect(validated.type).toBe('audio/ogg');
    expect(validated.size).toBe(audio.size);
  });

  it('rejects content that is not a supported audio container', async () => {
    const html = new Blob(['<!doctype html>'], { type: 'text/html' });

    await expect(validateCapturedAudio(html)).rejects.toThrow(
      'arquivo de áudio inválido',
    );
  });

  it('disarms without clicking the transport after cancellation', async () => {
    vi.useFakeTimers();
    const button = document.createElement('button');
    const click = vi.spyOn(button, 'click');
    const controller = new AbortController();

    const capture = captureVoiceAudio(button, controller.signal);
    controller.abort();

    await expect(capture).rejects.toMatchObject({ name: 'AbortError' });
    await vi.runAllTimersAsync();
    expect(click).not.toHaveBeenCalled();
  });
});
