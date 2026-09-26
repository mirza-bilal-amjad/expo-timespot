import { feature } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"

import topology from "../../assets/map/world.map.topo.json"

/**
 * docs/10-implementation-plan.md task 1.10. Guards scripts/build-map.ts's
 * output — a bad rebuild (over budget, geometry that fails to resolve, or
 * land and countries drifting onto separate arcs) fails CI.
 */
describe("world.map.topo.json", () => {
  const typed = topology as unknown as Topology
  const countries = typed.objects.countries as GeometryCollection

  it("stays within the 240 KB budget", () => {
    expect(JSON.stringify(typed).length).toBeLessThanOrEqual(240_000)
  })

  it("holds both 'land' and 'countries' in one topology, so they share arcs", () => {
    expect(typed.type).toBe("Topology")
    expect(typed.objects.land).toBeDefined()
    expect(countries.type).toBe("GeometryCollection")
  })

  it("resolves land to a non-trivial polygon", () => {
    const geo = feature(typed, typed.objects.land)
    const geometry = "geometry" in geo ? geo.geometry : geo.features[0]?.geometry
    expect(["Polygon", "MultiPolygon"]).toContain(geometry!.type)
  })

  it("keeps 50m detail — far more countries than the old 110m file's 137", () => {
    const ids = new Set(countries.geometries.map((g) => g.id).filter(Boolean))
    expect(ids.size).toBeGreaterThan(190)
    expect(ids.has("SG")).toBe(true)
  })

  it("drops Antarctica, which the Mercator projection clips away", () => {
    expect(countries.geometries.some((g) => g.id === "AQ")).toBe(false)
  })
})
