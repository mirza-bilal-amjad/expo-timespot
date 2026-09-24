import { useCallback, useMemo } from "react"
import { View, ViewStyle } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated"
import { Circle, Line, Svg } from "react-native-svg"
import { scheduleOnRN } from "react-native-worklets"

import { offsetMinutesToX, xToOffsetMinutes } from "@/domain/map/meridian"
import { projectLonLat } from "@/domain/map/projection"
import { useAppTheme } from "@/theme/context"

/**
 * docs/03-component-library.md "<MeridianMap>" (task 4.3 of the composite),
 * docs/04-screen-specs.md "S3 · Map" "Meridian". "1-pt vertical rule in
 * `state.meridian`, full map height, with a 10⌀ ring marker at the focused
 * city's latitude." Drag is `Gesture.Pan()` driven entirely on the UI
 * thread — `translateX` is a Reanimated shared value, and the derived
 * offset is written back to JS via `scheduleOnRN` throttled to 60ms
 * (docs/08-motion-spec.md §5), never per frame.
 *
 * Not yet wired: the ruler/floating-card sync (tasks 4.4/4.6), snap-on-
 * release + selection haptic (4.5), and the real `accessibilityRole="adjustable"`
 * slider contract (4.8, docs/09-accessibility.md §2 "The map" — "the SVG map
 * itself is aria-hidden... the ruler + card is the accessible interface"),
 * which is why this stays `accessibilityElementsHidden` for now rather than
 * a half-built slider that would announce the wrong thing.
 */
export interface MeridianLineProps {
  width: number
  height: number
  /** Latitude the ring marker sits at — the focused city's, or the equator
   * when nothing is focused. */
  markerLat?: number
  /** Starting position, as a UTC offset in minutes. Defaults to UTC+0. */
  initialOffsetMinutes?: number
  /** Fires during a drag, throttled to 60ms — never per frame. */
  onOffsetChange?: (offsetMinutes: number) => void
}

// Matches the ruler tick's own "44pt hitSlop even though the visual is 13pt"
// (docs/04-screen-specs.md "Ruler") — the same generous-hit/thin-visual idea
// applied to this control's own touch target.
const HIT_WIDTH = 44
// docs/04-screen-specs.md's own "10⌀ ring marker".
const RING_DIAMETER = 10
const RING_STROKE_WIDTH = 2
const LINE_STROKE_WIDTH = 1
const NOTIFY_THROTTLE_MS = 60

export function MeridianLine(props: MeridianLineProps) {
  const { width, height, markerLat = 0, initialOffsetMinutes = 0, onOffsetChange } = props
  const { theme } = useAppTheme()

  const translateX = useSharedValue(offsetMinutesToX(initialOffsetMinutes, width))
  const startX = useSharedValue(translateX.value)
  const lastNotifyMs = useSharedValue(0)

  const notify = useCallback(
    (offsetMinutes: number) => onOffsetChange?.(offsetMinutes),
    [onOffsetChange],
  )

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startX.value = translateX.value
        })
        .onUpdate((e) => {
          const nextX = Math.min(Math.max(startX.value + e.translationX, 0), width)
          translateX.value = nextX

          // This runs on the UI thread inside a worklet gesture callback, not
          // during render — the "impure function during render" rule can't
          // tell the two apart from a runtime call to `performance.now`.
          // eslint-disable-next-line react-hooks/purity
          const nowMs = performance.now()
          if (nowMs - lastNotifyMs.value >= NOTIFY_THROTTLE_MS) {
            lastNotifyMs.value = nowMs
            scheduleOnRN(notify, xToOffsetMinutes(nextX, width))
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gesture callback is workletized; shared values (startX, translateX, lastNotifyMs) are stable refs, not reactive deps.
    [width, notify],
  )

  const $animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - HIT_WIDTH / 2 }],
  }))

  if (width <= 0 || height <= 0) return null

  const markerY = projectLonLat(0, markerLat, width, height).y

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[$container(height), $animatedStyle]}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width={HIT_WIDTH} height={height}>
            <Line
              x1={HIT_WIDTH / 2}
              y1={0}
              x2={HIT_WIDTH / 2}
              y2={height}
              stroke={theme.colors.meridian}
              strokeWidth={LINE_STROKE_WIDTH}
            />
            <Circle
              cx={HIT_WIDTH / 2}
              cy={markerY}
              r={RING_DIAMETER / 2}
              stroke={theme.colors.meridian}
              strokeWidth={RING_STROKE_WIDTH}
              fill="none"
            />
          </Svg>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

const $container = (height: number): ViewStyle => ({
  position: "absolute",
  top: 0,
  width: HIT_WIDTH,
  height,
})
