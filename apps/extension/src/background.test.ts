import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GROQ_FORMATTING_MODEL, GROQ_TRANSCRIPTION_MODEL } from '@wat/protocol';
import { GroqProvider } from './providers/groq';
import * as groqSettings from './storage/groqSettings';
import * as formattingSettings from './storage/formattingSettings';
import { DEFAULT_FORMATTING_SETTINGS } from './formatting/settings';

type Listener = (
  value: unknown,
  sender?: unknown,
  sendResponse?: (response?: unknown) => void,
) => unknown;

const runtimeHarness = vi.hoisted(() => {
  const connectListeners: Array<(port: unknown) => void> = [];
  const messageListeners: Listener[] = [];
  const openPopup = vi.fn(() => Promise.resolve());
  const createTab = vi.fn(() => Promise.resolve());
  return {
    connectListeners,
    messageListeners,
    openPopup,
    createTab,
    origin: 'chrome-extension://test-extension',
  };
});

vi.mock('wxt/browser', () => ({
  browser: {
    action: {
      openPopup: runtimeHarness.openPopup,
    },
    runtime: {
      id: 'test-extension',
      getURL: (path: string) => `${runtimeHarness.origin}${path}`,
      onConnect: {
        addListener: (listener: (port: unknown) => void) =>
          runtimeHarness.connectListeners.push(listener),
      },
      onMessage: {
        addListener: (listener: Listener) =>
          runtimeHarness.messageListeners.push(listener),
      },
    },
    tabs: {
      create: runtimeHarness.createTab,
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
    vi.restoreAllMocks();
    vi.clearAllMocks();
    runtimeHarness.origin = 'chrome-extension://test-extension';
  });

  it('reassembles Base64 chunks into the exact audio sent to Groq', async () => {
    vi.spyOn(groqSettings, 'getGroqSettings').mockResolvedValue({
      apiKey: 'test-api-key-with-no-real-credentials',
      transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
      formattingModel: GROQ_FORMATTING_MODEL,
    });
    vi.spyOn(formattingSettings, 'getFormattingSettings').mockResolvedValue(
      DEFAULT_FORMATTING_SETTINGS,
    );
    const transcribe = vi
      .spyOn(GroqProvider.prototype, 'transcribe')
      .mockResolvedValue({
        text: 'Teste',
        rawText: 'Teste',
        language: 'pt',
        durationMs: 1000,
        audioSha256: '0'.repeat(64),
        transcriptionProvider: 'groq',
        transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
        formattingProvider: 'groq',
        formattingModel: GROQ_FORMATTING_MODEL,
        formattingSettingsKey: 'test',
      });
    const port = createPort();
    runtimeHarness.connectListeners[0]?.(port);
    port.emit({
      v: 1,
      type: 'audio.begin',
      jobId: 'complete-job',
      mimeType: 'audio/ogg',
      totalBytes: 8,
      language: null,
    });
    port.emit({
      v: 1,
      type: 'audio.chunk',
      jobId: 'complete-job',
      index: 0,
      data: 'T2dnUw==',
    });
    port.emit({
      v: 1,
      type: 'audio.chunk',
      jobId: 'complete-job',
      index: 1,
      data: 'AAECAw==',
    });
    port.emit({ v: 1, type: 'audio.end', jobId: 'complete-job' });
    await vi.waitFor(() =>
      expect(port.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'job.complete' }),
      ),
    );
    const audio = transcribe.mock.calls[0]?.[0];
    if (!audio) throw new Error('Missing captured audio');
    expect(audio.type).toBe('audio/ogg');
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(
      new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 1, 2, 3]),
    );
  });

  it.each([
    'chrome-extension://test-extension',
    'moz-extension://test-extension',
  ])('responds asynchronously to the popup at %s', async (origin) => {
    runtimeHarness.origin = origin;
    vi.spyOn(groqSettings, 'getGroqSettings').mockResolvedValue(null);
    const response = runtimeHarness.messageListeners[0]?.(
      { type: 'wat.groq.status' },
      { id: 'test-extension', url: `${origin}/popup.html` },
    );
    await expect(response).resolves.toMatchObject({
      configured: false,
      healthy: false,
    });
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
    const { keptChannelOpen, response } = dispatchRuntimeMessage(
      { type: 'wat.groq.remove-key' },
      {
        id: 'test-extension',
        url: 'https://web.whatsapp.com/',
      },
    );

    expect(keptChannelOpen).toBe(true);
    await expect(response).resolves.toBeUndefined();
  });

  it('opens the configuration popup only for the WhatsApp content script', async () => {
    const { response } = dispatchRuntimeMessage(
      { type: 'wat.open-popup' },
      {
        id: 'test-extension',
        url: 'https://web.whatsapp.com/',
      },
    );

    await expect(response).resolves.toEqual({ opened: true });
    expect(runtimeHarness.openPopup).toHaveBeenCalledOnce();

    const rejected = dispatchRuntimeMessage(
      { type: 'wat.open-popup' },
      {
        id: 'test-extension',
        url: 'https://example.com/',
      },
    );
    await expect(rejected.response).resolves.toBeUndefined();
  });

  it('falls back to a tab when Chrome cannot open the action popup', async () => {
    runtimeHarness.openPopup.mockRejectedValueOnce(new Error('unavailable'));

    const { response } = dispatchRuntimeMessage(
      { type: 'wat.open-popup' },
      {
        id: 'test-extension',
        url: 'https://web.whatsapp.com/',
      },
    );

    await expect(response).resolves.toEqual({ opened: true });
    expect(runtimeHarness.createTab).toHaveBeenCalledWith({
      url: 'chrome-extension://test-extension/popup.html',
    });
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

function dispatchRuntimeMessage(message: unknown, sender: unknown) {
  let deliver: (response: unknown) => void = () => {};
  const response = new Promise<unknown>((resolve) => {
    deliver = resolve;
  });
  const keptChannelOpen = runtimeHarness.messageListeners[0]?.(
    message,
    sender,
    (value?: unknown) => deliver(value),
  );
  return { keptChannelOpen, response };
}
