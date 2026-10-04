import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PAGE_BRIDGE_CHANNEL } from './messaging/constants';

type Definition = { main: () => void };
let definition: Definition;
// Keep the unbound method to restore the prototype after each test.
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalPlay = HTMLMediaElement.prototype.play;
const originalAddListener = window.addEventListener.bind(window);
let listeners: EventListener[] = [];

beforeAll(async () => {
  vi.stubGlobal('defineContentScript', (value: Definition) => {
    definition = value;
    return value;
  });
  await import('../entrypoints/whatsapp-main.content');
});

beforeEach(() => {
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
    if (type === 'message' && typeof listener === 'function') {
      listeners.push(listener);
    }
    originalAddListener(type, listener);
  });
});

afterEach(() => {
  for (const listener of listeners)
    window.removeEventListener('message', listener);
  listeners = [];
  Reflect.deleteProperty(window, '__watPageBridgeInstalled');
  HTMLMediaElement.prototype.play = originalPlay;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('MAIN audio capture', () => {
  it('transfers audio bytes without calling the real play method', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue();
    const bytes = new Uint8Array([0x4f, 0x67, 0x67, 0x53]).buffer;
    // Node 22's Response cannot consume a JSDOM Blob without stream().
    const fetcher = vi.fn().mockResolvedValue(new Response(bytes));
    vi.stubGlobal('fetch', fetcher);
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    definition.main();
    arm();
    const media = document.createElement('audio');
    media.src = `blob:${window.location.origin}/voice`;
    await media.play();

    await vi.waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'capture',
          requestId: 'capture-1',
          audio: bytes,
        }),
        window.location.origin,
        [bytes],
      );
    });
    expect(fetcher).toHaveBeenCalledWith(media.src);
    expect(play).not.toHaveBeenCalled();
    // Capture is one-shot: normal playback still uses the original method.
    await media.play();
    expect(play).toHaveBeenCalledOnce();
  });

  it('rejects a non-local source without playing it or fetching it', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    definition.main();
    arm();
    const media = document.createElement('audio');
    media.src = 'https://example.com/voice.ogg';
    await media.play();
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', requestId: 'capture-1' }),
      window.location.origin,
      [],
    );
    expect(play).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not intercept playback after disarming', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue();
    vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    definition.main();
    arm();
    command('disarm');
    await document.createElement('audio').play();
    expect(play).toHaveBeenCalledOnce();
  });
});

function arm() {
  command('arm');
}

function command(action: 'arm' | 'disarm') {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: null,
      origin: window.location.origin,
      data: {
        channel: PAGE_BRIDGE_CHANNEL,
        kind: 'command',
        action,
        requestId: 'capture-1',
      },
    }),
  );
}
