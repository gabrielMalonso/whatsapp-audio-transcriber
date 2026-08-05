import type { TranscriptionResult } from '@wat/protocol';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageHarness = vi.hoisted(() => {
  const values: Record<string, unknown> = {};
  const calls: string[] = [];
  return { calls, values };
});

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn((key: string | null) => {
          if (key === null)
            return Promise.resolve({ ...storageHarness.values });
          return Promise.resolve(
            key in storageHarness.values
              ? { [key]: storageHarness.values[key] }
              : {},
          );
        }),
        set: vi.fn((items: Record<string, unknown>) => {
          storageHarness.calls.push('set');
          const next = { ...storageHarness.values, ...items };
          const bytes = new TextEncoder().encode(
            JSON.stringify(next),
          ).byteLength;
          if (bytes > 10 * 1024 * 1024) {
            return Promise.reject(new Error('QUOTA_BYTES exceeded'));
          }
          Object.assign(storageHarness.values, items);
          return Promise.resolve();
        }),
        remove: vi.fn((keys: string | string[]) => {
          storageHarness.calls.push('remove');
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            delete storageHarness.values[key];
          }
          return Promise.resolve();
        }),
      },
    },
  },
}));

import {
  cacheStats,
  putTranscript,
  type TranscriptRecord,
} from './transcripts';

describe('transcript cache', () => {
  beforeEach(() => {
    storageHarness.calls.length = 0;
    for (const key of Object.keys(storageHarness.values)) {
      delete storageHarness.values[key];
    }
  });

  it('prunes old records before writing a result that would exceed quota', async () => {
    const oldText = 'á'.repeat(495_000);
    for (let index = 0; index < 5; index += 1) {
      const hash = String(index).padStart(64, '0');
      storageHarness.values[`wat.transcript.${hash}`] = record(
        hash,
        oldText,
        index,
      );
    }
    const newText = 'á'.repeat(250_000);
    const result = transcriptionResult(newText);

    const saved = await putTranscript('f'.repeat(64), result);
    const stats = await cacheStats();

    expect(storageHarness.calls[0]).toBe('remove');
    expect(saved.text).toBe(newText);
    expect(stats.bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(
      storageHarness.values[`wat.transcript.${'f'.repeat(64)}`],
    ).toBeDefined();
  });
});

function transcriptionResult(text: string): TranscriptionResult {
  return {
    text,
    rawText: text,
    language: 'pt',
    durationMs: 1_000,
    audioSha256: 'a'.repeat(64),
    transcriptionProvider: 'groq',
    transcriptionModel: 'whisper-large-v3-turbo',
    formattingProvider: 'groq',
    formattingModel: 'openai/gpt-oss-20b',
    formattingSettingsKey: 'v3:natural:1111',
  };
}

function record(
  messageKeyHash: string,
  text: string,
  lastAccessedAt: number,
): TranscriptRecord {
  return {
    ...transcriptionResult(text),
    schemaVersion: 2,
    messageKeyHash,
    createdAt: lastAccessedAt,
    updatedAt: lastAccessedAt,
    lastAccessedAt,
  };
}
