import { Archive, Mail, MailOpen } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type {
  ChatAction,
  ChatActionResult,
} from "../adapters/whatsapp/chatActions";
import type { ChatReadState } from "../adapters/whatsapp/chatRows";

type Props = {
  readState: ChatReadState;
  run: (action: ChatAction) => Promise<ChatActionResult>;
  signal: AbortSignal;
};

type Hint = {
  action: "read" | "archive";
  anchor: HTMLElement;
  visible: boolean;
};

const alreadyDone: Record<ChatAction, string> = {
  archive: "Esta conversa já está arquivada.",
  "mark-unread": "Esta conversa já está marcada como não lida.",
  "mark-read": "Esta conversa já está marcada como lida.",
};

// Shared across rows, matching the sidebar tooltip provider’s warm window.
let tooltipWarmUntil = 0;

export function ChatQuickActions({ readState, run, signal }: Props) {
  const readAction = readState === "unread" ? "mark-read" : "mark-unread";
  const readLabel =
    readState === "unread" ? "Marcar como lido" : "Marcar como não lido";
  const ReadIcon = readState === "unread" ? MailOpen : Mail;
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const tooltipId = useId();
  const tooltip = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actions = useRef<HTMLDivElement>(null);
  const hintText = hint?.action === "read" ? readLabel : "Arquivar conversa";

  const clearHint = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (hint?.visible) tooltipWarmUntil = Date.now() + 400;
    setHint((current) => (current ? { ...current, visible: false } : null));
  };
  const showHint = (
    anchor: HTMLElement,
    action: Hint["action"],
    immediate = false,
  ) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setHint({ anchor, action, visible: true }),
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
  }, [hint, hintText, feedback]);

  const act = async (action: ChatAction) => {
    if (pending || signal.aborted) return;
    clearHint();
    setFeedback(null);
    setPending(true);
    try {
      const result = await run(action);
      if (!signal.aborted && result === "already-done") {
        setFeedback(alreadyDone[action]);
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
        aria-label={readLabel}
        aria-describedby={
          hint?.visible && hint.action === "read" ? tooltipId : undefined
        }
        disabled={pending}
        onMouseEnter={(event) => showHint(event.currentTarget, "read")}
        onMouseLeave={clearHint}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible"))
            showHint(event.currentTarget, "read", true);
        }}
        onBlur={clearHint}
        onClick={(event) => {
          if (event.nativeEvent.isTrusted) void act(readAction);
        }}
      >
        <ReadIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Arquivar conversa"
        aria-describedby={
          hint?.visible && hint.action === "archive" ? tooltipId : undefined
        }
        disabled={pending}
        onMouseEnter={(event) => showHint(event.currentTarget, "archive")}
        onMouseLeave={clearHint}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible"))
            showHint(event.currentTarget, "archive", true);
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
          {feedback ?? hintText}
        </div>
      )}
    </div>
  );
}
