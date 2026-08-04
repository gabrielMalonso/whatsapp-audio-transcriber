import { afterEach, describe, expect, it, vi } from 'vitest';
import { GROQ_FORMATTING_MODEL, GROQ_TRANSCRIPTION_MODEL } from '@wat/protocol';
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
          text: 'oi tudo bem isso é um teste',
          language: 'pt',
          duration: 2.4,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  text: 'Oi, tudo bem? Isso é um teste.',
                }),
              },
            },
          ],
        }),
      );
    const stages: string[] = [];

    const result = await new GroqProvider(
      'gsk_valid_test_key_123456',
      fetcher,
    ).transcribe(
      new Blob(['OggS-test'], { type: 'audio/ogg' }),
      null,
      new AbortController().signal,
      (stage) => stages.push(stage),
    );

    expect(stages).toEqual(['transcribing', 'formatting']);
    expect(result).toMatchObject({
      text: 'Oi, tudo bem? Isso é um teste.',
      rawText: 'oi tudo bem isso é um teste',
      language: 'pt',
      durationMs: 2_400,
      transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
      formattingModel: GROQ_FORMATTING_MODEL,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toContain('/audio/transcriptions');
    const formattingBody = JSON.parse(
      String(fetcher.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(formattingBody).toMatchObject({
      model: GROQ_FORMATTING_MODEL,
      reasoning_effort: 'low',
    });
  });

  it('checks whether both pipeline models are available', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        data: [{ id: GROQ_TRANSCRIPTION_MODEL }, { id: GROQ_FORMATTING_MODEL }],
      }),
    );
    const status = await new GroqProvider(
      'gsk_valid_test_key_123456',
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
      new GroqProvider('gsk_secret_value_123456', fetcher).status(),
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
    json: async () => value,
  } as Response;
}
