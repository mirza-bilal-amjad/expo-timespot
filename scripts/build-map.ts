/**
 * docs/06-data-model.md, docs/10-implementation-plan.md task 1.10. Builds
 * src/assets/map/world.topo.json — a simplified land-silhouette TopoJSON for
 * the meridian map. Natural Earth geometry (public domain), via `world-atlas`
 * (the D3/topojson maintainers' own pre-built Natural Earth -> TopoJSON
 * package) rather than processing raw Natural Earth shapefiles directly —
 * that needs GDAL/mapshaper, neither of which is available here, and
 * world-atlas's 110m file is already exactly "Natural Earth, simplified to
 * TopoJSON" at the coarsest of its three published resolutions.
 *
 * Run: npx tsx scripts/build-map.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { quantize } from "topojson-client"
import { filter, filterWeight, presimplify, quantile, simplify } from "topojson-simplify"
import type { Objects, Topology } from "topojson-specification"

const SOURCE_PATH = path.join(__dirname, "..", "node_modules", "world-atlas", "land-110m.json")
const OUTPUT_PATH = path.join(__dirname, "..", "src", "assets", "map", "world.topo.json")
const MAX_BYTES = 30_000

async function build() {
  const raw = await readFile(SOURCE_PATH, "utf-8")
  const source = JSON.parse(raw) as Topology<Objects>

  const presimplified = presimplify(source)

  // Point-count simplification alone barely moves file size here — the real
  // cost is coordinate precision (JSON digits per arc point), so the search
  // is over quantization grid size, with one reasonable simplification pass
  // first to drop genuinely invisible detail and the slivers it leaves behind.
  const minWeight = quantile(presimplified, 0.5)
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
    if (size <= MAX_BYTES) break
  }

  if (!best) throw new Error("Simplification failed to produce any output")

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  const json = JSON.stringify(best)
  await writeFile(OUTPUT_PATH, json)

  console.log(`world.topo.json written: ${(json.length / 1024).toFixed(1)} KB`)
  console.log(
    `Budget: ${(MAX_BYTES / 1024).toFixed(0)} KB — ${json.length <= MAX_BYTES ? "within" : "OVER"} budget`,
  )
  const arcs = (best.arcs ?? []).length
  console.log(`Arcs: ${arcs}`)
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
