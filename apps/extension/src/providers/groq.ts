import {
  GROQ_FORMATTING_MODEL,
  GROQ_TRANSCRIPTION_MODEL,
  MAX_TRANSCRIPT_CHARS,
  type ErrorCode,
  type TranscriptionResult,
} from '@wat/protocol';
import { z } from 'zod';
import {
  buildSystemPrompt,
  DEFAULT_FORMATTING_SETTINGS,
  formattingSettingsKey,
  MIN_FORMATTING_CHARS,
  postProcessFormattedText,
  type FormattingSettings,
  wrapTranscription,
} from '../formatting/settings';
import type {
  GroqStatus,
  ProgressCallback,
  TranscriptionProvider,
} from './types';

const API_ROOT = 'https://api.groq.com/openai/v1';

const ModelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string() })),
});

const TranscriptionResponseSchema = z.object({
  text: z.string(),
  language: z.string().optional().nullable(),
  duration: z.number().nonnegative().optional().nullable(),
});

const ChatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

export class GroqProviderError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export class GroqProvider implements TranscriptionProvider {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly apiKey: string,
    private readonly formattingSettings: FormattingSettings = DEFAULT_FORMATTING_SETTINGS,
    fetcher?: typeof fetch,
  ) {
    this.fetcher = fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async status(signal?: AbortSignal): Promise<GroqStatus> {
    const response = await this.request(
      `${API_ROOT}/models`,
      { signal },
      'status',
    );
    const parsed = ModelsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new GroqProviderError(
        'NETWORK_ERROR',
        'A Groq respondeu em um formato inesperado.',
        true,
      );
    }
    const modelIds = new Set(parsed.data.data.map((model) => model.id));
    const modelsAvailable =
      modelIds.has(GROQ_TRANSCRIPTION_MODEL) &&
      modelIds.has(GROQ_FORMATTING_MODEL);
    return {
      configured: true,
      healthy: modelsAvailable,
      message: modelsAvailable
        ? 'Chave válida e modelos disponíveis.'
        : 'A chave é válida, mas um dos modelos não está disponível neste projeto.',
      transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
      formattingModel: GROQ_FORMATTING_MODEL,
    };
  }

  async transcribe(
    audio: Blob,
    language: string | null,
    signal: AbortSignal,
    onProgress: ProgressCallback,
  ): Promise<TranscriptionResult> {
    onProgress('transcribing');
    const raw = await this.createTranscription(audio, language, signal);
    const rawText = raw.text.trim();
    if (!rawText) {
      throw new GroqProviderError(
        'EMPTY_TRANSCRIPT',
        'A Groq retornou uma transcrição vazia.',
        false,
      );
    }
    if (rawText.length > MAX_TRANSCRIPT_CHARS) {
      throw new GroqProviderError(
        'TRANSCRIPT_TOO_LARGE',
        'A transcrição excedeu o limite permitido.',
        false,
      );
    }

    let text = rawText;
    if (rawText.length >= MIN_FORMATTING_CHARS) {
      onProgress('formatting');
      text = await this.formatTranscription(rawText, signal);
    }
    const audioSha256 = await hashBlob(audio);
    return {
      text,
      rawText,
      language: raw.language ?? language,
      durationMs: raw.duration == null ? null : raw.duration * 1_000,
      audioSha256,
      transcriptionProvider: 'groq',
      transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
      formattingProvider: 'groq',
      formattingModel: GROQ_FORMATTING_MODEL,
      formattingSettingsKey: formattingSettingsKey(this.formattingSettings),
    };
  }

  private async createTranscription(
    audio: Blob,
    language: string | null,
    signal: AbortSignal,
  ) {
    const form = new FormData();
    form.append('file', audio, filenameFor(audio.type));
    form.append('model', GROQ_TRANSCRIPTION_MODEL);
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');
    if (language) form.append('language', language);

    const response = await this.request(
      `${API_ROOT}/audio/transcriptions`,
      { method: 'POST', body: form, signal },
      'transcription',
    );
    const parsed = TranscriptionResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new GroqProviderError(
        'GROQ_TRANSCRIPTION_FAILED',
        'A resposta da transcrição veio em um formato inesperado.',
        true,
      );
    }
    return parsed.data;
  }

  private async formatTranscription(rawText: string, signal: AbortSignal) {
    const response = await this.request(
      `${API_ROOT}/chat/completions`,
      {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_FORMATTING_MODEL,
          reasoning_effort: 'low',
          include_reasoning: false,
          temperature: 0.3,
          max_completion_tokens: Math.min(
            65_536,
            Math.max(2_048, Math.ceil(rawText.length * 1.2)),
          ),
          messages: [
            {
              role: 'system',
              content: buildSystemPrompt(this.formattingSettings),
            },
            {
              role: 'user',
              content: wrapTranscription(rawText),
            },
          ],
        }),
      },
      'formatting',
    );
    const chat = ChatResponseSchema.safeParse(await response.json());
    if (!chat.success) {
      throw new GroqProviderError(
        'GROQ_FORMATTING_FAILED',
        'A resposta da formatação veio em um formato inesperado.',
        true,
      );
    }
    const text = postProcessFormattedText(
      chat.data.choices[0]!.message.content,
    );
    if (!text) {
      throw new GroqProviderError(
        'GROQ_FORMATTING_FAILED',
        'O GPT-OSS não devolveu o texto formatado.',
        true,
      );
    }
    if (text.length > MAX_TRANSCRIPT_CHARS) {
      throw new GroqProviderError(
        'TRANSCRIPT_TOO_LARGE',
        'O texto formatado excedeu o limite permitido.',
        false,
      );
    }
    return text;
  }

  private async request(
    url: string,
    init: RequestInit,
    operation: 'status' | 'transcription' | 'formatting',
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    let response: Response;
    try {
      response = await this.fetcher(url, { ...init, headers });
    } catch (error) {
      if (init.signal?.aborted) {
        throw new GroqProviderError(
          'CANCELLED',
          'A transcrição foi cancelada.',
          false,
        );
      }
      throw new GroqProviderError(
        'NETWORK_ERROR',
        error instanceof Error
          ? `Não foi possível acessar a Groq: ${error.message}`
          : 'Não foi possível acessar a Groq.',
        true,
      );
    }
    if (response.ok) return response;
    throw await apiError(response, operation);
  }
}

