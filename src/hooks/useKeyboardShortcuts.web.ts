import { useEffect } from "react"

import { usePrefsStore } from "@/store/prefs"
import { isTypingTarget, shortcutFor, yieldsToFocusedControl } from "@/utils/shortcuts"

import { dispatchShortcut } from "./useShortcut"

export const KEYBOARD_SHORTCUTS_SUPPORTED = true

/**
 * docs/07-responsive-strategy.md §4, docs/09-accessibility.md §3 — the one
 * keydown listener (task 6.8). A key is a shortcut only when:
 *  - shortcuts are on (Settings; WCAG 2.1.4 asks that single-key shortcuts
 *    can be turned off);
 *  - no text field has focus;
 *  - no sheet or dialog is open: behind a modal, keys belong to it (it
 *    closes on Esc itself);
 *  - the focused control doesn't use the key itself (Enter on a button).
 * A handled key's default is prevented; anything unhandled passes through.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      if (usePrefsStore.getState().prefs.keyboardShortcuts === false) return
      const id = shortcutFor(event)
      if (!id) return
      const target = event.target
      if (isTypingTarget(target) || yieldsToFocusedControl(id, target)) return
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return
      if (dispatchShortcut(id)) event.preventDefault()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])
}
