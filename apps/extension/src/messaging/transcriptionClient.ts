import {
  MAX_AUDIO_BYTES,
  PROTOCOL_VERSION,
  TranscriptionEventSchema,
  type TranscriptionEvent,
} from '@wat/protocol';
import { browser } from 'wxt/browser';
import { AUDIO_CHUNK_BYTES, TRANSCRIPTION_PORT_NAME } from './constants';

export type TranscriptionCallbacks = {
  onMessage: (message: TranscriptionEvent) => void;
};

export class TranscriptionClient {
  private port: ReturnType<typeof browser.runtime.connect> | null = null;
  private callbacks = new Map<string, TranscriptionCallbacks>();

  async transcribe(
    audio: Blob,
    callbacks: TranscriptionCallbacks,
  ): Promise<string> {
    if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
      throw new Error(
        audio.size > MAX_AUDIO_BYTES
          ? 'O áudio excede o limite de 25 MB.'
          : 'O áudio capturado está vazio.',
      );
    }

    const jobId = crypto.randomUUID();
    const port = this.ensurePort();
    this.callbacks.set(jobId, callbacks);
    port.postMessage({
      v: PROTOCOL_VERSION,
      type: 'audio.begin',
      jobId,
      mimeType: audio.type || 'audio/ogg',
      totalBytes: audio.size,
      language: null,
    });

    const bytes = new Uint8Array(await audio.arrayBuffer());
    let index = 0;
    for (let offset = 0; offset < bytes.length; offset += AUDIO_CHUNK_BYTES) {
      const chunk = bytes.subarray(offset, offset + AUDIO_CHUNK_BYTES);
      port.postMessage({
        v: PROTOCOL_VERSION,
        type: 'audio.chunk',
        jobId,
        index,
        data: bytesToBase64(chunk),
      });
      index += 1;
    }

    port.postMessage({
      v: PROTOCOL_VERSION,
      type: 'audio.end',
      jobId,
    });
    return jobId;
  }

  cancel(jobId: string) {
    this.port?.postMessage({
      v: PROTOCOL_VERSION,
      type: 'transcription.cancel',
      jobId,
    });
  }

  release(jobId: string) {
    this.callbacks.delete(jobId);
  }

  private ensurePort() {
    if (this.port) return this.port;
    const port = browser.runtime.connect({ name: TRANSCRIPTION_PORT_NAME });
    this.port = port;
    port.onMessage.addListener((value: unknown) => {
      const parsed = TranscriptionEventSchema.safeParse(value);
      if (!parsed.success) return;
      this.callbacks.get(parsed.data.jobId)?.onMessage(parsed.data);
    });
    port.onDisconnect.addListener(() => {
      this.port = null;
      for (const [jobId, callback] of this.callbacks) {
        callback.onMessage({
          v: PROTOCOL_VERSION,
          type: 'job.error',
          jobId,
          code: 'WORKER_DISCONNECTED',
          message: 'A conexão interna da extensão foi encerrada.',
          retryable: true,
        });
      }
      this.callbacks.clear();
    });
    return port;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const stride = 32_768;
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + stride));
  }
  return btoa(binary);
}

export const transcriptionClient = new TranscriptionClient();
