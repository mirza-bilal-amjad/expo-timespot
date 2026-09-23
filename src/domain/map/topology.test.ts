import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"

import topology from "../../assets/map/world.topo.json"

/**
 * docs/10-implementation-plan.md task 1.10. Guards scripts/build-map.ts's
 * output — a bad rebuild (over budget, or geometry that fails to resolve)
 * fails CI instead of shipping a broken or bloated map.
 */
describe("world.topo.json", () => {
  const typed = topology as unknown as Topology

  it("stays within the 30KB budget", () => {
    const bytes = JSON.stringify(typed).length
    expect(bytes).toBeLessThanOrEqual(30_000)
  })

  it("is a valid Topology with a 'land' object", () => {
    expect(typed.type).toBe("Topology")
    expect(typed.objects.land).toBeDefined()
  })

  it("resolves to GeoJSON with at least one non-trivial polygon", () => {
    const geo = feature(typed, typed.objects.land)
    const geometry = "geometry" in geo ? geo.geometry : geo.features[0]?.geometry
    expect(geometry).toBeDefined()
    expect(["Polygon", "MultiPolygon"]).toContain(geometry!.type)
  })

  it("has enough arcs left to be recognizable, not simplified into nothing", () => {
    expect(typed.arcs.length).toBeGreaterThan(20)
  })
})
