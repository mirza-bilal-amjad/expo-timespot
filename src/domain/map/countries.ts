import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"

import topology from "@/assets/map/world.map.topo.json"

import { geometryToSvgPath } from "./projection"

/**
 * docs/10-implementation-plan.md task 4.7: the pointed-at city's country
 * fills `map.landActive`. Reads the same `world.map.topo.json` as
 * `land.ts` — same arcs, so the fill sits exactly on the land beneath it.
 * Each geometry's `id` is already the ISO alpha-2 `City.countryCode`
 * carries (scripts/build-map.ts). Natural Earth 50m still omits a few
 * micro-states; `undefined` is the expected answer there, not an error.
 */
export function getCountrySvgPath(
  countryCode: string,
  width: number,
  height: number,
): string | undefined {
  const typed = topology as unknown as Topology
  const collection = typed.objects.countries
  if (!collection || collection.type !== "GeometryCollection") return undefined

  const match = collection.geometries.find((g) => g.id === countryCode)
  if (!match) return undefined

  const resolved = feature(typed, match)
  const geometry = "geometry" in resolved ? resolved.geometry : resolved.features[0]?.geometry
  if (!geometry) return undefined

  return geometryToSvgPath(geometry, width, height)
}
