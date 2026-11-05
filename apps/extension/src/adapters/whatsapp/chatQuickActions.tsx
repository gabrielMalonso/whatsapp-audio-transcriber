import { createRoot } from "react-dom/client";
import { ChatQuickActions } from "../../components/ChatQuickActions";
import { createChatActionRunner } from "./chatActions";
import { findChatRows, isCurrentChat, type ChatRow } from "./chatRows";
import styles from "./chatQuickActions.css?inline";

// Reserve room only while controls replace the timestamp. Lower-row unread,
// pinned and muted badges, and WhatsApp's own dropdown, remain untouched.
const pageStyles = `
[data-wat-chat-meta] { position: relative; }
[data-wat-chat-active] [data-wat-chat-meta] {
  min-inline-size: 112px;
  flex-shrink: 0;
  color: transparent !important;
}
[data-wat-chat-active] [data-wat-chat-meta] > :not([data-wat-chat-actions]) {
  opacity: 0 !important;
  pointer-events: none !important;
}
`;

type MountedActions = { chat: ChatRow; host: HTMLElement; dispose: () => void };

export function startChatQuickActions(): () => void {
  const mounted = new Map<HTMLElement, MountedActions>();
  const run = createChatActionRunner();
  const pageSheet = document.createElement("style");
  pageSheet.textContent = pageStyles;
  document.documentElement.append(pageSheet);
  let frame = 0;

  const scan = () => {
    frame = 0;
    const chats = findChatRows();
    const found = new Set(chats.map((chat) => chat.row));
    for (const [row, current] of mounted) {
      if (
        !found.has(row) ||
        !isCurrentChat(current.chat) ||
        !current.host.isConnected
      ) {
        current.dispose();
        mounted.delete(row);
      }
    }
    for (const chat of chats) {
      const current = mounted.get(chat.row);
      if (
        current?.chat.name === chat.name &&
        current.chat.metadata === chat.metadata
      )
        continue;
      current?.dispose();
      const host = document.createElement("span");
      host.dataset.watChatActions = "";
      chat.row.dataset.watChatRow = "";
      chat.metadata.dataset.watChatMeta = "";
      const shadow = host.attachShadow({ mode: "closed" });
      const stylesheet = document.createElement("style");
      stylesheet.textContent = styles;
      const app = document.createElement("span");
      shadow.append(stylesheet, app);
      chat.metadata.append(host);
      const controller = new AbortController();
      const root = createRoot(app);
      root.render(
        <ChatQuickActions
          run={(action) => run(chat, action, controller.signal)}
          signal={controller.signal}
        />,
      );
      let hovered = chat.row.matches(":hover");
      const sync = () => {
        if (controller.signal.aborted) return;
        const focused =
          shadow.activeElement?.matches(":focus-visible") ?? false;
        host.toggleAttribute("data-wat-chat-hover", hovered);
        chat.row.toggleAttribute("data-wat-chat-active", hovered || focused);
      };
      const enter = () => {
        hovered = true;
        sync();
      };
      const leave = () => {
        hovered = false;
        sync();
      };
      const focus = () => queueMicrotask(sync);
      chat.row.addEventListener("mouseenter", enter);
      chat.row.addEventListener("mouseleave", leave);
      shadow.addEventListener("focusin", focus);
      shadow.addEventListener("focusout", focus);
      sync();
      mounted.set(chat.row, {
        chat,
        host,
        dispose: () => {
          controller.abort();
          chat.row.removeEventListener("mouseenter", enter);
          chat.row.removeEventListener("mouseleave", leave);
          shadow.removeEventListener("focusin", focus);
          shadow.removeEventListener("focusout", focus);
          root.unmount();
          host.remove();
          delete chat.row.dataset.watChatRow;
          delete chat.row.dataset.watChatActive;
          delete chat.metadata.dataset.watChatMeta;
        },
      });
    }
  };
  const observer = new MutationObserver(() => {
    if (!frame) frame = requestAnimationFrame(scan);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["title", "data-id", "aria-rowindex"],
  });
  frame = requestAnimationFrame(scan);
  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    for (const current of mounted.values()) current.dispose();
    mounted.clear();
    pageSheet.remove();
  };
}
