/**
 * docs/08-motion-spec.md §3 — the odometer's index maths, pure and
 * worklet-safe so <Numeral>'s UI-thread reaction can call it directly.
 *
 * Each rolling digit is a static strip of STRIP_CELLS cells showing
 * `index % 10` (0-9, 0-9). The strip's text never changes; only its offset
 * moves. A digit rests somewhere in the middle band [BAND_START, BAND_END),
 * which leaves room to roll a couple of cells either way — 9 → 0 rolls
 * *forward* into the next "0", never back through 8…1 — and after landing
 * the index is shifted back into the band by exactly ten cells, which shows
 * an identical glyph, so the shift is invisible.
 */

export const STRIP_CELLS = 20
const BAND_START = 5
const BAND_END = 15

// "Clock-jump guard: if the value changes by more than 2, cut instead of
// rolling." Measured on the wheel (9 → 0 is one step), so a routine 59 → 00
// rolls its units digit and cuts its tens digit.
export const JUMP_GUARD_THRESHOLD = 2

/** The strip index at which `digit` rests — always inside the middle band. */
export function restIndex(digit: number): number {
  "worklet"
  return ((digit - BAND_START + 10) % 10) + BAND_START
}

/** Shortest signed step on the wheel from `prev` to `next`: +1 for 3 → 4 and
 * for 9 → 0, −1 for 4 → 3. A half-turn tie goes forward (time moves up). */
export function wheelStep(prev: number, next: number): number {
  "worklet"
  const forward = (next - prev + 10) % 10
  return forward <= 5 ? forward : forward - 10
}

export interface RollPlan {
  /** Animate to `target`, or jump there instantly. */
  animate: boolean
  target: number
}

/** Where the strip goes when the digit changes from `prev` to `next` while
 * the strip is at (or heading to) `fromIndex`. Cuts on a clock jump, or if
 * a burst of interrupted rolls has run out of strip. */
export function planRoll(fromIndex: number, prev: number, next: number): RollPlan {
  "worklet"
  const step = wheelStep(prev, next)
  const target = fromIndex + step
  if (Math.abs(step) > JUMP_GUARD_THRESHOLD || target < 0 || target >= STRIP_CELLS) {
    return { animate: false, target: restIndex(next) }
  }
  return { animate: true, target }
}

/** After a roll lands: the same glyph's index back inside the middle band. */
export function settleIndex(index: number): number {
  "worklet"
  if (index < BAND_START) return index + 10
  if (index >= BAND_END) return index - 10
  return index
}
