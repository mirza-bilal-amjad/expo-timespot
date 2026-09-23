/**
 * TimeSpot — dark theme colours.
 * Drop-in replacement for Ignite's `src/theme/colorsDark.ts`.
 *
 * Follows Ignite's convention: the palette numbering is INVERTED, so every
 * semantic name below is spelled identically to colors.ts and resolves correctly.
 *
 * Designed from first principles — the mockups have no dark theme (audit §8.9).
 * Two deliberate departures from a straight inversion, per design-system §1.3:
 *   1. canvas is #0B0B0B, not #000000, so pure black stays available for depth
 *   2. `inverseBackground` is near-WHITE, keeping "selected = maximum contrast
 *      against the field" true in both themes
 */

const palette = {
  neutral100: "#000000",
  neutral200: "#0B0B0B", // ⭐ canvas
  neutral300: "#121212",
  neutral350: "#161616", // card surface
  neutral400: "#0B0B0B",
  neutral500: "#242424", // hairline
  neutral600: "#5C5C5C",
  neutral700: "#7A7A7A", // 4.27:1 on canvas — large text only
  neutral800: "#A8A8A8", // 8.28:1 on canvas — AA ✓ the default secondary
  neutral900: "#FFFFFF",

  brand100: "#5C2110",
  brand500: "#BF4620",
  brand700: "#E8703F", // 6.9:1 on canvas — AA ✓

  day500: "#F0B54A",
  night500: "#8F9CC9",
  meridian500: "#E85C54",

  angry100: "#3D1A12",
  angry500: "#E8553A",

  overlay20: "rgba(0, 0, 0, 0.35)",
  overlay50: "rgba(0, 0, 0, 0.64)",

  // Ignite's stock Toggle components read these two directly — see colors.ts.
  secondary500: "#BF4620", // = brand500 (dark) — checked-state fill
  accent100: "#FFFFFF", // = neutral900 (white in THIS palette's inverted numbering)
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // ── Ignite's original semantic names ──────────────────────────────────────
  text: palette.neutral900,
  textDim: palette.neutral800,
  background: palette.neutral200,
  border: palette.neutral500,
  tint: palette.neutral900,
  tintInactive: palette.neutral600,
  separator: palette.neutral500,
  error: palette.angry500,
  errorBackground: palette.angry100,

  // ── TimeSpot additions ────────────────────────────────────────────────────
  textFaint: palette.neutral700,
  textOnInverse: palette.neutral100,
  textOnInverseDim: palette.neutral600,
  textAccent: palette.brand700,

  cardBackground: palette.neutral350,
  /** near-white, not black — see the header note */
  inverseBackground: "#F2F2F2",
  controlBackground: "#1F1F1F",

  strokeRaised: palette.neutral500,
  strokeSunken: "#000000",
  focusRing: palette.neutral900,
  scrim: palette.overlay50,

  frame: palette.brand500,

  day: palette.day500,
  night: palette.night500,
  meridian: palette.meridian500,

  mapLand: "#3A3A3A",
  mapLandActive: palette.neutral900,
  mapNight: "rgba(0, 0, 0, 0.35)",
} as const
