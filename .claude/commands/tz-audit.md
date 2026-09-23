---
description: Find fixed offsets, DST hazards and time-handling bugs across the codebase
---

Audit the codebase for time-zone correctness. This is the highest-risk subsystem in the product — its failures are silent. Report findings; do not fix unless I ask.

Load the `timespot-timezone-correctness` skill first.

## Blocking violations

1. **Numeric UTC offsets** — `offset: -8`, `utcOffset`, `+ 9 * 3600`, `* 3600000` arithmetic on a timestamp
2. **Zone abbreviations as data** — `'PST'`, `'EST'`, `'GMT+5'`, `'CET'` used for anything other than a display string produced by `Intl`
3. **Manual DST logic** — any `month >`, `getMonth()`, or date comparison used to decide whether DST is active
4. **Offsets reaching storage** — anything in a `persist` payload other than an IANA zone id
5. **Hand-formatted dates or times** — string concatenation or `padStart` where `Intl.DateTimeFormat` should be used
6. **`Date.now()` read inside `src/domain/`** — `now` must be injected so the layer stays deterministic and testable
7. **Missing or weakened `Intl` capability probe** — `domain/time/capability.ts` must exist, run before first render, and check two distinct zones with one mid-DST
8. **Hyphen instead of U+2212** in an offset label

## Warnings

9. Integer-hour assumptions — anything that would break on `+5:45`, `+8:45`, `+12:45`, `−3:30`
10. Offset range assumed to be −12…+12 — `Pacific/Kiritimati` is **+14**
11. Cached derived time values that could survive a DST boundary
12. Clock interval using `setInterval(1000)` instead of boundary alignment
13. Missing jump guard — a `Date.now()` move > 5 s must cut, not animate
14. `AppState` / `visibilitychange` resync missing from `useClock`

## Then verify the test matrix

- Do all 17 fixture zones from `docs/06-data-model.md` §5 have tests?
- Is every transition 2026–2028 asserted at −1 h, −1 s, +1 s, +1 h?
- Do the `Intl` path and the fallback path assert **identical** output?
- Are Kathmandu, Chatham, Kiritimati, Eucla and St John's all covered?

## Report as

```
BLOCKING (n)
  src/store/cities.ts:18    persists `offset: number`   → store only `zone: string`
  src/domain/time/fmt.ts:7  '-' hyphen in offset label  → U+2212

COVERAGE GAPS
  no test for Pacific/Chatham DST transition
```

If everything is clean, say so and state how many fixture zones and transitions are currently covered.
