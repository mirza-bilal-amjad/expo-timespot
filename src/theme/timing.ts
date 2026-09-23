/**
 * TimeSpot — motion tokens.
 * Drop-in replacement for Ignite's `src/theme/timing.ts`.
 *
 * `quick` is Ignite's original and is kept — its components animate with it.
 * Full choreography: docs/08-motion-spec.md.
 */
export const timing = {
  /** Ignite's original — keep it, the boilerplate uses it */
  quick: 300,

  // ── TimeSpot durations ────────────────────────────────────────────────────
  instant: 0,
  fast: 140,
  base: 220,
  slow: 320,
  deliberate: 480,

  // ── Easing curves ─────────────────────────────────────────────────────────
  ease: {
    standard: [0.2, 0, 0, 1],
    decelerate: [0, 0, 0, 1],
    accelerate: [0.3, 0, 1, 1],
  },

  // ── Reanimated springs ────────────────────────────────────────────────────
  spring: {
    /** the odometer digit roll */
    numeral: { damping: 22, stiffness: 220, mass: 0.9 },
    /** press feedback and meridian snap */
    press: { damping: 18, stiffness: 320, mass: 0.7 },
  },
} as const
