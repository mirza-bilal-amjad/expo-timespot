/**
 * TimeSpot — typography.
 * Drop-in replacement for Ignite's `src/theme/typography.ts`.
 *
 * Swaps Ignite's Space Grotesk for Geist — the closest free match to the
 * mockups' neo-grotesk (see docs/01-design-audit.md §6).
 *
 *   npx expo install @expo-google-fonts/geist
 *   npm uninstall @expo-google-fonts/space-grotesk
 *
 * Only three weights ship. Every extra weight is a font file on the critical
 * path, and the design uses exactly three.
 */

import { Platform } from "react-native"
import {
  Geist_400Regular as geistRegular,
  Geist_500Medium as geistMedium,
  Geist_600SemiBold as geistSemiBold,
} from "@expo-google-fonts/geist"

export const customFontsToLoad = {
  geistRegular,
  geistMedium,
  geistSemiBold,
}

const fonts = {
  geist: {
    // ⚠️ `light` and `bold` are ALIASES, not separate files.
    //    Ignite's own presets reference typography.primary.bold and
    //    typography.primary.light — a missing key falls back to the system
    //    font silently, which is a very confusing bug to chase.
    light: "geistRegular",
    normal: "geistRegular",
    medium: "geistMedium",
    semiBold: "geistSemiBold",
    bold: "geistSemiBold",
  },
  helveticaNeue: {
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  courier: { normal: "Courier" },
  sansSerif: {
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
  monospace: { normal: "monospace" },
}

export const typography = {
  fonts,
  /** Used everywhere. */
  primary: fonts.geist,
  /** TimeSpot is a single-family design — secondary points at the same face. */
  secondary: fonts.geist,
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),
}

/**
 * TABULAR FIGURES
 *
 * Every clock, offset and countdown must use these, or the numerals change
 * width as they tick and the whole layout twitches once a second.
 *
 *   style={{ fontVariant: ["tabular-nums"] }}      // native
 *   font-variant-numeric: tabular-nums;            // web
 *
 * <Numeral> applies this — AND independently pins a measured per-character
 * width, so the clock stays stable even if a font or platform ignores the
 * OpenType feature. Do not rely on the feature alone.
 */
export const tabularNums = { fontVariant: ["tabular-nums" as const] }
