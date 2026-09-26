/**
 * docs/10-implementation-plan.md tasks 6.3/6.4 — runs after `expo export`.
 *
 * 1. Removes `time/[slug].html`, the export's catch-all for the dynamic
 *    route. A host would serve it, with status 200, for any unknown city —
 *    a soft 404, which docs/07 §4 forbids. Without it, an unknown path falls
 *    through to `+not-found.html` and a real 404.
 * 2. Moves `<meta charset>` to the first tag of every page's <head>. Expo
 *    Router injects the head tags from `expo-router/head` (title,
 *    description, canonical, JSON-LD) *before* +html.tsx's own, which pushed
 *    the charset past the first 1,024 bytes, where browsers look for it —
 *    a page with non-Latin city names can then be decoded wrongly
 *    (Lighthouse "charset").
 * 3. Checks that every URL in the sitemap has a page in the export, so the
 *    sitemap can't advertise a 404.
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

const dist = path.resolve(process.argv[2] ?? "dist")

rmSync(path.join(dist, "time", "[slug].html"), { force: true })

const CHARSET = /<meta charSet="utf-8"\/>/i
let charsetMoved = 0
for (const entry of readdirSync(dist, { recursive: true, encoding: "utf8" })) {
  if (!entry.endsWith(".html")) continue
  const file = path.join(dist, entry)
  const html = readFileSync(file, "utf8")
  const match = html.match(CHARSET)
  if (!match) continue
  const fixed = html.replace(CHARSET, "").replace("<head>", `<head>${match[0]}`)
  if (fixed !== html) {
    writeFileSync(file, fixed)
    charsetMoved++
  }
}

const sitemap = readFileSync(path.join(dist, "sitemap.xml"), "utf8")
const missing = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .filter((p) => !existsSync(path.join(dist, p === "/" ? "index.html" : `${p}.html`)))

if (missing.length > 0) {
  console.error(
    `✗ ${missing.length} sitemap URLs have no page, e.g. ${missing.slice(0, 5).join(", ")}`,
  )
  process.exit(1)
}
console.log(
  `✓ every sitemap URL has a page; dynamic fallback removed; charset first in ${charsetMoved} pages`,
)
