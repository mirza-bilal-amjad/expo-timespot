/**
 * docs/07-responsive-strategy.md §4 "Keyboard" (task 6.8): which key means
 * what. Plain functions over a keydown-shaped object, so the table and its
 * guards are tested without a DOM.
 */

export type ShortcutId =
  | "search"
  | "tabList"
  | "tabClock"
  | "tabMap"
  | "previous"
  | "next"
  | "open"
  | "west"
  | "east"
  | "westZone"
  | "eastZone"
  | "theme"
  | "timeFormat"
  | "help"

export interface KeyLike {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

const PLAIN: Record<string, ShortcutId> = {
  "/": "search",
  "1": "tabList",
  "2": "tabClock",
  "3": "tabMap",
  "ArrowUp": "previous",
  "ArrowDown": "next",
  "Enter": "open",
  "ArrowLeft": "west",
  "ArrowRight": "east",
  "t": "theme",
  "T": "theme",
  "h": "timeFormat",
  "H": "timeFormat",
  "?": "help",
}

const SHIFTED: Record<string, ShortcutId> = {
  "ArrowLeft": "westZone",
  "ArrowRight": "eastZone",
  // `?` is Shift+/ on most layouts; `T`/`H` with Caps Lock or Shift.
  "?": "help",
  "T": "theme",
  "H": "timeFormat",
}

/** The shortcut a key press means, or null. A press with Ctrl, ⌘ or Alt is
 * never ours: those belong to the browser and the OS. */
export function shortcutFor(event: KeyLike): ShortcutId | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  return (event.shiftKey ? SHIFTED : PLAIN)[event.key] ?? null
}

interface TargetLike {
  tagName?: string
  isContentEditable?: boolean
  getAttribute?: (name: string) => string | null
}

/** True while the user is typing (docs/09 §3, WCAG 2.1.4): single-key
 * shortcuts must never steal a character from a field. */
export function isTypingTarget(target: unknown): boolean {
  const t = target as TargetLike | null
  if (!t || typeof t !== "object") return false
  if (t.isContentEditable) return true
  const tag = t.tagName?.toLowerCase()
  if (tag === "textarea" || tag === "select") return true
  if (tag === "input") {
    const type = (t.getAttribute?.("type") ?? "text").toLowerCase()
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color"].includes(type)
  }
  const role = t.getAttribute?.("role")
  return role === "textbox" || role === "combobox" || role === "searchbox"
}

/** Enter presses a focused button or link, and arrows adjust a focused
 * slider (the UTC ruler) — the control keeps those keys. Anywhere else they
 * are shortcuts, including on a row just clicked (a focused button does
 * nothing with an arrow). */
export function yieldsToFocusedControl(id: ShortcutId, target: unknown): boolean {
  const t = target as TargetLike | null
  const tag = t?.tagName?.toLowerCase()
  const role = t?.getAttribute?.("role") ?? null
  if (id === "open") {
    return (
      tag === "button" ||
      tag === "a" ||
      role === "button" ||
      role === "link" ||
      role === "tab" ||
      role === "menuitem"
    )
  }
  if (id === "previous" || id === "next" || id === "west" || id === "east") {
    return role === "slider" || role === "adjustable" || role === "menuitem"
  }
  return false
}
