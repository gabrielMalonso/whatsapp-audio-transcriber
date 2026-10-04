import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureVoiceAudio, validateCapturedAudio } from './pageBridge';
import { PAGE_BRIDGE_CHANNEL } from './constants';

describe('WhatsApp page bridge', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    { label: 'page window', source: window },
    { label: 'privileged context', source: null },
  ])(
    'captures transferred bytes after the arm acknowledgement ($label)',
    async ({ source }) => {
      const frame = document.createElement('iframe');
      document.body.append(frame);
      // The DOM type omits the constructors on this test window's global object.
      const realm = frame.contentWindow as typeof window;
      const pageAudio = new realm.ArrayBuffer(4);
      new realm.Uint8Array(pageAudio).set([0x4f, 0x67, 0x67, 0x53]);
      frame.remove();
      expect(pageAudio instanceof ArrayBuffer).toBe(false);
      const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
      const button = document.createElement('button');
      const click = vi.spyOn(button, 'click');
      const capture = captureVoiceAudio(button);
      const command: unknown = post.mock.calls[0]?.[0];
      if (
        !command ||
        typeof command !== 'object' ||
        !('requestId' in command) ||
        typeof command.requestId !== 'string'
      ) {
        throw new Error('Missing arm command');
      }
      const base = {
        channel: PAGE_BRIDGE_CHANNEL,
        requestId: command.requestId,
      };
      expect(click).not.toHaveBeenCalled();
      window.dispatchEvent(
        new MessageEvent('message', {
          source,
          origin: window.location.origin,
          data: { ...base, kind: 'response', action: 'arm' },
        }),
      );
      expect(click).toHaveBeenCalledOnce();
      window.dispatchEvent(
        new MessageEvent('message', {
          source,
          origin: window.location.origin,
          data: {
            ...base,
            kind: 'capture',
            audio: pageAudio,
          },
        }),
      );
      const audio = await capture;
      expect(audio.type).toBe('audio/ogg');
      expect(audio.size).toBe(4);
      expect(post).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'disarm' }),
        window.location.origin,
      );
    },
  );

  it('ignores acknowledgements from another origin or request', async () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const button = document.createElement('button');
    const click = vi.spyOn(button, 'click');
    const controller = new AbortController();
    const capture = captureVoiceAudio(button, controller.signal);
    const command: unknown = post.mock.calls[0]?.[0];
    if (
      !command ||
      typeof command !== 'object' ||
      !('requestId' in command) ||
      typeof command.requestId !== 'string'
    ) {
      throw new Error('Missing arm command');
    }
    for (const [origin, requestId] of [
      ['https://example.com', command.requestId],
      [window.location.origin, 'another-request'],
    ]) {
      window.dispatchEvent(
        new MessageEvent('message', {
          source: null,
          origin,
          data: {
            channel: PAGE_BRIDGE_CHANNEL,
            kind: 'response',
            action: 'arm',
            requestId,
          },
        }),
      );
    }
    expect(click).not.toHaveBeenCalled();
    controller.abort();
    await expect(capture).rejects.toMatchObject({ name: 'AbortError' });
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
