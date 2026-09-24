import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"

import topology from "@/assets/map/world.countries.topo.json"

import { geometryToSvgPath } from "./projection"

/**
 * docs/10-implementation-plan.md task 4.7, docs/04-screen-specs.md "S3 · Map":
 * "Land `map.land`, no borders except at the country of the focused city,
 * which fills `map.landActive`." `world.countries.topo.json` is built once,
 * offline, by `scripts/build-map.ts`, with each geometry's `id` already
 * remapped from world-atlas's own ISO-numeric to the ISO alpha-2 code
 * `City.countryCode` carries — this only resolves the one matching geometry
 * to GeoJSON and projects it, the same way `land.ts` does for the merged
 * silhouette.
 *
 * Natural Earth's 110m resolution (the same source `WorldMap`'s land
 * silhouette uses) only includes countries large enough to render
 * meaningfully at that scale — 137 of the ~243 country codes across
 * `cities.min.json`. A focused city in a micro-state or small island nation
 * (Singapore, Malta, most of the Caribbean and the Pacific) has no boundary
 * to highlight; `undefined` is the correct, expected answer there, not an
 * error — the caller (`WorldMap`) just renders no active-country overlay.
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
