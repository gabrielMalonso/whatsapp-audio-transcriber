import { MAX_AUDIO_BYTES } from '@wat/protocol';
import { PAGE_BRIDGE_CHANNEL } from './constants';

type BridgeMessage = {
  channel: typeof PAGE_BRIDGE_CHANNEL;
  kind: 'response' | 'capture' | 'error';
  requestId: string;
  action?: 'arm' | 'disarm';
  blob?: Blob;
  message?: string;
};

export async function captureVoiceAudio(
  transportButton: HTMLButtonElement,
  signal?: AbortSignal,
): Promise<Blob> {
  if (signal?.aborted) throw abortError();
  const requestId = crypto.randomUUID();

  return new Promise<Blob>((resolve, reject) => {
    let captureTimeout = 0;
    let settled = false;
    let armed = false;

    const cleanup = () => {
      window.clearTimeout(captureTimeout);
      window.removeEventListener('message', onMessage);
      signal?.removeEventListener('abort', onAbort);
      postBridgeCommand('disarm', requestId);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onAbort = () => fail(abortError());

    const onMessage = (event: MessageEvent<BridgeMessage>) => {
      if (
        event.source !== window ||
        event.data?.channel !== PAGE_BRIDGE_CHANNEL ||
        event.data.requestId !== requestId
      ) {
        return;
      }

      if (event.data.kind === 'capture' && event.data.blob instanceof Blob) {
        if (settled) return;
        settled = true;
        cleanup();
        void validateCapturedAudio(event.data.blob).then(resolve, reject);
      }

      if (
        event.data.kind === 'response' &&
        event.data.action === 'arm' &&
        !armed
      ) {
        armed = true;
        if (!signal?.aborted) transportButton.click();
      }

      if (event.data.kind === 'error') {
        fail(
          new Error(event.data.message ?? 'Não foi possível capturar o áudio.'),
        );
      }
    };

    window.addEventListener('message', onMessage);
    signal?.addEventListener('abort', onAbort, { once: true });
    captureTimeout = window.setTimeout(() => {
      fail(new Error('O WhatsApp não disponibilizou o áudio a tempo.'));
    }, 12_000);

    postBridgeCommand('arm', requestId, { timeoutMs: 10_000 });
  });
}

export async function validateCapturedAudio(blob: Blob): Promise<Blob> {
  if (!blob.size) throw new Error('O áudio capturado está vazio.');
  if (blob.size > MAX_AUDIO_BYTES) {
    throw new Error('O áudio excede o limite de 25 MB.');
  }

  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const mimeType = detectedAudioType(header);
  if (!mimeType) {
    throw new Error('O WhatsApp retornou um arquivo de áudio inválido.');
  }
  if (blob.type === mimeType) return blob;
  return new Blob([blob], { type: mimeType });
}

function detectedAudioType(header: Uint8Array): string | null {
  if (matches(header, [0x4f, 0x67, 0x67, 0x53])) return 'audio/ogg';
  if (matches(header, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm';
  if (
    matches(header, [0x52, 0x49, 0x46, 0x46]) &&
    matches(header.subarray(8), [0x57, 0x41, 0x56, 0x45])
  ) {
    return 'audio/wav';
  }
  if (
    matches(header, [0x49, 0x44, 0x33]) ||
    (header[0] === 0xff && (header[1] ?? 0) >= 0xe0)
  ) {
    return 'audio/mpeg';
  }
  return null;
}

function matches(value: Uint8Array, expected: number[]): boolean {
  return expected.every((byte, index) => value[index] === byte);
}

function abortError(): DOMException {
  return new DOMException('A captura foi cancelada.', 'AbortError');
}

function postBridgeCommand(
  action: 'arm' | 'disarm',
  requestId: string,
  payload: Record<string, unknown> = {},
) {
  window.postMessage(
    {
      channel: PAGE_BRIDGE_CHANNEL,
      kind: 'command',
      action,
      requestId,
      ...payload,
    },
    window.location.origin,
  );
}
