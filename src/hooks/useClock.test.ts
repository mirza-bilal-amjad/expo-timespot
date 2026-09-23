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
})
