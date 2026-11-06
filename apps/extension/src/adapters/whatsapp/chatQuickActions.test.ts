import { waitFor } from "@testing-library/react";
import type { ComponentProps, ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatQuickActions } from "../../components/ChatQuickActions";
import { startChatQuickActions } from "./chatQuickActions";
import { findChatRows } from "./chatRows";

const { unmount, renderRoot } = vi.hoisted(() => ({
  unmount: vi.fn(),
  renderRoot:
    vi.fn<
      (element: ReactElement<ComponentProps<typeof ChatQuickActions>>) => void
    >(),
}));
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: renderRoot, unmount })),
}));

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

function fixture(): HTMLElement {
  document.body.innerHTML = `<div id="pane-side"><div role="row">
    <div><div role="gridcell" aria-colindex="2"><span dir="auto" title="Example">Example</span></div><div data-meta><span>12:34</span></div></div>
    <div data-preview>Message <span data-unread>2</span></div>
  </div></div>`;
  return document.querySelector<HTMLElement>('[role="row"]')!;
}

function mountedHost(): Promise<HTMLElement> {
  return waitFor(() => {
    const host = document.querySelector<HTMLElement>("[data-wat-chat-actions]");
    if (!host) throw new Error("Chat actions have not mounted yet.");
    return host;
  });
}

describe("sidebar action lifecycle", () => {
  it("reveals only the hovered row and restores its timestamp on mouse leave", async () => {
    const row = fixture();
    stop = startChatQuickActions();
    const host = await mountedHost();
    expect(findChatRows()).toHaveLength(1);
    expect(host.previousElementSibling).toBe(row.querySelector("[data-meta]"));
    row.dispatchEvent(new MouseEvent("mouseenter"));
    expect(host.hasAttribute("data-wat-chat-visible")).toBe(true);
    expect(row.hasAttribute("data-wat-chat-active")).toBe(true);
    row.dispatchEvent(new MouseEvent("mouseleave"));
    expect(host.hasAttribute("data-wat-chat-visible")).toBe(false);
    expect(row.hasAttribute("data-wat-chat-active")).toBe(false);
    expect(row.querySelector("[data-meta]")?.textContent).toBe("12:34");
    expect(row.querySelector("[data-unread]")?.textContent).toBe("2");
    expect(host.shadowRoot).toBeNull();
  });

  it("replaces actions when WhatsApp recycles a row for a different chat", async () => {
    const row = fixture();
    stop = startChatQuickActions();
    const host = await mountedHost();
    row.querySelector<HTMLElement>("[title]")!.title = "Another conversation";
    await waitFor(() => expect(host.isConnected).toBe(false));
    expect(unmount).toHaveBeenCalledOnce();
    expect(await mountedHost()).not.toBe(host);
    expect(row.querySelectorAll("[data-wat-chat-actions]")).toHaveLength(1);
  });

  it("updates the read action when unread badges change without remounting or cancelling the row", async () => {
    const row = fixture();
    stop = startChatQuickActions();
    const host = await mountedHost();
    const initial = renderRoot.mock.calls[0]![0].props;
    expect(initial.readState).toBe("read");
    const badge = row.querySelector("[data-unread]")!;
    badge.setAttribute("aria-label", "2 mensagens não lidas");
    await waitFor(() =>
      expect(renderRoot.mock.lastCall?.[0].props.readState).toBe("unread"),
    );
    badge.remove();
    await waitFor(() =>
      expect(renderRoot.mock.lastCall?.[0].props.readState).toBe("read"),
    );
    expect(await mountedHost()).toBe(host);
    expect(initial.signal.aborted).toBe(false);
    expect(unmount).not.toHaveBeenCalled();
  });

  it("removes roots from detached rows and restores all injected attributes on stop", async () => {
    const row = fixture();
    stop = startChatQuickActions();
    await mountedHost();
    row.remove();
    await waitFor(() =>
      expect(row.querySelector("[data-wat-chat-actions]")).toBeNull(),
    );
    document.querySelector("#pane-side")!.append(row);
    await mountedHost();
    stop();
    stop = undefined;
    expect(document.querySelector("[data-wat-chat-actions]")).toBeNull();
    expect(document.querySelector("[data-wat-chat-meta]")).toBeNull();
  });
});
