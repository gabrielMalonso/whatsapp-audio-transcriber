import {
  GROQ_FORMATTING_MODEL,
  GROQ_TRANSCRIPTION_MODEL,
  MAX_AUDIO_BYTES,
  PROTOCOL_VERSION,
  TranscriptionCommandSchema,
  type ErrorCode,
  type TranscriptionEvent,
} from '@wat/protocol';
import { browser, type Browser } from 'wxt/browser';
import { TRANSCRIPTION_PORT_NAME } from '../src/messaging/constants';
import { GroqProvider, GroqProviderError } from '../src/providers/groq';
import type {
  GroqConfigurationResponse,
  GroqStatus,
} from '../src/providers/types';
import { getFormattingSettings } from '../src/storage/formattingSettings';
import {
  getGroqSettings,
  removeGroqApiKey,
  saveGroqApiKey,
} from '../src/storage/groqSettings';

type ContentPort = ReturnType<typeof browser.runtime.connect>;
type JobStatus = 'assembling' | 'queued' | 'running';
const ASSEMBLY_TIMEOUT_MS = 30_000;

type Job = {
  id: string;
  owner: ContentPort;
  mimeType: string;
  totalBytes: number;
  language: string | null;
  chunks: ArrayBuffer[];
  receivedBytes: number;
  nextIndex: number;
  status: JobStatus;
  controller: AbortController;
  assemblyTimeout: number | null;
};

