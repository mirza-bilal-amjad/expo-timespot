import cities from "../../assets/data/cities.min.json"
import { getCityById, searchCities } from "../cities/search"
import type { City } from "../types"
import { pickCityAt } from "./pick"
import { MAP_ASPECT, projectLonLat } from "./projection"

const W = 880
const H = W * MAP_ASPECT

function cityNamed(name: string): City {
  const hit = searchCities(name, 1)[0]
  if (!hit) throw new Error(`no city named ${name}`)
  return hit
}

function at(lon: number, lat: number) {
  const { x, y } = projectLonLat(lon, lat, W, H)
  return pickCityAt(x, y, W, H)
}

describe("pickCityAt", () => {
  it("tapping right on a major city returns that city", () => {
    for (const name of ["Tokyo", "Algiers", "São Paulo", "Sydney"]) {
      const city = cityNamed(name)
      expect(at(city.lon, city.lat).id).toBe(city.id)
    }
  })

  it("tapping exactly on a smaller town a pixel from a big city means the big city", () => {
    // At map zoom the two are indistinguishable under a finger — the
    // population-weighted score picks the one the user almost surely meant.
    const london = cityNamed("London")
    const neighbour = (cities as City[])
      .filter((c) => c.id !== london.id && c.countryCode === "GB")
      .sort(
        (a, b) =>
          Math.hypot(a.lon - london.lon, a.lat - london.lat) -
          Math.hypot(b.lon - london.lon, b.lat - london.lat),
      )[0]
    expect(Math.hypot(neighbour.lon - london.lon, neighbour.lat - london.lat)).toBeLessThan(0.5)
    expect(at(neighbour.lon, neighbour.lat).id).toBe(london.id)
  })

  it("resolves by real geography, not longitude — Madrid is UTC+1/+2, not London's zone", () => {
    const madrid = cityNamed("Madrid")
    const pick = at(madrid.lon, madrid.lat)
    expect(pick.countryCode).toBe("ES")
    expect(pick.zone).toBe("Europe/Madrid")
  })

  it("still returns the nearest city from the open ocean", () => {
    const pick = at(-30, 0) // mid-Atlantic
    expect(pick).toBeDefined()
    expect(getCityById(pick.id)).toBe(pick)
  })

  it("scans the whole dataset well inside half a frame", () => {
    // Runs in the 60 ms-throttled drag preview, so it must never eat a frame.
    // Median of 21 picks, so one GC pause on a loaded runner can't fail it.
    at(0, 0)
    const runs = Array.from({ length: 21 }, (_, i) => {
      const start = performance.now()
      at(-170 + i * 16, -40 + i * 5)
      return performance.now() - start
    }).sort((x, y) => x - y)
    expect(runs[10]).toBeLessThan(8)
  })
})
