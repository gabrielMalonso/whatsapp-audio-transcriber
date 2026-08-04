import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type {
  GroqConfigurationResponse,
  GroqStatus,
} from '../../src/providers/types';
import {
  cacheStats,
  clearTranscriptCache,
} from '../../src/storage/transcripts';

type Health = 'checking' | 'ready' | 'unavailable' | 'unconfigured';

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
    const [response, stats] = await Promise.all([
      browser.runtime.sendMessage({
        type: 'wat.groq.status',
      }) as Promise<GroqStatus>,
      cacheStats(),
    ]);
    setCount(stats.count);
    setBytes(stats.bytes);
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
    const response = (await browser.runtime.sendMessage({
      type: 'wat.groq.save-key',
      apiKey: apiKey.trim(),
    })) as GroqConfigurationResponse;
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
    const response = (await browser.runtime.sendMessage({
      type: 'wat.groq.remove-key',
    })) as GroqStatus;
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

  return (
    <main>
      <header>
        <div className="mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 9v6M9 5v14M13 8v8M17 3v18M21 9v6" />
          </svg>
        </div>
        <div>
          <p className="eyebrow">WHATSAPP · GROQ</p>
          <h1>Transcritor</h1>
        </div>
      </header>

      <section className="status-card">
        <div className={`status-dot ${health}`} />
        <div>
          <strong>{healthTitle(health)}</strong>
          <span>{detail}</span>
        </div>
        <button
          type="button"
          className="refresh"
          onClick={refresh}
          aria-label="Verificar novamente"
        >
          ↻
        </button>
      </section>

      <section className="pipeline" aria-label="Pipeline de transcrição">
        <p>PIPELINE</p>
        <div className="pipeline-step">
          <span>01</span>
          <div>
            <strong>Transcrição</strong>
            <small>Whisper Large v3 Turbo</small>
          </div>
        </div>
        <div className="pipeline-line" />
        <div className="pipeline-step">
          <span>02</span>
          <div>
            <strong>Formatação</strong>
            <small>GPT-OSS 20B · reasoning low</small>
          </div>
        </div>
      </section>

      {!loaded ? (
        <div className="key-loading" aria-label="Carregando configuração">
          <span />
          <span />
        </div>
      ) : editing ? (
        <form className="key-form" onSubmit={saveKey}>
          <div className="form-heading">
            <div>
              <strong>API key da Groq</strong>
              <span>Salva somente no armazenamento da extensão.</span>
            </div>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
            >
              Criar chave ↗
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
            <button type="button" onClick={() => setShowKey((value) => !value)}>
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            {health !== 'unconfigured' && (
              <button
                className="secondary"
                type="button"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            )}
            <button className="save" type="submit" disabled={saving}>
              {saving ? 'Testando…' : 'Salvar e testar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="key-actions">
          <span>Chave configurada</span>
          <button type="button" onClick={() => setEditing(true)}>
            Trocar
          </button>
          <button type="button" className="danger" onClick={removeKey}>
            Remover
          </button>
        </div>
      )}

      <div className="privacy-note">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5v13M3 5l5-3.5L13 5M3 11l5 3.5 5-3.5" />
        </svg>
        <span>
          O áudio é enviado diretamente à Groq; não passa por servidor próprio.
        </span>
      </div>

      <section className="cache-row">
        <div>
          <span>Transcrições salvas</span>
          <strong>{count}</strong>
          <small>{formatBytes(bytes)}</small>
        </div>
        <button type="button" onClick={clearCache} disabled={!count}>
          Limpar
        </button>
      </section>

      <footer>
        <span>Idioma automático · macOS · Windows · Linux</span>
        <code>v0.2 · {browser.runtime.id}</code>
      </footer>
    </main>
  );
}

function healthTitle(health: Health) {
  if (health === 'ready') return 'Pipeline pronto';
  if (health === 'checking') return 'Verificando…';
  if (health === 'unconfigured') return 'Configuração necessária';
  return 'Groq indisponível';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
