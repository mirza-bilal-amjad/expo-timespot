import { renderHook } from "@testing-library/react-native"

import { useShouldPlayEntrance } from "./useShouldPlayEntrance"

describe("useShouldPlayEntrance", () => {
  it("plays the first time a given key is used", () => {
    const { result } = renderHook(() => useShouldPlayEntrance("test-key-first"))
    expect(result.current).toBe(true)
  })

  it("does not play again for the same key, even across a fresh render tree (a warm start)", () => {
    const key = "test-key-repeat"
    const first = renderHook(() => useShouldPlayEntrance(key))
    expect(first.result.current).toBe(true)

    const second = renderHook(() => useShouldPlayEntrance(key))
    expect(second.result.current).toBe(false)
  })

  it("tracks each key independently — one screen's cold start doesn't consume another's", () => {
    const a = renderHook(() => useShouldPlayEntrance("test-key-a"))
    const b = renderHook(() => useShouldPlayEntrance("test-key-b"))
    expect(a.result.current).toBe(true)
    expect(b.result.current).toBe(true)
  })

  it("stays true for the lifetime of the component instance that first claimed it", () => {
    const key = "test-key-stable"
    const { result, rerender } = renderHook(() => useShouldPlayEntrance(key))
    expect(result.current).toBe(true)
    rerender({})
    expect(result.current).toBe(true)
  })
})
