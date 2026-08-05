import { PAGE_BRIDGE_CHANNEL } from '../src/messaging/constants';

type ActiveCapture = {
  requestId: string;
  expiresAt: number;
};

export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const stateKey = '__watPageBridgeInstalled';
    const pageWindow = window as typeof window & Record<string, unknown>;
    if (pageWindow[stateKey]) return;
    pageWindow[stateKey] = true;

    let activeCapture: ActiveCapture | null = null;
    // The method stays unbound so the intercepted media element can be its `this`.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalPlay = HTMLMediaElement.prototype.play;

    HTMLMediaElement.prototype.play = function (...args) {
      const capture = activeCapture;
      if (!capture || capture.expiresAt < Date.now()) {
        activeCapture = null;
        return originalPlay.apply(this, args);
      }

      activeCapture = null;
      const source = this.currentSrc || this.src;
      if (!source) {
        post('error', capture.requestId, {
          message: 'A mensagem ainda não disponibilizou uma fonte de áudio.',
        });
        return Promise.resolve();
      }

      void fetch(source)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          if (!blob.size) throw new Error('O áudio recebido está vazio.');
          post('capture', capture.requestId, { blob });
        })
        .catch((error: unknown) => {
          post('error', capture.requestId, {
            message:
              error instanceof Error
                ? error.message
                : 'Falha ao ler o áudio do WhatsApp.',
          });
        });

      return Promise.resolve();
    };

    window.addEventListener('message', (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (
        event.source !== window ||
        !data ||
        typeof data !== 'object' ||
        !('channel' in data) ||
        data.channel !== PAGE_BRIDGE_CHANNEL ||
        !('kind' in data) ||
        data.kind !== 'command' ||
        !('requestId' in data) ||
        typeof data.requestId !== 'string'
      ) {
        return;
      }

      if ('action' in data && data.action === 'arm') {
        const timeoutMs = Math.min(
          Math.max(
            Number('timeoutMs' in data ? data.timeoutMs : undefined) || 10_000,
            500,
          ),
          15_000,
        );
        activeCapture = {
          requestId: data.requestId,
          expiresAt: Date.now() + timeoutMs,
        };
        post('response', data.requestId);
      }

      if (
        'action' in data &&
        data.action === 'disarm' &&
        activeCapture?.requestId === data.requestId
      ) {
        activeCapture = null;
        post('response', data.requestId);
      }
    });

    function post(
      kind: 'response' | 'capture' | 'error',
      requestId: string,
      payload: Record<string, unknown> = {},
    ) {
      window.postMessage(
        {
          channel: PAGE_BRIDGE_CHANNEL,
          kind,
          requestId,
          ...payload,
        },
        '*',
      );
    }
  },
});
