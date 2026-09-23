/**
 * TimeSpot — light theme colours.
 * Drop-in replacement for Ignite's `src/theme/colors.ts`.
 *
 * Values measured from the source mockups — see docs/01-design-audit.md §2.
 * Contrast ledger — docs/02-design-system.md §1.4.
 *
 * ⚠️ Every key Ignite originally shipped is still here. Ignite's own components
 *    (Screen, Text, Card, TextField, Button…) read them by name. Add keys; never remove one.
 */

const palette = {
  neutral100: "#FFFFFF",
  neutral200: "#F5F5F5",
  neutral300: "#EDEDED",
  neutral350: "#EAEAEA", // card surface — +2 over canvas, see audit §3
  neutral400: "#E8E8E8", // ⭐ canvas — the dominant colour of both mockups
  neutral500: "#DCDCDC", // hairline shade / divider
  neutral600: "#A8A8A8",
  neutral700: "#7A7A7A", // 3.50:1 on canvas — LARGE TEXT ONLY (>=24pt)
  neutral800: "#5C5C5C", // 5.46:1 on canvas — AA ✓ the default secondary
  neutral900: "#000000",

  brand100: "#F6DCD2",
  brand500: "#D44F24", // web page bezel — 4.25:1, SURFACE ONLY, never text
  brand700: "#A93B18", // 5.15:1 on canvas — AA ✓ the text-safe orange

  day500: "#E8A317",
  night500: "#6E7BA8",
  meridian500: "#D9433B",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  overlay20: "rgba(0, 0, 0, 0.20)",
  overlay50: "rgba(0, 0, 0, 0.44)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // ── Ignite's original semantic names ──────────────────────────────────────
  text: palette.neutral900,
  textDim: palette.neutral800,
  background: palette.neutral400,
  border: palette.neutral500,
  tint: palette.neutral900, // TimeSpot's accent is black, not a hue
  tintInactive: palette.neutral600,
  separator: palette.neutral500,
  error: palette.angry500,
  errorBackground: palette.angry100,

  // ── TimeSpot additions ────────────────────────────────────────────────────
  /** 3.50:1 — permitted ONLY at >=24pt. Use `textDim` for anything smaller. */
  textFaint: palette.neutral700,
  textOnInverse: palette.neutral100,
  textOnInverseDim: palette.neutral600,
  textAccent: palette.brand700,

  cardBackground: palette.neutral350,
  inverseBackground: palette.neutral900,
  controlBackground: palette.neutral100,

  strokeRaised: "#F3F3F3",
  strokeSunken: palette.neutral500,
  focusRing: palette.neutral900,
  scrim: palette.overlay50,

  /** Web page bezel. Surface only — never put text on it. */
  frame: palette.brand500,

  day: palette.day500,
  night: palette.night500,
  meridian: palette.meridian500,

  mapLand: "#828282",
  mapLandActive: palette.neutral900,
  mapNight: "rgba(0, 0, 0, 0.10)",
} as const
