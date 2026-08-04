import type { ProgressStage, TranscriptionEvent } from '@wat/protocol';
import {
  AlignLeft,
  BotMessageSquare,
  Check,
  Copy,
  Info,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react';
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

const iconProps = {
  absoluteStrokeWidth: false,
  'aria-hidden': true,
  size: 15,
  strokeWidth: 1.75,
} as const;

const triggerIconProps = {
  ...iconProps,
  size: 13,
} as const;

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
        <BotMessageSquare {...triggerIconProps} />
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
        <AlignLeft {...triggerIconProps} />
      </button>
    );
  }

  return createPortal(
    <section className="panel" aria-live="polite">
      {phase === 'notice' && (
        <>
          <div className="panel-title">
            <Info {...iconProps} />
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
            <strong>{statusLabel(phase, stage)}</strong>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={cancel}
            aria-label="Cancelar"
          >
            <X {...iconProps} />
          </button>
        </div>
      )}

      {phase === 'error' && (
        <>
          <div className="panel-title error-title">
            <TriangleAlert {...iconProps} />
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
              <AlignLeft {...iconProps} />
              Transcrição
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Fechar transcrição"
            >
              <X {...iconProps} />
            </button>
          </div>
          <p className="transcript">{record.text}</p>
          <div className="transcript-foot">
            <div className="inline-actions">
              <button
                className="icon-button"
                type="button"
                onClick={copy}
                aria-label={copied ? 'Copiado' : 'Copiar'}
                title={copied ? 'Copiado' : 'Copiar'}
              >
                {copied ? <Check {...iconProps} /> : <Copy {...iconProps} />}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={beginTranscription}
                aria-label="Refazer"
                title="Refazer"
              >
                <RefreshCw {...iconProps} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>,
    panelTarget,
  );
}

function statusLabel(phase: Phase, stage: ProgressStage) {
  if (stage === 'formatting' && phase === 'working') return 'Formatando…';
  return 'Transcrevendo…';
}
