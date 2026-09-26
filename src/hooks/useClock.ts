import { useEffect, useRef, useState } from "react"
import { AppState, Platform } from "react-native"

/**
 * docs/10-implementation-plan.md task 3.2; algorithm from the
 * timespot-timezone-correctness skill's "The clock tick". The only interval
 * in the app — screens subscribe here, components receive time as a prop
 * (CLAUDE.md rule 3, "one clock").
 */

const JUMP_THRESHOLD_MS = 5_000

interface UseClockOptions {
  /** When true, only re-render once a minute instead of every second — for
   * screens that don't display seconds. Still ticks on a 1s cadence
   * internally so a coalesced screen catches a minute boundary promptly. */
  coalesceToMinute?: boolean
  /** When false the clock stops entirely — no timer, no re-render — and
   * catches up the moment it's true again. Screens pass whether they're
   * focused: the tabs keep visited screens mounted, and a hidden clock
   * ticking every second behind the one on screen was pure waste. */
  active?: boolean
}

function nextTickDelay(): number {
  // Align to the wall-clock second boundary, +4ms so we land just after it
  // rather than racing it.
  return 1000 - (Date.now() % 1000) + 4
}

export function useClock(options: UseClockOptions = {}): number {
  const { coalesceToMinute = false, active = true } = options
  const [now, setNow] = useState(() => Date.now())
  const lastTickRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMinuteRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    // Coming back from inactive: show the current time straight away.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- catching up after a pause is the point
    setNow(Date.now())
    lastTickRef.current = Date.now()
    lastMinuteRef.current = Math.floor(Date.now() / 60_000)

    const tick = () => {
      if (cancelled) return
      const current = Date.now()
      const delta = current - (lastTickRef.current ?? current)
      lastTickRef.current = current

      // Jump guard: a device clock change (not just drift) jumps straight to
      // the new value rather than animating through it — callers rendering
      // via <Numeral> already cut, not roll, on a value that isn't ±1.
      const isJump = Math.abs(delta) > JUMP_THRESHOLD_MS

      const currentMinute = Math.floor(current / 60_000)
      const minuteChanged = currentMinute !== lastMinuteRef.current
      lastMinuteRef.current = currentMinute

      if (!coalesceToMinute || minuteChanged || isJump) {
        setNow(current)
      }

      timeoutRef.current = setTimeout(tick, nextTickDelay())
    }

    const resync = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      lastTickRef.current = Date.now()
      lastMinuteRef.current = Math.floor(Date.now() / 60_000)
      setNow(Date.now())
      timeoutRef.current = setTimeout(tick, nextTickDelay())
    }

    timeoutRef.current = setTimeout(tick, nextTickDelay())

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") resync()
    })

    let visibilityHandler: (() => void) | undefined
    if (Platform.OS === "web" && typeof document !== "undefined") {
      visibilityHandler = () => {
        if (document.visibilityState === "visible") resync()
      }
      document.addEventListener("visibilitychange", visibilityHandler)
    }

    return () => {
      cancelled = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      appStateSub.remove()
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler)
    }
  }, [coalesceToMinute, active])

  return now
}
