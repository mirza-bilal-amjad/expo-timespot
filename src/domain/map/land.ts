import type { Geometry } from "geojson"
import { feature, mesh } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"

import topology from "@/assets/map/world.map.topo.json"

import { geometryToSvgPath } from "./projection"

/**
 * docs/10-implementation-plan.md task 4.1. `world.map.topo.json` is built
 * offline by scripts/build-map.ts. The topology -> GeoJSON walk is the
 * expensive half, so it runs once per process (lazily); projecting to a
 * given pixel size is the cheap half the caller memoizes per size.
 */

const typed = topology as unknown as Topology

let landGeometry: Geometry | undefined
let bordersGeometry: Geometry | undefined

function getLandGeometry(): Geometry {
  if (!landGeometry) {
    const land = feature(typed, typed.objects.land)
    const geometry = "geometry" in land ? land.geometry : land.features[0]?.geometry
    if (!geometry) throw new Error("getLandSvgPath: world.map.topo.json's land object is empty")
    landGeometry = geometry
  }
  return landGeometry
}

export function getLandSvgPath(width: number, height: number): string {
  return geometryToSvgPath(getLandGeometry(), width, height)
}

/** Interior country borders only (`a !== b`) — coastlines are the land
 * fill's own edge, and stroking them too would thicken every coast. */
export function getBordersSvgPath(width: number, height: number): string {
  if (!bordersGeometry) {
    bordersGeometry = mesh(typed, typed.objects.countries as GeometryCollection, (a, b) => a !== b)
  }
  return geometryToSvgPath(bordersGeometry, width, height)
}