export default defineBackground(() => {
  const jobs = new Map<string, Job>();
  const waiting: string[] = [];
  let activeJobId: string | null = null;

  browser.runtime.onConnect.addListener((contentPort) => {
    if (contentPort.name !== TRANSCRIPTION_PORT_NAME) return;

    contentPort.onMessage.addListener((value: unknown) => {
      const parsed = TranscriptionCommandSchema.safeParse(value);
      if (!parsed.success) {
        const jobId = readJobId(value);
        postError(
          contentPort,
          jobId,
          'INVALID_MESSAGE',
          'A extensão gerou uma mensagem inválida.',
          false,
        );
        return;
      }

      const command = parsed.data;
      if (command.type === 'audio.begin') begin(command, contentPort);
      if (command.type === 'audio.chunk') append(command, contentPort);
      if (command.type === 'audio.end') enqueue(command.jobId, contentPort);
      if (command.type === 'transcription.cancel') {
        cancel(command.jobId, contentPort);
      }
    });

    contentPort.onDisconnect.addListener(() => {
      for (const job of jobs.values()) {
        if (job.owner !== contentPort) continue;
        job.controller.abort();
        clearAssemblyTimeout(job);
        jobs.delete(job.id);
      }
    });
  });

  browser.runtime.onMessage.addListener(
    // The returned promise carries the asynchronous response back to the popup.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    (message: unknown, sender) => handlePopupMessage(message, sender),
  );

  function begin(
    command: Extract<
      ReturnType<typeof TranscriptionCommandSchema.parse>,
      { type: 'audio.begin' }
    >,
    owner: ContentPort,
  ) {
    if (jobs.has(command.jobId)) {
      postError(
        owner,
        command.jobId,
        'INVALID_MESSAGE',
        'Este trabalho já existe.',
        false,
      );
      return;
    }
    if (jobs.size >= 10) {
      postError(
        owner,
        command.jobId,
        'GROQ_RATE_LIMITED',
        'A fila da extensão está cheia. Aguarde e tente novamente.',
        true,
      );
      return;
    }
    const job: Job = {
      id: command.jobId,
      owner,
      mimeType: command.mimeType,
      totalBytes: command.totalBytes,
      language: command.language,
      chunks: [],
      receivedBytes: 0,
      nextIndex: 0,
      status: 'assembling',
      controller: new AbortController(),
      assemblyTimeout: null,
    };
    jobs.set(command.jobId, job);
    job.assemblyTimeout = globalThis.setTimeout(() => {
      if (jobs.get(job.id) === job && job.status === 'assembling') {
        failAssembly(job, 'O envio do áudio demorou além do limite permitido.');
      }
    }, ASSEMBLY_TIMEOUT_MS);
  }

  function append(
    command: Extract<
      ReturnType<typeof TranscriptionCommandSchema.parse>,
      { type: 'audio.chunk' }
    >,
    owner: ContentPort,
  ) {
    const job = jobs.get(command.jobId);
    if (job && job.owner !== owner) {
      postError(
        owner,
        command.jobId,
        'INVALID_MESSAGE',
        'Este trabalho pertence a outra conexão.',
        false,
      );
      return;
    }
    if (
      !job ||
      job.status !== 'assembling' ||
      command.index !== job.nextIndex
    ) {
      if (job) failAssembly(job, 'Os blocos do áudio chegaram fora de ordem.');
      return;
    }
    let chunk: ArrayBuffer;
    try {
      chunk = base64ToBuffer(command.data);
    } catch {
      failAssembly(job, 'Um bloco do áudio está corrompido.');
      return;
    }
    if (
      !chunk.byteLength ||
      job.receivedBytes + chunk.byteLength > job.totalBytes
    ) {
      failAssembly(job, 'O tamanho recebido não confere com o áudio.');
      return;
    }
    job.chunks.push(chunk);
    job.receivedBytes += chunk.byteLength;
    job.nextIndex += 1;
  }

  function enqueue(jobId: string, owner: ContentPort) {
    const job = jobs.get(jobId);
    if (job && job.owner !== owner) {
      postError(
        owner,
        jobId,
        'INVALID_MESSAGE',
        'Este trabalho pertence a outra conexão.',
        false,
      );
      return;
    }
    if (
      !job ||
      job.status !== 'assembling' ||
      job.receivedBytes !== job.totalBytes
    ) {
      if (job) failAssembly(job, 'O áudio chegou incompleto.');
      return;
    }
    clearAssemblyTimeout(job);
    job.status = 'queued';
    waiting.push(job.id);
    safePost(job.owner, {
      v: PROTOCOL_VERSION,
      type: 'job.queued',
      jobId: job.id,
    });
    drain();
  }

  function cancel(jobId: string, owner: ContentPort) {
    const job = jobs.get(jobId);
    if (!job || job.owner !== owner) return;
    job.controller.abort();
    clearAssemblyTimeout(job);
    if (job.status !== 'running') {
      jobs.delete(job.id);
      safePost(job.owner, {
        v: PROTOCOL_VERSION,
        type: 'job.cancelled',
        jobId: job.id,
      });
    }
  }

  function drain() {
    if (activeJobId) return;
    let job: Job | undefined;
    while (!job && waiting.length) {
      const id = waiting.shift();
      if (id) job = jobs.get(id);
    }
    if (!job) return;
    activeJobId = job.id;
    job.status = 'running';
    void execute(job).finally(() => {
      clearAssemblyTimeout(job);
      jobs.delete(job.id);
      activeJobId = null;
      drain();
    });
  }

  async function execute(job: Job) {
    try {
      const [settings, formattingSettings] = await Promise.all([
        getGroqSettings(),
        getFormattingSettings(),
      ]);
      if (!settings) {
        throw new GroqProviderError(
          'API_KEY_MISSING',
          'Configure sua API key da Groq no popup da extensão.',
          false,
        );
      }
      const audio = new Blob(job.chunks, { type: job.mimeType });
      job.chunks = [];
      const provider = new GroqProvider(settings.apiKey, formattingSettings);
      const result = await provider.transcribe(
        audio,
        job.language,
        job.controller.signal,
        (stage) =>
          safePost(job.owner, {
            v: PROTOCOL_VERSION,
            type: 'job.progress',
            jobId: job.id,
            stage,
          }),
      );
      safePost(job.owner, {
        v: PROTOCOL_VERSION,
        type: 'job.complete',
        jobId: job.id,
        result,
      });
    } catch (error) {
      if (error instanceof GroqProviderError) {
        if (error.code === 'CANCELLED') {
          safePost(job.owner, {
            v: PROTOCOL_VERSION,
            type: 'job.cancelled',
            jobId: job.id,
          });
          return;
        }
        postError(
          job.owner,
          job.id,
          error.code,
          error.message,
          error.retryable,
        );
        return;
      }
      postError(
        job.owner,
        job.id,
        'NETWORK_ERROR',
        'O pipeline da Groq falhou inesperadamente.',
        true,
      );
    }
  }

  function failAssembly(job: Job, message: string) {
    clearAssemblyTimeout(job);
    jobs.delete(job.id);
    postError(job.owner, job.id, 'INVALID_MESSAGE', message, false);
  }

  function clearAssemblyTimeout(job: Job) {
    if (job.assemblyTimeout === null) return;
    globalThis.clearTimeout(job.assemblyTimeout);
    job.assemblyTimeout = null;
  }
});

