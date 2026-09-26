import { useEffect, useRef } from "react"

import type { ShortcutId } from "@/utils/shortcuts"

/**
 * docs/07 §4 (task 6.8). Shortcuts are registered by whoever can act on
 * them, while they can: the tabs layout owns the global ones, a screen
 * registers its own only while focused (tabs stay mounted, so a hidden
 * map must not swallow ← →). One key listener (`useKeyboardShortcuts`)
 * dispatches to the most recent registration.
 */

type Handler = () => void
const registry = new Map<ShortcutId, Handler[]>()

export function useShortcut(id: ShortcutId, handler: Handler, enabled = true): void {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => {
    if (!enabled) return undefined
    const entry: Handler = () => latest.current()
    const list = registry.get(id) ?? []
    registry.set(id, [...list, entry])
    return () => {
      registry.set(
        id,
        (registry.get(id) ?? []).filter((h) => h !== entry),
      )
    }
  }, [id, enabled])
}

/** Runs the newest handler for `id`. False when nothing handles it, so the
 * key keeps its default (an arrow still scrolls the page). */
export function dispatchShortcut(id: ShortcutId): boolean {
  const handlers = registry.get(id)
  const handler = handlers?.[handlers.length - 1]
  if (!handler) return false
  handler()
  return true
}
