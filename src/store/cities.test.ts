import { storage } from "@/utils/storage"

import { useCitiesStore } from "./cities"
import { storageAdapter } from "./storage"

/**
 * docs/10-implementation-plan.md task 3.6 acceptance: "reorder survives
 * relaunch; undo restores position, not just the city." As in focus.test.ts,
 * "survives relaunch" is asserted via the write-through contract to
 * `ts.cities.v1` rather than a `jest.resetModules()` reload — see that
 * file's comment for why a resetModules-based relaunch doesn't work under
 * jest's react-native-mmkv mock.
 */
describe("useCitiesStore", () => {
  beforeEach(() => {
    storage.clearAll()
    useCitiesStore.setState({ cities: [], hasSeeded: false })
  })

  function persistedOrder(): string[] {
    const raw = storageAdapter.getItem("ts.cities.v1")
    return JSON.parse(raw!)
      .state.cities.slice()
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      .map((c: { cityId: string }) => c.cityId)
  }

  it("reorderCities writes the new order through to storage", () => {
    useCitiesStore.getState().addCity("tokyo")
    useCitiesStore.getState().addCity("london")
    useCitiesStore.getState().addCity("nyc")

    useCitiesStore.getState().reorderCities(["nyc", "tokyo", "london"])

    expect(persistedOrder()).toEqual(["nyc", "tokyo", "london"])
  })

  it("removeCity does not touch the surviving cities' order", () => {
    useCitiesStore.getState().addCity("tokyo")
    useCitiesStore.getState().addCity("london")
    useCitiesStore.getState().addCity("nyc")

    useCitiesStore.getState().removeCity("london")

    const remaining = useCitiesStore.getState().cities
    expect(remaining.find((c) => c.cityId === "tokyo")!.order).toBe(0)
    expect(remaining.find((c) => c.cityId === "nyc")!.order).toBe(2)
  })

  it("restoreCity reinserts at the exact original order, not appended at the end", () => {
    useCitiesStore.getState().addCity("tokyo") // order 0
    useCitiesStore.getState().addCity("london") // order 1
    useCitiesStore.getState().addCity("nyc") // order 2

    const london = useCitiesStore.getState().cities.find((c) => c.cityId === "london")!
    useCitiesStore.getState().removeCity("london")
    expect(useCitiesStore.getState().cities.map((c) => c.cityId)).toEqual(["tokyo", "nyc"])

    useCitiesStore.getState().restoreCity(london)

    const order = [...useCitiesStore.getState().cities].sort((a, b) => a.order - b.order)
    // London's order (1) sits between Tokyo's (0) and NYC's (2) — restored
    // to its middle position, not appended after NYC.
    expect(order.map((c) => c.cityId)).toEqual(["tokyo", "london", "nyc"])
  })

  it("restoreCity is a no-op if the city is already present", () => {
    useCitiesStore.getState().addCity("tokyo")
    const tokyo = useCitiesStore.getState().cities[0]

    useCitiesStore.getState().restoreCity({ ...tokyo, order: 99 })

    expect(useCitiesStore.getState().cities).toHaveLength(1)
    expect(useCitiesStore.getState().cities[0].order).toBe(0)
  })

  it("hasSeeded defaults to false and markSeeded flips it permanently", () => {
    expect(useCitiesStore.getState().hasSeeded).toBe(false)

    useCitiesStore.getState().markSeeded()

    expect(useCitiesStore.getState().hasSeeded).toBe(true)

    useCitiesStore.getState().addCity("tokyo")
    useCitiesStore.getState().removeCity("tokyo")

    // deleting every city afterward must not reset the flag — task 3.9's
    // whole point is that hasSeeded !== cities.length === 0.
    expect(useCitiesStore.getState().hasSeeded).toBe(true)
  })
})
