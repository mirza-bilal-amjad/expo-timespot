/**
 * docs/adr/0004-intl-time-engine.md — the bundled fallback for a device
 * whose `Intl` ignores `timeZone` (the boot probe's `degraded`).
 *
 * Writes `src/assets/data/tz.offsets.json`: for every IANA zone, its UTC
 * offset over a fixed window and the instant of every change inside it —
 * computed here, at build time, from Node's full ICU. At runtime the
 * degraded engine looks an offset up instead of asking `Intl`; everything
 * else in `domain/time/zone.ts` is plain arithmetic from the offset, so the
 * two engines can only differ if this table does, and `zone.test.ts`
 * asserts it doesn't.
 *
 * Format — compact on purpose, it ships in the bundle:
 *   { v, from, to, zones: { [zone]: [offset0, t1, offset1, t2, offset2, …] } }
 * `from` / `to` / `tN` are minutes since the Unix epoch (every transition
 * falls on a whole minute); offsets are minutes east of UTC.
 *
 * Re-run when the window needs extending or a government changes its rules:
 *   npx tsx scripts/build-tzdata.ts
 */
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const OUTPUT_PATH = path.join(__dirname, "..", "src", "assets", "data", "tz.offsets.json")
const CITIES_PATH = path.join(__dirname, "..", "src", "assets", "data", "cities.min.json")

// The window the fallback is exact within. Outside it the nearest known
// offset is used (still right for zones without DST).
const WINDOW_FROM = Date.UTC(2024, 0, 1)
const WINDOW_TO = Date.UTC(2031, 0, 1)
// Scan step: no zone changes offset twice within six hours.
const SCAN_STEP_MS = 6 * 3_600_000
const MINUTE_MS = 60_000
const MAX_BYTES = 80_000

const formatters = new Map<string, Intl.DateTimeFormat>()

function offsetMinutes(zone: string, at: number): number {
  let formatter = formatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
    formatters.set(zone, formatter)
  }
  const parts = formatter.formatToParts(at)
  const gmt = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT"
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(gmt)
  if (!match) return 0
  const sign = match[1] === "-" ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

/** [offset0, t1, offset1, …] for one zone across the window. */
function transitions(zone: string): number[] {
  let current = offsetMinutes(zone, WINDOW_FROM)
  const out = [current]
  for (let t = WINDOW_FROM + SCAN_STEP_MS; t <= WINDOW_TO; t += SCAN_STEP_MS) {
    const next = offsetMinutes(zone, t)
    if (next === current) continue
    // Binary-search the change down to the minute.
    let lo = t - SCAN_STEP_MS
    let hi = t
    while (hi - lo > MINUTE_MS) {
      const mid = lo + Math.floor((hi - lo) / 2 / MINUTE_MS) * MINUTE_MS
      if (offsetMinutes(zone, mid) === current) lo = mid
      else hi = mid
    }
    out.push(hi / MINUTE_MS, next)
    current = next
  }
  return out
}

async function main() {
  const cities = JSON.parse(await readFile(CITIES_PATH, "utf8")) as { zone: string }[]
  const zones = new Set<string>(["UTC", ...Intl.supportedValuesOf("timeZone")])
  for (const city of cities) zones.add(city.zone)

  const table: Record<string, number[]> = {}
  for (const zone of [...zones].sort()) table[zone] = transitions(zone)

  const json = JSON.stringify({
    v: 1,
    from: WINDOW_FROM / MINUTE_MS,
    to: WINDOW_TO / MINUTE_MS,
    zones: table,
  })
  if (json.length > MAX_BYTES) {
    throw new Error(`tz.offsets.json is ${json.length} bytes, over the ${MAX_BYTES} budget`)
  }
  await writeFile(OUTPUT_PATH, json + "\n")

  const withDst = Object.values(table).filter((t) => t.length > 1).length
  console.log(
    `tz.offsets.json: ${zones.size} zones (${withDst} with changes), ${json.length} bytes, ` +
      `ICU ${process.versions.icu}, tz ${process.versions.tz ?? "?"}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
