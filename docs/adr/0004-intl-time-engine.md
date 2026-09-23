# ADR-0004 — `Intl` as the time engine, with a bundled tzdata fallback

**Status:** accepted · 2026-09-23 · **the most important decision in the project**

## Context

Every time the app displays is derived from an IANA zone. Get this wrong and the product has no reason to exist — and the supplied mockups get it wrong four separate times (`01-design-audit.md` §8.1–8.2).

Options:

1. **Fixed offsets** — store `-8` per city. What the mockups did.
2. **`Intl.DateTimeFormat` with `timeZone`** — the platform's own tz database.
3. **Bundled tz library** — `luxon`, `@date-fns/tz`, `moment-timezone`, shipping tzdata in the app.
4. **`Temporal`** — the right long-term answer; not reliably available across RN 0.86 and all browsers today.

## Decision

**`Intl` as the primary engine, with a boot-time capability probe and a bundled `@date-fns/tz` fallback path.**

## Rationale

- Option 1 is the bug. Offsets change twice a year and the rules themselves change by legislation — Lebanon reversed a DST decision mid-season in 2023 with days of notice.
- `Intl` reads the **OS** tz database. When a government changes the rules, an OS update fixes the app with no release. That is a property no bundled library can match.
- Bundling tzdata as the *primary* path means shipping an app update every time the rules change, and users who never update are permanently wrong.
- `Temporal` is the destination; revisit when it is stable across Hermes and all target browsers.

## The risk, and the mitigation

Hermes on some Android builds ships a reduced ICU. If `Intl.DateTimeFormat` **silently ignores** the `timeZone` option, every time in the app is wrong and nothing throws. This is the worst possible failure mode.

Therefore, at boot, before first render:

```ts
// 1 July 2025, 12:00 UTC → New York 08 (EDT), Tokyo 21
const ny = fmtHour('America/New_York', t)
const tk = fmtHour('Asia/Tokyo', t)
return (ny === '08' && tk === '21') ? 'full' : 'degraded'
```

Two zones, one mid-DST, one far from UTC. On `degraded`, the app switches to `@date-fns/tz` `TZDate` backed by a bundled tzdata slice (~420 canonical zones, current + 2 years of transitions, ≈ 60 KB) and emits a non-PII telemetry event so the fallback rate is observable.

Both paths are asserted to produce **identical output** for all 17 fixture zones, on both sides of every 2026–2028 transition.

## Consequences

- One extra dependency and ~60 KB, paid only as a fallback.
- Two code paths to keep in sync — kept honest by the shared test matrix.
- A device with a wrong *tz database* (very old, unpatched OS) can still be wrong. Accepted: the probe catches the catastrophic case, not the stale-by-one-rule case, and the weekly transition-table diff job surfaces that class of drift.
- **Derived rule, enforced by `/tz-audit`:** the only persisted time fact anywhere in the codebase is an IANA zone ID. A literal `-8`, `"UTC-8"` or `"PST"` in `src/` is a build failure.
