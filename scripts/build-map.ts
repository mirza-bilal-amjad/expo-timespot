/**
 * docs/06-data-model.md, docs/10-implementation-plan.md tasks 1.10, 4.7 and
 * 4.9. Builds the meridian map's assets from Natural Earth (public domain)
 * via `world-atlas`, the topojson maintainers' pre-built Natural Earth ->
 * TopoJSON package:
 *
 *  - `world.map.topo.json` — ONE topology holding both `countries` (ids
 *    remapped from ISO-numeric to the ISO alpha-2 `City.countryCode`
 *    carries) and `land`, the countries merged with `mergeArcs`. Both
 *    objects share the same arcs, so they are simplified together and can
 *    never disagree: the active-country fill sits exactly on the land it
 *    highlights, and `topojson.mesh` gets real shared borders.
 *    ~~Two separately-simplified 110m files under 30 KB each~~ — corrected
 *    2026-09-25: separate simplification is what misaligned the black
 *    active country from the grey land, and 110m cut to 30 KB is what made
 *    the map read as low quality. 50m at ~210 KB is the new budget.
 *    Antarctica is dropped: the Mercator projection clips at 58°S.
 *  - `land-raster.png` — the low-end-device fallback (task 4.9), rendered
 *    from the same topology and the same `geometryToSvgPath`, via `sharp`
 *    (devDependency only). White land with borders knocked out to
 *    transparent, so `<WorldMap>`'s `tintColor` keeps both themes and the
 *    borders from one file.
 *
 * Run: npx tsx scripts/build-map.ts
 */
import { numericToAlpha2 } from "i18n-iso-countries"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { feature, mergeArcs, mesh, quantize } from "topojson-client"
import { filter, filterWeight, presimplify, quantile, simplify } from "topojson-simplify"
import type { GeometryCollection, Objects, Topology } from "topojson-specification"

import { geometryToSvgPath, MAP_ASPECT } from "../src/domain/map/projection"

const SOURCE_PATH = path.join(__dirname, "..", "node_modules", "world-atlas", "countries-50m.json")
const OUTPUT_PATH = path.join(__dirname, "..", "src", "assets", "map", "world.map.topo.json")
const RASTER_OUTPUT_PATH = path.join(__dirname, "..", "src", "assets", "map", "land-raster.png")
const MAX_BYTES = 240_000
const RASTER_MAX_BYTES = 160_000

// Keeps the top ~70% of vertices by visual weight — measured: 0.15 -> 129 KB,
// 0.3 -> 220 KB, 0.45 -> 299 KB. 0.3 is where coastlines stop looking faceted
// at the map's zoomed phone size (~880 pt wide).
const SIMPLIFY_QUANTILE = 0.3
const QUANTIZE_STEPS = 1e4

// ISO 3166-1 numeric for Antarctica.
const ANTARCTICA_NUMERIC = "010"

const RASTER_WIDTH = 1600
const RASTER_HEIGHT = Math.round(RASTER_WIDTH * MAP_ASPECT)
const RASTER_BORDER_WIDTH = 1.2

async function buildTopology(): Promise<Topology<Objects>> {
  const source = JSON.parse(await readFile(SOURCE_PATH, "utf-8")) as Topology<Objects>

  const countries = source.objects.countries as GeometryCollection
  const remapped = countries.geometries.flatMap((g) => {
    if (g.id === ANTARCTICA_NUMERIC) return []
    // world-atlas ids are zero-padded ISO-numeric strings (Algeria is "012").
    const alpha2 = g.id !== undefined ? numericToAlpha2(String(g.id)) : undefined
    // Disputed territories with no ISO alpha-2 keep their land and borders
    // but get no id — nothing can focus them.
    return [{ ...g, id: alpha2, properties: undefined }]
  })

  const collection: GeometryCollection = { type: "GeometryCollection", geometries: remapped }
  source.objects = {
    countries: collection,
    land: mergeArcs(source, remapped as Parameters<typeof mergeArcs>[1]),
  }

  const presimplified = presimplify(source)
  const minWeight = quantile(presimplified, SIMPLIFY_QUANTILE)
  const simplified = simplify(presimplified, minWeight)
  const filtered = filter(simplified, filterWeight(simplified, minWeight))
  const topology = quantize(filtered, QUANTIZE_STEPS)

  const json = JSON.stringify(topology)
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, json)
  console.log(`${path.basename(OUTPUT_PATH)} written: ${(json.length / 1024).toFixed(1)} KB`)
  console.log(
    `Budget: ${(MAX_BYTES / 1024).toFixed(0)} KB — ${json.length <= MAX_BYTES ? "within" : "OVER"} budget`,
  )
  return topology
}

async function buildRaster(topology: Topology<Objects>) {
  const land = feature(topology, topology.objects.land)
  const landGeometry = "geometry" in land ? land.geometry : land.features[0]?.geometry
  if (!landGeometry) throw new Error("buildRaster: land object resolved empty")
  const borders = mesh(
    topology,
    topology.objects.countries as GeometryCollection,
    (a, b) => a !== b,
  )

  const landD = geometryToSvgPath(landGeometry, RASTER_WIDTH, RASTER_HEIGHT)
  const bordersD = geometryToSvgPath(borders, RASTER_WIDTH, RASTER_HEIGHT)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${RASTER_WIDTH}" height="${RASTER_HEIGHT}">` +
    `<defs><mask id="m"><rect width="100%" height="100%" fill="#fff"/>` +
    `<path d="${bordersD}" fill="none" stroke="#000" stroke-width="${RASTER_BORDER_WIDTH}"/></mask></defs>` +
    `<path d="${landD}" fill="#fff" mask="url(#m)"/></svg>`

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer()
  await writeFile(RASTER_OUTPUT_PATH, png)
  console.log(`${path.basename(RASTER_OUTPUT_PATH)} written: ${(png.length / 1024).toFixed(1)} KB`)
  console.log(
    `Budget: ${(RASTER_MAX_BYTES / 1024).toFixed(0)} KB — ${png.length <= RASTER_MAX_BYTES ? "within" : "OVER"} budget`,
  )
}

async function build() {
  const topology = await buildTopology()
  await buildRaster(topology)
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
