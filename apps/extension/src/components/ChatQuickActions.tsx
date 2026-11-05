import { Archive, MailPlus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type {
  ChatAction,
  ChatActionResult,
} from "../adapters/whatsapp/chatActions";

type Props = {
  run: (action: ChatAction) => Promise<ChatActionResult>;
  signal: AbortSignal;
};

type Hint = { text: string; anchor: HTMLElement; visible: boolean };

// Shared across rows, matching the sidebar tooltip provider’s warm window.
let tooltipWarmUntil = 0;

export function ChatQuickActions({ run, signal }: Props) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const tooltipId = useId();
  const tooltip = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actions = useRef<HTMLDivElement>(null);

  const clearHint = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (hint?.visible) tooltipWarmUntil = Date.now() + 400;
    setHint((current) => (current ? { ...current, visible: false } : null));
  };
  const showHint = (anchor: HTMLElement, text: string, immediate = false) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setHint({ anchor, text, visible: true }),
      immediate || Date.now() < tooltipWarmUntil ? 0 : 150,
    );
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 5_000);
    return () => clearTimeout(timeout);
  }, [feedback]);
  useEffect(() => {
    const popup = tooltip.current;
    const anchor = feedback
      ? actions.current
      : hint?.visible
        ? hint.anchor
        : null;
    if (!popup) return;
    if (!anchor) {
      popup.hidePopover?.();
      return;
    }
    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const width = popup.offsetWidth;
      const height = popup.offsetHeight;
      popup.style.left = `${Math.max(5, Math.min((rect.left + rect.right - width) / 2, window.innerWidth - width - 5))}px`;
      const top = rect.top - height - 4;
      popup.style.top = `${top >= 5 ? top : rect.bottom + 4}px`;
    };
    popup.showPopover?.();
    position();
    const dismiss = () => {
      if (hint?.visible) tooltipWarmUntil = Date.now() + 400;
      setHint((current) => (current ? { ...current, visible: false } : null));
      setFeedback(null);
    };
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      popup.hidePopover?.();
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [hint, feedback]);

  const act = async (action: ChatAction) => {
    if (pending || signal.aborted) return;
    clearHint();
    setFeedback(null);
    setPending(true);
    try {
      const result = await run(action);
      if (!signal.aborted && result === "already-done") {
        setFeedback(
          action === "archive"
            ? "Esta conversa já está arquivada."
            : "Esta conversa já está marcada como não lida.",
        );
      }
    } catch (error) {
      if (!signal.aborted)
        setFeedback(
          error instanceof Error
            ? error.message
            : "Use o menu da conversa para tentar novamente.",
        );
    } finally {
      if (!signal.aborted) setPending(false);
    }
  };

  return (
    <div
      className="wat-chat-actions"
      ref={actions}
      role="group"
      aria-label="Ações da conversa"
      aria-busy={pending}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") clearHint();
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
    >
      <button
        type="button"
        aria-label="Marcar como não lido"
        aria-describedby={
          hint?.visible && hint.text === "Marcar como não lido"
            ? tooltipId
            : undefined
        }
        disabled={pending}
        onMouseEnter={(event) =>
          showHint(event.currentTarget, "Marcar como não lido")
        }
        onMouseLeave={clearHint}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible"))
            showHint(event.currentTarget, "Marcar como não lido", true);
        }}
        onBlur={clearHint}
        onClick={(event) => {
          if (event.nativeEvent.isTrusted) void act("mark-unread");
        }}
      >
        <MailPlus aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Arquivar conversa"
        aria-describedby={
          hint?.visible && hint.text === "Arquivar conversa"
            ? tooltipId
            : undefined
        }
        disabled={pending}
        onMouseEnter={(event) =>
          showHint(event.currentTarget, "Arquivar conversa")
        }
        onMouseLeave={clearHint}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible"))
            showHint(event.currentTarget, "Arquivar conversa", true);
        }}
        onBlur={clearHint}
        onClick={(event) => {
          if (event.nativeEvent.isTrusted) void act("archive");
        }}
      >
        <Archive aria-hidden="true" />
        <span>Arquivar</span>
      </button>
      <span className="wat-chat-sr-only" role="status">
        {feedback}
      </span>
      {(feedback || hint) && (
        <div
          ref={tooltip}
          popover="manual"
          className="wat-chat-tooltip"
          role="tooltip"
          id={tooltipId}
        >
          {feedback ?? hint?.text}
        </div>
      )}
    </div>
  );
}
