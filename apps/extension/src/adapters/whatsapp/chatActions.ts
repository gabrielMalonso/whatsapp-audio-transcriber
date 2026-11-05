import { isCurrentChat, type ChatRow } from "./chatRows";

export type ChatAction = "archive" | "mark-unread";
export type ChatActionResult = "dispatched" | "already-done";

const MENU_SELECTOR = '[role="menu"], [data-animate-dropdown-popup="true"]';
const ITEM_SELECTOR = '[role="menuitem"], [role="button"], li[tabindex]';
const labels: Record<ChatAction, readonly string[]> = {
  archive: [
    "Arquivar conversa",
    "Arquivar",
    "Archive chat",
    "Archive",
    "Archivar chat",
    "Archivar",
  ],
  "mark-unread": [
    "Marcar como não lida",
    "Marcar como não lido",
    "Mark as unread",
    "Marcar como no leído",
    "Marcar como no leída",
  ],
};
const inverseLabels: Record<ChatAction, readonly string[]> = {
  archive: [
    "Desarquivar conversa",
    "Desarquivar",
    "Unarchive chat",
    "Unarchive",
    "Desarchivar chat",
    "Desarchivar",
  ],
  "mark-unread": [
    "Marcar como lida",
    "Marcar como lido",
    "Mark as read",
    "Marcar como leído",
    "Marcar como leída",
  ],
};

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function isVisible(element: HTMLElement): boolean {
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node);
    if (
      node.hidden ||
      style.display === "none" ||
      style.visibility === "hidden"
    )
      return false;
  }
  return true;
}

function openMenus(): HTMLElement[] {
  const menus = [
    ...document.querySelectorAll<HTMLElement>(MENU_SELECTOR),
  ].filter(isVisible);
  // WhatsApp can nest role=menu inside its animated dropdown container.
  return menus.filter(
    (menu) => !menus.some((other) => other !== menu && menu.contains(other)),
  );
}

function findItem(
  menu: HTMLElement,
  expected: readonly string[],
): HTMLElement | undefined {
  return [...menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].find((item) => {
    const label = normalize(
      item.getAttribute("aria-label") ?? item.textContent ?? "",
    );
    return (
      isVisible(item) &&
      item.getAttribute("aria-disabled") !== "true" &&
      !item.hasAttribute("disabled") &&
      expected.some((value) => normalize(value) === label)
    );
  });
}

function concealActionMenu() {
  const sheet = document.createElement("style");
  sheet.dataset.watChatMenuMask = "";
  sheet.textContent = `
    :root[data-wat-chat-menu-opening] :is(${MENU_SELECTOR}),
    [data-wat-chat-menu-owned] {
      opacity: 0 !important;
      pointer-events: none !important;
      animation: none !important;
      transition: none !important;
    }
  `;
  document.documentElement.append(sheet);
  document.documentElement.dataset.watChatMenuOpening = "";
  let popup: HTMLElement | null = null;
  return {
    claim(menu: HTMLElement) {
      popup =
        menu.closest<HTMLElement>('[data-animate-dropdown-popup="true"]') ??
        menu;
      popup.dataset.watChatMenuOwned = "";
      delete document.documentElement.dataset.watChatMenuOpening;
    },
    release() {
      delete document.documentElement.dataset.watChatMenuOpening;
      if (!popup?.isConnected || !isVisible(popup)) {
        popup?.removeAttribute("data-wat-chat-menu-owned");
        sheet.remove();
        return;
      }
      // Keep the mask through WhatsApp's asynchronous exit, but never trap a
      // later user interaction or leave an unclosable menu invisible.
      const cleanup = () => {
        observer.disconnect();
        clearTimeout(timeout);
        document.removeEventListener("pointerdown", cleanup, true);
        document.removeEventListener("keydown", cleanup, true);
        popup?.removeAttribute("data-wat-chat-menu-owned");
        sheet.remove();
      };
      const observer = new MutationObserver(() => {
        if (!popup?.isConnected || !isVisible(popup)) cleanup();
      });
      const timeout = setTimeout(cleanup, 1_500);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "hidden", "class"],
      });
      document.addEventListener("pointerdown", cleanup, true);
      document.addEventListener("keydown", cleanup, true);
    },
  };
}

/** Serializes access to WhatsApp's single native context menu. */
export function createChatActionRunner() {
  let busy = false;
  return async (
    chat: ChatRow,
    action: ChatAction,
    signal: AbortSignal,
  ): Promise<ChatActionResult> => {
    if (busy) throw new Error("Aguarde a ação anterior terminar.");
    if (!isCurrentChat(chat) || signal.aborted)
      throw new Error("A conversa mudou. Tente novamente.");
    if (openMenus().length)
      throw new Error("Feche o menu aberto e tente novamente.");
    busy = true;
    let ownedMenu: HTMLElement | null = null;
    const controller = new AbortController();
    const abort = () => controller.abort();
    const onKey = () => abort();
    // A different user interaction cancels the pending command rather than
    // accidentally choosing an item from a newly opened menu.
    document.addEventListener("pointerdown", abort, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("scroll", abort, true);
    signal.addEventListener("abort", abort, { once: true });
    const mask = concealActionMenu();
    try {
      const menuPromise = waitForMenu(controller.signal);
      const icon = chat.row.querySelector(
        '[data-icon="down"], [data-icon="chevron-down"]',
      );
      const trigger = icon?.closest<HTMLElement>('button, [role="button"]');
      if (trigger && !trigger.contains(chat.name)) {
        trigger.click();
      } else {
        const target =
          chat.row.querySelector<HTMLElement>('[tabindex="-1"]') ?? chat.name;
        const rect = chat.row.getBoundingClientRect();
        target.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            button: 2,
            buttons: 2,
            clientX: Math.max(rect.left, rect.right - 24),
            clientY: rect.top + Math.min(24, rect.height / 2),
          }),
        );
      }
      ownedMenu = await menuPromise;
      mask.claim(ownedMenu);
      if (controller.signal.aborted || !isCurrentChat(chat)) {
        throw new Error("A conversa mudou. Tente novamente.");
      }
      const item = findItem(ownedMenu, labels[action]);
      if (!item) {
        if (findItem(ownedMenu, inverseLabels[action])) return "already-done";
        throw new Error(
          "Esta ação não está disponível. Use o menu da conversa.",
        );
      }
      item.click();
      // This confirms DOM dispatch, not server-side completion. WhatsApp owns
      // the resulting state, row removal, errors and undo notification.
      return "dispatched";
    } finally {
      if (ownedMenu?.isConnected && isVisible(ownedMenu)) {
        ownedMenu.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            bubbles: true,
          }),
        );
      }
      controller.abort();
      mask.release();
      signal.removeEventListener("abort", abort);
      document.removeEventListener("pointerdown", abort, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("scroll", abort, true);
      busy = false;
    }
  };
}

function waitForMenu(signal: AbortSignal): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const finish = (menu?: HTMLElement) => {
      observer.disconnect();
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
      if (menu) resolve(menu);
      else
        reject(
          new Error("Não foi possível acessar o menu. Use o menu da conversa."),
        );
    };
    const cancel = () => finish();
    const observer = new MutationObserver(() => {
      const menus = openMenus();
      if (menus.length === 1 && menus[0]?.querySelector(ITEM_SELECTOR))
        finish(menus[0]);
    });
    const timeout = setTimeout(cancel, 1_500);
    signal.addEventListener("abort", cancel, { once: true });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "hidden"],
    });
    if (signal.aborted) cancel();
  });
}
