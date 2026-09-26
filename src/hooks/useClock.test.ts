import { AppState } from "react-native"
import { act, renderHook } from "@testing-library/react-native"

import { useClock } from "./useClock"

describe("useClock", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("sets exactly one interval/timeout chain — a second tick doesn't stack timers", () => {
    const setTimeoutSpy = jest.spyOn(global, "setTimeout")
    renderHook(() => useClock())

    const callsAfterMount = setTimeoutSpy.mock.calls.length
    expect(callsAfterMount).toBe(1) // one scheduled tick, not N

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // exactly one more timer is scheduled per tick — never more than one in flight
    expect(setTimeoutSpy.mock.calls.length).toBe(callsAfterMount + 1)
    setTimeoutSpy.mockRestore()
  })

  it("advances value on each aligned tick", () => {
    const { result } = renderHook(() => useClock())
    const start = result.current

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current).toBeGreaterThan(start)
  })

  it("resyncs to the real clock on AppState -> active after being backgrounded", () => {
    let changeHandler: ((state: string) => void) | undefined
    jest.spyOn(AppState, "addEventListener").mockImplementation((type, handler) => {
      if (type === "change") changeHandler = handler as (state: string) => void
      return { remove: jest.fn() }
    })

    const { result } = renderHook(() => useClock())
    const before = result.current

    act(() => {
      // simulate 10 minutes passing while backgrounded, then foregrounding
      jest.advanceTimersByTime(10 * 60_000)
      changeHandler?.("active")
    })

    // resync should reflect the jumped time immediately, not wait for the next 1s tick
    expect(result.current).toBeGreaterThanOrEqual(before + 10 * 60_000)
    jest.restoreAllMocks()
  })

  it("coalesces to the minute when coalesceToMinute is set — no update on a same-minute tick", () => {
    const fixedStart = Date.UTC(2026, 0, 1, 12, 0, 0, 0)
    jest.setSystemTime(fixedStart)

    const { result } = renderHook(() => useClock({ coalesceToMinute: true }))
    const start = result.current

    act(() => {
      jest.advanceTimersByTime(30_000)
    })

    expect(result.current).toBe(start) // still within the same minute

    act(() => {
      jest.advanceTimersByTime(31_000)
    })

    expect(result.current).toBeGreaterThan(start) // minute boundary crossed
  })

  // docs/10-implementation-plan.md task 5.2: "set the device clock forward
  // an hour -> cut, not a 3,600-frame roll." useClock structurally can't
  // animate through a jump in the first place — every tick just re-reads
  // Date.now(), it never increments a counter — so what's actually being
  // guarded here is that the *displayed* value updates to the jumped time
  // in one step, promptly, rather than only catching up gradually (which
  // would visually read the same as an accidental roll even without one).
  // The complementary half — Numeral itself never rolling through a jump
  // once it *has* the new value — is domain/component-level coverage in
  // Numeral.test.tsx ("still updates to the new digit on a jump beyond the
  // guard threshold"), not this hook's job to re-test.
  it("jump guard: a device clock set forward an hour is reflected in a single tick, not a gradual catch-up", () => {
    const fixedStart = Date.UTC(2026, 0, 1, 12, 0, 0, 0)
    jest.setSystemTime(fixedStart)
    const { result } = renderHook(() => useClock())

    const ONE_HOUR_MS = 60 * 60_000
    act(() => {
      jest.setSystemTime(fixedStart + ONE_HOUR_MS)
      // The pending tick was scheduled ~1004ms out (nextTickDelay's own
      // wall-clock alignment); setSystemTime alone doesn't advance Jest's
      // separate timer-queue clock, so the advance has to cover that,
      // not just a nominal "one second."
      jest.advanceTimersByTime(1_100)
    })

    // One tick landed the full hour forward — not partway there.
    expect(result.current).toBeGreaterThanOrEqual(fixedStart + ONE_HOUR_MS)
    expect(result.current).toBeLessThan(fixedStart + ONE_HOUR_MS + 1_100)
  })

  it("jump guard forces a coalesced screen to update even when the jump doesn't cross a minute boundary", () => {
    // A jump can exceed the 5s jump threshold while still landing inside
    // the *same* minute number (e.g. a 5.5s forward jump from just after a
    // minute boundary) — coalesceToMinute's own minuteChanged check alone
    // would miss this, which is exactly why isJump is a separate OR clause.
    const fixedStart = Date.UTC(2026, 0, 1, 12, 0, 0, 0)
    jest.setSystemTime(fixedStart)
    const { result } = renderHook(() => useClock({ coalesceToMinute: true }))
    const start = result.current

    act(() => {
      jest.setSystemTime(fixedStart + 5_500) // still :00 minute, but > the 5s jump threshold
      jest.advanceTimersByTime(1_100)
    })

    expect(result.current).toBeGreaterThan(start)
  })

  it("stops completely while inactive and catches up the moment it's active again", () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useClock({ active }),
      {
        initialProps: { active: false },
      },
    )
    const start = result.current
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(result.current).toBe(start) // no ticks, no re-renders

    rerender({ active: true })
    expect(result.current).toBeGreaterThanOrEqual(start + 5000)
  })

  it("schedules no timer at all while inactive", () => {
    const setTimeoutSpy = jest.spyOn(global, "setTimeout")
    renderHook(() => useClock({ active: false }))
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    setTimeoutSpy.mockRestore()
  })
})
