import { useEffect, useRef, useState } from "react"
import { Platform, TextStyle, View, ViewStyle } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Pressable } from "./Pressable"
import { Text } from "./Text"

/**
 * docs/03-component-library.md. The 12h/24h control (and anything else with
 * a small, fixed set of mutually-exclusive options). Thumb width is measured
 * from each segment's actual rendered width, so options of different widths
 * (e.g. '12h' vs '24h') both look right.
 */
export interface SegmentedPillOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedPillProps<T extends string> {
  options: SegmentedPillOption<T>[]
  value: T
  onChange: (value: T) => void
  style?: ViewStyle
  accessibilityLabel?: string
}

// No token exists yet for a fixed 36pt control height (docs/02-design-system.md
// has no control-height scale) — named constant, not a bare magic number.
const TRACK_HEIGHT = 36

export function SegmentedPill<T extends string>(props: SegmentedPillProps<T>) {
  const { options, value, onChange, style, accessibilityLabel } = props
  const { theme, themed } = useAppTheme()
  const [widths, setWidths] = useState<Partial<Record<T, number>>>({})

  const activeIndex = options.findIndex((o) => o.value === value)

  const thumbX = useSharedValue(0)
  const thumbWidth = useSharedValue(0)
  const hasMeasured = useRef(false)

  useEffect(() => {
    if (widths[options[activeIndex]?.value as T] === undefined) return

    let x = theme.spacing.xxxs
    for (let i = 0; i < activeIndex; i++) {
      x += widths[options[i].value] ?? 0
    }
    const w = widths[options[activeIndex]?.value as T] ?? 0

    if (!hasMeasured.current) {
      // First real measurement — snap into place, don't animate a grow-from-nothing entrance.
      hasMeasured.current = true
      thumbX.value = x
      thumbWidth.value = w
      return
    }

    const config = {
      duration: theme.timing.base,
      easing: Easing.bezier(...theme.timing.ease.standard),
    }
    thumbX.value = withTiming(x, config)
    thumbWidth.value = withTiming(w, config)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theme is stable per render; re-running on it would re-trigger the animation for no reason
  }, [activeIndex, widths])

  const $thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
    width: thumbWidth.value,
  }))

  function moveSelection(delta: 1 | -1) {
    const next = options[Math.min(Math.max(activeIndex + delta, 0), options.length - 1)]
    if (next) onChange(next.value)
  }

  const webKeyboardProps =
    Platform.OS === "web"
      ? {
          onKeyDown: (e: { key: string }) => {
            if (e.key === "ArrowRight") moveSelection(1)
            else if (e.key === "ArrowLeft") moveSelection(-1)
          },
        }
      : undefined

  return (
    <View
      style={[themed($track), style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onKeyDown is a react-native-web-only DOM event, not in RN's View typings
      {...(webKeyboardProps as any)}
    >
      <Animated.View style={[themed($thumb), $thumbAnimatedStyle]} />
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width
              setWidths((prev) =>
                prev[option.value] === width ? prev : { ...prev, [option.value]: width },
              )
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={option.label}
            style={themed($segment)}
          >
            <Text text={option.label} style={themed(active ? $labelActive : $label)} />
          </Pressable>
        )
      })}
    </View>
  )
}

const $track: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  height: TRACK_HEIGHT,
  borderRadius: theme.radius.pill,
  backgroundColor: theme.colors.controlBackground,
  padding: theme.spacing.xxxs,
})

const $thumb: ThemedStyle<ViewStyle> = (theme) => ({
  position: "absolute",
  top: theme.spacing.xxxs,
  bottom: theme.spacing.xxxs,
  borderRadius: theme.radius.pill,
  backgroundColor: theme.colors.inverseBackground,
})

const $segment: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.md,
  alignItems: "center",
  justifyContent: "center",
})

const $label: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.text })
const $labelActive: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textOnInverse })
