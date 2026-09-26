/**
 * docs/06-data-model.md §3. Builds src/assets/data/cities.min.json from GeoNames
 * (CC BY 4.0 — attribution required in the app's About screen, per the project README).
 *
 * Run: npx tsx scripts/build-cities.ts
 *
 * Source files are cached under scripts/.data/ (gitignored) and fetched on first
 * run. Re-run any time to rebuild against fresh GeoNames data.
 */
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { slugify } from "../src/domain/cities/slugify"
import type { DatasetCity as City } from "../src/domain/types"

const DATA_DIR = path.join(__dirname, ".data", "geonames")
const OUTPUT_PATH = path.join(__dirname, "..", "src", "assets", "data", "cities.min.json")
const MAX_CITIES = 5000
const GEONAMES_BASE = "https://download.geonames.org/export/dump/"

const SOURCES = {
  cities15000: "cities15000.zip", // primary pool: population >= 15,000
  cities1000: "cities1000.zip", // coverage fallback: population >= 1,000
  admin1: "admin1CodesASCII.txt",
  countryInfo: "countryInfo.txt",
}

async function ensureCached(name: string, file: string): Promise<string> {
  await mkdir(DATA_DIR, { recursive: true })
  const isZip = file.endsWith(".zip")
  const txtName = file.replace(".zip", ".txt")
  const txtPath = path.join(DATA_DIR, txtName)
  if (existsSync(txtPath)) return txtPath

  const zipOrTxtPath = path.join(DATA_DIR, file)
  console.log(`Fetching ${file}...`)
  const res = await fetch(GEONAMES_BASE + file)
  if (!res.ok) throw new Error(`Failed to fetch ${file}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  await writeFile(zipOrTxtPath, buffer)

  if (isZip) {
    const { execFileSync } = await import("node:child_process")
    execFileSync("unzip", ["-o", zipOrTxtPath, "-d", DATA_DIR])
  }
  return txtPath
}

interface GeoNamesRow {
  geonameid: string
  name: string
  asciiname: string
  alternatenames: string
  lat: number
  lon: number
  countryCode: string
  admin1Code: string
  population: number
  timezone: string
}

function parseGeoNamesFile(text: string): GeoNamesRow[] {
  const rows: GeoNamesRow[] = []
  for (const line of text.split("\n")) {
    if (!line.trim()) continue
    const f = line.split("\t")
    rows.push({
      geonameid: f[0],
      name: f[1],
      asciiname: f[2],
      alternatenames: f[3],
      lat: Number(f[4]),
      lon: Number(f[5]),
      countryCode: f[8],
      admin1Code: f[10],
      population: Number(f[14]),
      timezone: f[17],
    })
  }
  return rows
}

function parseCountryInfo(text: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue
    const f = line.split("\t")
    map.set(f[0], f[4]) // ISO code -> country name
  }
  return map
}

function parseAdmin1(text: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of text.split("\n")) {
    if (!line.trim()) continue
    const f = line.split("\t")
    map.set(f[0], f[1]) // 'US.CA' -> 'California'
  }
  return map
}

const zoneValidityCache = new Map<string, boolean>()
function isValidZone(zone: string): boolean {
  const cached = zoneValidityCache.get(zone)
  if (cached !== undefined) return cached
  let valid: boolean
  try {
    // eslint-disable-next-line no-new -- constructing is the validity check
    new Intl.DateTimeFormat("en-US", { timeZone: zone })
    valid = true
  } catch {
    valid = false
  }
  zoneValidityCache.set(zone, valid)
  return valid
}

/** ASCII-only alt names, deduped against name/asciiName, capped — keeps the file small. */
function pickAltNames(row: GeoNamesRow): string[] {
  const seen = new Set([row.name, row.asciiname])
  const alts: string[] = []
  for (const raw of row.alternatenames.split(",")) {
    const alt = raw.trim()
    if (!alt || seen.has(alt)) continue
    if (!/^[\x20-\x7e]+$/.test(alt)) continue // ASCII-printable only
    seen.add(alt)
    alts.push(alt)
    if (alts.length >= 4) break
  }
  return alts
}

function toCity(
  row: GeoNamesRow,
  countryNames: Map<string, string>,
  admin1Names: Map<string, string>,
): City | null {
  if (row.population <= 0) return null
  if (!isValidZone(row.timezone)) return null
  const country = countryNames.get(row.countryCode)
  if (!country) return null

  const admin1 = admin1Names.get(`${row.countryCode}.${row.admin1Code}`)

  return {
    id: `gn-${row.geonameid}`,
    slug: slugify(row.asciiname), // deduped against collisions in build()
    name: row.name,
    asciiName: row.asciiname,
    altNames: pickAltNames(row),
    admin1,
    country,
    countryCode: row.countryCode,
    zone: row.timezone,
    lat: Math.round(row.lat * 10_000) / 10_000, // ~11m precision — plenty for a map pin
    lon: Math.round(row.lon * 10_000) / 10_000,
    population: row.population,
  }
}

function dedupeSlugs(cities: City[]): void {
  const bySlug = new Map<string, City[]>()
  for (const city of cities) {
    const group = bySlug.get(city.slug)
    if (group) group.push(city)
    else bySlug.set(city.slug, [city])
  }
  for (const group of bySlug.values()) {
    if (group.length < 2) continue
    // Highest-population city keeps the bare slug; the rest get a country suffix.
    group.sort((a, b) => b.population - a.population)
    for (const city of group.slice(1)) {
      city.slug = `${city.slug}-${city.countryCode.toLowerCase()}`
    }
  }
  // A country-suffixed slug can still collide (two cities, same name, same
  // country) — fall back to appending the geonames id, which is always unique.
  const finalCounts = new Map<string, number>()
  for (const city of cities) {
    const count = finalCounts.get(city.slug) ?? 0
    if (count > 0) city.slug = `${city.slug}-${city.id.replace("gn-", "")}`
    finalCounts.set(city.slug, count + 1)
  }
}

async function build() {
  const [cities15000Path, cities1000Path, admin1Path, countryInfoPath] = await Promise.all([
    ensureCached("cities15000", SOURCES.cities15000),
    ensureCached("cities1000", SOURCES.cities1000),
    ensureCached("admin1", SOURCES.admin1),
    ensureCached("countryInfo", SOURCES.countryInfo),
  ])

  const countryNames = parseCountryInfo(await readFile(countryInfoPath, "utf-8"))
  const admin1Names = parseAdmin1(await readFile(admin1Path, "utf-8"))

  const primaryRows = parseGeoNamesFile(await readFile(cities15000Path, "utf-8"))
  const fallbackRows = parseGeoNamesFile(await readFile(cities1000Path, "utf-8"))

  const primaryCities = primaryRows
    .map((r) => toCity(r, countryNames, admin1Names))
    .filter((c): c is City => c !== null)
    .sort((a, b) => b.population - a.population)

  const fallbackCities = fallbackRows
    .map((r) => toCity(r, countryNames, admin1Names))
    .filter((c): c is City => c !== null)

  const canonicalZones = Intl.supportedValuesOf("timeZone")

  const selected = primaryCities.slice(0, MAX_CITIES)
  const selectedZones = new Set(selected.map((c) => c.zone))
  const selectedIds = new Set(selected.map((c) => c.id))

  const forced: City[] = []
  for (const zone of canonicalZones) {
    if (selectedZones.has(zone)) continue
    // Best (highest-population) candidate for this zone, checking the primary
    // pool first, then the broader population>=1000 fallback pool.
    const candidates = [...primaryCities, ...fallbackCities]
      .filter((c) => c.zone === zone && !selectedIds.has(c.id))
      .sort((a, b) => b.population - a.population)
    if (candidates.length === 0) {
      console.warn(`No representative city found for zone ${zone} at any population tier.`)
      continue
    }
    forced.push(candidates[0])
    selectedIds.add(candidates[0].id)
    selectedZones.add(zone)
  }

  // Keep the cap: trim the lowest-population non-forced cities to make room.
  let final = [...selected, ...forced]
  if (final.length > MAX_CITIES) {
    const forcedIds = new Set(forced.map((c) => c.id))
    final.sort((a, b) => {
      const aForced = forcedIds.has(a.id)
      const bForced = forcedIds.has(b.id)
      if (aForced !== bForced) return aForced ? -1 : 1 // forced cities sort first, so slice() below keeps them
      return b.population - a.population
    })
    final = final.slice(0, MAX_CITIES)
  }
  final.sort((a, b) => b.population - a.population)

  dedupeSlugs(final)

  // Validation
  const slugCounts = new Map<string, number>()
  for (const c of final) slugCounts.set(c.slug, (slugCounts.get(c.slug) ?? 0) + 1)
  const dupeSlugs = [...slugCounts.entries()].filter(([, n]) => n > 1)
  if (dupeSlugs.length > 0)
    throw new Error(`Duplicate slugs remain: ${dupeSlugs.map((d) => d[0]).join(", ")}`)

  const coveredZones = new Set(final.map((c) => c.zone))
  const missingZones = canonicalZones.filter((z) => !coveredZones.has(z))

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  const json = JSON.stringify(final)
  await writeFile(OUTPUT_PATH, json)

  console.log(`\n${final.length} cities written to ${path.relative(process.cwd(), OUTPUT_PATH)}`)
  console.log(`${(json.length / 1024).toFixed(0)} KB uncompressed`)
  console.log(
    `${canonicalZones.length - missingZones.length} / ${canonicalZones.length} canonical zones covered`,
  )
  if (missingZones.length > 0) {
    console.log(
      `Zones with no representative city at any population tier: ${missingZones.join(", ")}`,
    )
  }
  for (const name of ["Reykjavik", "Nuuk", "Apia", "Waitangi"]) {
    const found = final.some((c) => c.name === name || c.asciiName === name)
    console.log(`${found ? "✓" : "✗"} ${name} present`)
  }
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
