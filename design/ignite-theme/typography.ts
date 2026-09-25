/**
 * TimeSpot — typography.
 * Drop-in replacement for Ignite's `src/theme/typography.ts`.
 *
 * Space Grotesk — the mockups' actual face, identified by glyph comparison
 * (the straight-tailed `y` in "Sydney", the flat-topped `3`, the flagged
 * `1`; docs/01-design-audit.md §6). An earlier pass misread it as a
 * Neue-Montreal-style grotesk and shipped Geist instead.
 *
 * Four weights ship; every extra weight is a font file on the critical path.
 */

import { Platform } from "react-native"
import {
  SpaceGrotesk_300Light as spaceGroteskLight,
  SpaceGrotesk_400Regular as spaceGroteskRegular,
  SpaceGrotesk_500Medium as spaceGroteskMedium,
  SpaceGrotesk_600SemiBold as spaceGroteskSemiBold,
} from "@expo-google-fonts/space-grotesk"

export const customFontsToLoad = {
  spaceGroteskLight,
  spaceGroteskRegular,
  spaceGroteskMedium,
  spaceGroteskSemiBold,
}

const fonts = {
  spaceGrotesk: {
    // ⚠️ `bold` is an ALIAS for semiBold, not a separate file. Ignite's own
    //    presets reference typography.primary.bold and .light — a missing
    //    key falls back to the system font silently.
    light: "spaceGroteskLight",
    normal: "spaceGroteskRegular",
    medium: "spaceGroteskMedium",
    semiBold: "spaceGroteskSemiBold",
    bold: "spaceGroteskSemiBold",
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
  primary: fonts.spaceGrotesk,
  /** TimeSpot is a single-family design — secondary points at the same face. */
  secondary: fonts.spaceGrotesk,
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
