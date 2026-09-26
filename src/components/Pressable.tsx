import { forwardRef, useCallback, useState } from "react"
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  Platform,
  TargetedEvent,
  View,
  ViewStyle,
  // eslint-disable-next-line no-restricted-imports
  Pressable as RNPressable,
  // eslint-disable-next-line no-restricted-imports
  PressableProps as RNPressableProps,
} from "react-native"
import * as Haptics from "expo-haptics"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"

/**
 * docs/03-component-library.md — Tier 1. The only place besides Text/Numeral
 * that touches raw RN. Every other pressable surface (Button, SegmentedPill,
 * Icon's pressable variant, CityRow…) composes this instead of RN's Pressable
 * directly, so press feedback, hit area and the web focus ring are consistent
 * everywhere for free.
 */

const MIN_TARGET = Platform.select({ ios: 44, android: 48, default: 24 })!

export interface PressableProps extends Omit<RNPressableProps, "style"> {
  style?: RNPressableProps["style"]
  disabled?: boolean
  /** Scale the surface shrinks to on press-in, via `spring.press`. Default
   * `0.97` (buttons, pills, icons — anything the docs don't call out a
   * specific value for). docs/04-screen-specs.md's own row-states table and
   * docs/08-motion-spec.md §4 both specify `0.985` for `<CityRow>`
   * specifically — a full-width row shrinking as much as a small button
   * would read as an alarming jump, not a tap acknowledgement. */
  pressedScale?: number
}

const DEFAULT_PRESSED_SCALE = 0.97

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable)

export const Pressable = forwardRef<View, PressableProps>(function Pressable(props, ref) {
  const {
    style,
    hitSlop,
    disabled,
    onPressIn,
    onPressOut,
    onLayout,
    onFocus,
    onBlur,
    pressedScale = DEFAULT_PRESSED_SCALE,
    ...rest
  } = props
  const { theme } = useAppTheme()
  const scale = useSharedValue(1)
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null)
  const [focused, setFocused] = useState(false)

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout
      setMeasured({ width, height })
      onLayout?.(e)
    },
    [onLayout],
  )

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withSpring(pressedScale, theme.timing.spring.press)
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      }
      onPressIn?.(e)
    },
    [onPressIn, scale, pressedScale, theme.timing.spring.press],
  )

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withSpring(1, theme.timing.spring.press)
      onPressOut?.(e)
    },
    [onPressOut, scale, theme.timing.spring.press],
  )

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      setFocused(isFocusVisible(e))
      onFocus?.(e)
    },
    [onFocus],
  )

  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      setFocused(false)
      onBlur?.(e)
    },
    [onBlur],
  )

  const $animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  // Auto-hitSlop only pads up to the platform minimum touch target — it never
  // shrinks a slop the caller passed explicitly, and never inflates the visual.
  const autoHitSlop =
    !hitSlop && measured && Platform.OS !== "web"
      ? {
          top: Math.max(0, (MIN_TARGET - measured.height) / 2),
          bottom: Math.max(0, (MIN_TARGET - measured.height) / 2),
          left: Math.max(0, (MIN_TARGET - measured.width) / 2),
          right: Math.max(0, (MIN_TARGET - measured.width) / 2),
        }
      : undefined

  return (
    <AnimatedPressable
      ref={ref}
      hitSlop={hitSlop ?? autoHitSlop}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={handleLayout}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[
        $animatedStyle,
        disabled && $disabledStyle,
        // docs/04-screen-specs.md "focus-visible (web)": keyboard focus only.
        Platform.OS === "web" && focused && ($focusRingStyle(theme.colors.focusRing) as ViewStyle),
        style,
      ]}
      {...rest}
    />
  )
})

const $disabledStyle: ViewStyle = { opacity: 0.4 }

/**
 * Whether a focus should show the ring — the browser's own `:focus-visible`
 * verdict (keyboard focus yes, a mouse or touch press no). On web the focus
 * event's target is the DOM element itself. ~~Ring on any web focus~~ —
 * corrected 2026-09-26: pressing a row showed the ring, and while dragging
 * it read as two stray lines beside the lifted card. Browsers without
 * `:focus-visible` keep showing it (the accessible default).
 */
function isFocusVisible(e: NativeSyntheticEvent<TargetedEvent>): boolean {
  if (Platform.OS !== "web") return false
  const target = (e as unknown as { target?: { matches?: (selector: string) => boolean } }).target
  try {
    return target?.matches?.(":focus-visible") ?? true
  } catch {
    return true
  }
}

const $focusRingStyle = (color: string) =>
  ({
    outlineWidth: 2,
    outlineColor: color,
    outlineStyle: "solid",
    outlineOffset: 2,
  }) as ViewStyle
