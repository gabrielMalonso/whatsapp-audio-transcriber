import type { TranscriptionResult } from '@wat/protocol';
import { browser } from 'wxt/browser';

export type TranscriptRecord = TranscriptionResult & {
  schemaVersion: 2;
  messageKeyHash: string;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
};

const PREFIX = 'wat.transcript.';
const NOTICE_KEY = 'wat.capture-notice-seen';
const MAX_RECORDS = 500;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;

export async function hashMessageKey(messageId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(messageId),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getTranscript(
  messageKeyHash: string,
): Promise<TranscriptRecord | null> {
  const key = `${PREFIX}${messageKeyHash}`;
  const stored = await browser.storage.local.get(key);
  const record = stored[key] as TranscriptRecord | undefined;
  if (!record || record.schemaVersion !== 2) return null;
  record.lastAccessedAt = Date.now();
  await browser.storage.local.set({ [key]: record });
  return record;
}

export async function putTranscript(
  messageKeyHash: string,
  result: TranscriptionResult,
): Promise<TranscriptRecord> {
  const key = `${PREFIX}${messageKeyHash}`;
  const previous = await getTranscript(messageKeyHash);
  const now = Date.now();
  const record: TranscriptRecord = {
    ...result,
    schemaVersion: 2,
    messageKeyHash,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    lastAccessedAt: now,
  };
  await browser.storage.local.set({ [key]: record });
  await pruneCache();
  return record;
}

export async function cacheStats() {
  const records = await allRecords();
  return {
    count: records.length,
    bytes: encodedSize(records),
  };
}

export async function clearTranscriptCache() {
  const stored = await browser.storage.local.get(null);
  const keys = Object.keys(stored).filter((key) => key.startsWith(PREFIX));
  if (keys.length) await browser.storage.local.remove(keys);
}

export async function hasSeenCaptureNotice(): Promise<boolean> {
  const stored = await browser.storage.local.get(NOTICE_KEY);
  return stored[NOTICE_KEY] === true;
}

export async function markCaptureNoticeSeen() {
  await browser.storage.local.set({ [NOTICE_KEY]: true });
}

async function pruneCache() {
  const records = (await allRecords()).sort(
    (a, b) => b.lastAccessedAt - a.lastAccessedAt,
  );
  let bytes = 0;
  const remove: string[] = [];
  for (const [index, record] of records.entries()) {
    const recordBytes = encodedSize(record);
    if (index >= MAX_RECORDS || bytes + recordBytes > MAX_CACHE_BYTES) {
      remove.push(`${PREFIX}${record.messageKeyHash}`);
      continue;
    }
    bytes += recordBytes;
  }
  if (remove.length) await browser.storage.local.remove(remove);
}

async function allRecords(): Promise<TranscriptRecord[]> {
  const stored = await browser.storage.local.get(null);
  return Object.entries(stored)
    .filter(([key]) => key.startsWith(PREFIX))
    .map(([, value]) => value as TranscriptRecord)
    .filter((record) => record.schemaVersion === 2);
}

function encodedSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
