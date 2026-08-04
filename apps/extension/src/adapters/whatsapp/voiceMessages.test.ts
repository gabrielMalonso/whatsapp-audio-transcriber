import { beforeEach, describe, expect, it } from 'vitest';
import { findVoiceMessages } from './voiceMessages';

describe('WhatsApp voice message adapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', {
      value: 1_000,
      configurable: true,
    });
  });

  it('finds a voice message without depending on generated classes', () => {
    document.body.innerHTML = `
      <div role="row" style="width: 800px">
        <div data-id="message-123">
          <div data-testid="msg-container" style="width: 300px; margin-left: 450px">
            <button aria-label="Reproduzir mensagem de voz"></button>
            <span data-icon="ptt-status"></span>
            <div role="slider"></div>
            <button aria-label="Mudar velocidade de reprodução, no momento 2×"></button>
          </div>
        </div>
      </div>
    `;
    const row = document.querySelector<HTMLElement>('[role="row"]')!;
    const bubble = document.querySelector<HTMLElement>(
      '[data-testid="msg-container"]',
    )!;
    row.getBoundingClientRect = () =>
      ({ left: 0, width: 800, top: 0, height: 80, right: 800, bottom: 80 }) as DOMRect;
    bubble.getBoundingClientRect = () =>
      ({
        left: 450,
        width: 300,
        top: 0,
        height: 80,
        right: 750,
        bottom: 80,
      }) as DOMRect;

    const messages = findVoiceMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: 'message-123',
      outgoing: true,
    });
    expect(messages[0]?.bubble).toBe(bubble);
    expect(messages[0]?.transportButton.getAttribute('aria-label')).toContain(
      'Reproduzir',
    );
  });

  it('detects incoming messages from row-relative position', () => {
    document.body.innerHTML = `
      <div role="row">
        <div data-id="message-in">
          <div data-testid="msg-container">
            <button aria-label="Play voice message"></button>
            <span data-icon="ptt-status"></span>
            <div role="slider"></div>
          </div>
        </div>
      </div>
    `;
    const row = document.querySelector<HTMLElement>('[role="row"]')!;
    const bubble = document.querySelector<HTMLElement>(
      '[data-testid="msg-container"]',
    )!;
    row.getBoundingClientRect = () =>
      ({ left: 0, width: 800, top: 0, height: 80, right: 800, bottom: 80 }) as DOMRect;
    bubble.getBoundingClientRect = () =>
      ({
        left: 40,
        width: 300,
        top: 0,
        height: 80,
        right: 340,
        bottom: 80,
      }) as DOMRect;

    expect(findVoiceMessages()[0]?.outgoing).toBe(false);
  });

  it('ignores ordinary messages', () => {
    document.body.innerHTML = `
      <div role="row">
        <div data-id="text-123">
          <div data-testid="msg-container">Olá</div>
        </div>
      </div>
    `;
    expect(findVoiceMessages()).toEqual([]);
  });
});
