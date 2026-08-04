export type VoiceMessageDescriptor = {
  id: string;
  row: HTMLElement;
  bubble: HTMLElement;
  transportButton: HTMLButtonElement;
  outgoing: boolean;
};

export function findVoiceMessages(
  root: ParentNode = document,
): VoiceMessageDescriptor[] {
  const messages: VoiceMessageDescriptor[] = [];

  for (const row of root.querySelectorAll<HTMLElement>('[role="row"]')) {
    const messageRoot = row.querySelector<HTMLElement>('[data-id]');
    const bubble = row.querySelector<HTMLElement>(
      '[data-testid="msg-container"]',
    );
    const slider = row.querySelector<HTMLElement>('[role="slider"]');
    if (!messageRoot?.dataset.id || !bubble || !slider) continue;
    if (!row.querySelector('[data-icon="ptt-status"]')) continue;

    const transportButton = findTransportButton(bubble, slider);
    if (!transportButton) continue;

    messages.push({
      id: messageRoot.dataset.id,
      row,
      bubble,
      transportButton,
      outgoing: isOutgoingMessage(row, bubble),
    });
  }

  return messages;
}

function isOutgoingMessage(row: HTMLElement, bubble: HTMLElement): boolean {
  const rowRect = row.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();
  if (rowRect.width <= 0) return false;
  const rowCenter = rowRect.left + rowRect.width / 2;
  const bubbleCenter = bubbleRect.left + bubbleRect.width / 2;
  return bubbleCenter > rowCenter;
}

function findTransportButton(
  container: HTMLElement,
  slider: HTMLElement,
): HTMLButtonElement | null {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
  const candidates = buttons.filter((button) => {
    const label = (button.getAttribute('aria-label') ?? '').toLocaleLowerCase();
    if (
      /velocidade|speed|reproducción|velocidad|\d+[,.]?\d*\s*[×x]/u.test(label)
    ) {
      return false;
    }
    return Boolean(
      button.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  return candidates.at(-1) ?? null;
}
