import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startChatQuickActions } from "./chatQuickActions";

const { unmount } = vi.hoisted(() => ({ unmount: vi.fn() }));
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: vi.fn(), unmount })),
}));

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

function fixture() {
  document.body.innerHTML = `<div id="pane-side"><div role="row">
    <div><div role="gridcell" aria-colindex="2"><span dir="auto" title="Example">Example</span></div><div data-meta><span>12:34</span></div></div>
    <div data-preview>Message <span data-unread>2</span></div>
  </div></div>`;
  return document.querySelector<HTMLElement>('[role="row"]')!;
}

async function mountedHost() {
  await waitFor(() =>
    expect(document.querySelector("[data-wat-chat-actions]")).not.toBeNull(),
  );
  return document.querySelector<HTMLElement>("[data-wat-chat-actions]")!;
}

describe("sidebar action lifecycle", () => {
  it("reveals only the hovered row and restores its timestamp on mouse leave", async () => {
    const row = fixture();
    stop = startChatQuickActions();
    const host = await mountedHost();
    row.dispatchEvent(new MouseEvent("mouseenter"));
    expect(host.hasAttribute("data-wat-chat-hover")).toBe(true);
    expect(row.hasAttribute("data-wat-chat-active")).toBe(true);
    row.dispatchEvent(new MouseEvent("mouseleave"));
    expect(host.hasAttribute("data-wat-chat-hover")).toBe(false);
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

  it("removes roots from detached rows and restores all injected attributes on stop", async () => {
    const row = fixture();
    stop = startChatQuickActions();
    await mountedHost();
    row.remove();
    await waitFor(() =>
      expect(row.querySelector("[data-wat-chat-actions]")).toBeNull(),
    );
    expect(row.hasAttribute("data-wat-chat-row")).toBe(false);
    document.querySelector("#pane-side")!.append(row);
    await mountedHost();
    stop();
    stop = undefined;
    expect(document.querySelector("[data-wat-chat-actions]")).toBeNull();
    expect(document.querySelector("[data-wat-chat-meta]")).toBeNull();
    expect(document.querySelector("[data-wat-chat-row]")).toBeNull();
  });
});
