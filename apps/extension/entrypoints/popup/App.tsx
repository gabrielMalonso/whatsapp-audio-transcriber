import {
  AlignLeft,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  List,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { browser } from 'wxt/browser';
import {
  DEFAULT_FORMATTING_SETTINGS,
  type FormattingSettings,
  type FormattingTone,
} from '../../src/formatting/settings';
import type {
  GroqConfigurationResponse,
  GroqStatus,
} from '../../src/providers/types';
import {
  cacheStats,
  clearTranscriptCache,
} from '../../src/storage/transcripts';
import {
  getFormattingSettings,
  saveFormattingSettings,
} from '../../src/storage/formattingSettings';
import appIcon from '../../assets/icon.png';

type Health = 'checking' | 'ready' | 'unavailable' | 'unconfigured';
type FormattingSaveState = 'loading' | 'saved' | 'saving' | 'error';

const iconSm = { 'aria-hidden': true, size: 14, strokeWidth: 1.75 } as const;

export function App() {
  const [health, setHealth] = useState<Health>('checking');
  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState('Verificando a conexão com a Groq…');
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [count, setCount] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [formatting, setFormatting] = useState<FormattingSettings>(
    DEFAULT_FORMATTING_SETTINGS,
  );
  const [formattingSaveState, setFormattingSaveState] =
    useState<FormattingSaveState>('loading');
  const formattingSaveVersion = useRef(0);

  const applyStatus = (status: GroqStatus) => {
    setLoaded(true);
    setDetail(status.message);
    setHealth(
      status.healthy
        ? 'ready'
        : status.configured
          ? 'unavailable'
          : 'unconfigured',
    );
    if (!status.configured) setEditing(true);
  };

  const refresh = useCallback(async () => {
    setHealth('checking');
    const [response, stats, formattingSettings] = await Promise.all([
      browser.runtime.sendMessage<{ type: 'wat.groq.status' }, GroqStatus>({
        type: 'wat.groq.status',
      }),
      cacheStats(),
      getFormattingSettings(),
    ]);
    setCount(stats.count);
    setBytes(stats.bytes);
    setFormatting(formattingSettings);
    setFormattingSaveState('saved');
    applyStatus(response);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveKey = async (event: React.FormEvent) => {
    event.preventDefault();
    if (apiKey.trim().length < 20) {
      setFormError('Cole uma API key válida da Groq.');
      return;
    }
    setSaving(true);
    setFormError('');
    const response = await browser.runtime.sendMessage<
      { type: 'wat.groq.save-key'; apiKey: string },
      GroqConfigurationResponse
    >({
      type: 'wat.groq.save-key',
      apiKey: apiKey.trim(),
    });
    setSaving(false);
    if (!response.saved) {
      setFormError(response.message);
      return;
    }
    setApiKey('');
    setEditing(false);
    applyStatus(response);
  };

  const removeKey = async () => {
    if (!window.confirm('Remover a API key salva nesta extensão?')) return;
    const response = await browser.runtime.sendMessage<
      { type: 'wat.groq.remove-key' },
      GroqStatus
    >({ type: 'wat.groq.remove-key' });
    setApiKey('');
    setEditing(true);
    applyStatus(response);
  };

  const clearCache = async () => {
    if (!window.confirm('Apagar todas as transcrições salvas?')) return;
    await clearTranscriptCache();
    setCount(0);
    setBytes(0);
  };

  const updateFormatting = (change: Partial<FormattingSettings>) => {
    const next = { ...formatting, ...change };
    const version = formattingSaveVersion.current + 1;
    formattingSaveVersion.current = version;
    setFormatting(next);
    setFormattingSaveState('saving');
    void saveFormattingSettings(next)
      .then(() => {
        if (formattingSaveVersion.current === version) {
          setFormattingSaveState('saved');
        }
      })
      .catch(() => {
        if (formattingSaveVersion.current === version) {
          setFormattingSaveState('error');
        }
      });
  };

  return (
    <main>
      <div className="atmosphere" aria-hidden="true" />

      <header
        className="reveal"
        style={{ '--d': '0ms' } as React.CSSProperties}
      >
        <img className="mark" src={appIcon} alt="" width={40} height={40} />
        <div className="brand">
          <p className="eyebrow">WhatsApp</p>
          <h1>Transcritor</h1>
        </div>
      </header>

      <section
        className={`status-card reveal ${health}`}
        style={{ '--d': '60ms' } as React.CSSProperties}
      >
        <div className={`status-dot ${health}`} />
        <div className="status-copy">
          <strong>{healthTitle(health)}</strong>
          {health !== 'ready' && <span>{detail}</span>}
        </div>
        <button
          type="button"
          className="icon-action"
          onClick={() => void refresh()}
          aria-label="Verificar novamente"
          title="Verificar novamente"
        >
          <RefreshCw
            {...iconSm}
            className={health === 'checking' ? 'spin' : undefined}
          />
        </button>
      </section>

      <section
        className="pipeline reveal"
        aria-label="Pipeline de transcrição"
        style={{ '--d': '110ms' } as React.CSSProperties}
      >
        <div className="pipeline-step">
          <span className="step-index">1</span>
          <div>
            <strong>Transcrever</strong>
            <small>Whisper Large v3 Turbo</small>
          </div>
        </div>
        <div className="pipeline-rail" aria-hidden="true" />
        <div className="pipeline-step">
          <span className="step-index">2</span>
          <div>
            <strong>Formatar</strong>
            <small>GPT-OSS 20B</small>
          </div>
        </div>
      </section>

      <section
        className="formatting-card reveal"
        aria-labelledby="formatting-title"
        style={{ '--d': '150ms' } as React.CSSProperties}
      >
        <div className="formatting-heading">
          <div className="formatting-title">
            <span className="formatting-mark" aria-hidden="true">
              <SlidersHorizontal size={15} strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="formatting-title">Formatação</h2>
              <p>Personalize o texto depois da transcrição</p>
            </div>
          </div>
          <span
            className={`save-state ${formattingSaveState}`}
            role="status"
            aria-live="polite"
          >
            {formattingSaveLabel(formattingSaveState)}
          </span>
        </div>

        {formattingSaveState === 'loading' ? (
          <div className="formatting-loading" aria-label="Carregando ajustes">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <>
            <div className="tone-block">
              <div className="setting-label">
                <strong>Tom</strong>
                <span>{toneDescription(formatting.tone)}</span>
              </div>
              <div className="tone-selector" role="radiogroup" aria-label="Tom">
                {(['colloquial', 'natural', 'formal'] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    role="radio"
                    aria-checked={formatting.tone === tone}
                    className={
                      formatting.tone === tone ? 'selected' : undefined
                    }
                    onClick={() => updateFormatting({ tone })}
                  >
                    {toneLabel(tone)}
                  </button>
                ))}
              </div>
            </div>

            <div className="formatting-options">
              <FormattingToggle
                icon={<AlignLeft size={15} strokeWidth={1.8} />}
                label="Parágrafos"
                detail="Separa ideias em blocos curtos"
                checked={formatting.addParagraphs}
                onChange={(addParagraphs) =>
                  updateFormatting({ addParagraphs })
                }
              />
              <FormattingToggle
                icon={<span className="period-icon">.</span>}
                label="Sem ponto final"
                detail="Remove o último ponto de cada linha"
                checked={formatting.removeFinalPeriod}
                onChange={(removeFinalPeriod) =>
                  updateFormatting({ removeFinalPeriod })
                }
              />
              <FormattingToggle
                icon={<CalendarDays size={15} strokeWidth={1.8} />}
                label="Datas"
                detail="Formata como DD/MM"
                checked={formatting.formatDates}
                onChange={(formatDates) => updateFormatting({ formatDates })}
              />
              <FormattingToggle
                icon={<Clock3 size={15} strokeWidth={1.8} />}
                label="Horas"
                detail="Formata como HH:MMh"
                checked={formatting.formatTimes}
                onChange={(formatTimes) => updateFormatting({ formatTimes })}
              />
              <FormattingToggle
                icon={<List size={15} strokeWidth={1.8} />}
                label="Listas"
                detail="Cria marcadores ao enumerar itens"
                checked={formatting.formatLists}
                onChange={(formatLists) => updateFormatting({ formatLists })}
              />
            </div>
          </>
        )}
      </section>

      <section
        className="reveal"
        style={{ '--d': '210ms' } as React.CSSProperties}
      >
        {!loaded ? (
          <div className="key-loading" aria-label="Carregando configuração">
            <span />
            <span />
          </div>
        ) : editing ? (
          <form className="key-form" onSubmit={(event) => void saveKey(event)}>
            <div className="form-heading">
              <div className="form-title">
                <KeyRound {...iconSm} />
                <div>
                  <strong>API key da Groq</strong>
                  <span>Salva só no armazenamento da extensão.</span>
                </div>
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Criar
                <ExternalLink size={12} strokeWidth={1.8} aria-hidden="true" />
              </a>
            </div>
            <label>
              <span className="sr-only">API key da Groq</span>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="gsk_…"
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              <button
                type="button"
                className="icon-action inset"
                onClick={() => setShowKey((value) => !value)}
                aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                title={showKey ? 'Ocultar' : 'Mostrar'}
              >
                {showKey ? <EyeOff {...iconSm} /> : <Eye {...iconSm} />}
              </button>
            </label>
            {formError && <p className="form-error">{formError}</p>}
            <div className="form-actions">
              {health !== 'unconfigured' && (
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              )}
              <button className="primary" type="submit" disabled={saving}>
                {saving ? 'Testando…' : 'Salvar e testar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="key-row">
            <div className="key-meta">
              <KeyRound {...iconSm} />
              <span>Chave configurada</span>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="text-action"
                onClick={() => setEditing(true)}
              >
                Trocar
              </button>
              <button
                type="button"
                className="icon-action danger"
                onClick={() => void removeKey()}
                aria-label="Remover chave"
                title="Remover"
              >
                <Trash2 {...iconSm} />
              </button>
            </div>
          </div>
        )}
      </section>

      <section
        className="cache-row reveal"
        style={{ '--d': '250ms' } as React.CSSProperties}
      >
        <div className="cache-meta">
          <span>Transcrições salvas</span>
          <div className="cache-stats">
            <strong>{count}</strong>
            <small>{formatBytes(bytes)}</small>
          </div>
        </div>
        <button
          type="button"
          className="icon-action"
          onClick={() => void clearCache()}
          disabled={!count}
          aria-label="Limpar transcrições"
          title="Limpar"
        >
          <Trash2 {...iconSm} />
        </button>
      </section>

      <footer
        className="reveal"
        style={{ '--d': '300ms' } as React.CSSProperties}
      >
        <span>v0.2</span>
      </footer>
    </main>
  );
}

function FormattingToggle({
  icon,
  label,
  detail,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="formatting-option"
      onClick={() => onChange(!checked)}
    >
      <span className="option-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="option-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

function healthTitle(health: Health) {
  if (health === 'ready') return 'Pronto';
  if (health === 'checking') return 'Verificando…';
  if (health === 'unconfigured') return 'Configure a chave';
  return 'Indisponível';
}

function toneLabel(tone: FormattingTone) {
  if (tone === 'colloquial') return 'Coloquial';
  if (tone === 'formal') return 'Formal';
  return 'Natural';
}

function toneDescription(tone: FormattingTone) {
  if (tone === 'colloquial') return 'Preserva gírias e informalidade';
  if (tone === 'formal') return 'Produz um texto escrito mais limpo';
  return 'Remove vícios de fala e mantém leveza';
}

function formattingSaveLabel(state: FormattingSaveState) {
  if (state === 'saving') return 'Salvando…';
  if (state === 'error') return 'Não foi possível salvar';
  if (state === 'saved') return 'Salvo';
  return 'Carregando…';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
