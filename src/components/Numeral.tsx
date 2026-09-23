import { memo, useCallback, useState } from "react"
import {
  LayoutChangeEvent,
  // eslint-disable-next-line no-restricted-imports
  Text as RNText,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"

import { useAppTheme } from "@/theme/context"
import type { Theme } from "@/theme/types"

export type NumeralSize = "numeralMd" | "numeralLg" | "display" | "displayXl" | "hero"

export interface NumeralProps {
  /** e.g. '08', '08:40', '15' — digits and separators only. */
  value: string
  size?: NumeralSize
  color?: keyof Omit<Theme["colors"], "palette">
  /** 'roll' is not implemented yet — falls back to a cut. */
  animate?: "none" | "roll"
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

const $sizeStyles: Record<NumeralSize, TextStyle> = {
  numeralMd: { fontSize: 32, lineHeight: 32, letterSpacing: -0.5 },
  numeralLg: { fontSize: 48, lineHeight: 48, letterSpacing: -1 },
  display: { fontSize: 56, lineHeight: 57, letterSpacing: -1.4 },
  displayXl: { fontSize: 72, lineHeight: 66, letterSpacing: -2.2 },
  hero: { fontSize: 144, lineHeight: 124, letterSpacing: -5 },
}

const DIGIT_RE = /[0-9]/

/**
 * Cell width is measured once per (font, size) from a hidden "0" glyph and
 * cached module-wide, so every <Numeral> after the first of that size mounts
 * with the exact width already known — no per-tick layout shift.
 */
const cellWidthCache = new Map<string, number>()

const $hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants" as const,
}

export const Numeral = memo(function Numeral(props: NumeralProps) {
  const { value, size = "numeralLg", color, accessibilityLabel, style } = props
  const { theme } = useAppTheme()

  const fontFamily = theme.typography.primary.medium
  const fontSize = $sizeStyles[size].fontSize as number
  const cacheKey = `${fontFamily}-${fontSize}`

  const [cellWidth, setCellWidth] = useState(
    () => cellWidthCache.get(cacheKey) ?? Math.round(fontSize * 0.62),
  )

  const onMeasureCell = useCallback(
    (e: LayoutChangeEvent) => {
      if (cellWidthCache.has(cacheKey)) return
      const width = Math.ceil(e.nativeEvent.layout.width)
      cellWidthCache.set(cacheKey, width)
      setCellWidth(width)
    },
    [cacheKey],
  )

  const $digitText: TextStyle = {
    ...$sizeStyles[size],
    fontFamily,
    color: color ? (theme.colors[color] as string) : theme.colors.text,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  }

  return (
    <View
      style={[$row, style]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
      {value.split("").map((char, index) =>
        DIGIT_RE.test(char) ? (
          <View key={index} style={{ width: cellWidth }}>
            <RNText style={$digitText} maxFontSizeMultiplier={1.3} {...$hidden}>
              {char}
            </RNText>
          </View>
        ) : (
          <RNText key={index} style={$digitText} maxFontSizeMultiplier={1.3} {...$hidden}>
            {char}
          </RNText>
        ),
      )}
      {!cellWidthCache.has(cacheKey) && (
        <RNText style={[$digitText, $calibration]} onLayout={onMeasureCell} {...$hidden}>
          0
        </RNText>
      )}
    </View>
  )
})

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $calibration: TextStyle = {
  position: "absolute",
  opacity: 0,
}
