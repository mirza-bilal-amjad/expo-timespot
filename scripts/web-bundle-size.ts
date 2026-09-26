/**
 * docs/10-implementation-plan.md task 6.1. Reports the gzipped JavaScript
 * each statically exported route loads up front, and fails when a route
 * exceeds its budget — so bundle growth is caught by a number, not noticed
 * later.
 *
 *   npx expo export -p web && npx tsx scripts/web-bundle-size.ts [dist]
 *
 * Budgets (KiB) are the measured 2026-09-26 sizes plus ~8 % headroom (see docs/05
 * §6 for why the original "< 180 KB gz" was unreachable on this stack).
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { gzipSync } from "node:zlib"

const dist = path.resolve(process.argv[2] ?? "dist")
const BUDGET_KB: Record<string, number> = { index: 815, clock: 805, map: 875 }

let failed = false
for (const [route, budget] of Object.entries(BUDGET_KB)) {
  const html = readFileSync(path.join(dist, `${route}.html`), "utf8")
  const scripts = [...html.matchAll(/<script src="\/([^"]+\.js)"/g)].map((m) => m[1])
  const bytes = scripts.reduce(
    (sum, src) => sum + gzipSync(readFileSync(path.join(dist, src)), { level: 9 }).length,
    0,
  )
  const kb = Math.round(bytes / 1024)
  const over = kb > budget
  failed ||= over
  console.log(
    `${over ? "✗" : "✓"} /${route === "index" ? "" : route}  ${kb} KB gz initial JS (budget ${budget})`,
  )
}
process.exit(failed ? 1 : 0)
