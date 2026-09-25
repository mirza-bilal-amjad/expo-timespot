import { useMemo } from "react"
import { AccessibilityActionEvent, Platform, View, ViewStyle } from "react-native"
import * as Haptics from "expo-haptics"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { Circle, Line, Svg } from "react-native-svg"

import { getNearestRepresentativeCity } from "@/domain/cities/search"
import {
  MAX_OFFSET_MINUTES,
  MIN_OFFSET_MINUTES,
  offsetMinutesToX,
  pixelVelocityToOffsetVelocity,
  xToOffsetMinutes,
} from "@/domain/map/meridian"
import { projectLonLat } from "@/domain/map/projection"
import { snapToNearestOffset, stepToAdjacentOffset } from "@/domain/map/snap"
import { meridianValueText } from "@/domain/time/speech"
import { getZonedTime } from "@/domain/time/zone"
import type { Prefs } from "@/domain/types"
import { useThrottledSharedValue } from "@/hooks/useThrottledSharedValue"
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
 * (docs/08-motion-spec.md §5).
 *
 * Task 4.5 originally also pushed a throttled `onOffsetChange` from here —
 * removed in 4.6 once `<FloatingCityCard>` proved it wrong: `offsetMinutes`
 * is shared with `<UtcRuler>`, and a ruler tap or scroll writes it directly,
 * without ever going through this component's own gesture at all, so a
 * bridge that only fired from *this* component's `.onUpdate()`/`.onEnd()`
 * silently missed most real changes. `useThrottledSharedValue` (task 4.8)
 * is the fix that generalised — it watches `offsetMinutes` itself, not this
 * component's gesture, so it sees every source of a write.
 *
 * Task 4.8 makes this the real accessible interface (docs/09-accessibility.md
 * §2 "The map"): `accessibilityRole="adjustable"` with an
 * `accessibilityValue.text` reading `domain/time/speech.ts`'s
 * `meridianValueText` (e.g. "UTC plus 1, Algiers, 5:40 PM") — the SVG stays
 * `aria-hidden`, but the drag surface around it no longer does.
 * Increment/decrement (VoiceOver swipe-up/down, TalkBack volume keys) step
 * to the *adjacent real offset* (`stepToAdjacentOffset`), matching the
 * doc's "move it one zone." Web adds `←`/`→` for a raw ±1h step and
 * `Shift+←`/`Shift+→` for ±15min (docs/08-motion-spec.md §5.6) —
 * deliberately *not* snapped to a real zone the way increment/decrement is:
 * this is direct fine-grained control, the keyboard equivalent of the drag
 * itself, not "next stop."
 */
export interface MeridianLineProps {
  width: number
  height: number
  /** Latitude the ring marker sits at — the focused city's, or the equator
   * when nothing is focused. */
  markerLat?: number
  offsetMinutes: SharedValue<number>
  /** The one clock tick (CLAUDE.md rule 3) — this component doesn't
   * subscribe itself, same convention as `<FloatingCityCard now={now}>`. */
  now: number
  prefs: Prefs
}

// Matches the ruler tick's own "44pt hitSlop even though the visual is 13pt"
// (docs/04-screen-specs.md "Ruler") — the same generous-hit/thin-visual idea
// applied to this control's own touch target.
const HIT_WIDTH = 44
// docs/04-screen-specs.md's own "10⌀ ring marker".
const RING_DIAMETER = 10
const RING_STROKE_WIDTH = 2
const LINE_STROKE_WIDTH = 1

function triggerSnapHaptic() {
  if (Platform.OS !== "web") {
    Haptics.selectionAsync().catch(() => {})
  }
}

const ACCESSIBILITY_VALUE_THROTTLE_MS = 60

// docs/08-motion-spec.md §5.6: "←/→ key steps of one hour (Shift → 15 min)."
const ARROW_KEY_STEP_MINUTES = 60
const SHIFT_ARROW_KEY_STEP_MINUTES = 15

