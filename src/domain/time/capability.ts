/**
 * docs/adr/0004-intl-time-engine.md. Hermes on some Android builds ships a reduced
 * ICU that silently ignores `timeZone` — nothing throws, every time in the app is
 * just wrong. This probe is the mandatory guard against that failure mode.
 */
export type TimeCapability = "full" | "degraded"

const PROBE_INSTANT_MS = Date.parse("2025-07-01T12:00:00Z")

function probeHour(zone: string, atMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    hour: "2-digit",
  }).format(atMs)
}

/**
 * Pure and injectable so a test can simulate a broken formatter without touching
 * the global Intl object. `probeFn` returning the same hour for both zones (or
 * anything other than the expected pair) means `timeZone` is being ignored.
 */
export function probeTimeCapability(
  probeFn: (zone: string, atMs: number) => string = probeHour,
  atMs: number = PROBE_INSTANT_MS,
): TimeCapability {
  try {
    // 1 July 2025, 12:00 UTC -> New York 08 (EDT), Tokyo 21.
    const newYorkHour = probeFn("America/New_York", atMs)
    const tokyoHour = probeFn("Asia/Tokyo", atMs)
    return newYorkHour === "08" && tokyoHour === "21" ? "full" : "degraded"
  } catch {
    // A formatter that can't even construct is a stronger signal of the same
    // problem — never let the probe itself crash the boot sequence.
    return "degraded"
  }
}

let cachedCapability: TimeCapability | undefined

/** Boot-time singleton. Call once, before first render. */
export function getTimeCapability(): TimeCapability {
  if (!cachedCapability) cachedCapability = probeTimeCapability()
  return cachedCapability
}
