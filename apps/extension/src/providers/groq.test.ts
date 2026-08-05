import { afterEach, describe, expect, it, vi } from 'vitest';
import { GROQ_FORMATTING_MODEL, GROQ_TRANSCRIPTION_MODEL } from '@wat/protocol';
import { DEFAULT_FORMATTING_SETTINGS } from '../formatting/settings';
import { GroqProvider } from './groq';

describe('GroqProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs transcription followed by GPT-OSS formatting', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          text: 'oi tudo bem isso é um teste que eu gravei agora no WhatsApp',
          language: 'pt',
          duration: 2.4,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content:
                  'Oi, tudo bem? Isso é um teste que eu gravei agora no WhatsApp.',
              },
            },
          ],
        }),
      );
    const stages: string[] = [];

    const result = await new GroqProvider(
      'gsk_valid_test_key_123456',
      DEFAULT_FORMATTING_SETTINGS,
      fetcher,
    ).transcribe(
      new Blob(['OggS-test'], { type: 'audio/ogg' }),
      null,
      new AbortController().signal,
      (stage) => stages.push(stage),
    );

    expect(stages).toEqual(['transcribing', 'formatting']);
    expect(result).toMatchObject({
      text: 'Oi, tudo bem? Isso é um teste que eu gravei agora no WhatsApp.',
      rawText: 'oi tudo bem isso é um teste que eu gravei agora no WhatsApp',
      language: 'pt',
      durationMs: 2_400,
      transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
      formattingModel: GROQ_FORMATTING_MODEL,
      formattingSettingsKey: 'v1:natural:1111',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toContain('/audio/transcriptions');
    const body = fetcher.mock.calls[1]?.[1]?.body;
    expect(typeof body).toBe('string');
    const formattingBody = JSON.parse(
      typeof body === 'string' ? body : '',
    ) as Record<string, unknown>;
    expect(formattingBody).toMatchObject({
      model: GROQ_FORMATTING_MODEL,
      reasoning_effort: 'low',
      temperature: 0.3,
    });
    expect(formattingBody).not.toHaveProperty('response_format');
    const messages = formattingBody.messages as Array<{
      role: string;
      content: string;
    }>;
    expect(messages[0]?.content).toContain('<task id="paragraphs">');
    expect(messages[1]?.content).toBe(
      '<transcription>\noi tudo bem isso é um teste que eu gravei agora no WhatsApp\n</transcription>',
    );
  });

  it('does not call the formatter below 40 characters', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        text: 'Mensagem curta.',
        language: 'pt',
      }),
    );
    const stages: string[] = [];

    const result = await new GroqProvider(
      'gsk_valid_test_key_123456',
      DEFAULT_FORMATTING_SETTINGS,
      fetcher,
    ).transcribe(
      new Blob(['OggS-test'], { type: 'audio/ogg' }),
      null,
      new AbortController().signal,
      (stage) => stages.push(stage),
    );

    expect(fetcher).toHaveBeenCalledOnce();
    expect(stages).toEqual(['transcribing']);
    expect(result.text).toBe('Mensagem curta.');
  });

  it('checks whether both pipeline models are available', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        data: [{ id: GROQ_TRANSCRIPTION_MODEL }, { id: GROQ_FORMATTING_MODEL }],
      }),
    );
    const status = await new GroqProvider(
      'gsk_valid_test_key_123456',
      DEFAULT_FORMATTING_SETTINGS,
      fetcher,
    ).status();
    expect(status).toMatchObject({ configured: true, healthy: true });
  });

  it('binds the native worker fetch to globalThis', async () => {
    const nativeLikeFetch = vi.fn(function (this: unknown) {
      if (this !== globalThis) {
        throw new TypeError('Illegal invocation');
      }
      return Promise.resolve(
        jsonResponse({
          data: [
            { id: GROQ_TRANSCRIPTION_MODEL },
            { id: GROQ_FORMATTING_MODEL },
          ],
        }),
      );
    });
    vi.stubGlobal('fetch', nativeLikeFetch);

    const status = await new GroqProvider('gsk_valid_test_key_123456').status();

    expect(status.healthy).toBe(true);
    expect(nativeLikeFetch).toHaveBeenCalledOnce();
  });

  it('maps an invalid key without exposing it', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ error: { message: 'invalid_api_key' } }, 401),
      );
    await expect(
      new GroqProvider(
        'gsk_secret_value_123456',
        DEFAULT_FORMATTING_SETTINGS,
        fetcher,
      ).status(),
    ).rejects.toMatchObject({
      code: 'GROQ_AUTH_FAILED',
      retryable: false,
    });
  });
});

function jsonResponse(value: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(value),
  } as Response;
}
