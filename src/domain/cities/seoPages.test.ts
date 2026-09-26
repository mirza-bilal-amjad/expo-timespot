import { getCityByZone } from "./search"
import { getNeighbours, getReferenceCities, getSeoCities, getSeoCityBySlug } from "./seoPages"
import { getOffsetMinutes } from "../time/zone"

const NOW = Date.UTC(2026, 6, 1, 12)

describe("getSeoCities", () => {
  it("is the top 1,000 by population, with unique slugs", () => {
    const cities = getSeoCities()
    expect(cities).toHaveLength(1000)
    expect(new Set(cities.map((c) => c.slug)).size).toBe(1000)
    expect(cities[0].population).toBeGreaterThanOrEqual(cities[999].population)
  })

  it("resolves a page's slug, and nothing for an unknown one", () => {
    expect(getSeoCityBySlug("tokyo")?.name).toBe("Tokyo")
    expect(getSeoCityBySlug("not-a-city")).toBeUndefined()
  })
})

describe("getNeighbours", () => {
  const tokyo = getCityByZone("Asia/Tokyo")!

  it("links 8 cities, one per zone, never its own zone", () => {
    const n = getNeighbours(tokyo, NOW)
    expect(n).toHaveLength(8)
    expect(new Set(n.map((c) => c.zone)).size).toBe(8)
    expect(n.some((c) => c.zone === tokyo.zone)).toBe(false)
  })

  it("orders by closeness of offset", () => {
    const own = getOffsetMinutes(NOW, tokyo.zone)
    const d = getNeighbours(tokyo, NOW).map((c) => Math.abs(getOffsetMinutes(NOW, c.zone) - own))
    expect([...d].sort((a, b) => a - b)).toEqual(d)
    expect(d[0]).toBe(0) // Seoul/Pyongyang share UTC+9
  })

  it("only links to cities that have pages", () => {
    const slugs = new Set(getSeoCities().map((c) => c.slug))
    expect(getNeighbours(tokyo, NOW).every((c) => slugs.has(c.slug))).toBe(true)
  })
})

describe("getReferenceCities", () => {
  it("drops the page's own zone from the table", () => {
    const tokyo = getCityByZone("Asia/Tokyo")!
    const refs = getReferenceCities(tokyo)
    expect(refs).toHaveLength(5)
    expect(refs.some((c) => c.zone === "Asia/Tokyo")).toBe(false)
  })
})
