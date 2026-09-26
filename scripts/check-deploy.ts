/**
 * docs/10-implementation-plan.md task 6.9 — checks a deployed site (or a
 * local server) for what the static export can't guarantee by itself: the
 * host's status codes, headers and compression.
 *
 *   npx tsx scripts/check-deploy.ts https://timespot.app
 *
 * Fails (exit 1) on anything that breaks the site or its SEO. Header
 * advice the service worker already works around is a warning only.
 */

const origin = (process.argv[2] ?? "").replace(/\/$/, "")
if (!/^https?:\/\//.test(origin)) {
  console.error("usage: tsx scripts/check-deploy.ts <origin>, e.g. https://timespot.app")
  process.exit(2)
}

let failures = 0
let warnings = 0
const pass = (message: string) => console.log(`✓ ${message}`)
const fail = (message: string) => {
  failures++
  console.log(`✗ ${message}`)
}
const warn = (message: string) => {
  warnings++
  console.log(`! ${message}`)
}

async function get(path: string) {
  const response = await fetch(origin + path, {
    redirect: "follow",
    headers: { "accept-encoding": "br, gzip" },
  })
  return { response, body: await response.text() }
}

function cacheControl(response: Response): string {
  return response.headers.get("cache-control") ?? "(none)"
}

async function main() {
  // Pages, and a real 404 for an unknown city (a soft 404 poisons the index).
  for (const path of ["/", "/clock", "/map", "/time/tokyo"]) {
    const { response } = await get(path)
    if (response.status === 200) pass(`${path} 200`)
    else fail(`${path} returned ${response.status}`)
  }
  const missing = await get("/time/no-such-city-anywhere")
  if (missing.response.status === 404) pass("unknown city → 404")
  else fail(`unknown city returned ${missing.response.status} (a soft 404)`)

  // The city page's head survived the host.
  const tokyo = await get("/time/tokyo")
  for (const [label, pattern] of [
    ["canonical", /<link[^>]*rel="canonical"[^>]*href="[^"]+\/time\/tokyo"/],
    ["og:image", /<meta[^>]*property="og:image"/],
    ["JSON-LD", /<script[^>]*type="application\/ld\+json"/],
    ["charset first", /<head><meta charSet="utf-8"\/>/i],
  ] as const) {
    if (pattern.test(tokyo.body)) pass(`/time/tokyo has ${label}`)
    else fail(`/time/tokyo is missing ${label}`)
  }
  const og = tokyo.body.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1]
  if (og) {
    const image = await fetch(og).catch(() => null)
    if (!image) fail(`OG image ${og} is unreachable`)
    else if (image.ok && image.headers.get("content-type")?.startsWith("image/png"))
      pass("OG image is served")
    else fail(`OG image ${og} returned ${image.status} ${image.headers.get("content-type")}`)
    if (!og.startsWith(origin))
      warn(`og:image points at ${new URL(og).origin}, not ${origin} (EXPO_PUBLIC_SITE_URL)`)
  }

  // Crawling and install.
  for (const [path, type] of [
    ["/sitemap.xml", "xml"],
    ["/robots.txt", "text"],
    ["/manifest.webmanifest", "json"],
    ["/sw.js", "javascript"],
  ] as const) {
    const { response } = await get(path)
    const contentType = response.headers.get("content-type") ?? ""
    if (response.ok && contentType.includes(type)) pass(`${path} (${contentType})`)
    else if (response.ok) warn(`${path} is served as "${contentType}"`)
    else fail(`${path} returned ${response.status}`)
  }

  // Caching and compression (ADR-0006 §3). The worker revalidates pages and
  // bypasses the HTTP cache for its own updates, so a long cache on HTML or
  // sw.js is a warning: it still slows a first visit's freshness.
  const html = (await get("/")).response
  if (/max-age=0|no-cache|no-store/.test(cacheControl(html))) pass("HTML is revalidated")
  else warn(`HTML Cache-Control is ${cacheControl(html)}; want max-age=0, must-revalidate`)

  const entry = tokyo.body.match(/src="(\/_expo\/static\/js\/web\/entry-[^"]+\.js)"/)?.[1]
  if (!entry) fail("no entry script found in /time/tokyo")
  else {
    const { response } = await get(entry)
    const encoding = response.headers.get("content-encoding")
    if (encoding === "br" || encoding === "gzip") pass(`JS is compressed (${encoding})`)
    else fail("JS is served uncompressed (about 3× the transfer)")
    if (/immutable|max-age=(3\d{7}|[4-9]\d{7}|\d{9,})/.test(cacheControl(response)))
      pass("hashed JS is cached long-term")
    else
      warn(`hashed JS Cache-Control is ${cacheControl(response)}; want max-age=31536000, immutable`)
  }

  console.log(`\n${failures} failed, ${warnings} warnings`)
  process.exit(failures > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
