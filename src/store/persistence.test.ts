import type { StorageValue } from "zustand/middleware"

import cities from "@/assets/data/cities.min.json"

import { sanitizeCities } from "./cities"
import { sanitizeFocus } from "./focus"
import { useNoticesStore } from "./notices"
import { CORRUPT_SUFFIX, guardedStorage, isRecord, type Sanitizer } from "./persistence"
import { sanitizePrefs } from "./prefs"
import type { StorageAdapter } from "./storage"

/** docs/10-implementation-plan.md task 5.7 — "corrupt storage". */

const [first, second] = cities as { id: string }[]

function memoryAdapter(initial: Record<string, string> = {}): StorageAdapter & {
  data: Record<string, string>
} {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    },
  }
}

const passThrough: Sanitizer<{ n: number }> = (state) =>
  isRecord(state) && typeof state.n === "number" ? { state: { n: state.n }, repaired: false } : null

describe("guardedStorage", () => {
  beforeEach(() => useNoticesStore.setState({ notices: [] }))

  it("reads a healthy blob untouched, with no notice", () => {
    const adapter = memoryAdapter({ k: JSON.stringify({ state: { n: 1 }, version: 1 }) })
    expect(guardedStorage(1, passThrough, adapter).getItem("k")).toEqual({
      state: { n: 1 },
      version: 1,
    })
    expect(useNoticesStore.getState().notices).toEqual([])
  })

  it.each([
    ["unreadable JSON", "{not json"],
    ["no envelope", JSON.stringify([1, 2, 3])],
    ["a version from the future", JSON.stringify({ state: { n: 1 }, version: 9 })],
    ["a shape the sanitizer rejects", JSON.stringify({ state: { n: "x" }, version: 1 })],
  ])("quarantines %s: keeps a copy, clears the key, starts fresh, tells the user", (_, raw) => {
    const adapter = memoryAdapter({ k: raw })
    expect(guardedStorage(1, passThrough, adapter).getItem("k")).toBeNull()
    expect(adapter.data.k).toBeUndefined()
    expect(adapter.data["k" + CORRUPT_SUFFIX]).toBe(raw)
    expect(useNoticesStore.getState().notices).toEqual([{ kind: "storageReset", key: "k" }])
  })

  it("reports a repair without resetting", () => {
    const repairing: Sanitizer<{ n: number }> = () => ({ state: { n: 0 }, repaired: true })
    const adapter = memoryAdapter({ k: JSON.stringify({ state: {}, version: 1 }) })
    const read = guardedStorage(1, repairing, adapter).getItem("k") as StorageValue<{ n: number }>
    expect(read.state).toEqual({ n: 0 })
    expect(useNoticesStore.getState().notices).toEqual([{ kind: "storageRepaired", key: "k" }])
  })
})

describe("sanitizeCities", () => {
  it("keeps good rows and drops bad ones, rather than losing the list", () => {
    const result = sanitizeCities({
      hasSeeded: true,
      cities: [
        { cityId: first.id, order: 0, addedAt: 1 },
        { cityId: "no-such-city", order: 1, addedAt: 1 },
        { cityId: first.id, order: 2, addedAt: 1 }, // duplicate
        "garbage",
        { cityId: second.id, order: "x", addedAt: 1, label: "Mum" },
      ],
    })
    expect(result?.repaired).toBe(true)
    expect(result?.state.cities.map((c) => c.cityId)).toEqual([first.id, second.id])
    expect(result?.state.cities[1]).toMatchObject({ order: 1, label: "Mum" })
  })

  it("accepts a clean list as-is", () => {
    const state = { hasSeeded: true, cities: [{ cityId: first.id, order: 0, addedAt: 5 }] }
    expect(sanitizeCities(state)).toEqual({
      state: { hasSeeded: true, cities: [{ cityId: first.id, order: 0, addedAt: 5 }] },
      repaired: false,
    })
  })

  it("rejects a state with no list at all", () => {
    expect(sanitizeCities({ cities: "nope" })).toBeNull()
    expect(sanitizeCities(null)).toBeNull()
  })
})

describe("sanitizePrefs", () => {
  it("replaces unknown values field by field", () => {
    const result = sanitizePrefs({ prefs: { timeFormat: "12h", theme: "purple" } })
    expect(result?.repaired).toBe(true)
    expect(result?.state.prefs).toMatchObject({ timeFormat: "12h", theme: "system" })
  })

  it("defaults a field missing from an older blob without calling it a repair", () => {
    expect(sanitizePrefs({ prefs: { timeFormat: "12h" } })?.repaired).toBe(false)
  })
})

describe("sanitizeFocus", () => {
  it("clears a focus on a city that doesn't exist", () => {
    expect(sanitizeFocus({ focusedCityId: "gone" })).toEqual({
      state: { focusedCityId: null },
      repaired: true,
    })
    expect(sanitizeFocus({ focusedCityId: first.id })?.repaired).toBe(false)
  })
})
