import { renderHook } from "@testing-library/react-native"

import { useCitiesStore } from "@/store/cities"
import { useFocusStore } from "@/store/focus"
import { storage } from "@/utils/storage"

import { useSeedFirstLaunch } from "./useSeedFirstLaunch"

jest.mock("@/domain/time/zone", () => ({
  ...jest.requireActual("@/domain/time/zone"),
  getDeviceZone: jest.fn(() => "Asia/Karachi"),
}))

/**
 * docs/10-implementation-plan.md task 3.9 acceptance: "fresh install in
 * Asia/Karachi seeds Karachi focused, then NY/London/Tokyo."
 */
describe("useSeedFirstLaunch", () => {
  beforeEach(() => {
    storage.clearAll()
    useCitiesStore.setState({ cities: [], hasSeeded: false })
    useFocusStore.setState({ focusedCityId: null })
  })

  it("seeds the device city (focused) plus the three defaults on a fresh install", () => {
    renderHook(() => useSeedFirstLaunch())

    // Karachi's Intl zone (Asia/Karachi) has no exact-named city in the
    // 5,000-city dataset — its highest-population representative is Lahore.
    const cities = useCitiesStore.getState().cities
    expect(cities.map((c) => c.cityId)).toEqual([
      "gn-1172451", // Lahore (Asia/Karachi)
      "gn-5128581", // New York City
      "gn-2643743", // London
      "gn-1850147", // Tokyo
    ])
    expect(useFocusStore.getState().focusedCityId).toBe("gn-1172451")
    expect(useCitiesStore.getState().hasSeeded).toBe(true)
  })

  it("does nothing on a later launch once hasSeeded is already true", () => {
    useCitiesStore.setState({ hasSeeded: true })

    renderHook(() => useSeedFirstLaunch())

    expect(useCitiesStore.getState().cities).toHaveLength(0)
    expect(useFocusStore.getState().focusedCityId).toBeNull()
  })

  it("does not reseed after the user deletes every city post-seeding", () => {
    renderHook(() => useSeedFirstLaunch())
    for (const city of useCitiesStore.getState().cities) {
      useCitiesStore.getState().removeCity(city.cityId)
    }

    renderHook(() => useSeedFirstLaunch())

    expect(useCitiesStore.getState().cities).toHaveLength(0)
  })
})
