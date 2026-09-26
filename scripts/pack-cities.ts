/**
 * docs/10-implementation-plan.md task 6.1. Packs `cities.min.json` (the
 * output of build-cities.ts, and still the source of truth + test oracle)
 * into the two files the app actually loads:
 *
 *  - `cities.core.json` — everything a screen needs to show a city, read
 *    at boot. One array per field instead of 5,000 keyed objects;
 *    repeated strings (zone, country, country code, admin1) interned into
 *    tables; `gn-` ids as numbers; lat/lon to 4 decimals (~11 m); slugs
 *    stored only where they differ from `slugify(name)`.
 *  - `cities.search.json` — `asciiName` and `altNames`, used only by search,
 *    loaded the first time search runs.
 *
 * 1.3 MB / 327 KB gz as one file → ~350 KB / ~130 KB gz at boot, plus the
 * search names on demand.
 *
 * Run after build-cities.ts: npx tsx scripts/pack-cities.ts
 */
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { slugify } from "../src/domain/cities/slugify"

const DATA = path.join(__dirname, "..", "src", "assets", "data")

interface SourceCity {
  id: string
  slug: string
  name: string
  asciiName: string
  altNames: string[]
  admin1?: string
  country: string
  countryCode: string
  zone: string
  lat: number
  lon: number
  population: number
}

function intern(values: (string | null)[]): { t: (string | null)[]; i: number[] } {
  const table = [...new Set(values)]
  const index = new Map(table.map((v, i) => [v, i]))
  return { t: table, i: values.map((v) => index.get(v)!) }
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4

async function main() {
  const cities = JSON.parse(
    await readFile(path.join(DATA, "cities.min.json"), "utf8"),
  ) as SourceCity[]

  const slugOverrides: Record<number, string> = {}
  cities.forEach((c, i) => {
    if (c.slug !== slugify(c.name)) slugOverrides[i] = c.slug
  })

  for (const c of cities) {
    if (!/^gn-\d+$/.test(c.id))
      throw new Error(`Unexpected id ${c.id} — the core file stores ids as numbers`)
  }

  const core = {
    v: 1,
    id: cities.map((c) => Number(c.id.slice(3))),
    name: cities.map((c) => c.name),
    slugOverrides,
    admin1: intern(cities.map((c) => c.admin1 ?? null)),
    country: intern(cities.map((c) => c.country)),
    countryCode: intern(cities.map((c) => c.countryCode)),
    zone: intern(cities.map((c) => c.zone)),
    lat: cities.map((c) => round4(c.lat)),
    lon: cities.map((c) => round4(c.lon)),
    population: cities.map((c) => c.population),
  }
  const search = {
    v: 1,
    asciiName: cities.map((c) => c.asciiName),
    altNames: cities.map((c) => c.altNames),
  }

  const coreJson = JSON.stringify(core)
  const searchJson = JSON.stringify(search)
  await writeFile(path.join(DATA, "cities.core.json"), coreJson + "\n")
  await writeFile(path.join(DATA, "cities.search.json"), searchJson + "\n")
  console.log(
    `cities.core.json ${coreJson.length} bytes (${Object.keys(slugOverrides).length} slug overrides), ` +
      `cities.search.json ${searchJson.length} bytes`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
