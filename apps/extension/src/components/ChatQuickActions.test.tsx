import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatQuickActions } from "./ChatQuickActions";

describe("sidebar action controls", () => {
  it("labels both actions and prevents synthetic clicks from acting or opening the chat", () => {
    const openChat = vi.fn();
    const run = vi.fn(() => Promise.resolve("dispatched" as const));
    const ui = render(
      <div onClick={openChat} onDoubleClick={openChat} onKeyDown={openChat}>
        <ChatQuickActions run={run} signal={new AbortController().signal} />
      </div>,
    );
    const archive = ui.getByRole("button", { name: "Arquivar conversa" });
    expect(
      ui.getByRole("button", { name: "Marcar como não lido" }),
    ).toBeTruthy();
    fireEvent.click(archive);
    fireEvent.doubleClick(archive);
    fireEvent.keyDown(archive, { key: "Enter" });
    fireEvent.keyDown(archive, { key: " " });
    expect(openChat).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    ui.unmount();
  });
});
