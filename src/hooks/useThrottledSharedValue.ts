import { useState } from "react"
import { runOnJS, SharedValue, useAnimatedReaction, useSharedValue } from "react-native-reanimated"

/**
 * A UI-thread Reanimated shared value's current value, mirrored onto the JS
 * thread and re-rendered at most every `throttleMs` — never per frame.
 * Watches `value` itself via `useAnimatedReaction`, so it sees every write
 * regardless of which gesture, scroll or animation produced it.
 *
 * Extracted from `<FloatingCityCard>` (task 4.6), which discovered the hard
 * way that a throttled bridge scoped to *one* component's own gesture
 * (`<MeridianLine>`'s original `onOffsetChange`, task 4.5) misses writes
 * made by a sibling that shares the same value (`<UtcRuler>`'s tap/scroll).
 * Each caller of this hook gets its own independent reaction — that's the
 * correct fix, not a workaround: multiple independent observers of one
 * shared value is exactly what shared values are for, as long as none of
 * them piggyback on another component's callback instead of watching the
 * value directly.
 */
export function useThrottledSharedValue<T>(value: SharedValue<T>, throttleMs: number): T {
  const [resolved, setResolved] = useState(value.value)
  const lastPushMs = useSharedValue(0)

  useAnimatedReaction(
    () => value.value,
    (current) => {
      // A UI-thread clock read, needed to gate the runOnJS bridge — the
      // lint rule can't tell this from an impure read during render.
      // eslint-disable-next-line react-hooks/purity
      const now = performance.now()
      if (now - lastPushMs.value >= throttleMs) {
        lastPushMs.value = now
        runOnJS(setResolved)(current)
      }
    },
  )

  return resolved
}
