import { useMemo } from "react"
import { Platform, View, ViewStyle } from "react-native"
import * as Haptics from "expo-haptics"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { Circle, Line, Svg } from "react-native-svg"

import {
  offsetMinutesToX,
  pixelVelocityToOffsetVelocity,
  xToOffsetMinutes,
} from "@/domain/map/meridian"
import { projectLonLat } from "@/domain/map/projection"
import { snapToNearestOffset } from "@/domain/map/snap"
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
 * exactly that literally: this component no longer owns its own position
 * (task 4.3's approach) — it reads and writes the *same* shared value the
 * ruler does, entirely on the UI thread for the drag itself.
 *
 * Task 4.5 adds the release behaviour: `.onEnd()` snaps to the nearest real
 * UTC offset (`domain/map/snap.ts`, velocity-aware so a fast flick can
 * travel several zones) with `theme.timing.spring.press`, plus
 * `Haptics.selectionAsync()` on the snap itself — never during the drag,
 * which is direct manipulation and must track the finger exactly
 * (docs/08-motion-spec.md §5). `onOffsetChange`, if given, is pushed with
 * `runOnJS` throttled to 60 ms (never per frame — the same non-negotiable
 * CLAUDE.md's "things that will bite" calls out by name): task 4.6's
 * floating card is its first real consumer, reading the offset to resolve
 * a zone label from the city dataset, which is JS-only work this component
 * has no business doing itself.
 *
 * Not yet wired: the real `accessibilityRole="adjustable"` slider contract
 * (4.8, docs/09-accessibility.md §2 "The map" — "the SVG map itself is
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
  /** Pushed via `runOnJS`, throttled to 60 ms during the drag and once more
   * on release/snap settle. Optional — with no listener, nothing crosses
   * onto the JS thread while dragging at all. */
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

// docs/08-motion-spec.md §5, non-negotiable #2: "pushed with runOnJS
// throttled to 60ms — about 16 updates/second... 4x cheaper than per-frame."
const OFFSET_CHANGE_THROTTLE_MS = 60

function triggerSnapHaptic() {
  if (Platform.OS !== "web") {
    Haptics.selectionAsync().catch(() => {})
  }
}

export function MeridianLine(props: MeridianLineProps) {
  const { width, height, markerLat = 0, offsetMinutes, onOffsetChange } = props
  const { theme } = useAppTheme()
  const springPress = theme.timing.spring.press

  const startOffset = useSharedValue(offsetMinutes.value)
  const lastOffsetPushMs = useSharedValue(0)

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

          if (onOffsetChange) {
            // A UI-thread clock read, needed to gate the runOnJS bridge to
            // 60ms — the lint rule can't tell this from an impure read
            // during render. Same established false positive as task 4.3's
            // now-removed throttle (still correct here; this one is load
            // bearing, not leftover plumbing).
            // eslint-disable-next-line react-hooks/purity
            const now = performance.now()
            if (now - lastOffsetPushMs.value >= OFFSET_CHANGE_THROTTLE_MS) {
              lastOffsetPushMs.value = now
              runOnJS(onOffsetChange)(offsetMinutes.value)
            }
          }
        })
        .onEnd((e) => {
          const velocity = pixelVelocityToOffsetVelocity(e.velocityX, width)
          const target = snapToNearestOffset(offsetMinutes.value, velocity)
          // eslint-disable-next-line react-hooks/immutability
          offsetMinutes.value = withSpring(target, springPress)
          runOnJS(triggerSnapHaptic)()
          if (onOffsetChange) {
            lastOffsetPushMs.value = performance.now() // eslint-disable-line react-hooks/purity
            runOnJS(onOffsetChange)(target)
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gesture callback is workletized; shared values (startOffset, offsetMinutes, lastOffsetPushMs) are stable refs, not reactive deps.
    [width, springPress, onOffsetChange],
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
