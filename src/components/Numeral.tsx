import { memo, useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
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
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"
import type { Theme } from "@/theme/types"
import { planRoll, restIndex, settleIndex, STRIP_CELLS } from "@/utils/odometer"

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
  /** Multiplies the size's font, line height and tracking — for layouts that
   * fit type to the space available (S2's hero). Rounded to half-points. */
  scale?: number
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

// A tabular digit's advance in Space Grotesk, as a share of the font size —
// only the first frame's placeholder, before the real "0" is measured.
const UNCALIBRATED_CELL_RATIO = 0.62

/**
 * A digit cell's width is measured once per (font, size) from a hidden "0"
 * glyph and cached module-wide as width *per point of font size*, so every
 * <Numeral> of that size — at any `scale` — mounts with its exact width
 * already known: no per-tick layout shift, and no guessed-then-corrected
 * width when a layout rescales the type (~~one cache entry per rendered
 * font size~~ — corrected 2026-09-26: each new scale re-measured, and the
 * one-frame guess made S2's fitted clock jitter on Android).
 */
const cellRatioCache = new Map<string, number>()
const calibrationListeners = new Set<() => void>()

const ratioKey = (fontFamily: string, size: NumeralSize) => `${fontFamily}-${size}`

function subscribeCalibration(listener: () => void) {
  calibrationListeners.add(listener)
  return () => {
    calibrationListeners.delete(listener)
  }
}

// The static web render measures nothing, so a size is never calibrated
// there — and the hydration render must agree (task 6.3).
const notCalibrated = () => false

const halfPoint = (n: number) => Math.round(n * 2) / 2

/** The font size a <Numeral> of `size` renders at `scale` — half-point rounded. */
export function numeralFontSize(size: NumeralSize, scale = 1): number {
  return halfPoint(($sizeStyles[size].fontSize as number) * scale)
}

/** The width of one digit cell, or `undefined` until that size has been
 * calibrated on this device (any mounted <Numeral> of the size does it). */
export function numeralCellWidth(
  fontFamily: string,
  size: NumeralSize,
  scale = 1,
): number | undefined {
  const ratio = cellRatioCache.get(ratioKey(fontFamily, size))
  return ratio === undefined ? undefined : Math.ceil(ratio * numeralFontSize(size, scale))
}

/** True once every listed size has a calibrated cell width. */
export function useNumeralCalibrated(fontFamily: string, sizes: NumeralSize[]): boolean {
  return useSyncExternalStore(
    subscribeCalibration,
    () => sizes.every((size) => cellRatioCache.has(ratioKey(fontFamily, size))),
    notCalibrated,
  )
}

const $hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants" as const,
}

// "Native: opacity + a 0.94 scale instead [of expo-blur], which reads as
// blur at this size and costs nothing."
const GHOST_OPACITY = 0.18
const GHOST_SCALE = 0.94

const CELL_INDICES = Array.from({ length: STRIP_CELLS }, (_, i) => i)

interface DigitCellProps {
  index: number
  y: SharedValue<number>
  cellWidth: number
  cellHeight: number
  textStyle: TextStyle
  ghostColor: string
}

/**
 * One fixed cell of the strip. Its text never changes; its look follows
 * how far it sits from the window's centre (`index * cellHeight + y`), so
 * a digit fades and scales continuously from ghost to live as it rolls in.
 */
const DigitCell = memo(function DigitCell(props: DigitCellProps) {
  const { index, y, cellWidth, cellHeight, textStyle, ghostColor } = props
  const liveColor = textStyle.color as string

  const $look = useAnimatedStyle(() => {
    const distance = Math.abs(index * cellHeight + y.value)
    const progress = interpolate(distance, [0, cellHeight], [0, 1], Extrapolation.CLAMP)
    return {
      opacity: interpolate(progress, [0, 1], [1, GHOST_OPACITY]),
      transform: [{ scale: interpolate(progress, [0, 1], [1, GHOST_SCALE]) }],
      color: interpolateColor(progress, [0, 1], [liveColor, ghostColor]),
    }
  })

  return (
    <Animated.Text
      style={[textStyle, { width: cellWidth, height: cellHeight }, $look]}
      maxFontSizeMultiplier={1.3}
      {...$hidden}
    >
      {String(index % 10)}
    </Animated.Text>
  )
})

interface RollingDigitProps {
  digit: string
  cellWidth: number
  cellHeight: number
  textStyle: TextStyle
}

