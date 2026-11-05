import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChatActionRunner } from "./chatActions";
import { findChatRows, isCurrentChat } from "./chatRows";

function fixture() {
  document.body.innerHTML = `
    <div id="pane-side"><div role="row" aria-rowindex="1">
      <div tabindex="-1">
        <div><div role="gridcell" aria-colindex="2"><span title="Example" dir="auto">Example</span></div><div data-meta><span>12:34</span></div></div>
        <div data-preview>Preview <span data-unread>2</span><button data-menu><span data-icon="down"></span></button></div>
      </div>
    </div></div>
    <main><div role="row"><span title="Message" dir="auto"></span></div></main>`;
  const chat = findChatRows()[0]!;
  const trigger = document.querySelector<HTMLButtonElement>("[data-menu]")!;
  return { chat, trigger };
}

function menu(label = "Arquivar conversa") {
  const popup = document.createElement("div");
  popup.dataset.animateDropdownPopup = "true";
  const list = document.createElement("div");
  list.setAttribute("role", "menu");
  const action = document.createElement("div");
  action.setAttribute("role", "button");
  action.setAttribute("aria-label", label);
  action.textContent = label;
  const click = vi.fn();
  action.addEventListener("click", click);
  list.append(action);
  popup.append(list);
  document.body.append(popup);
  list.addEventListener("keydown", (event) => {
    if (event.key === "Escape") popup.remove();
  });
  return { popup, click };
}

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.useRealTimers();
});

