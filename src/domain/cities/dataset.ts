import core from "../../assets/data/cities.core.json"
import type { City } from "../types"
import { slugify } from "./slugify"

/**
 * docs/07-responsive-strategy.md exception #10, docs/10 task 6.1. The city
 * dataset as the app reads it: `cities.core.json`, packed by
 * scripts/pack-cities.ts from `cities.min.json` — one array per field,
 * repeated strings interned, numeric ids, slugs only where they differ
 * from `slugify(name)`. Decoded once, here, into ordinary `City` objects,
 * population-sorted. (~350 KB / 136 KB gz, from 1.3 MB / 327 KB.)
 *
 * The search-only names (`asciiName`, `altNames`) live in
 * `cities.search.json`, loaded by search.ts the first time it's needed.
 */

interface Interned {
  t: (string | null)[]
  i: number[]
}

interface CoreFile {
  id: number[]
  name: string[]
  slugOverrides: Record<string, string>
  admin1: Interned
  country: Interned
  countryCode: Interned
  zone: Interned
  lat: number[]
  lon: number[]
  population: number[]
}

const pick = (column: Interned, i: number) => column.t[column.i[i]] ?? undefined

/** Decodes the packed columns; a row missing anything a screen relies on is
 * dropped rather than allowed to throw at module load (task 5.7). */
export function decodeCities(file: unknown): City[] {
  const f = file as Partial<CoreFile> | null
  if (!f || !Array.isArray(f.id) || !Array.isArray(f.name)) return []
  const out: City[] = []
  for (let i = 0; i < f.id.length; i++) {
    const name = f.name[i]
    const zone = f.zone && pick(f.zone, i)
    const country = f.country && pick(f.country, i)
    const lat = f.lat?.[i]
    const lon = f.lon?.[i]
    if (typeof name !== "string" || !zone || !country) continue
    if (typeof lat !== "number" || typeof lon !== "number") continue
    const admin1 = f.admin1 && pick(f.admin1, i)
    out.push({
      id: `gn-${f.id[i]}`,
      slug: f.slugOverrides?.[i] ?? slugify(name),
      name,
      ...(admin1 ? { admin1 } : null),
      country,
      countryCode: (f.countryCode && pick(f.countryCode, i)) ?? "",
      zone,
      lat,
      lon,
      population: f.population?.[i] ?? 0,
    })
  }
  return out
}

/** Every usable city, population-sorted. */
export const allCities: readonly City[] = decodeCities(core)

/** How many rows the packed file declared — for the dataset error message. */
export const declaredRowCount: number = Array.isArray((core as Partial<CoreFile>).id)
  ? (core as CoreFile).id.length
  : 0
