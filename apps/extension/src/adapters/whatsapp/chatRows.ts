export type ChatReadState = "read" | "unread";

export type ChatRow = {
  row: HTMLElement;
  name: HTMLElement;
  nameValue: string;
  rowId: string | null;
  rowIndex: string | null;
  metadata: HTMLElement;
  readState: ChatReadState;
};

function readState(row: HTMLElement): ChatReadState {
  const unread = [...row.querySelectorAll("[aria-label]")].some((element) => {
    const label = (element.getAttribute("aria-label") ?? "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase();
    return /^(?:nao lid[ao]s?|unread|no leid[oa]s?|\d+ (?:mensage(?:m|ns) nao lid[ao]s?|unread messages?|mensajes? no leid[oa]s?))$/.test(
      label,
    );
  });
  return unread ? "unread" : "read";
}

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
      readState: readState(row),
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
