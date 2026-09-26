/**
 * docs/08-motion-spec.md §5 "Meridian drag", docs/04-screen-specs.md "S3 ·
 * Map" "Meridian" — task 4.5. "Snap targets are every real UTC offset,
 * including +5:45, +8:45, +12:45, +14." A naive nearest-whole-hour snap
 * would make Kathmandu, Eucla and Chatham unreachable by release even
 * though the map and the ruler can already display them.
 *
 * Hand-maintained rather than derived from `Intl.supportedValuesOf` at
 * runtime: a snap-target set has to be a plain worklet-safe array (no JS
 * engine round-trip during a UI-thread gesture), and the set of real-world
 * offsets changes by legislation rarely enough that a static list is the
 * right tradeoff — the same reasoning `capability.ts`'s boot probe applies
 * to `Intl` itself. Every fixture zone in `domain/__fixtures__/zones.ts`
 * (Kathmandu +5:45, Eucla +8:45, Chatham +12:45, Kiritimati +14,
 * St. Johns −3:30) has its offset represented here.
 */
export const SNAP_TARGETS_MINUTES = [
  -720, -660, -600, -570, -540, -480, -420, -360, -300, -240, -210, -180, -120, -60, 0, 60, 120,
  180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 525, 540, 570, 600, 630, 660, 720, 765,
  780, 825, 840,
] as const

// docs/08-motion-spec.md: "Velocity-aware: a fast flick can travel several
// zones." A short forward projection of the release velocity is enough to
// carry the snap past the immediate neighbour without needing full
// deceleration physics.
const FLICK_PROJECTION_SECONDS = 0.15

/**
 * Nearest real UTC offset to `offsetMinutes`, optionally projected forward
 * by a release velocity in offset-minutes per second, so a fast flick lands
 * past where it let go rather than snapping back to it. A worklet, so it
 * can run on the UI thread.
 */
export function snapToNearestOffset(offsetMinutes: number, velocityMinutesPerSecond = 0): number {
  "worklet"
  const projected = offsetMinutes + velocityMinutesPerSecond * FLICK_PROJECTION_SECONDS

  let nearest: number = SNAP_TARGETS_MINUTES[0]
  let smallestDistance = Math.abs(projected - nearest)
  for (let i = 1; i < SNAP_TARGETS_MINUTES.length; i++) {
    const candidate: number = SNAP_TARGETS_MINUTES[i]
    const distance = Math.abs(projected - candidate)
    if (distance < smallestDistance) {
      nearest = candidate
      smallestDistance = distance
    }
  }
  return nearest
}

function nearestSnapTargetIndex(offsetMinutes: number): number {
  "worklet"
  let index = 0
  let smallestDistance = Math.abs(offsetMinutes - SNAP_TARGETS_MINUTES[0])
  for (let i = 1; i < SNAP_TARGETS_MINUTES.length; i++) {
    const distance = Math.abs(offsetMinutes - SNAP_TARGETS_MINUTES[i])
    if (distance < smallestDistance) {
      index = i
      smallestDistance = distance
    }
  }
  return index
}

/**
 * docs/09-accessibility.md §2 "The map": "VoiceOver swipe-up/down and
 * TalkBack volume-key adjustment both move it one zone" — one accessibility
 * increment/decrement steps to the *adjacent real offset* in
 * `SNAP_TARGETS_MINUTES`, not a raw ±60 minutes (unevenly spaced zones mean
 * those aren't the same thing: from `+5:45` a raw +60 would land on `+6:45`,
 * which isn't a real zone, where the adjacent *real* zone is `+6:00`).
 * Deliberately distinct from the web keyboard's own ±1h/±15min raw steps
 * (docs/08-motion-spec.md §5.6) — those are a fine-grained continuous
 * control, this is "next stop."
 */
export function stepToAdjacentOffset(offsetMinutes: number, direction: 1 | -1): number {
  "worklet"
  const currentIndex = nearestSnapTargetIndex(offsetMinutes)
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), SNAP_TARGETS_MINUTES.length - 1)
  return SNAP_TARGETS_MINUTES[nextIndex]
}
