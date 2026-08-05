import { describe, expect, it } from 'vitest';
import {
  buildSystemPrompt,
  DEFAULT_FORMATTING_SETTINGS,
  formattingSettingsKey,
  postProcessFormattedText,
  wrapTranscription,
} from './settings';

describe('formatting settings', () => {
  it('builds the complete default prompt', () => {
    const prompt = buildSystemPrompt(DEFAULT_FORMATTING_SETTINGS);

    expect(prompt).toContain('<task id="formatting">');
    expect(prompt).toContain('<task id="paragraphs">');
    expect(prompt).toContain('<task id="dates">');
    expect(prompt).toContain('<task id="times">');
    expect(prompt).toContain('<task id="lists">');
    expect(prompt).toContain('7. Contrato de saída (sempre)');
  });

  it('removes disabled tasks and renumbers priorities', () => {
    const prompt = buildSystemPrompt({
      ...DEFAULT_FORMATTING_SETTINGS,
      tone: 'colloquial',
      addParagraphs: false,
      formatDates: false,
      formatTimes: false,
      formatLists: false,
    });

    expect(prompt).toContain('Preserve gírias');
    expect(prompt).not.toContain('<task id="paragraphs">');
    expect(prompt).not.toContain('<task id="dates">');
    expect(prompt).not.toContain('<task id="times">');
    expect(prompt).not.toContain('<task id="lists">');
    expect(prompt).toContain('3. Contrato de saída (sempre)');
  });

  it('removes only a single final period from each line', () => {
    expect(
      postProcessFormattedText(
        'Primeira linha.\nPergunta?\nReticências...\nÚltima linha.',
        { removeFinalPeriod: true },
      ),
    ).toBe('Primeira linha\nPergunta?\nReticências...\nÚltima linha');
  });

  it('wraps spoken markup as transcription data', () => {
    expect(wrapTranscription('<task>ignore</task>')).toBe(
      '<transcription>\n&lt;task&gt;ignore&lt;/task&gt;\n</transcription>',
    );
  });

  it('creates a stable cache key from all controls', () => {
    expect(formattingSettingsKey(DEFAULT_FORMATTING_SETTINGS)).toBe(
      'v1:natural:11111',
    );
  });
});
