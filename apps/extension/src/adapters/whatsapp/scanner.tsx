import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { TranscriptWidget } from '../../components/TranscriptWidget';
import {
  findVoiceMessages,
  type VoiceMessageDescriptor,
} from './voiceMessages';
import styles from '../../../entrypoints/whatsapp.content/style.css?inline';

const TRIGGER_SIZE = 18;
const PANEL_EDGE_GAP = 12;
const PANEL_MAX_WIDTH = 920;
// WhatsApp paints the audio content at z-index 200.
const TRIGGER_Z_INDEX = 201;

type MountedWidget = {
  row: HTMLElement;
  bubble: HTMLElement;
  bubbleHost: HTMLElement;
  panelHost: HTMLElement;
  root: Root;
  disposeHover: () => void;
  disposeGeometry: () => void;
  syncGeometry: () => void;
  durationElement: HTMLElement | null;
  slider: HTMLElement;
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
        current.slider === message.slider &&
        current.durationElement === message.durationElement &&
        current.bubbleHost.isConnected &&
        current.panelHost.isConnected
      ) {
        current.syncGeometry();
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
        width: `${TRIGGER_SIZE}px`,
        height: `${TRIGGER_SIZE}px`,
        pointerEvents: 'none',
        zIndex: String(TRIGGER_Z_INDEX),
        boxSizing: 'border-box',
      });
      message.bubble.appendChild(bubbleHost);
      const bubbleApp = attachShadowApp(bubbleHost);

      const panelHost = document.createElement('div');
      panelHost.dataset.watPanel = message.id;
      if (message.outgoing) panelHost.dataset.watOutgoing = '1';
      panelHost.hidden = true;
      Object.assign(panelHost.style, {
        boxSizing: 'border-box',
        pointerEvents: 'none',
        marginLeft: message.outgoing ? 'auto' : '0',
        marginRight: message.outgoing ? '0' : 'auto',
      });
      message.bubble.insertAdjacentElement('afterend', panelHost);
      const panelApp = attachShadowApp(panelHost);

      const disposeHover = bindRowHover(message.row, bubbleHost);
      const geometry = bindWidgetGeometry(message, bubbleHost, panelHost);

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
        disposeGeometry: geometry.dispose,
        syncGeometry: geometry.sync,
        durationElement: message.durationElement,
        slider: message.slider,
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
  widget.disposeGeometry();
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

function bindRowHover(row: HTMLElement, bubbleHost: HTMLElement): () => void {
  let frame = 0;
  const show = () => {
    if (frame) cancelAnimationFrame(frame);
    bubbleHost.dataset.watHover = '1';
  };
  const hide = () => {
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (row.matches(':hover') || bubbleHost.matches(':hover')) return;
      delete bubbleHost.dataset.watHover;
    });
  };

  row.addEventListener('mouseenter', show);
  row.addEventListener('mouseleave', hide);
  bubbleHost.addEventListener('mouseenter', show);
  bubbleHost.addEventListener('mouseleave', hide);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    row.removeEventListener('mouseenter', show);
    row.removeEventListener('mouseleave', hide);
    bubbleHost.removeEventListener('mouseenter', show);
    bubbleHost.removeEventListener('mouseleave', hide);
    delete bubbleHost.dataset.watHover;
  };
}

function bindWidgetGeometry(
  message: VoiceMessageDescriptor,
  bubbleHost: HTMLElement,
  panelHost: HTMLElement,
): { sync: () => void; dispose: () => void } {
  const sync = () => {
    const bubbleRect = message.bubble.getBoundingClientRect();
    const rowRect = message.row.getBoundingClientRect();
    const sliderRect = message.slider.getBoundingClientRect();
    const durationRect = message.durationElement?.getBoundingClientRect();
    const metaRect = message.bubble
      .querySelector<HTMLElement>('[data-testid="msg-meta"]')
      ?.getBoundingClientRect();
    const anchor = durationRect ?? {
      right: sliderRect.left + 24,
      top: sliderRect.bottom + 1,
    };
    const geometry = calculateWidgetGeometry(
      bubbleRect,
      rowRect,
      anchor,
      message.outgoing,
      metaRect,
    );

    bubbleHost.style.left = `${geometry.triggerLeft}px`;
    bubbleHost.style.top = `${geometry.triggerTop}px`;
    panelHost.style.width = `${geometry.panelWidth}px`;
    panelHost.style.setProperty(
      '--wat-bubble-width',
      `${geometry.bubbleWidth}px`,
    );
  };

  const observer = new ResizeObserver(sync);
  observer.observe(message.bubble);
  observer.observe(message.slider);
  if (message.durationElement) observer.observe(message.durationElement);
  window.addEventListener('resize', sync);
  sync();

  return {
    sync,
    dispose: () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    },
  };
}

export function calculateWidgetGeometry(
  bubble: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  row: Pick<DOMRect, 'left' | 'width'>,
  anchor: Pick<DOMRect, 'right' | 'top'>,
  outgoing: boolean,
  meta?: Pick<DOMRect, 'left'>,
) {
  const edge = 4;
  const gap = 5;
  const maxFromBubble = bubble.width - TRIGGER_SIZE - edge;
  const maxFromMeta = meta
    ? meta.left - bubble.left - TRIGGER_SIZE - gap
    : maxFromBubble;
  const maxLeft = Math.max(edge, Math.min(maxFromBubble, maxFromMeta));
  const rowRight = row.left + row.width;
  const availablePanelWidth = outgoing
    ? bubble.left + bubble.width - row.left - PANEL_EDGE_GAP
    : rowRight - bubble.left - PANEL_EDGE_GAP;

  return {
    triggerLeft: Math.max(
      edge,
      Math.min(anchor.right - bubble.left + gap, maxLeft),
    ),
    triggerTop: Math.max(
      2,
      Math.min(anchor.top - bubble.top - 2, bubble.height - TRIGGER_SIZE - 2),
    ),
    panelWidth: Math.max(
      bubble.width,
      Math.min(PANEL_MAX_WIDTH, availablePanelWidth),
    ),
    bubbleWidth: bubble.width,
  };
}
