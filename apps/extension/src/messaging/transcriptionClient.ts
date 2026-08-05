import {
  AudioMimeTypeSchema,
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
  private uploads = new Map<string, AbortController>();

  transcribe(audio: Blob, callbacks: TranscriptionCallbacks): string {
    if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
      throw new Error(
        audio.size > MAX_AUDIO_BYTES
          ? 'O áudio excede o limite de 25 MB.'
          : 'O áudio capturado está vazio.',
      );
    }
    const mimeType = AudioMimeTypeSchema.safeParse(audio.type || 'audio/ogg');
    if (!mimeType.success) {
      throw new Error('O formato do áudio capturado não é compatível.');
    }

    const jobId = crypto.randomUUID();
    const port = this.ensurePort();
    const controller = new AbortController();
    this.callbacks.set(jobId, callbacks);
    this.uploads.set(jobId, controller);
    try {
      port.postMessage({
        v: PROTOCOL_VERSION,
        type: 'audio.begin',
        jobId,
        mimeType: mimeType.data,
        totalBytes: audio.size,
        language: null,
      });
    } catch (error) {
      this.release(jobId);
      throw error;
    }

    void this.upload(jobId, audio, port, controller.signal).catch((error) => {
      if (controller.signal.aborted) return;
      this.cancelRemote(jobId);
      this.deliver({
        v: PROTOCOL_VERSION,
        type: 'job.error',
        jobId,
        code: 'AUDIO_UNSUPPORTED',
        message:
          error instanceof Error
            ? `Não foi possível preparar o áudio: ${error.message}`
            : 'Não foi possível preparar o áudio.',
        retryable: true,
      });
    });
    return jobId;
  }

  cancel(jobId: string) {
    this.uploads.get(jobId)?.abort();
    this.cancelRemote(jobId);
  }

  release(jobId: string) {
    this.uploads.get(jobId)?.abort();
    this.uploads.delete(jobId);
    this.callbacks.delete(jobId);
  }

  private async upload(
    jobId: string,
    audio: Blob,
    port: ReturnType<typeof browser.runtime.connect>,
    signal: AbortSignal,
  ) {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    if (signal.aborted) return;

    let index = 0;
    for (let offset = 0; offset < bytes.length; offset += AUDIO_CHUNK_BYTES) {
      if (signal.aborted) return;
      const chunk = bytes.subarray(offset, offset + AUDIO_CHUNK_BYTES);
      port.postMessage({
        v: PROTOCOL_VERSION,
        type: 'audio.chunk',
        jobId,
        index,
        data: bytesToBase64(chunk),
      });
      index += 1;
      if (index % 4 === 0) await yieldToBrowser();
    }

    if (signal.aborted) return;
    port.postMessage({
      v: PROTOCOL_VERSION,
      type: 'audio.end',
      jobId,
    });
  }

  private cancelRemote(jobId: string) {
    try {
      this.port?.postMessage({
        v: PROTOCOL_VERSION,
        type: 'transcription.cancel',
        jobId,
      });
    } catch {
      return;
    }
  }

  private deliver(message: TranscriptionEvent) {
    this.callbacks.get(message.jobId)?.onMessage(message);
    if (
      message.type === 'job.complete' ||
      message.type === 'job.error' ||
      message.type === 'job.cancelled'
    ) {
      this.release(message.jobId);
    }
  }

  private ensurePort() {
    if (this.port) return this.port;
    const port = browser.runtime.connect({ name: TRANSCRIPTION_PORT_NAME });
    this.port = port;
    port.onMessage.addListener((value: unknown) => {
      const parsed = TranscriptionEventSchema.safeParse(value);
      if (!parsed.success) return;
      this.deliver(parsed.data);
    });
    port.onDisconnect.addListener(() => {
      this.port = null;
      for (const controller of this.uploads.values()) controller.abort();
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
      this.uploads.clear();
      this.callbacks.clear();
    });
    return port;
  }
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
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
