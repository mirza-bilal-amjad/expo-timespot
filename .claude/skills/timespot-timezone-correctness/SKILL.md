---
name: timespot-timezone-correctness
description: Enforce correct time-zone, DST and offset handling anywhere in TimeSpot. Use whenever writing or reviewing code that formats a time, computes an offset or difference, stores city data, renders a clock, or tests time behaviour. Also use when a displayed time looks wrong.
---

# Time-zone correctness

This is the subsystem where a bug destroys the product's reason to exist, and it fails **silently** — nothing throws, the clock just shows the wrong hour. Treat every change here as high-risk.

Background: `docs/06-data-model.md` §4, `docs/adr/0004-intl-time-engine.md`.

---

## The one rule

> **The only persisted time fact is an IANA zone ID.**
> Offsets, abbreviations and DST status are derived at display time. Never stored. Never cached across a boundary.

```ts
// ❌ every one of these is a defect
const offset = -8
city.utcOffset = 9
const tz = 'PST'
new Date(now + offsetHours * 3600_000)
const isDST = month > 3 && month < 11
JSON.stringify({ city, offset })     // offset must not reach storage

// ✅
city.zone = 'America/Los_Angeles'
getZonedTime(now, city.zone, prefs)
getOffsetMinutes(now, city.zone)
```

Why: offsets change twice a year, and the *rules themselves* change by legislation with little notice (Lebanon 2023, Mexico 2022, Chile repeatedly, Iran abolished DST in 2022). Derived values are always right. Stored values rot.

---

## The engine

Primary: `Intl.DateTimeFormat` with `timeZone` — it reads the **OS** tz database, so rule changes arrive via OS updates with no app release.

**The probe is mandatory.** Hermes on some Android builds ships a reduced ICU that *silently ignores* `timeZone`:

```ts
// src/domain/time/capability.ts — runs at boot, before first render
const t = new Date('2025-07-01T12:00:00Z')
const ny = hourIn('America/New_York', t)  // expect '08' (EDT)
const tk = hourIn('Asia/Tokyo', t)        // expect '21'
return (ny === '08' && tk === '21') ? 'full' : 'degraded'
```

On `degraded` → `@date-fns/tz` `TZDate` with the bundled tzdata slice. Both paths must produce identical output for every fixture zone.

Never remove or weaken the probe. Never assume `Intl` works because it worked on your simulator.

---

## Formatting rules

```
UTC+9      whole hour, no zero-pad, no space after UTC
UTC+0      not 'UTC+00:00', not 'GMT'
UTC+5:45   sub-hour zones render H:MM
UTC−7      minus is U+2212 (−), NOT a hyphen (-)
```

Never hand-format a date or time. `Intl.DateTimeFormat` with the user's locale, always — it is the only thing that is right in every language.

---

## Zones that break naïve code

Keep these in mind on every change; they are the fixture set in `src/domain/__fixtures__/zones.ts`.

| Zone | Trap |
|---|---|
| `Asia/Kathmandu` | **+5:45** — 45-minute offset |
| `Asia/Kolkata` | +5:30, and `Asia/Calcutta` is a link that must normalise |
| `Australia/Eucla` | +8:45 |
| `Pacific/Chatham` | +12:45 **and** DST |
| `Pacific/Kiritimati` | **+14** — the maximum; a day ahead of most of the world |
| `America/St_Johns` | −3:30 |
| `Australia/Sydney` | southern-hemisphere DST — inverted from the north |
| `Europe/London` | DST starts ~3 weeks after the US. **This is the exact case the mockups got wrong.** |
| `Asia/Tehran` | abolished DST in 2022 — catches stale rules |
| `Antarctica/Troll` | a 2-hour DST jump |
| `Asia/Jerusalem` | dates set by legislation, not a fixed rule |

Assume nothing is a whole hour. Assume nothing about hemisphere. Assume the rules changed last year.

---

## Testing

Every change to `domain/time` requires the matrix in `docs/11-testing-strategy.md` §1:

for each fixture zone, for every transition 2026–2028, assert the offset at
`transition − 1h`, `− 1s`, `+ 1s`, `+ 1h`.

Plus:
- `Intl` path and fallback path produce **identical** output
- day rollover: Kiritimati is a day ahead of Midway
- `getDifference` sign and label on both sides of a DST boundary
- **inject `now`** — never read `Date.now()` inside `domain/`

---

## The clock tick

```ts
const delay = 1000 - (Date.now() % 1000) + 4   // align to the wall-clock second
```

- Align to the boundary; do not `setInterval(1000)` and drift.
- Re-sync on `AppState → active` and on web `visibilitychange`.
- Stop ticking when the app is not active.
- Coalesce to the minute when seconds are not displayed.
- **Jump guard:** if `Date.now()` moves more than 5 s between ticks, treat it as a system clock change — recompute and cut, never animate through it.

---

## Review checklist

- [ ] No numeric offset anywhere in the diff
- [ ] No `'PST'` / `'EST'` / `'GMT+5'` string
- [ ] No `new Date(x + n * 3600000)` arithmetic
- [ ] No month/date comparison used to guess DST
- [ ] Offsets formatted through `formatOffset`, with U+2212
- [ ] `now` is injected, not read, inside `domain/`
- [ ] New fixtures added if the change touches a new class of zone
- [ ] Full DST matrix run and green

If any box is unchecked, the change is not safe to merge — and it is definitely not safe to ship as an OTA update, which would break every user at once.
