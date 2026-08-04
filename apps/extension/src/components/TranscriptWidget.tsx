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
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from 'react';
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

type PanelView = 'notice' | 'status' | 'error' | 'transcript';

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

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function AnimatedPanelShell({
  open,
  contentKey,
  onClosed,
  children,
}: {
  open: boolean;
  contentKey: string;
  onClosed: () => void;
  children: ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const firstLayoutRef = useRef(true);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const inner = innerRef.current;
    if (!shell || !inner) return;

    const reduce = prefersReducedMotion();

    if (firstLayoutRef.current) {
      firstLayoutRef.current = false;
      if (open) {
        shell.style.height = '0px';
        shell.style.opacity = '0';
        shell.style.transform = 'translateY(-6px)';
        if (reduce) {
          shell.style.height = 'auto';
          shell.style.opacity = '1';
          shell.style.transform = 'translateY(0)';
          openRef.current = true;
          return;
        }
        void shell.offsetHeight;
        const id = window.requestAnimationFrame(() => {
          shell.style.height = `${inner.scrollHeight}px`;
          shell.style.opacity = '1';
          shell.style.transform = 'translateY(0)';
        });
        openRef.current = true;
        return () => window.cancelAnimationFrame(id);
      }
      shell.style.height = '0px';
      shell.style.opacity = '0';
      shell.style.transform = 'translateY(-6px)';
      openRef.current = false;
      return;
    }

    if (open === openRef.current) {
      if (!open) return;
      const current =
        shell.style.height === 'auto'
          ? shell.getBoundingClientRect().height
          : Number.parseFloat(shell.style.height || '0') ||
            shell.getBoundingClientRect().height;
      shell.style.height = `${current}px`;
      void shell.offsetHeight;
      if (reduce) {
        shell.style.height = 'auto';
        return;
      }
      shell.style.height = `${inner.scrollHeight}px`;
      const settle = (event: Event) => {
        const transition = event as unknown as TransitionEvent<HTMLDivElement>;
        if (transition.propertyName !== 'height') return;
        if (openRef.current) shell.style.height = 'auto';
      };
      shell.addEventListener('transitionend', settle);
      return () => shell.removeEventListener('transitionend', settle);
    }

    openRef.current = open;

    if (open) {
      shell.style.height = '0px';
      shell.style.opacity = '0';
      shell.style.transform = 'translateY(-6px)';
      void shell.offsetHeight;
      if (reduce) {
        shell.style.height = 'auto';
        shell.style.opacity = '1';
        shell.style.transform = 'translateY(0)';
        return;
      }
      shell.style.height = `${inner.scrollHeight}px`;
      shell.style.opacity = '1';
      shell.style.transform = 'translateY(0)';
      return;
    }

    const current =
      shell.style.height === 'auto'
        ? inner.scrollHeight
        : shell.getBoundingClientRect().height;
    shell.style.height = `${current}px`;
    void shell.offsetHeight;
    if (reduce) {
      shell.style.height = '0px';
      shell.style.opacity = '0';
      shell.style.transform = 'translateY(-6px)';
      onClosedRef.current();
      return;
    }
    shell.style.height = '0px';
    shell.style.opacity = '0';
    shell.style.transform = 'translateY(-6px)';
  }, [open, contentKey]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'height') return;
    const shell = shellRef.current;
    if (!shell) return;
    if (open) {
      shell.style.height = 'auto';
      return;
    }
    onClosedRef.current();
  };

  return (
    <div
      ref={shellRef}
      className="panel-shell"
      data-open={open ? '1' : '0'}
      onTransitionEnd={handleTransitionEnd}
    >
      <div ref={innerRef} className="panel-shell-inner">
        {children}
      </div>
    </div>
  );
}

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
  const [shellVisible, setShellVisible] = useState(false);
  const [shellOpen, setShellOpen] = useState(false);
  const jobRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const lastViewRef = useRef<PanelView>('status');

  const panelView = resolvePanelView(phase, expanded, record);
  if (panelView) lastViewRef.current = panelView;
  const renderedView = panelView ?? (shellVisible ? lastViewRef.current : null);
  const wantsOpen = panelView !== null;

  useEffect(() => {
    if (wantsOpen) {
      panelHost.hidden = false;
      panelHost.style.pointerEvents = 'auto';
      setShellVisible(true);
      setShellOpen(true);
      return;
    }

    setShellOpen(false);
    panelHost.style.pointerEvents = 'none';
    if (prefersReducedMotion()) {
      setShellVisible(false);
      panelHost.hidden = true;
    }
  }, [wantsOpen, panelHost]);

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

  const finishClose = () => {
    if (wantsOpen) return;
    setShellVisible(false);
    panelHost.hidden = true;
    panelHost.style.pointerEvents = 'none';
  };

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
    setExpanded(false);
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

  const showTrigger =
    !shellVisible &&
    (phase === 'idle' || (phase === 'success' && Boolean(record) && !expanded));

  return (
    <>
      {showTrigger && (
        <button
          className={`trigger icon-only${phase === 'success' ? ' ready' : ''}`}
          type="button"
          onClick={
            phase === 'idle' ? requestTranscription : () => setExpanded(true)
          }
          aria-label={phase === 'idle' ? 'Transcrever' : 'Ver transcrição'}
          title={phase === 'idle' ? 'Transcrever' : 'Ver transcrição'}
        >
          {phase === 'idle' ? (
            <BotMessageSquare {...triggerIconProps} />
          ) : (
            <AlignLeft {...triggerIconProps} />
          )}
        </button>
      )}

      {shellVisible &&
        renderedView &&
        createPortal(
          <AnimatedPanelShell
            open={shellOpen}
            contentKey={renderedView}
            onClosed={finishClose}
          >
            <section className="panel" aria-live="polite">
              <div className="panel-body" key={renderedView}>
                {renderedView === 'notice' && (
                  <>
                    <div className="panel-title">
                      <Info {...iconProps} />
                      Antes da primeira transcrição
                    </div>
                    <p className="notice-copy">
                      O áudio será enviado diretamente à Groq. Para acessá-lo, a
                      extensão aciona a mensagem por um instante; o WhatsApp
                      pode marcá-la como reproduzida, mas o som é bloqueado.
                    </p>
                    <div className="actions">
                      <button
                        className="quiet"
                        type="button"
                        onClick={() => setPhase('idle')}
                      >
                        Agora não
                      </button>
                      <button
                        className="primary"
                        type="button"
                        onClick={acceptNotice}
                      >
                        Continuar
                      </button>
                    </div>
                  </>
                )}

                {renderedView === 'status' && (
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

                {renderedView === 'error' && (
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

                {renderedView === 'transcript' && record && (
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
                          {copied ? (
                            <Check {...iconProps} />
                          ) : (
                            <Copy {...iconProps} />
                          )}
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
              </div>
            </section>
          </AnimatedPanelShell>,
          panelTarget,
        )}
    </>
  );
}

function resolvePanelView(
  phase: Phase,
  expanded: boolean,
  record: TranscriptRecord | null,
): PanelView | null {
  if (phase === 'notice') return 'notice';
  if (phase === 'capturing' || phase === 'queued' || phase === 'working') {
    return 'status';
  }
  if (phase === 'error') return 'error';
  if (phase === 'success' && record && expanded) return 'transcript';
  return null;
}

function statusLabel(phase: Phase, stage: ProgressStage) {
  if (stage === 'formatting' && phase === 'working') return 'Formatando…';
  return 'Transcrevendo…';
}