async function handlePopupMessage(
  message: unknown,
  sender: Browser.runtime.MessageSender,
) {
  if (
    sender.id !== browser.runtime.id ||
    sender.url !== browser.runtime.getURL('/popup.html')
  ) {
    return undefined;
  }
  if (!message || typeof message !== 'object' || !('type' in message)) {
    return undefined;
  }
  if (message.type === 'wat.groq.status') return groqStatus();
  if (message.type === 'wat.groq.remove-key') {
    await removeGroqApiKey();
    return unconfiguredStatus();
  }
  if (message.type === 'wat.groq.save-key' && 'apiKey' in message) {
    return configureGroq(String(message.apiKey));
  }
  return undefined;
}

async function groqStatus(): Promise<GroqStatus> {
  const settings = await getGroqSettings();
  if (!settings) return unconfiguredStatus();
  try {
    return await new GroqProvider(settings.apiKey).status();
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      message:
        error instanceof GroqProviderError
          ? error.message
          : 'Não foi possível verificar a Groq.',
      transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
      formattingModel: GROQ_FORMATTING_MODEL,
    };
  }
}

async function configureGroq(
  apiKey: string,
): Promise<GroqConfigurationResponse> {
  try {
    const status = await new GroqProvider(apiKey.trim()).status();
    if (!status.healthy) return { ...status, saved: false };
    await saveGroqApiKey(apiKey);
    return { ...status, saved: true };
  } catch (error) {
    return {
      configured: Boolean(await getGroqSettings()),
      healthy: false,
      saved: false,
      message:
        error instanceof GroqProviderError
          ? error.message
          : 'Não foi possível validar essa API key.',
      transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
      formattingModel: GROQ_FORMATTING_MODEL,
    };
  }
}

function unconfiguredStatus(): GroqStatus {
  return {
    configured: false,
    healthy: false,
    message: 'Adicione uma API key da Groq para começar.',
    transcriptionModel: GROQ_TRANSCRIPTION_MODEL,
    formattingModel: GROQ_FORMATTING_MODEL,
  };
}

function postError(
  port: ContentPort,
  jobId: string,
  code: ErrorCode,
  message: string,
  retryable: boolean,
) {
  safePost(port, {
    v: PROTOCOL_VERSION,
    type: 'job.error',
    jobId,
    code,
    message,
    retryable,
  });
}

function safePost(port: ContentPort, event: TranscriptionEvent) {
  try {
    port.postMessage(event);
  } catch {
    // The content port may disconnect while a queued event is being delivered.
  }
}

function readJobId(value: unknown) {
  return typeof value === 'object' && value && 'jobId' in value
    ? String(value.jobId)
    : 'unknown';
}

function base64ToBuffer(encoded: string): ArrayBuffer {
  const binary = atob(encoded);
  if (binary.length > MAX_AUDIO_BYTES) throw new Error('Chunk muito grande.');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
