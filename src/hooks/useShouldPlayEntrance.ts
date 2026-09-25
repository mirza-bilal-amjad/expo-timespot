import { useState } from "react"

/**
 * docs/08-motion-spec.md §7 "Entrance choreography": "Total under 500ms and
 * it runs after the first meaningful paint... Skipped entirely under
 * reduced motion and on any warm start." Each named entrance participant
 * (a screen's own title/hero, the tab bar) gets its own `key`, played at
 * most once per app process — the very first time that key's caller mounts.
 * A later remount of the same screen (switching tabs away and back; the
 * router doesn't guarantee a bare `<Slot/>`-based custom tab bar preserves
 * mount state the way a real tab navigator would) still correctly counts
 * as a "warm start" and is skipped, because the record here is keyed by
 * the *screen identity*, not by whether the component instance happens to
 * still be alive.
 */
const playedKeys = new Set<string>()

export function useShouldPlayEntrance(key: string): boolean {
  const [shouldPlay] = useState(() => {
    if (playedKeys.has(key)) return false
    playedKeys.add(key)
    return true
  })
  return shouldPlay
}
