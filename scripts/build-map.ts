/**
 * docs/06-data-model.md, docs/10-implementation-plan.md tasks 1.10, 4.7 and
 * 4.9. Builds three assets for the meridian map from Natural Earth geometry
 * (public domain), via `world-atlas` (the D3/topojson maintainers' own
 * pre-built Natural Earth -> TopoJSON package) rather than processing raw
 * Natural Earth shapefiles directly — that needs GDAL/mapshaper, neither of
 * which is available here, and world-atlas's 110m files are already exactly
 * "Natural Earth, simplified to TopoJSON" at the coarsest of their three
 * published resolutions:
 *
 *  - `world.topo.json` — the merged land silhouette (task 4.1).
 *  - `world.countries.topo.json` — per-country boundaries (task 4.7), for
 *    the focused city's `map.landActive` fill. `id` is remapped from
 *    world-atlas's own ISO-numeric (GeoNames' `countryInfo.txt`, cached
 *    alongside `build-cities.ts`'s own GeoNames fetch) to the ISO alpha-2
 *    `City.countryCode` already carries, so `getCountrySvgPath` needs no
 *    runtime mapping table of its own. `properties.name` is dropped before
 *    simplification — nothing at runtime looks a country up by name, and
 *    177 name strings roughly double the file size for no reason.
 *  - `land-raster.png` — docs/04-screen-specs.md's "pre-rendered raster at
 *    2x" fallback for low-end devices (task 4.9), rendered from the exact
 *    same simplified land topology and the same `geometryToSvgPath` runtime
 *    code the vector map uses, via `sharp` (a devDependency — this script
 *    is the only thing that touches it; the app never ships it). White
 *    land on a transparent background, not a themed colour: `<WorldMap>`
 *    applies `theme.colors.mapLand` at render time with `expo-image`'s own
 *    `tintColor`, the same way a monochrome icon would, so one raster
 *    serves both themes.
 *
 * Run: npx tsx scripts/build-map.ts
 */
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { feature, quantize } from "topojson-client"
import { filter, filterWeight, presimplify, quantile, simplify } from "topojson-simplify"
import type { GeometryCollection, Objects, Topology } from "topojson-specification"

import { geometryToSvgPath } from "../src/domain/map/projection"

const LAND_SOURCE_PATH = path.join(__dirname, "..", "node_modules", "world-atlas", "land-110m.json")
const COUNTRIES_SOURCE_PATH = path.join(
  __dirname,
  "..",
  "node_modules",
  "world-atlas",
  "countries-110m.json",
)
const LAND_OUTPUT_PATH = path.join(__dirname, "..", "src", "assets", "map", "world.topo.json")
const COUNTRIES_OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "assets",
  "map",
  "world.countries.topo.json",
)
const RASTER_OUTPUT_PATH = path.join(__dirname, "..", "src", "assets", "map", "land-raster.png")
const LAND_MAX_BYTES = 30_000
const COUNTRIES_MAX_BYTES = 30_000
const RASTER_MAX_BYTES = 60_000

// Equirectangular is always 2:1 (width:height) — the same ratio
// projection.ts's own [-180,180]x[-90,90] domain implies. "At 2x": the
// reference size a low-end device's map area would actually need is well
// under 720x360 logical points, so 1440x720 pixels is already a real 2x
// over that, not a bare doubling of some arbitrary base.
const RASTER_WIDTH = 1280
const RASTER_HEIGHT = 640

const GEONAMES_DATA_DIR = path.join(__dirname, ".data", "geonames")
const GEONAMES_BASE = "https://download.geonames.org/export/dump/"

/**
 * Point-count simplification alone barely moves file size here — the real
 * cost is coordinate precision (JSON digits per arc point), so the search is
 * over quantization grid size, with one simplification pass first (at
 * `quantileValue`) to drop genuinely invisible detail and the slivers it
 * leaves behind.
 */
function simplifyToBudget(
  topology: Topology<Objects>,
  maxBytes: number,
  quantileValue: number,
): Topology<Objects> {
  const presimplified = presimplify(topology)
  const minWeight = quantile(presimplified, quantileValue)
  const simplified = simplify(presimplified, minWeight)
  const filtered = filter(simplified, filterWeight(simplified, minWeight))

  let best: Topology<Objects> | null = null
  let bestSize = Infinity
  for (const steps of [1e4, 5e3, 2e3, 1e3, 5e2, 2e2, 1e2]) {
    const candidate = quantize(filtered, steps)
    const size = JSON.stringify(candidate).length
    if (size < bestSize) {
      best = candidate
      bestSize = size
    }
    if (size <= maxBytes) break
  }

  if (!best) throw new Error("Simplification failed to produce any output")
  return best
}

async function writeTopology(outputPath: string, topology: Topology<Objects>, maxBytes: number) {
  await mkdir(path.dirname(outputPath), { recursive: true })
  const json = JSON.stringify(topology)
  await writeFile(outputPath, json)

  console.log(`${path.basename(outputPath)} written: ${(json.length / 1024).toFixed(1)} KB`)
  console.log(
    `Budget: ${(maxBytes / 1024).toFixed(0)} KB — ${json.length <= maxBytes ? "within" : "OVER"} budget`,
  )
  console.log(`Arcs: ${(topology.arcs ?? []).length}`)
}

