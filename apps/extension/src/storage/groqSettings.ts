import { GROQ_FORMATTING_MODEL, GROQ_TRANSCRIPTION_MODEL } from '@wat/protocol';
import { browser } from 'wxt/browser';
import { z } from 'zod';

const STORAGE_KEY = 'wat.groq-settings.v1';
const ApiKeySchema = z.string().trim().min(20).max(512);

export type GroqSettings = {
  apiKey: string;
  transcriptionModel: typeof GROQ_TRANSCRIPTION_MODEL;
  formattingModel: typeof GROQ_FORMATTING_MODEL;
};

export async function getGroqSettings(): Promise<GroqSettings | null> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  if (!value || typeof value !== 'object' || !('apiKey' in value)) return null;
  const parsed = ApiKeySchema.safeParse(value.apiKey);
  if (!parsed.success) return null;
  return {
    apiKey: parsed.data,
    transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
    formattingModel: GROQ_FORMATTING_MODEL,
  };
}

export async function saveGroqApiKey(apiKey: string): Promise<GroqSettings> {
  const parsed = ApiKeySchema.parse(apiKey);
  const settings: GroqSettings = {
    apiKey: parsed,
    transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
    formattingModel: GROQ_FORMATTING_MODEL,
  };
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
  return settings;
}

export async function removeGroqApiKey() {
  await browser.storage.local.remove(STORAGE_KEY);
}
