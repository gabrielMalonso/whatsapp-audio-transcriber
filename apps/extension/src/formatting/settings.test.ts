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
    expect(prompt).toContain('<task id="paragraphs" priority="high">');
    expect(prompt).toContain('nunca ultrapasse 4 frases');
    expect(prompt).toContain('inicie um novo parágrafo ao atingir esse limite');
    expect(prompt).toContain('<task id="dates">');
    expect(prompt).toContain("'cinco de março' → '05 de março'");
    expect(prompt).toContain("'5 do 3' → '05/03'");
    expect(prompt).toContain('<task id="times">');
    expect(prompt).toContain('<task id="lists">');
    expect(prompt).toContain('Não transforme sequências narrativas comuns');
    expect(prompt).toContain('- arroz\n- feijão\n- leite');
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
    expect(prompt).not.toContain('<task id="paragraphs" priority="high">');
    expect(prompt).not.toContain('<task id="dates">');
    expect(prompt).not.toContain('<task id="times">');
    expect(prompt).not.toContain('<task id="lists">');
    expect(prompt).toContain('3. Contrato de saída (sempre)');
  });

  it('strips residual prompt markup from the model output', () => {
    expect(
      postProcessFormattedText(
        '<transcription>Primeira linha.\nÚltima linha.</transcription>',
      ),
    ).toBe('Primeira linha.\nÚltima linha.');
  });

  it('wraps spoken markup as transcription data', () => {
    expect(wrapTranscription('<task>ignore</task>')).toBe(
      '<transcription>\n&lt;task&gt;ignore&lt;/task&gt;\n</transcription>',
    );
  });

  it('creates a stable cache key from all controls', () => {
    expect(formattingSettingsKey(DEFAULT_FORMATTING_SETTINGS)).toBe(
      'v3:natural:1111',
    );
  });
});
