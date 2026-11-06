import { Archive, Mail, MailOpen, type LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
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

type ActionButton = {
  id: Hint["action"];
  action: ChatAction;
  label: string;
  icon: LucideIcon;
  text?: string;
};

const readButtons: Record<ChatReadState, ActionButton> = {
  read: {
    id: "read",
    action: "mark-unread",
    label: "Marcar como não lido",
    icon: Mail,
  },
  unread: {
    id: "read",
    action: "mark-read",
    label: "Marcar como lido",
    icon: MailOpen,
  },
};
const archiveButton: ActionButton = {
  id: "archive",
  action: "archive",
  label: "Arquivar conversa",
  icon: Archive,
  text: "Arquivar",
};

const TOOLTIP_OPEN_DELAY_MS = 150;
const TOOLTIP_WARM_WINDOW_MS = 400;
const FEEDBACK_DURATION_MS = 5_000;

const alreadyDone: Record<ChatAction, string> = {
  archive: "Esta conversa já está arquivada.",
  "mark-unread": "Esta conversa já está marcada como não lida.",
  "mark-read": "Esta conversa já está marcada como lida.",
};

// Shared across rows, matching the sidebar tooltip provider’s warm window.
let tooltipWarmUntil = 0;

export function ChatQuickActions({
  readState,
  run,
  signal,
}: Props): ReactElement {
  const readButton = readButtons[readState];
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const tooltipId = useId();
  const tooltip = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actions = useRef<HTMLDivElement>(null);
  const hintText =
    hint?.action === "read" ? readButton.label : archiveButton.label;

  const hideHint = useCallback(
    function hideHint(): void {
      if (hint?.visible) tooltipWarmUntil = Date.now() + TOOLTIP_WARM_WINDOW_MS;
      setHint((current) => (current ? { ...current, visible: false } : null));
    },
    [hint?.visible],
  );

  function clearHint(): void {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    hideHint();
  }

  const showHint = useCallback(function showHint(
    anchor: HTMLElement,
    action: Hint["action"],
    immediate = false,
  ): void {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setHint({ anchor, action, visible: true }),
      immediate || Date.now() < tooltipWarmUntil ? 0 : TOOLTIP_OPEN_DELAY_MS,
    );
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [feedback]);
  useEffect(() => {
    const popup = tooltip.current;
    if (!popup) return;
    let anchor: HTMLElement | null = null;
    if (feedback) {
      anchor = actions.current;
    } else if (hint?.visible) {
      anchor = hint.anchor;
    }
    if (!anchor) {
      popup.hidePopover?.();
      return;
    }
    popup.showPopover?.();
    const rect = anchor.getBoundingClientRect();
    const width = popup.offsetWidth;
    const height = popup.offsetHeight;
    const left = Math.max(
      5,
      Math.min(
        (rect.left + rect.right - width) / 2,
        window.innerWidth - width - 5,
      ),
    );
    const top = rect.top - height - 4;
    popup.style.left = `${left}px`;
    popup.style.top = `${top >= 5 ? top : rect.bottom + 4}px`;

    function dismiss(): void {
      hideHint();
      setFeedback(null);
    }
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      popup.hidePopover?.();
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [hint, hintText, feedback, hideHint]);

  async function act(action: ChatAction): Promise<void> {
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
  }

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
      {[readButton, archiveButton].map(
        ({ id, action, label, icon: Icon, text }) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-describedby={
              hint?.visible && hint.action === id ? tooltipId : undefined
            }
            disabled={pending}
            onMouseEnter={(event) => showHint(event.currentTarget, id)}
            onMouseLeave={clearHint}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible"))
                showHint(event.currentTarget, id, true);
            }}
            onBlur={clearHint}
            onClick={(event) => {
              if (event.nativeEvent.isTrusted) void act(action);
            }}
          >
            <Icon aria-hidden="true" />
            {text && <span>{text}</span>}
          </button>
        ),
      )}
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
