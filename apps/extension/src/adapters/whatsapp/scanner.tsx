import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { TranscriptWidget } from '../../components/TranscriptWidget';
import { findVoiceMessages } from './voiceMessages';
import styles from '../../../entrypoints/whatsapp.content/style.css?inline';

type MountedWidget = {
  row: HTMLElement;
  bubble: HTMLElement;
  bubbleHost: HTMLElement;
  panelHost: HTMLElement;
  root: Root;
  disposeHover: () => void;
  restoreBubblePosition: (() => void) | null;
};

export function startVoiceMessageScanner(): () => void {
  const mounted = new Map<string, MountedWidget>();
  let frame = 0;

  const scan = () => {
    frame = 0;
    const found = new Set<string>();

    for (const message of findVoiceMessages()) {
      found.add(message.id);
      const current = mounted.get(message.id);
      if (
        current?.row === message.row &&
        current.bubble === message.bubble &&
        current.bubbleHost.isConnected &&
        current.panelHost.isConnected
      ) {
        continue;
      }
      teardown(current);

      const restoreBubblePosition = ensureRelativePosition(message.bubble);

      const bubbleHost = document.createElement('div');
      bubbleHost.dataset.watRoot = message.id;
      bubbleHost.dataset.watBubble = '1';
      if (message.outgoing) bubbleHost.dataset.watOutgoing = '1';
      Object.assign(bubbleHost.style, {
        position: 'absolute',
        inset: '0',
        width: 'auto',
        height: 'auto',
        pointerEvents: 'none',
        zIndex: '2',
        boxSizing: 'border-box',
      });
      message.bubble.appendChild(bubbleHost);
      const bubbleApp = attachShadowApp(bubbleHost);

      const panelHost = document.createElement('div');
      panelHost.dataset.watPanel = message.id;
      if (message.outgoing) panelHost.dataset.watOutgoing = '1';
      panelHost.hidden = true;
      Object.assign(panelHost.style, {
        width: '100%',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      });
      message.bubble.insertAdjacentElement('afterend', panelHost);
      const panelApp = attachShadowApp(panelHost);

      const disposeHover = bindRowHover(message.row, bubbleHost, panelHost);

      const root = createRoot(bubbleApp);
      root.render(
        <TranscriptWidget
          message={message}
          panelHost={panelHost}
          panelTarget={panelApp}
        />,
      );

      mounted.set(message.id, {
        row: message.row,
        bubble: message.bubble,
        bubbleHost,
        panelHost,
        root,
        disposeHover,
        restoreBubblePosition,
      });
    }

    for (const [id, widget] of mounted) {
      if (found.has(id) && widget.row.isConnected) continue;
      teardown(widget);
      mounted.delete(id);
    }
  };

  const scheduleScan = () => {
    if (!frame) frame = requestAnimationFrame(scan);
  };
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  scheduleScan();

  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    for (const widget of mounted.values()) teardown(widget);
    mounted.clear();
  };
}

function teardown(widget: MountedWidget | undefined) {
  if (!widget) return;
  widget.disposeHover();
  widget.root.unmount();
  widget.bubbleHost.remove();
  widget.panelHost.remove();
  widget.restoreBubblePosition?.();
}

function attachShadowApp(host: HTMLElement): HTMLElement {
  const shadow = host.attachShadow({ mode: 'open' });
  const stylesheet = document.createElement('style');
  stylesheet.textContent = styles;
  const app = document.createElement('div');
  shadow.append(stylesheet, app);
  return app;
}

function ensureRelativePosition(bubble: HTMLElement): (() => void) | null {
  if (getComputedStyle(bubble).position !== 'static') return null;
  const previous = bubble.style.position;
  bubble.style.position = 'relative';
  return () => {
    bubble.style.position = previous;
  };
}

function bindRowHover(
  row: HTMLElement,
  bubbleHost: HTMLElement,
  panelHost: HTMLElement,
): () => void {
  const sync = () => {
    const hovering =
      row.matches(':hover') ||
      bubbleHost.matches(':hover') ||
      panelHost.matches(':hover');
    if (hovering) {
      bubbleHost.dataset.watHover = '1';
      panelHost.dataset.watHover = '1';
    } else {
      delete bubbleHost.dataset.watHover;
      delete panelHost.dataset.watHover;
    }
  };

  row.addEventListener('mouseenter', sync);
  row.addEventListener('mouseleave', sync);
  bubbleHost.addEventListener('mouseenter', sync);
  bubbleHost.addEventListener('mouseleave', sync);
  panelHost.addEventListener('mouseenter', sync);
  panelHost.addEventListener('mouseleave', sync);

  return () => {
    row.removeEventListener('mouseenter', sync);
    row.removeEventListener('mouseleave', sync);
    bubbleHost.removeEventListener('mouseenter', sync);
    bubbleHost.removeEventListener('mouseleave', sync);
    panelHost.removeEventListener('mouseenter', sync);
    panelHost.removeEventListener('mouseleave', sync);
    delete bubbleHost.dataset.watHover;
    delete panelHost.dataset.watHover;
  };
}