/**
 * docs/08-motion-spec.md §3's odometer. A static strip of STRIP_CELLS
 * cells (0-9, 0-9) behind a one-cell `overflow: hidden` window; only the
 * strip's `translateY` ever moves, and only on the UI thread.
 *
 * ~~Three cells whose text rotates after each roll~~ — replaced
 * 2026-09-25. Rotating text needed a JS round-trip (`runOnJS` → setState)
 * at the end of every roll, and React's text commit and the offset reset
 * could land in different frames: a one-frame flash of the wrong digit on
 * every tick. The underdamped spring also overshot and bounced, and a tick
 * arriving mid-roll cancelled the previous completion so a digit skipped.
 * Now: the JS side only publishes the digit; `useAnimatedReaction` plans
 * the move (`utils/odometer.ts`) and animates the offset with an easing
 * curve that cannot overshoot. 9 → 0 rolls forward into the second "0" and
 * the index is shifted back ten cells on landing — an identical glyph, so
 * the shift is invisible.
 */
const RollingDigit = memo(function RollingDigit(props: RollingDigitProps) {
  const { digit, cellWidth, cellHeight, textStyle } = props
  const { theme } = useAppTheme()
  const reducedMotion = useReducedMotion()
  const value = Number(digit)

  const shown = useSharedValue(value)
  const index = useSharedValue(restIndex(value))
  const y = useSharedValue(-restIndex(value) * cellHeight)

  const duration = theme.timing.slow
  const easing = useMemo(() => Easing.bezier(...theme.timing.ease.standard), [theme.timing])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, read by the UI-thread reaction below
    shown.value = value
  }, [value, shown])

  useAnimatedReaction(
    () => shown.value,
    (next, prev) => {
      if (prev === null || next === prev) return
      const plan = reducedMotion
        ? { animate: false, target: restIndex(next) }
        : planRoll(index.value, prev, next)
      index.value = plan.target
      if (!plan.animate) {
        y.value = -plan.target * cellHeight
        return
      }
      y.value = withTiming(-plan.target * cellHeight, { duration, easing }, (finished) => {
        if (!finished) return
        const settled = settleIndex(plan.target)
        if (settled === plan.target) return
        index.value = settled
        y.value = -settled * cellHeight
      })
    },
    [reducedMotion, cellHeight, duration, easing],
  )

  // A size change re-seats the strip on the same cell, without animating.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
    y.value = -index.value * cellHeight
  }, [cellHeight, index, y])

  const $stripMotion = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))

  if (reducedMotion) {
    // "Reduced motion: hard cut, no strip, no neighbours."
    return (
      <View style={$cellWidthOnly(cellWidth)}>
        <RNText style={textStyle} maxFontSizeMultiplier={1.3} {...$hidden}>
          {digit}
        </RNText>
      </View>
    )
  }

  return (
    <View style={$window(cellWidth, cellHeight)}>
      <Animated.View style={$stripMotion}>
        {CELL_INDICES.map((i) => (
          <DigitCell
            key={i}
            index={i}
            y={y}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            textStyle={textStyle}
            ghostColor={theme.colors.textFaint}
          />
        ))}
      </Animated.View>
    </View>
  )
})

export const Numeral = memo(function Numeral(props: NumeralProps) {
  const {
    value,
    size = "numeralLg",
    color,
    animate = "none",
    scale = 1,
    accessibilityLabel,
    style,
  } = props
  const { theme } = useAppTheme()

  const fontFamily = theme.typography.primary.normal
  const base = $sizeStyles[size]
  const fontSize = numeralFontSize(size, scale)
  const cellHeight = halfPoint((base.lineHeight as number) * scale)
  // Tracking follows the rounded font size exactly, so the cell's width per
  // point stays constant across scales.
  const letterSpacing = ((base.letterSpacing as number) * fontSize) / (base.fontSize as number)
  const key = ratioKey(fontFamily, size)

  const calibrated = useSyncExternalStore(
    subscribeCalibration,
    () => cellRatioCache.has(key),
    notCalibrated,
  )
  const cellWidth =
    numeralCellWidth(fontFamily, size, scale) ?? Math.round(fontSize * UNCALIBRATED_CELL_RATIO)

  const onMeasureCell = useCallback(
    (e: LayoutChangeEvent) => {
      if (cellRatioCache.has(key)) return
      cellRatioCache.set(key, e.nativeEvent.layout.width / fontSize)
      calibrationListeners.forEach((listener) => listener())
    },
    [key, fontSize],
  )

  const textColor = color ? (theme.colors[color] as string) : theme.colors.text
  // Stable across ticks, so memo'd digits and cells that didn't change skip
  // re-rendering entirely.
  const $digitText: TextStyle = useMemo(
    () => ({
      fontSize,
      lineHeight: cellHeight,
      letterSpacing,
      fontFamily,
      color: textColor,
      includeFontPadding: false,
      fontVariant: ["tabular-nums"],
      textAlign: "center",
    }),
    [fontSize, cellHeight, letterSpacing, fontFamily, textColor],
  )

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
      {!calibrated && (
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

const $window = (width: number, height: number): ViewStyle => ({
  width,
  height,
  overflow: "hidden",
})
