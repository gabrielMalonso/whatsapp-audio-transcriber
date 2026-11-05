# Sidebar quick actions

## T3 Code reference

Inspected on November 5, 2026, in Gabriel's local `Projetos/t3code` checkout at
`337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`. No T3 source was copied into the extension.

| Reference                                                                  | Relevant behavior                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/sidebar/SidebarThreadRow.tsx`, `SnoozeMenuButton` | Clock icon, transparent button, 6 px horizontal padding, muted color turning into foreground on hover. Stops click and double-click propagation.                                                                                                                        |
| Same file, card status slot                                                | Date/status becomes transparent and absolute while the controls become visible and participate in layout. The pair is secondary icon first, then primary icon + “Settle”. Controls are 20 px high, 12 px text, 14 px primary icon, 4 px icon/text gap and 6 px corners. |
| Same file, card reveal                                                     | Immediate visibility change: **no slide, scale or fade transition on the card controls**. Hover is gated by `any-hover: hover`. Keyboard uses `:focus-visible`, so mouse focus does not keep controls displayed after leaving a card.                                   |
| Same file, slim rows                                                       | Icon-only primary action with an opacity transition. This is a different variant from the cards Gabriel referenced.                                                                                                                                                     |
| `apps/web/src/components/Sidebar.tsx`, thread `TooltipProvider`            | 150 ms opening delay, 0 ms close delay, 400 ms provider warm window.                                                                                                                                                                                                    |
| `apps/web/src/components/ui/tooltip.tsx`, `TooltipPopup`                   | 4 px anchor offset, 5 px collision padding, 12 px text, 8 × 4 px content padding, 6 px corners. Scale/opacity transitions between 0.98/0 and 1/1; Tailwind's default 150 ms duration. Popup is portaled; scrolling dismisses hover hints.                               |
| `SidebarThreadRow.tsx`, action handlers                                    | Stop default navigation and propagation. Snooze opens a preset menu; Settle dispatches immediately.                                                                                                                                                                     |
| `Sidebar.tsx`, `attemptSettle`                                             | Guards repeated submissions, reports errors and advances navigation if the settled thread is active.                                                                                                                                                                    |
| `Sidebar.tsx`, `startActionSweep`                                          | Also supports holding the action and sweeping across rows. This is a separate bulk action gesture.                                                                                                                                                                      |

## WhatsApp mapping and visual plan

```
rest:     contact name                         time
hover:    contact name               [mail+] [archive Arquivar]
          message preview             unread / pinned / menu
```

- Secondary action: envelope icon, **Marcar como não lido**.
- Primary action: archive icon + **Arquivar**.
- Replace only the upper timestamp slot; keep the preview and lower unread,
  pinned and muted badges and the native dropdown.
- Inherit WhatsApp typography and control colors: `--primary` (#111b21),
  `--secondary` (#667781), `--focus` (#008069). The tooltip uses a self-contained
  charcoal surface (#292929) and light text (#f4f4f5) in both themes, avoiding
  mismatched or missing WhatsApp popup tokens.
- Use the card reference's immediate reveal, muted-to-foreground colors,
  12 px labels, 14 px icons with a 1.75 stroke, 4 px gap, 6 px padding and corners.
  The controls are 20 px high and replace the timestamp in the native flex row
  using their intrinsic width. WhatsApp's timestamp nodes stay untouched.
- Tooltip opens after 150 ms with 150 ms opacity/0.98-scale transitions, no
  close delay and a shared 400 ms warm window between rows. It sits 4 px above
  the trigger, flips below when needed and clamps to a 5 px viewport inset.
  Native Popover places it above clipping/virtualization boundaries.
  Reduced-motion disables the transitions.
- Keyboard focus reveals the controls and adds a focus ring. Mouse focus alone
  does not pin them. Enter/Space and double-click cannot activate the chat.

This preserves the referenced control hierarchy and behavior while using the
WhatsApp palette. T3's own font, card surface, Snooze scheduling, bulk sweep,
Un-settle, and automatic navigation are not introduced by these two shortcuts.

## Integration

`chatRows.ts` discovers rows **only inside `#pane-side`** and requires a separate
name and timestamp slot. It uses semantic grid cells or the title test ID, with
an unambiguous two-child heading fallback that ignores the injected controls.
Generated class names are not used. Unsupported row structures are skipped.

`chatQuickActions.tsx` mounts a closed Shadow DOM beside the timestamp cell. A
frame-batched observer reconciles inserted, removed and recycled rows. Unmount
cancels pending actions and removes listeners and injected attributes. The
content entrypoint also disposes both scanners when WXT invalidates the script.

`chatActions.ts` opens the row's native dropdown, or dispatches its context-menu
event when the dropdown is not mounted. It waits up to 1.5 seconds for a native
menu and selects an **exact** action label (Portuguese, English or Spanish).
An inverse action such as “Marcar como lida” or “Desarquivar” is never clicked.
Already-unread/already-archived chats receive informational feedback.

Only trusted clicks on the extension controls dispatch actions. Commands are
serialized across rows. Existing menus block dispatch; row recycling,
intervening pointer/keyboard interaction, scrolling or teardown cancel pending
commands. Missing selectors/actions produce a visible instruction to use the
native menu. No WhatsApp private JS APIs, network calls, permissions, API key,
stored chat IDs or persisted contact names are required. A title is compared
transiently in memory alongside the row's `data-id` and `aria-rowindex` (when
available) to detect virtualized row reuse, including matching display names.

The automated popup is masked before opening and stays transparent through its
exit. Once identified, only that popup remains masked. Detachment, native hiding,
the next user interaction or a 1.5-second deadline releases the mask, so manual
menus remain usable even if WhatsApp fails to close the automated popup.

WhatsApp remains responsible for state changes, native row transitions,
notifications, errors and any undo UI. “Dispatched” means a native menu item was
clicked, not that the WhatsApp server confirmed success.

## Verification and remaining limitation

DOM fixtures cover exact native action dispatch, nested dropdowns, supported
labels, inverse-action protection, unrelated menus, cancellation, timeouts,
virtualized row replacement, teardown and event propagation.

Live visual validation on November 5, 2026 used Computer Use in Central ES's
Helium (Chromium 156), with the production build loaded unpacked. Captures cover
rest, hover and readable tooltips in WhatsApp's dark and light themes at 110%
zoom. The original dark theme was restored. A self-chat with a test message was
marked unread and archived using the extension: WhatsApp displayed both native
confirmation toasts and the automated menu was not observed in the captures.
Manual context menus remained visible; the self-chat was restored to read and
left archived. Narrower sidebars, archived/unread filters and Firefox/Zen still
need live validation before release.
