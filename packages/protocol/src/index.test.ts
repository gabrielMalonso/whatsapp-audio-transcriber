import { describe, expect, it } from 'vitest';
import {
  GROQ_FORMATTING_MODEL,
  GROQ_TRANSCRIPTION_MODEL,
  PROTOCOL_VERSION,
  TranscriptionCommandSchema,
  TranscriptionEventSchema,
} from './index.js';

describe('transcription protocol', () => {
  it('accepts an audio chunk', () => {
    expect(
      TranscriptionCommandSchema.parse({
        v: PROTOCOL_VERSION,
        type: 'audio.chunk',
        jobId: 'job-1',
        index: 0,
        data: 'T2dnUw==',
      }),
    ).toMatchObject({ type: 'audio.chunk', index: 0 });
  });

  it('accepts the Groq pipeline result', () => {
    expect(
      TranscriptionEventSchema.parse({
        v: PROTOCOL_VERSION,
        type: 'job.complete',
        jobId: 'job-1',
        result: {
          text: 'Texto formatado.',
          rawText: 'texto formatado',
          language: 'pt',
          durationMs: 1_200,
          audioSha256: 'a'.repeat(64),
          transcriptionProvider: 'groq',
          transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
          formattingProvider: 'groq',
          formattingModel: GROQ_FORMATTING_MODEL,
          formattingSettingsKey: 'v1:natural:11111',
        },
      }),
    ).toMatchObject({ type: 'job.complete' });
  });
});
