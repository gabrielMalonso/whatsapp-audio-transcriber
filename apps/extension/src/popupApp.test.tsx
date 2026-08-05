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