async function buildLand(): Promise<Topology<Objects>> {
  const raw = await readFile(LAND_SOURCE_PATH, "utf-8")
  const source = JSON.parse(raw) as Topology<Objects>
  const best = simplifyToBudget(source, LAND_MAX_BYTES, 0.5)
  await writeTopology(LAND_OUTPUT_PATH, best, LAND_MAX_BYTES)
  return best
}

/** Reuses the exact same simplified topology and `geometryToSvgPath` the
 * vector `<WorldMap>` renders from, so the raster fallback is never more
 * than a device-tier check away from matching the vector version pixel for
 * pixel — not a separately-maintained approximation of it. */
async function buildRaster(landTopology: Topology<Objects>) {
  const land = feature(landTopology, landTopology.objects.land)
  const geometry = "geometry" in land ? land.geometry : land.features[0]?.geometry
  if (!geometry) throw new Error("buildRaster: land object resolved empty")

  const d = geometryToSvgPath(geometry, RASTER_WIDTH, RASTER_HEIGHT)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RASTER_WIDTH}" height="${RASTER_HEIGHT}" viewBox="0 0 ${RASTER_WIDTH} ${RASTER_HEIGHT}"><path d="${d}" fill="#ffffff"/></svg>`

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
  await mkdir(path.dirname(RASTER_OUTPUT_PATH), { recursive: true })
  await writeFile(RASTER_OUTPUT_PATH, png)

  console.log(`${path.basename(RASTER_OUTPUT_PATH)} written: ${(png.length / 1024).toFixed(1)} KB`)
  console.log(
    `Budget: ${(RASTER_MAX_BYTES / 1024).toFixed(0)} KB — ${png.length <= RASTER_MAX_BYTES ? "within" : "OVER"} budget`,
  )
}

async function ensureCountryInfo(): Promise<string> {
  await mkdir(GEONAMES_DATA_DIR, { recursive: true })
  const txtPath = path.join(GEONAMES_DATA_DIR, "countryInfo.txt")
  if (existsSync(txtPath)) return txtPath

  console.log("Fetching countryInfo.txt...")
  const res = await fetch(GEONAMES_BASE + "countryInfo.txt")
  if (!res.ok) throw new Error(`Failed to fetch countryInfo.txt: ${res.status}`)
  await writeFile(txtPath, Buffer.from(await res.arrayBuffer()))
  return txtPath
}

/** world-atlas's own country `id` (ISO 3166-1 numeric) -> `City.countryCode`
 * (ISO 3166-1 alpha-2), via GeoNames' own two columns for the same standard. */
async function getNumericToAlpha2(): Promise<Map<string, string>> {
  const txtPath = await ensureCountryInfo()
  const text = await readFile(txtPath, "utf-8")
  const map = new Map<string, string>()
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue
    const f = line.split("\t")
    const alpha2 = f[0]
    const numeric = Number(f[2])
    if (alpha2 && Number.isFinite(numeric)) map.set(String(numeric), alpha2)
  }
  return map
}

async function buildCountries() {
  const raw = await readFile(COUNTRIES_SOURCE_PATH, "utf-8")
  const source = JSON.parse(raw) as Topology<Objects>
  const numericToAlpha2 = await getNumericToAlpha2()

  const countries = source.objects.countries as GeometryCollection
  const remapped = countries.geometries.flatMap((g) => {
    // world-atlas's own id is a zero-padded numeric *string* (Algeria is
    // "012", not "12") — normalise through Number() the same way
    // getNumericToAlpha2 normalised GeoNames' own numeric column, or every
    // id with a leading zero silently fails to match.
    const alpha2 = g.id !== undefined ? numericToAlpha2.get(String(Number(g.id))) : undefined
    // A handful of world-atlas entries (disputed/unrecognised territories)
    // have no ISO alpha-2 counterpart in GeoNames — dropped here rather than
    // kept under a meaningless id; getCountrySvgPath already has to handle
    // "no geometry for this code" for the 110m resolution's other omissions
    // (micro-states too small to render at all), so this is the same case.
    if (!alpha2) return []
    return [{ ...g, id: alpha2, properties: undefined }]
  })

  // Only `objects.countries` is used at runtime (getCountrySvgPath) —
  // dropping the redundant merged `objects.land` here lets quantize prune
  // any arcs that existed only for it.
  source.objects = { countries: { ...countries, geometries: remapped } }

  const best = simplifyToBudget(source, COUNTRIES_MAX_BYTES, 0.1)
  await writeTopology(COUNTRIES_OUTPUT_PATH, best, COUNTRIES_MAX_BYTES)
}

async function build() {
  const landTopology = await buildLand()
  await buildCountries()
  await buildRaster(landTopology)
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
