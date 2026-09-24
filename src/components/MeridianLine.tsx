import { useMemo } from "react"
import { View, ViewStyle } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated"
import { Circle, Line, Svg } from "react-native-svg"

import { offsetMinutesToX, xToOffsetMinutes } from "@/domain/map/meridian"
import { projectLonLat } from "@/domain/map/projection"
import { useAppTheme } from "@/theme/context"

/**
 * docs/03-component-library.md "<MeridianMap>" (task 4.3 of the composite),
 * docs/04-screen-specs.md "S3 · Map" "Meridian". "1-pt vertical rule in
 * `state.meridian`, full map height, with a 10⌀ ring marker at the focused
 * city's latitude." Drag is `Gesture.Pan()` driven entirely on the UI
 * thread.
 *
 * `offsetMinutes` is owned by the caller (`MapScreen`, via `useSharedValue`)
 * and shared with `<UtcRuler>` — task 4.4's "the ruler and the meridian are
 * two views of one shared value... no JS round-trip" turned out to mean
 * exactly that literally: this component no longer owns its own position or
 * emits a throttled JS callback (task 4.3's approach) — it reads and writes
 * the *same* shared value the ruler does, entirely on the UI thread. A JS
 * consumer (task 4.6's floating card) will read this shared value with its
 * own throttled reaction when it exists; it doesn't need this component to
 * plumb one through.
 *
 * Not yet wired: snap-on-release + selection haptic (4.5), and the real
 * `accessibilityRole="adjustable"` slider contract (4.8,
 * docs/09-accessibility.md §2 "The map" — "the SVG map itself is
 * aria-hidden... the ruler + card is the accessible interface"), which is
 * why this stays `accessibilityElementsHidden` for now rather than a
 * half-built slider that would announce the wrong thing.
 */
export interface MeridianLineProps {
  width: number
  height: number
  /** Latitude the ring marker sits at — the focused city's, or the equator
   * when nothing is focused. */
  markerLat?: number
  offsetMinutes: SharedValue<number>
}

// Matches the ruler tick's own "44pt hitSlop even though the visual is 13pt"
// (docs/04-screen-specs.md "Ruler") — the same generous-hit/thin-visual idea
// applied to this control's own touch target.
const HIT_WIDTH = 44
// docs/04-screen-specs.md's own "10⌀ ring marker".
const RING_DIAMETER = 10
const RING_STROKE_WIDTH = 2
const LINE_STROKE_WIDTH = 1

export function MeridianLine(props: MeridianLineProps) {
  const { width, height, markerLat = 0, offsetMinutes } = props
  const { theme } = useAppTheme()

  const startOffset = useSharedValue(offsetMinutes.value)

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startOffset.value = offsetMinutes.value
        })
        .onUpdate((e) => {
          const startX = offsetMinutesToX(startOffset.value, width)
          const nextX = Math.min(Math.max(startX + e.translationX, 0), width)
          // offsetMinutes is a Reanimated shared value passed as a prop —
          // its own `.value` is intentionally mutable outside React's
          // render model (that's the whole point of sharing it with
          // <UtcRuler>); the lint rule can't distinguish that from mutating
          // a plain prop. Same false positive as ReorderableCityRow.tsx's
          // indexShared.value write.
          // eslint-disable-next-line react-hooks/immutability
          offsetMinutes.value = xToOffsetMinutes(nextX, width)
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gesture callback is workletized; shared values (startOffset, offsetMinutes) are stable refs, not reactive deps.
    [width],
  )

  const $animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetMinutesToX(offsetMinutes.value, width) - HIT_WIDTH / 2 }],
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
