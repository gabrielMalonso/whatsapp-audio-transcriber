export type ChatRow = {
  row: HTMLElement;
  name: HTMLElement;
  nameValue: string;
  rowId: string | null;
  rowIndex: string | null;
  metadata: HTMLElement;
};

// Scope to the conversation list: message rows and global search results differ.
export function findChatRows(): ChatRow[] {
  const rows: ChatRow[] = [];
  for (const row of document.querySelectorAll<HTMLElement>(
    '#pane-side [role="row"]',
  )) {
    const name = row.querySelector<HTMLElement>(
      '[data-testid="cell-frame-title"] span[title], span[title][dir="auto"]',
    );
    if (!name) continue;
    const titleCell = name.closest<HTMLElement>(
      '[role="gridcell"][aria-colindex="2"], [data-testid="cell-frame-title"]',
    );
    const heading =
      titleCell?.parentElement ?? name.parentElement?.parentElement;
    const cells = Array.from(heading?.children ?? []).filter(
      (child) => !child.hasAttribute("data-wat-chat-actions"),
    );
    const metadata = cells.at(-1);
    if (
      !(metadata instanceof HTMLElement) ||
      metadata.contains(name) ||
      cells.length !== 2 ||
      metadata.querySelector('button, [role="button"], img, [role="row"]')
    ) {
      continue;
    }
    rows.push({
      row,
      name,
      nameValue: name.getAttribute("title") ?? "",
      rowId: row.getAttribute("data-id"),
      rowIndex: row.getAttribute("aria-rowindex"),
      metadata,
    });
  }
  return rows;
}

export function isCurrentChat(chat: ChatRow): boolean {
  return (
    chat.row.isConnected &&
    chat.row.contains(chat.name) &&
    chat.row.contains(chat.metadata) &&
    chat.name.getAttribute("title") === chat.nameValue &&
    chat.row.getAttribute("data-id") === chat.rowId &&
    chat.row.getAttribute("aria-rowindex") === chat.rowIndex
  );
}
