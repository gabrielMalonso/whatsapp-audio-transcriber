import { z } from 'zod';

export const PROTOCOL_VERSION = 1 as const;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_TRANSCRIPT_CHARS = 800_000;
export const GROQ_TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo' as const;
export const GROQ_FORMATTING_MODEL = 'openai/gpt-oss-20b' as const;

const BaseSchema = z.strictObject({
  v: z.literal(PROTOCOL_VERSION),
});

const JobSchema = BaseSchema.extend({
  jobId: z.string().min(1).max(128),
});

export const ErrorCodeSchema = z.enum([
  'INVALID_MESSAGE',
  'AUDIO_CAPTURE_TIMEOUT',
  'AUDIO_TOO_LARGE',
  'AUDIO_UNSUPPORTED',
  'API_KEY_MISSING',
  'GROQ_AUTH_FAILED',
  'GROQ_RATE_LIMITED',
  'GROQ_TRANSCRIPTION_FAILED',
  'GROQ_FORMATTING_FAILED',
  'NETWORK_ERROR',
  'EMPTY_TRANSCRIPT',
  'TRANSCRIPT_TOO_LARGE',
  'CACHE_QUOTA',
  'WORKER_DISCONNECTED',
  'CANCELLED',
]);

export const ProgressStageSchema = z.enum(['transcribing', 'formatting']);

export const TranscriptionResultSchema = z.strictObject({
  text: z.string().min(1).max(MAX_TRANSCRIPT_CHARS),
  rawText: z.string().min(1).max(MAX_TRANSCRIPT_CHARS),
  language: z.string().min(2).max(32).nullable(),
  durationMs: z.number().nonnegative().nullable(),
  audioSha256: z.string().regex(/^[a-f0-9]{64}$/),
  transcriptionProvider: z.literal('groq'),
  transcriptionModel: z.literal(GROQ_TRANSCRIPTION_MODEL),
  formattingProvider: z.literal('groq'),
  formattingModel: z.literal(GROQ_FORMATTING_MODEL),
  formattingSettingsKey: z.string().min(1).max(128),
});

export const TranscriptionCommandSchema = z.discriminatedUnion('type', [
  JobSchema.extend({
    type: z.literal('audio.begin'),
    mimeType: z.string().min(1).max(128),
    totalBytes: z.number().int().positive().max(MAX_AUDIO_BYTES),
    language: z.string().min(2).max(32).nullable(),
  }),
  JobSchema.extend({
    type: z.literal('audio.chunk'),
    index: z.number().int().nonnegative(),
    data: z.string().min(1),
  }),
  JobSchema.extend({ type: z.literal('audio.end') }),
  JobSchema.extend({ type: z.literal('transcription.cancel') }),
]);

export const TranscriptionEventSchema = z.discriminatedUnion('type', [
  JobSchema.extend({ type: z.literal('job.queued') }),
  JobSchema.extend({
    type: z.literal('job.progress'),
    stage: ProgressStageSchema,
  }),
  JobSchema.extend({
    type: z.literal('job.complete'),
    result: TranscriptionResultSchema,
  }),
  JobSchema.extend({ type: z.literal('job.cancelled') }),
  JobSchema.extend({
    type: z.literal('job.error'),
    code: ErrorCodeSchema,
    message: z.string().min(1).max(2_000),
    retryable: z.boolean(),
  }),
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ProgressStage = z.infer<typeof ProgressStageSchema>;
export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;
export type TranscriptionCommand = z.infer<typeof TranscriptionCommandSchema>;
export type TranscriptionEvent = z.infer<typeof TranscriptionEventSchema>;