async function apiError(
  response: Response,
  operation: 'status' | 'transcription' | 'formatting',
) {
  const detail = await readApiError(response);
  if (response.status === 401 || response.status === 403) {
    return new GroqProviderError(
      'GROQ_AUTH_FAILED',
      'A API key da Groq é inválida ou não tem acesso aos modelos.',
      false,
    );
  }
  if (response.status === 429) {
    return new GroqProviderError(
      'GROQ_RATE_LIMITED',
      'O limite da Groq foi atingido. Aguarde um pouco e tente novamente.',
      true,
    );
  }
  if (response.status === 413) {
    return new GroqProviderError(
      'AUDIO_TOO_LARGE',
      'O áudio excede o limite aceito pela Groq.',
      false,
    );
  }
  const code =
    operation === 'formatting'
      ? 'GROQ_FORMATTING_FAILED'
      : operation === 'transcription'
        ? 'GROQ_TRANSCRIPTION_FAILED'
        : 'NETWORK_ERROR';
  return new GroqProviderError(
    code,
    detail
      ? `A Groq recusou a solicitação: ${detail}`
      : 'A Groq recusou a solicitação.',
    response.status >= 500,
  );
}

async function readApiError(response: Response): Promise<string> {
  try {
    const value = (await response.json()) as {
      error?: { message?: unknown };
    };
    return typeof value.error?.message === 'string'
      ? value.error.message.slice(0, 500)
      : '';
  } catch {
    return '';
  }
}

function filenameFor(mimeType: string) {
  if (mimeType.includes('webm')) return 'whatsapp-voice.webm';
  if (mimeType.includes('wav')) return 'whatsapp-voice.wav';
  if (mimeType.includes('mpeg')) return 'whatsapp-voice.mp3';
  return 'whatsapp-voice.ogg';
}

async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await blob.arrayBuffer(),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
