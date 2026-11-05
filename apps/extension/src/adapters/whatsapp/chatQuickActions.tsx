import { createRoot } from "react-dom/client";
import { ChatQuickActions } from "../../components/ChatQuickActions";
import { createChatActionRunner } from "./chatActions";
import {
  findChatRows,
  isCurrentChat,
  type ChatReadState,
  type ChatRow,
} from "./chatRows";
import styles from "./chatQuickActions.css?inline";

// Let the controls' intrinsic width replace the timestamp in the native flex row.
const pageStyles = `
[data-wat-chat-active] [data-wat-chat-meta] {
  display: none !important;
}
`;

type MountedActions = {
  chat: ChatRow;
  host: HTMLElement;
  update: (readState: ChatReadState) => void;
  dispose: () => void;
};

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
      ) {
        if (current.chat.readState !== chat.readState) {
          current.chat = chat;
          current.update(chat.readState);
        }
        continue;
      }
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
      chat.metadata.after(host);
      const controller = new AbortController();
      const root = createRoot(app);
      const update = (readState: ChatReadState) => {
        root.render(
          <ChatQuickActions
            readState={readState}
            run={(action) => run(chat, action, controller.signal)}
            signal={controller.signal}
          />,
        );
      };
      update(chat.readState);
      let hovered = chat.row.matches(":hover");
      const sync = () => {
        if (controller.signal.aborted) return;
        const focused =
          shadow.activeElement?.matches(":focus-visible") ?? false;
        host.toggleAttribute("data-wat-chat-visible", hovered || focused);
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
        update,
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
    attributeFilter: ["title", "data-id", "aria-rowindex", "aria-label"],
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
