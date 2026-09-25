import { renderHook } from "@testing-library/react-native"
import { useSharedValue } from "react-native-reanimated"

import { useThrottledSharedValue } from "./useThrottledSharedValue"

/**
 * The throttle itself isn't meaningfully testable under jest —
 * react-native-reanimated's mock stubs `useAnimatedReaction` to a no-op
 * (test/setup.ts), the same reasoning `FloatingCityCard.test.tsx` and
 * `UtcRuler.test.tsx` already document. This only pins down the one thing
 * that *is* real JS: the hook returns the shared value's value at the time
 * it was called, synchronously, with no crash.
 */
describe("useThrottledSharedValue", () => {
  it("returns the shared value's initial value", () => {
    const { result } = renderHook(() => {
      const shared = useSharedValue(42)
      return useThrottledSharedValue(shared, 60)
    })
    expect(result.current).toBe(42)
  })
})