export function MeridianLine(props: MeridianLineProps) {
  const { width, height, markerLat = 0, offsetMinutes, now, prefs } = props
  const { theme } = useAppTheme()
  const springPress = theme.timing.spring.press

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
        })
        .onEnd((e) => {
          const velocity = pixelVelocityToOffsetVelocity(e.velocityX, width)
          const target = snapToNearestOffset(offsetMinutes.value, velocity)
          // eslint-disable-next-line react-hooks/immutability
          offsetMinutes.value = withSpring(target, springPress)
          runOnJS(triggerSnapHaptic)()
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gesture callback is workletized; shared values (startOffset, offsetMinutes) are stable refs, not reactive deps.
    [width, springPress],
  )

  const $animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetMinutesToX(offsetMinutes.value, width) - HIT_WIDTH / 2 }],
  }))

  const resolvedOffsetMinutes = useThrottledSharedValue(
    offsetMinutes,
    ACCESSIBILITY_VALUE_THROTTLE_MS,
  )
  const resolvedCity = getNearestRepresentativeCity(resolvedOffsetMinutes, now)
  const resolvedTime = getZonedTime(now, resolvedCity.zone, prefs)

  // docs/09-accessibility.md §2: "VoiceOver swipe-up/down and TalkBack
  // volume-key adjustment both move it one zone" — the *adjacent real
  // offset*, not a raw ±1h (see stepToAdjacentOffset's own doc comment).
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    // offsetMinutes is a Reanimated shared value passed as a prop — see the
    // gesture callback above's own note on this same established false
    // positive; this write just happens from a JS-thread a11y callback
    // instead of a UI-thread worklet.
    if (event.nativeEvent.actionName === "increment") {
      // eslint-disable-next-line react-hooks/immutability
      offsetMinutes.value = withTiming(stepToAdjacentOffset(offsetMinutes.value, 1), {
        duration: theme.timing.base,
      })
    } else if (event.nativeEvent.actionName === "decrement") {
      // eslint-disable-next-line react-hooks/immutability
      offsetMinutes.value = withTiming(stepToAdjacentOffset(offsetMinutes.value, -1), {
        duration: theme.timing.base,
      })
    }
  }

  // Raw, unsnapped ±1h/±15min — the keyboard's own fine-grained control,
  // not "next real zone" (see this component's own doc comment for why
  // that's deliberately different from the accessibility increment/decrement
  // above).
  const moveByRaw = (deltaMinutes: number) => {
    const target = Math.min(
      Math.max(offsetMinutes.value + deltaMinutes, MIN_OFFSET_MINUTES),
      MAX_OFFSET_MINUTES,
    )
    // eslint-disable-next-line react-hooks/immutability -- same established false positive as above
    offsetMinutes.value = withTiming(target, { duration: theme.timing.base })
  }

  const webKeyboardProps =
    Platform.OS === "web"
      ? {
          // react-native-web only makes button/checkbox/link/radio/textbox/switch
          // roles keyboard-focusable by default — "adjustable" (ARIA "slider")
          // isn't one of them, so without this the ←/→ handler below would
          // never receive a keydown at all (confirmed against RNW's own
          // createDOMProps source).
          focusable: true,
          onKeyDown: (e: { key: string; shiftKey: boolean }) => {
            const step = e.shiftKey ? SHIFT_ARROW_KEY_STEP_MINUTES : ARROW_KEY_STEP_MINUTES
            if (e.key === "ArrowRight") moveByRaw(step)
            else if (e.key === "ArrowLeft") moveByRaw(-step)
          },
        }
      : undefined

  if (width <= 0 || height <= 0) return null

  const markerY = projectLonLat(0, markerLat, width, height).y
  const valueText = meridianValueText(resolvedCity, resolvedTime)
  const valueMin = MIN_OFFSET_MINUTES / 60
  const valueMax = MAX_OFFSET_MINUTES / 60
  const valueNow = resolvedOffsetMinutes / 60

  // react-native-web doesn't read RN native's nested `accessibilityValue`
  // object at all — it only understands these flat `aria-value*` props
  // (confirmed against its own createDOMProps source), so the slider's
  // value is silently missing from the web accessibility tree without
  // them. Merged into the same web-only, cast-to-any spread as the
  // keyboard handler below, for the same typing reason.
  const webAccessibilityValueProps =
    Platform.OS === "web"
      ? {
          "aria-valuemin": valueMin,
          "aria-valuemax": valueMax,
          "aria-valuenow": valueNow,
          "aria-valuetext": valueText,
        }
      : undefined

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[$container(height), $animatedStyle]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Time zone selector"
        accessibilityValue={{ min: valueMin, max: valueMax, now: valueNow, text: valueText }}
        accessibilityActions={[
          { name: "increment", label: "Next time zone" },
          { name: "decrement", label: "Previous time zone" },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onKeyDown/aria-value* are react-native-web-only, not in RN's View typings (same pattern as SegmentedPill's own web arrow keys)
        {...({ ...webKeyboardProps, ...webAccessibilityValueProps } as any)}
      >
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
