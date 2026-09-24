import { getSeedCities } from "./seed"

describe("getSeedCities", () => {
  it("seeds the device city focused, then New York/London/Tokyo (Asia/Karachi has no default-zone collision)", () => {
    const result = getSeedCities("Asia/Karachi")

    expect(result.cities.map((c) => c.zone)).toEqual([
      "Asia/Karachi",
      "America/New_York",
      "Europe/London",
      "Asia/Tokyo",
    ])
    expect(result.focusCityId).toBe(result.cities[0].id)
  })

  it("skips the default that duplicates the device zone", () => {
    const result = getSeedCities("Europe/London")

    expect(result.cities.map((c) => c.zone)).toEqual([
      "Europe/London",
      "America/New_York",
      "Asia/Tokyo",
    ])
    expect(result.focusCityId).toBe(result.cities[0].id)
  })

  it("falls back to the defaults, focused on the first, when the device zone has no dataset match", () => {
    const result = getSeedCities("Etc/Nowhere")

    expect(result.cities.map((c) => c.zone)).toEqual([
      "America/New_York",
      "Europe/London",
      "Asia/Tokyo",
    ])
    expect(result.focusCityId).toBe(result.cities[0].id)
  })
})
