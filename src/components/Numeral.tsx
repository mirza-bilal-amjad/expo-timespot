import { memo, useCallback, useEffect, useRef, useState } from "react"
import {
  LayoutChangeEvent,
  // eslint-disable-next-line no-restricted-imports
  Text as RNText,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"
import type { Theme } from "@/theme/types"

export type NumeralSize = "numeralMd" | "numeralLg" | "display" | "displayXl" | "hero"

export interface NumeralProps {
  /** e.g. '08', '08:40', '15' — digits and separators only. */
  value: string
  size?: NumeralSize
  color?: keyof Omit<Theme["colors"], "palette">
  /** 'roll': each digit position that changed since the last render slides
   * up like an odometer wheel (docs/08-motion-spec.md §3); unchanged
   * positions and separators never animate. 'none' (default) is always a
   * plain cut. */
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

// docs/08-motion-spec.md §3: "Clock-jump guard: if the value changes by
// more than 2, cut instead of rolling." A single digit position wraps
// mod 10 (9 -> 0 is a normal tick, not a jump), so the distance that
// threshold applies to is the *circular* one — a routine 59 -> 00 minute
// rollover then rolls its units digit (9->0, circular distance 1) but cuts
// its tens digit (5->0, circular distance 5), which is exactly the right
// visual: only the digit that's genuinely just "one more" rolls.
const JUMP_GUARD_THRESHOLD = 2

function circularDigitDistance(a: number, b: number): number {
  const diff = Math.abs(a - b)
  return Math.min(diff, 10 - diff)
}

// "Native: opacity + a 0.94 scale instead [of expo-blur], which reads as
// blur at this size and costs nothing."
const GHOST_OPACITY = 0.18
const GHOST_SCALE = 0.94

/**
 * One cell's opacity/scale/colour, all driven by the same `y` shared value
 * the strip's own translateY uses — `distance` is how far *this* cell
 * currently sits from the visible window's centre (its rest offset plus
 * the in-flight scroll), so as the strip moves every cell fades and scales
 * continuously between "live" and "ghost" together, rather than each cell
 * having a fixed, discontinuous look that only swaps at the moment the
 * strip's contents rotate. `baseOffset` is that cell's rest position:
 * `-cellHeight` for the previous digit, `0` for the live one, `cellHeight`
 * for the next — the same three positions `RollingDigit` always renders.
 */
function useCellStyle(
  y: SharedValue<number>,
  cellHeight: number,
  baseOffset: number,
  liveColor: string,
  ghostColor: string,
) {
  return useAnimatedStyle(() => {
    const distance = Math.abs(baseOffset + y.value)
    const progress = interpolate(distance, [0, cellHeight], [0, 1], Extrapolation.CLAMP)
    return {
      opacity: interpolate(progress, [0, 1], [1, GHOST_OPACITY]),
      transform: [{ scale: interpolate(progress, [0, 1], [1, GHOST_SCALE]) }],
      color: interpolateColor(progress, [0, 1], [liveColor, ghostColor]),
    }
  })
}

interface RollingDigitProps {
  digit: string
  cellWidth: number
  cellHeight: number
  textStyle: TextStyle
}

/**
 * docs/08-motion-spec.md §3's odometer: a 3-cell strip (previous digit /
 * live digit / next digit) in a 1-cell `overflow: hidden` window. At rest
 * the strip sits at `translateY: -cellHeight` so the middle cell shows;
 * on a change it animates one more `-cellHeight` (revealing the "next"
 * cell rising from below, rule 2's "time moves up"), then the displayed
 * digit is rotated and the offset reset to `-cellHeight` — the same
 * `y.value = withSpring(...); if (finished) { rotate(); y.value = 0 }`
 * shape the doc's own pseudocode shows, just with the constant `-cellHeight`
 * base folded into the container's transform instead of the animated value.
 */
function RollingDigit(props: RollingDigitProps) {
  const { digit, cellWidth, cellHeight, textStyle } = props
  const { theme } = useAppTheme()
  const reducedMotion = useReducedMotion()

  const [displayDigit, setDisplayDigit] = useState(digit)
  const prevDigitRef = useRef(digit)
  const y = useSharedValue(0)

  useEffect(() => {
    const prev = prevDigitRef.current
    prevDigitRef.current = digit
    if (prev === digit) return

    // This effect's job is exactly "synchronize local display state with a
    // changed prop, using an external system (Reanimated's UI thread) when
    // motion is warranted" — real effect territory, not the "you might not
    // need an effect" case: which of the three branches below runs can only
    // be known once `digit` has actually changed, and the animate branch
    // must start a UI-thread animation, which render-phase code must not do.
    //
    // Reduced motion: hard cut, no strip, no neighbours — the digit still
    // updates, per the doc's own rule. Reanimated's own `reduceMotion:
    // ReduceMotion.System` default (every `withSpring` call, unconfigured)
    // already makes the animation itself instant; this skips rendering the
    // ghost neighbours at all, which the OS setting doesn't do on its own.
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayDigit(digit)
      return
    }

    const jump = circularDigitDistance(Number(digit), Number(prev))
    if (jump > JUMP_GUARD_THRESHOLD) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayDigit(digit)
      return
    }

    y.value = withSpring(-cellHeight, theme.timing.spring.numeral, (finished) => {
      if (finished) {
        runOnJS(setDisplayDigit)(digit)
        y.value = 0
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- y/cellHeight/theme.timing.spring.numeral are stable refs/constants for this component's lifetime; only `digit` and `reducedMotion` should retrigger the effect.
  }, [digit, reducedMotion])

  const $animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -cellHeight + y.value }],
  }))

  const liveColor = textStyle.color as string
  const ghostColor = theme.colors.textFaint
  const $prevStyle = useCellStyle(y, cellHeight, -cellHeight, liveColor, ghostColor)
  const $currentStyle = useCellStyle(y, cellHeight, 0, liveColor, ghostColor)
  const $nextStyle = useCellStyle(y, cellHeight, cellHeight, liveColor, ghostColor)

  if (reducedMotion) {
    return (
      <View style={$cellWidthOnly(cellWidth)}>
        <RNText style={textStyle} maxFontSizeMultiplier={1.3} {...$hidden}>
          {displayDigit}
        </RNText>
      </View>
    )
  }

  // "the next value rises from below, like an odometer" — the cell below
  // is what the wheel is turning toward, not a value that has occurred yet.
  const prevChar = String((Number(displayDigit) + 9) % 10)
  const nextChar = String((Number(displayDigit) + 1) % 10)

  const $cell: TextStyle = { ...textStyle, width: cellWidth, height: cellHeight }

  return (
    <View style={$strip(cellWidth, cellHeight)}>
      <Animated.View style={$animatedStyle}>
        <Animated.Text style={[$cell, $prevStyle]} {...$hidden}>
          {prevChar}
        </Animated.Text>
        <Animated.Text style={[$cell, $currentStyle]} maxFontSizeMultiplier={1.3} {...$hidden}>
          {displayDigit}
        </Animated.Text>
        <Animated.Text style={[$cell, $nextStyle]} {...$hidden}>
          {nextChar}
        </Animated.Text>
      </Animated.View>
    </View>
  )
}

export const Numeral = memo(function Numeral(props: NumeralProps) {
  const { value, size = "numeralLg", color, animate = "none", accessibilityLabel, style } = props
  const { theme } = useAppTheme()

  const fontFamily = theme.typography.primary.medium
  const fontSize = $sizeStyles[size].fontSize as number
  const cellHeight = $sizeStyles[size].lineHeight as number
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
          animate === "roll" ? (
            <RollingDigit
              key={index}
              digit={char}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              textStyle={$digitText}
            />
          ) : (
            <View key={index} style={{ width: cellWidth }}>
              <RNText style={$digitText} maxFontSizeMultiplier={1.3} {...$hidden}>
                {char}
              </RNText>
            </View>
          )
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

const $cellWidthOnly = (width: number): ViewStyle => ({ width })

const $strip = (width: number, height: number): ViewStyle => ({ width, height, overflow: "hidden" })
