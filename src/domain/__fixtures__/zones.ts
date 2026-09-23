/**
 * docs/06-data-model.md §5, docs/11-testing-strategy.md §1. The zones that break
 * naïve time-handling code. Every domain/time test runs its matrix over this list.
 */
export interface FixtureZone {
  zone: string
  note: string
}

export const FIXTURE_ZONES: FixtureZone[] = [
  { zone: "Asia/Kathmandu", note: "UTC+5:45 — 45-minute offset" },
  {
    zone: "Asia/Kolkata",
    note: "UTC+5:30 — half-hour, and a canonical-link rename from Asia/Calcutta",
  },
  { zone: "Australia/Eucla", note: "UTC+8:45" },
  { zone: "Pacific/Chatham", note: "UTC+12:45 and DST" },
  { zone: "Pacific/Kiritimati", note: "UTC+14 — the maximum; date is ahead of everywhere" },
  { zone: "Pacific/Midway", note: "UTC−11" },
  { zone: "America/Los_Angeles", note: "Northern-hemisphere DST" },
  { zone: "Australia/Sydney", note: "Southern-hemisphere DST (inverted)" },
  {
    zone: "Europe/London",
    note: "DST transition differs from the US by 3 weeks — the mockup's exact bug",
  },
  { zone: "Asia/Tehran", note: "abolished DST in 2022 — stale-rule detector" },
  { zone: "America/Santiago", note: "DST rules changed recently, southern hemisphere" },
  { zone: "Africa/Cairo", note: "reinstated DST in 2023" },
  { zone: "Asia/Shanghai", note: "5.2M km², a single zone, no DST" },
  { zone: "Antarctica/Troll", note: "UTC+0 / +2, a 2-hour DST jump" },
  { zone: "Europe/Lisbon", note: "same longitude as Madrid, different zone" },
  {
    zone: "Europe/Madrid",
    note: "same longitude as Lisbon, different zone — catches geo-based guessing",
  },
  { zone: "America/St_Johns", note: "UTC−3:30" },
  { zone: "Asia/Jerusalem", note: "DST dates set by legislation, not a fixed rule" },
]

export const FIXTURE_ZONE_NAMES = FIXTURE_ZONES.map((f) => f.zone)
