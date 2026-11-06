import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatQuickActions } from "./ChatQuickActions";

describe("sidebar action controls", () => {
  it("labels both actions and prevents synthetic clicks from acting or opening the chat", () => {
    const openChat = vi.fn();
    const run = vi.fn(() => Promise.resolve("dispatched" as const));
    const ui = render(
      <div onClick={openChat} onDoubleClick={openChat} onKeyDown={openChat}>
        <ChatQuickActions
          readState="read"
          run={run}
          signal={new AbortController().signal}
        />
      </div>,
    );
    expect(ui.getByRole("button", { name: "Arquivar conversa" })).toBeTruthy();
    expect(
      ui.getByRole("button", { name: "Marcar como não lido" }),
    ).toBeTruthy();
    for (const button of ui.getAllByRole("button")) {
      fireEvent.click(button);
      fireEvent.doubleClick(button);
      fireEvent.keyDown(button, { key: "Enter" });
      fireEvent.keyDown(button, { key: " " });
    }
    expect(openChat).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    ui.unmount();
  });

  it("updates an already open read tooltip when WhatsApp changes the unread state", async () => {
    const run = vi.fn(() => Promise.resolve("dispatched" as const));
    const signal = new AbortController().signal;
    const ui = render(
      <ChatQuickActions readState="read" run={run} signal={signal} />,
    );
    fireEvent.mouseEnter(
      ui.getByRole("button", { name: "Marcar como não lido" }),
    );
    await waitFor(() =>
      expect(ui.getByRole("tooltip", { hidden: true }).textContent).toBe(
        "Marcar como não lido",
      ),
    );
    ui.rerender(
      <ChatQuickActions readState="unread" run={run} signal={signal} />,
    );
    const readButton = ui.getByRole("button", { name: "Marcar como lido" });
    expect(ui.getByRole("tooltip", { hidden: true }).textContent).toBe(
      "Marcar como lido",
    );
    fireEvent.scroll(document);
    await waitFor(() =>
      expect(readButton.hasAttribute("aria-describedby")).toBe(false),
    );
    const archive = ui.getByRole("button", { name: "Arquivar conversa" });
    fireEvent.mouseEnter(archive);
    await waitFor(() =>
      expect(ui.getByRole("tooltip", { hidden: true }).textContent).toBe(
        "Arquivar conversa",
      ),
    );
    expect(archive.hasAttribute("aria-describedby")).toBe(true);
    fireEvent.keyDown(archive, { key: "Escape" });
    expect(archive.hasAttribute("aria-describedby")).toBe(false);
    ui.unmount();
  });
});
