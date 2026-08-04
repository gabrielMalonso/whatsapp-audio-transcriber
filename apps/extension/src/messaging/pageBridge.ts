import { PAGE_BRIDGE_CHANNEL } from './constants';

type BridgeMessage = {
  channel: typeof PAGE_BRIDGE_CHANNEL;
  kind: 'response' | 'capture' | 'error';
  requestId: string;
  blob?: Blob;
  message?: string;
};

export async function captureVoiceAudio(
  transportButton: HTMLButtonElement,
): Promise<Blob> {
  const requestId = crypto.randomUUID();

  return new Promise<Blob>((resolve, reject) => {
    let captureTimeout = 0;

    const cleanup = () => {
      window.clearTimeout(captureTimeout);
      window.removeEventListener('message', onMessage);
      postBridgeCommand('disarm', requestId);
    };

    const onMessage = (event: MessageEvent<BridgeMessage>) => {
      if (
        event.source !== window ||
        event.data?.channel !== PAGE_BRIDGE_CHANNEL ||
        event.data.requestId !== requestId
      ) {
        return;
      }

      if (event.data.kind === 'capture' && event.data.blob) {
        cleanup();
        resolve(event.data.blob);
      }

      if (event.data.kind === 'error') {
        cleanup();
        reject(
          new Error(event.data.message ?? 'Não foi possível capturar o áudio.'),
        );
      }
    };

    window.addEventListener('message', onMessage);
    captureTimeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('O WhatsApp não disponibilizou o áudio a tempo.'));
    }, 12_000);

    postBridgeCommand('arm', requestId, { timeoutMs: 10_000 });
    window.setTimeout(() => transportButton.click(), 50);
  });
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
    '*',
  );
}
