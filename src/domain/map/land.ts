import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"

import topology from "@/assets/map/world.topo.json"

import { geometryToSvgPath } from "./projection"

/**
 * docs/10-implementation-plan.md task 4.1. `world.topo.json` is built once,
 * offline, by scripts/build-map.ts (task 1.10) — this only resolves it to
 * GeoJSON and projects it, at whatever size the `<WorldMap>` component asks
 * for. `feature()`'s topology walk is cheap (the whole file is ~28 KB), so
 * no caching beyond the caller's own `useMemo` on (width, height).
 */
export function getLandSvgPath(width: number, height: number): string {
  const typed = topology as unknown as Topology
  const land = feature(typed, typed.objects.land)
  const geometry = "geometry" in land ? land.geometry : land.features[0]?.geometry
  if (!geometry) throw new Error("getLandSvgPath: world.topo.json's land object resolved empty")
  return geometryToSvgPath(geometry, width, height)
}
