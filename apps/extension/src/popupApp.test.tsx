import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getManifest: vi.fn(() => ({ version: '0.2.1' })),
      sendMessage: vi.fn(() => Promise.reject(new Error('worker unavailable'))),
    },
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({})),
        remove: vi.fn(() => Promise.resolve()),
        set: vi.fn(() => Promise.resolve()),
      },
    },
  },
}));

import { App } from '../entrypoints/popup/App';

describe('popup', () => {
  it('links to the Chrome Web Store and the open source repository', () => {
    const { unmount } = render(<App />);

    expect(
      screen
        .getByRole('link', { name: 'Chrome Web Store' })
        .getAttribute('href'),
    ).toBe(
      'https://chromewebstore.google.com/detail/transcri%C3%A7%C3%A3o-de-%C3%A1udios-do/dnfdcckllipjhijlddogocihdabnbblp',
    );
    expect(
      screen.getByRole('link', { name: 'GitHub' }).getAttribute('href'),
    ).toBe('https://github.com/gabrielMalonso/whatsapp-audio-transcriber');

    unmount();
  });

  it('shows a recoverable status when the service worker is unavailable', async () => {
    render(<App />);

    expect(await screen.findByText('Indisponível')).toBeTruthy();
    expect(
      screen.getByText(
        'Não foi possível consultar o service worker da extensão.',
      ),
    ).toBeTruthy();
  });
});
