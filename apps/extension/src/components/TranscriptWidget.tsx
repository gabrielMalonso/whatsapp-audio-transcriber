import type { ProgressStage, TranscriptionEvent } from '@wat/protocol';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { VoiceMessageDescriptor } from '../adapters/whatsapp/voiceMessages';
import { captureVoiceAudio } from '../messaging/pageBridge';
import { transcriptionClient } from '../messaging/transcriptionClient';
import {
  getTranscript,
  hashMessageKey,
  hasSeenCaptureNotice,
  markCaptureNoticeSeen,
  putTranscript,
  type TranscriptRecord,
} from '../storage/transcripts';

type Phase =
  | 'loading'
  | 'idle'
  | 'notice'
  | 'capturing'
  | 'queued'
  | 'working'
  | 'success'
  | 'error';

export function TranscriptWidget({
  message,
  panelHost,
  panelTarget,
}: {
  message: VoiceMessageDescriptor;
  panelHost: HTMLElement;
  panelTarget: HTMLElement;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [messageHash, setMessageHash] = useState('');
  const [record, setRecord] = useState<TranscriptRecord | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [stage, setStage] = useState<ProgressStage>('transcribing');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const jobRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const compact =
    phase === 'loading' ||
    phase === 'idle' ||
    (phase === 'success' && Boolean(record) && !expanded);

  useEffect(() => {
    panelHost.hidden = compact;
    panelHost.style.pointerEvents = compact ? 'none' : 'auto';
  }, [compact, panelHost]);

  useEffect(() => {
    let active = true;
    void hashMessageKey(message.id).then(async (hash) => {
      const cached = await getTranscript(hash);
      if (!active) return;
      setMessageHash(hash);
      setRecord(cached);
      setPhase(cached ? 'success' : 'idle');
    });
    return () => {
      active = false;
      if (jobRef.current) transcriptionClient.cancel(jobRef.current);
    };
  }, [message.id]);

  const requestTranscription = async () => {
    if (!messageHash) return;
    if (!(await hasSeenCaptureNotice())) {
      setPhase('notice');
      return;
    }
    await beginTranscription();
  };

  const beginTranscription = async () => {
    cancelledRef.current = false;
    setError('');
    setPhase('capturing');
    try {
      const audio = await captureVoiceAudio(message.transportButton);
      if (cancelledRef.current) return;
      const jobId = await transcriptionClient.transcribe(audio, {
        onMessage: handleHostMessage,
      });
      jobRef.current = jobId;
      setPhase('queued');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível iniciar a transcrição.',
      );
      setPhase('error');
    }
  };

  const handleHostMessage = (hostMessage: TranscriptionEvent) => {
    if (hostMessage.type === 'job.queued') setPhase('queued');
    if (hostMessage.type === 'job.progress') {
      setStage(hostMessage.stage);
      setPhase('working');
    }
    if (hostMessage.type === 'job.complete') {
      void putTranscript(messageHash, hostMessage.result).then((saved) => {
        setRecord(saved);
        setExpanded(true);
        setPhase('success');
      });
      finishJob(hostMessage.jobId);
    }
    if (hostMessage.type === 'job.error') {
      setError(hostMessage.message);
      setPhase('error');
      finishJob(hostMessage.jobId);
    }
    if (hostMessage.type === 'job.cancelled') {
      setPhase(record ? 'success' : 'idle');
      finishJob(hostMessage.jobId);
    }
  };

  const finishJob = (jobId: string) => {
    transcriptionClient.release(jobId);
    if (jobRef.current === jobId) jobRef.current = null;
  };

  const cancel = () => {
    cancelledRef.current = true;
    if (jobRef.current) transcriptionClient.cancel(jobRef.current);
    setPhase(record ? 'success' : 'idle');
  };

  const acceptNotice = async () => {
    await markCaptureNoticeSeen();
    await beginTranscription();
  };

  const copy = async () => {
    if (!record) return;
    await navigator.clipboard.writeText(record.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_400);
  };

  if (phase === 'loading') return null;

  if (phase === 'idle') {
    return (
      <button
        className="trigger icon-only"
        type="button"
        onClick={requestTranscription}
        aria-label="Transcrever"
        title="Transcrever"
      >
        <SparkIcon />
      </button>
    );
  }

  if (phase === 'success' && record && !expanded) {
    return (
      <button
        className="trigger icon-only ready"
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Ver transcrição"
        title="Ver transcrição"
      >
        <TextIcon />
      </button>
    );
  }

  return createPortal(
    <section className="panel" aria-live="polite">
      {phase === 'notice' && (
        <>
          <div className="panel-title">
            <InfoIcon />
            Antes da primeira transcrição
          </div>
          <p className="notice-copy">
            O áudio será enviado diretamente à Groq. Para acessá-lo, a extensão
            aciona a mensagem por um instante; o WhatsApp pode marcá-la como
            reproduzida, mas o som é bloqueado.
          </p>
          <div className="actions">
            <button
              className="quiet"
              type="button"
              onClick={() => setPhase('idle')}
            >
              Agora não
            </button>
            <button className="primary" type="button" onClick={acceptNotice}>
              Continuar
            </button>
          </div>
        </>
      )}

      {(phase === 'capturing' || phase === 'queued' || phase === 'working') && (
        <div className="status-row">
          <span className="spinner" aria-hidden="true" />
          <div className="status-copy">
            <strong>{statusTitle(phase, stage)}</strong>
            <span>{statusDetail(phase, stage)}</span>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={cancel}
            aria-label="Cancelar"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {phase === 'error' && (
        <>
          <div className="panel-title error-title">
            <AlertIcon />
            Não foi possível transcrever
          </div>
          <p className="error-copy">{error}</p>
          <div className="actions">
            <button
              className="quiet"
              type="button"
              onClick={() => setPhase(record ? 'success' : 'idle')}
            >
              Fechar
            </button>
            <button
              className="primary"
              type="button"
              onClick={beginTranscription}
            >
              Tentar novamente
            </button>
          </div>
        </>
      )}

      {phase === 'success' && record && expanded && (
        <>
          <div className="transcript-head">
            <div className="panel-title">
              <TextIcon />
              Transcrição
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Fechar transcrição"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="transcript">{record.text}</p>
          <div className="transcript-foot">
            <span>
              {record.language ? record.language.toUpperCase() : 'AUTO'} · Groq
              · GPT-OSS
            </span>
            <div className="inline-actions">
              <button className="text-button" type="button" onClick={copy}>
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={beginTranscription}
              >
                Refazer
              </button>
            </div>
          </div>
        </>
      )}
    </section>,
    panelTarget,
  );
}

function statusTitle(phase: Phase, stage: ProgressStage) {
  if (phase === 'capturing') return 'Preparando o áudio';
  if (phase === 'queued') return 'Na fila';
  if (stage === 'formatting') return 'Formatando com GPT-OSS';
  return 'Transcrevendo com Whisper';
}

function statusDetail(phase: Phase, stage: ProgressStage) {
  if (phase === 'capturing') return 'Lendo a mensagem de voz…';
  if (phase === 'queued') return 'Aguardando o pipeline da Groq…';
  if (stage === 'formatting') return 'Corrigindo pontuação e parágrafos…';
  return 'Enviando e reconhecendo o áudio…';
}

const SparkIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5c.35 2.55 1.95 4.15 4.5 4.5C9.95 6.35 8.35 7.95 8 10.5 7.65 7.95 6.05 6.35 3.5 6 6.05 5.65 7.65 4.05 8 1.5Z" />
    <path d="M12.3 9.3c.18 1.25.95 2.02 2.2 2.2-1.25.18-2.02.95-2.2 2.2-.18-1.25-.95-2.02-2.2-2.2 1.25-.18 2.02-.95 2.2-2.2Z" />
  </svg>
);
const TextIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2.25 3.25h11.5M2.25 6.4h8.5M2.25 9.55h11.5M2.25 12.7h7" />
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 7v4M8 4.75h.01" />
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.8 14.3 13H1.7L8 1.8Z" />
    <path d="M8 5.5v3.7M8 11.4h.01" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);
