import { useEffect } from "react"
import { StyleProp, View, ViewStyle } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"

/**
 * docs/08-motion-spec.md §7 "Entrance choreography" — the shared mechanism
 * behind every row of that table: opacity 0→1, `translateY` from `distance`
 * down to 0, `ease.decelerate`. Each caller supplies `play` (from
 * `useShouldPlayEntrance`, so it only ever fires once per screen per app
 * process), its own `delayMs` (the table's stagger) and `durationMs`.
 *
 * When `play` is false (a warm start) or reduced motion is on, this renders
 * a plain `View` with no Animated wrapper at all — "skipped entirely," not
 * an instant version of the same animation, matching how `Numeral`'s own
 * reduced-motion path (task 5.1) treats "skip the mechanism" as distinct
 * from "make it instant."
 */
export interface EntranceViewProps {
  play: boolean
  delayMs?: number
  durationMs?: number
  /** Starting `translateY` offset the element settles in from. The table's
   * own default is 8 (hero/title/rows); the tab bar's own row asks for 16. */
  distance?: number
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}

const DEFAULT_DISTANCE = 8

export function EntranceView(props: EntranceViewProps) {
  const { play, delayMs = 0, durationMs, distance = DEFAULT_DISTANCE, style, children } = props
  const { theme } = useAppTheme()
  const duration = durationMs ?? theme.timing.slow
  const reducedMotion = useReducedMotion()
  const active = play && !reducedMotion

  const progress = useSharedValue(active ? 0 : 1)

  useEffect(() => {
    if (!active) return
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration, easing: Easing.bezier(...theme.timing.ease.decelerate) }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount for this element's own single entrance; delayMs/duration/theme are stable for the component's lifetime.
  }, [active])

  const $animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }))

  // This wrapper is purely visual choreography, never a touch target itself
  // — without `box-none`, a caller that sizes it to `StyleSheet.absoluteFill`
  // (the tab bar's own usage, so its translateY has a real box to animate
  // within — see `(tabs)/_layout.tsx`) turns it into a full-screen, invisible
  // pane sitting over every other screen and swallows every touch that isn't
  // on the tab bar's own small pill, anywhere in the app. `box-none` makes
  // the wrapper itself untouchable while leaving its children (here, the tab
  // bar) hit-testable exactly as before.
  if (!active)
    return (
      <View style={style} pointerEvents="box-none">
        {children}
      </View>
    )

  return (
    <Animated.View style={[style, $animatedStyle]} pointerEvents="box-none">
      {children}
    </Animated.View>
  )
}
