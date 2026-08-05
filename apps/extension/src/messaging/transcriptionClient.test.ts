import { beforeEach, describe, expect, it, vi } from 'vitest';

const portHarness = vi.hoisted(() => {
  const messageListeners: Array<(value: unknown) => void> = [];
  const disconnectListeners: Array<() => void> = [];
  const postMessage = vi.fn();
  const port = {
    postMessage,
    onMessage: {
      addListener: (listener: (value: unknown) => void) =>
        messageListeners.push(listener),
    },
    onDisconnect: {
      addListener: (listener: () => void) => disconnectListeners.push(listener),
    },
  };
  return { disconnectListeners, messageListeners, port, postMessage };
});

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      connect: vi.fn(() => portHarness.port),
    },
  },
}));

import { TranscriptionClient } from './transcriptionClient';

describe('transcription client', () => {
  beforeEach(() => {
    portHarness.messageListeners.length = 0;
    portHarness.disconnectListeners.length = 0;
    portHarness.postMessage.mockClear();
  });

  it('returns the job ID before reading the audio and stops a cancelled upload', async () => {
    const client = new TranscriptionClient();
    const deferred = Promise.withResolvers<ArrayBuffer>();
    const audio = new Blob([new Uint8Array([0x4f, 0x67, 0x67, 0x53])], {
      type: 'audio/ogg',
    });
    vi.spyOn(audio, 'arrayBuffer').mockReturnValue(deferred.promise);

    const jobId = client.transcribe(audio, { onMessage: vi.fn() });
    client.cancel(jobId);
    deferred.resolve(new Uint8Array([0x4f, 0x67, 0x67, 0x53]).buffer);
    await deferred.promise;
    await Promise.resolve();

    expect(jobId).toEqual(expect.any(String));
    expect(portHarness.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'audio.begin', jobId }),
    );
    expect(portHarness.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transcription.cancel', jobId }),
    );
    expect(portHarness.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'audio.chunk', jobId }),
    );
    expect(portHarness.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'audio.end', jobId }),
    );
  });

  it('stops assembling when the worker rejects a job early', async () => {
    const client = new TranscriptionClient();
    const deferred = Promise.withResolvers<ArrayBuffer>();
    const onMessage = vi.fn();
    const audio = new Blob([new Uint8Array([0x4f, 0x67, 0x67, 0x53])], {
      type: 'audio/ogg',
    });
    vi.spyOn(audio, 'arrayBuffer').mockReturnValue(deferred.promise);
    const jobId = client.transcribe(audio, { onMessage });

    portHarness.messageListeners[0]?.({
      v: 1,
      type: 'job.error',
      jobId,
      code: 'GROQ_RATE_LIMITED',
      message: 'Fila cheia.',
      retryable: true,
    });
    deferred.resolve(new Uint8Array([0x4f, 0x67, 0x67, 0x53]).buffer);
    await deferred.promise;
    await Promise.resolve();

    expect(onMessage).toHaveBeenCalledOnce();
    expect(portHarness.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'audio.end', jobId }),
    );
  });
});