describe("WhatsApp sidebar adapter", () => {
  it("only finds chat rows with a separate timestamp slot", () => {
    const { chat } = fixture();
    expect(findChatRows()).toHaveLength(1);
    expect(chat.metadata).toBe(document.querySelector("[data-meta]"));
    chat.metadata.remove();
    expect(findChatRows()).toHaveLength(0);
  });

  it("detects recycled and detached rows before acting", () => {
    const { chat } = fixture();
    expect(isCurrentChat(chat)).toBe(true);
    chat.name.title = "Another conversation";
    expect(isCurrentChat(chat)).toBe(false);
    chat.row.remove();
    expect(isCurrentChat(chat)).toBe(false);
  });

  it("detects row reuse for chats with identical display names", () => {
    const { chat } = fixture();
    chat.row.setAttribute("aria-rowindex", "12");
    expect(isCurrentChat(chat)).toBe(false);
  });

  it.each([
    ["Não lida", "unread"],
    ["1 mensagem não lida", "unread"],
    ["12 mensagens não lidas", "unread"],
    ["Unread", "unread"],
    ["2 unread messages", "unread"],
    ["3 mensajes no leídos", "unread"],
    ["Marcar como não lida", "read"],
    ["", "read"],
  ])("detects read state from the badge %s", (label, expected) => {
    const { chat } = fixture();
    const badge = chat.row.querySelector("[data-unread]")!;
    badge.setAttribute("aria-label", label);
    expect(findChatRows()[0]?.readState).toBe(expected);
  });

  it("dispatches the native action, including nested dropdown/menu markup", async () => {
    const { chat, trigger } = fixture();
    let clicked = vi.fn();
    let openingOpacity = "";
    trigger.addEventListener("click", () => {
      const opened = menu();
      clicked = opened.click;
      openingOpacity = getComputedStyle(opened.popup).opacity;
    });
    const result = await createChatActionRunner()(
      chat,
      "archive",
      new AbortController().signal,
    );
    expect(result).toBe("dispatched");
    expect(openingOpacity).toBe("0");
    expect(clicked).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it("keeps a closing menu invisible without hiding menus opened afterward", async () => {
    const { chat, trigger } = fixture();
    let closing: HTMLElement | undefined;
    trigger.addEventListener("click", () => {
      closing = menu().popup;
      closing.addEventListener("keydown", (event) => event.stopPropagation(), {
        capture: true,
      });
    });
    await createChatActionRunner()(
      chat,
      "archive",
      new AbortController().signal,
    );
    expect(closing?.isConnected).toBe(true);
    expect(getComputedStyle(closing!).opacity).toBe("0");
    const manual = menu().popup;
    expect(getComputedStyle(manual).opacity).not.toBe("0");
    closing?.remove();
    await vi.waitFor(() =>
      expect(document.querySelector("[data-wat-chat-menu-mask]")).toBeNull(),
    );
  });

  it("restores a menu that refuses to close instead of leaving an invisible popup", async () => {
    vi.useFakeTimers();
    const { chat, trigger } = fixture();
    let stuck: HTMLElement | undefined;
    trigger.addEventListener("click", () => {
      stuck = menu().popup;
      stuck.addEventListener("keydown", (event) => event.stopPropagation(), {
        capture: true,
      });
    });
    await createChatActionRunner()(
      chat,
      "archive",
      new AbortController().signal,
    );
    expect(getComputedStyle(stuck!).opacity).toBe("0");
    await vi.advanceTimersByTimeAsync(1_500);
    expect(getComputedStyle(stuck!).opacity).not.toBe("0");
    expect(document.querySelector("[data-wat-chat-menu-mask]")).toBeNull();
  });

  it.each([
    ["mark-unread", "Marcar como não lida"],
    ["mark-unread", "Mark as unread"],
    ["mark-unread", "Marcar como no leído"],
    ["mark-read", "Marcar como lida"],
    ["mark-read", "Mark as read"],
    ["mark-read", "Marcar como leído"],
  ] as const)(
    "supports %s with the exact native label %s",
    async (action, label) => {
      const { chat, trigger } = fixture();
      let clicked = vi.fn();
      trigger.addEventListener("click", () => {
        clicked = menu(label).click;
      });
      await createChatActionRunner()(
        chat,
        action,
        new AbortController().signal,
      );
      expect(clicked).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["archive", "Desarquivar conversa"],
    ["mark-unread", "Marcar como lida"],
    ["mark-read", "Marcar como não lida"],
  ] as const)("never toggles the inverse of %s", async (action, label) => {
    const { chat, trigger } = fixture();
    let clicked = vi.fn();
    trigger.addEventListener("click", () => {
      clicked = menu(label).click;
    });
    expect(
      await createChatActionRunner()(
        chat,
        action,
        new AbortController().signal,
      ),
    ).toBe("already-done");
    expect(clicked).not.toHaveBeenCalled();
  });

  it("uses the row context menu when the hover dropdown is absent, without opening the chat", async () => {
    const { chat, trigger } = fixture();
    trigger.remove();
    const openChat = vi.fn();
    chat.row.addEventListener("click", openChat);
    let clicked = vi.fn();
    chat.row.addEventListener("contextmenu", () => {
      clicked = menu().click;
    });
    await createChatActionRunner()(
      chat,
      "archive",
      new AbortController().signal,
    );
    expect(clicked).toHaveBeenCalledOnce();
    expect(openChat).not.toHaveBeenCalled();
  });

  it("refuses to use an already open menu", async () => {
    const { chat } = fixture();
    const { click } = menu();
    await expect(
      createChatActionRunner()(chat, "archive", new AbortController().signal),
    ).rejects.toThrow("Feche o menu");
    expect(click).not.toHaveBeenCalled();
  });

  it("rejects a recycled row even if the native menu arrives afterward", async () => {
    const { chat, trigger } = fixture();
    let clicked = vi.fn();
    trigger.addEventListener("click", () => {
      chat.name.title = "Another conversation";
      clicked = menu().click;
    });
    await expect(
      createChatActionRunner()(chat, "archive", new AbortController().signal),
    ).rejects.toThrow("conversa mudou");
    expect(clicked).not.toHaveBeenCalled();
  });

  it("cancels a delayed action when the user interacts elsewhere", async () => {
    const { chat } = fixture();
    const promise = createChatActionRunner()(
      chat,
      "archive",
      new AbortController().signal,
    );
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    const { click } = menu();
    await expect(promise).rejects.toThrow("menu");
    expect(click).not.toHaveBeenCalled();
    expect(document.querySelector("[data-wat-chat-menu-mask]")).toBeNull();
  });

  it("serializes commands and releases the lock after cancellation", async () => {
    const { chat } = fixture();
    const run = createChatActionRunner();
    const controller = new AbortController();
    const first = run(chat, "archive", controller.signal);
    await expect(run(chat, "archive", controller.signal)).rejects.toThrow(
      "Aguarde",
    );
    controller.abort();
    await expect(first).rejects.toThrow("menu");
    const aborted = new AbortController();
    aborted.abort();
    await expect(run(chat, "archive", aborted.signal)).rejects.toThrow(
      "conversa mudou",
    );
  });

  it("fails visibly when WhatsApp does not expose a supported menu", async () => {
    vi.useFakeTimers();
    const { chat } = fixture();
    const promise = createChatActionRunner()(
      chat,
      "archive",
      new AbortController().signal,
    );
    const assertion = expect(promise).rejects.toThrow(
      "Não foi possível acessar o menu",
    );
    await vi.advanceTimersByTimeAsync(1_500);
    await assertion;
    expect(document.querySelector("[data-wat-chat-menu-mask]")).toBeNull();
  });
});
