import { browser } from 'wxt/browser';
import { z } from 'zod';
import {
  DEFAULT_FORMATTING_SETTINGS,
  type FormattingSettings,
} from '../formatting/settings';

export const FORMATTING_SETTINGS_STORAGE_KEY = 'wat.formatting-settings.v1';

const FormattingSettingsSchema = z.strictObject({
  tone: z.enum(['colloquial', 'natural', 'formal']),
  addParagraphs: z.boolean(),
  removeFinalPeriod: z.boolean(),
  formatDates: z.boolean(),
  formatTimes: z.boolean(),
  formatLists: z.boolean(),
});

export async function getFormattingSettings(): Promise<FormattingSettings> {
  const stored = await browser.storage.local.get(
    FORMATTING_SETTINGS_STORAGE_KEY,
  );
  const parsed = FormattingSettingsSchema.safeParse(
    stored[FORMATTING_SETTINGS_STORAGE_KEY],
  );
  return parsed.success ? parsed.data : { ...DEFAULT_FORMATTING_SETTINGS };
}

export async function saveFormattingSettings(
  settings: FormattingSettings,
): Promise<FormattingSettings> {
  const parsed = FormattingSettingsSchema.parse(settings);
  await browser.storage.local.set({
    [FORMATTING_SETTINGS_STORAGE_KEY]: parsed,
  });
  return parsed;
}
