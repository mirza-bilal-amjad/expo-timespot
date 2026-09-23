/**
 * TimeSpot — corner radius. NEW FILE: Ignite has no radius scale.
 *
 * Wire it up in three places:
 *   1. src/theme/theme.ts   → add `radius` to lightTheme and darkTheme
 *   2. src/theme/types.ts   → add `radius: Radius` to the Theme interface
 *   3. src/theme/index.ts   → re-export
 *
 * `md` is measured: 24px on the mobile board (@0.75 = 18pt) and 20px on the web
 * board (@0.792 = 16px). Normalised to 16 — one token is worth more than two,
 * and a 2pt delta at this radius is imperceptible. See docs/01-design-audit.md §4.
 */
export const radius = {
  xs: 6, // ruler tick chip
  sm: 10, // city avatar squircle
  md: 16, // ⭐ list rows, city cards, floating map card
  lg: 24, // bottom sheets, modals
  xl: 32, // web app panel
  pill: 999,
} as const

export type Radius = typeof radius
