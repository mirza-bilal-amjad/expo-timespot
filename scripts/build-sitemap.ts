/**
 * docs/10-implementation-plan.md task 6.4, docs/07 §4 "SEO". Writes
 * `public/sitemap.xml` (the app's home plus every static city page) and
 * `public/robots.txt` (allow everything, point at the sitemap). Expo's
 * static export copies `public/` into `dist/` as-is.
 *
 * Runs as part of `npm run export:web`. Set EXPO_PUBLIC_SITE_URL for a
 * preview origin.
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { getSeoCities } from "../src/domain/cities/seoPages"
import { cityPagePath, SITE_URL } from "../src/utils/site"

const PUBLIC_DIR = path.join(__dirname, "..", "public")

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

async function main() {
  const lastmod = new Date().toISOString().slice(0, 10)
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    ...getSeoCities().map((c) => ({ loc: `${SITE_URL}${cityPagePath(c.slug)}`, priority: "0.8" })),
  ]
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${escapeXml(u.loc)}</loc><lastmod>${lastmod}</lastmod><priority>${u.priority}</priority></url>`,
      )
      .join("\n") +
    `\n</urlset>\n`
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`

  await mkdir(PUBLIC_DIR, { recursive: true })
  await writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), sitemap)
  await writeFile(path.join(PUBLIC_DIR, "robots.txt"), robots)
  console.log(`sitemap.xml: ${urls.length} URLs · robots.txt → ${SITE_URL}/sitemap.xml`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
