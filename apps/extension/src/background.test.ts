import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

type Listener = (value: unknown, sender?: unknown) => unknown;

const runtimeHarness = vi.hoisted(() => {
  const connectListeners: Array<(port: unknown) => void> = [];
  const messageListeners: Listener[] = [];
  return { connectListeners, messageListeners };
});

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      id: 'test-extension',
      getURL: (path: string) => `chrome-extension://test-extension${path}`,
      onConnect: {
        addListener: (listener: (port: unknown) => void) =>
          runtimeHarness.connectListeners.push(listener),
      },
      onMessage: {
        addListener: (listener: Listener) =>
          runtimeHarness.messageListeners.push(listener),
      },
    },
  },
}));

describe('background job assembly', () => {
  beforeAll(async () => {
    vi.stubGlobal('defineBackground', (setup: () => void) => setup());
    await import('../entrypoints/background');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('expires an audio upload that never finishes', async () => {
    vi.useFakeTimers();
    const port = createPort();
    runtimeHarness.connectListeners[0]?.(port);

    port.emit({
      v: 1,
      type: 'audio.begin',
      jobId: 'stalled-job',
      mimeType: 'audio/ogg',
      totalBytes: 4,
      language: null,
    });
    await vi.advanceTimersByTimeAsync(30_000);

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'job.error',
        jobId: 'stalled-job',
        code: 'INVALID_MESSAGE',
      }),
    );
  });

  it('does not let another port mutate an existing job', () => {
    const owner = createPort();
    const intruder = createPort();
    runtimeHarness.connectListeners[0]?.(owner);
    runtimeHarness.connectListeners[0]?.(intruder);

    owner.emit({
      v: 1,
      type: 'audio.begin',
      jobId: 'owned-job',
      mimeType: 'audio/ogg',
      totalBytes: 4,
      language: null,
    });
    intruder.emit({
      v: 1,
      type: 'audio.chunk',
      jobId: 'owned-job',
      index: 0,
      data: 'T2dnUw==',
    });
    owner.emit({
      v: 1,
      type: 'transcription.cancel',
      jobId: 'owned-job',
    });

    expect(intruder.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'job.error',
        jobId: 'owned-job',
        code: 'INVALID_MESSAGE',
      }),
    );
    expect(owner.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job.cancelled', jobId: 'owned-job' }),
    );
  });

  it('ignores popup commands sent from a content-script context', async () => {
    const response = runtimeHarness.messageListeners[0]?.(
      { type: 'wat.groq.remove-key' },
      {
        id: 'test-extension',
        url: 'https://web.whatsapp.com/',
      },
    );

    await expect(response).resolves.toBeUndefined();
  });
});

function createPort() {
  const messageListeners: Listener[] = [];
  const disconnectListeners: Array<() => void> = [];
  return {
    name: 'wat.transcription.v1',
    postMessage: vi.fn(),
    onMessage: {
      addListener: (listener: Listener) => messageListeners.push(listener),
    },
    onDisconnect: {
      addListener: (listener: () => void) => disconnectListeners.push(listener),
    },
    emit: (value: unknown) => {
      for (const listener of messageListeners) listener(value);
    },
  };
}
