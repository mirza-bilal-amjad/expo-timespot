# 11 — Testing Strategy

The risk in this product is concentrated in one place: **being wrong about time, silently.** Testing effort is allocated accordingly.

```
        ▲  e2e (Maestro / Playwright)        ~15 flows
       ╱ ╲
      ╱   ╲  component (RNTL + jest-axe)     ~60 tests
     ╱─────╲
    ╱       ╲ visual regression               ~40 stories × 2 themes
   ╱─────────╲
  ╱           ╲ domain unit tests            ~250 tests  ← the bulk
 ╱─────────────╲
```

Inverted from the usual pyramid on purpose. The domain layer is pure, fast and where all the real danger lives.

---

## 1. Domain tests — the ones that matter

`src/domain/**`, plain Jest, no renderer, whole suite under one second.

### Coverage requirement: **100 % branches in `domain/time/`**. Not negotiable.

```ts
describe.each(FIXTURE_ZONES)('zone %s', (zone) => {
  it('formats the offset correctly in January and July', …)
  it('matches Intl and the tzdata fallback path identically',  …)
  it('returns the right offset on both sides of every transition', …)
})
```

### The DST matrix

For each of the 17 fixture zones (`06-data-model.md` §5), and for every transition between 2026-01-01 and 2028-12-31, assert the offset at:

- `transition − 1 h`
- `transition − 1 s`
- `transition + 1 s`
- `transition + 1 h`

That is roughly 480 assertions and it runs in milliseconds. It is the test that would have caught every one of the four data defects in the supplied mockups.

### Other domain suites

| Suite | Asserts |
|---|---|
| `formatOffset` | `UTC+5:45`, `UTC+0`, `UTC−3:30`, `UTC+14`; U+2212 minus, never a hyphen |
| `getZonedTime` | day rollover — Kiritimati is a day ahead of Midway; `dayOffset` is ±1 |
| `getDifference` | `+5:30` India↔London in winter (GMT), `+4:30` in BST — **corrected 2026-09-24**, was backwards; sign and label |
| `getOverlap` | zero-overlap pairs (LA↔Tokyo) return `null`, not a negative range |
| `getSunTimes` | Tromsø polar night/midnight sun; equator ≈ 12 h year-round; ±1 min vs reference |
| `searchCities` | diacritics, alt-names, typos, ranking; **< 30 ms** hard bound |
| `slug` | uniqueness across all 5 000; stability across dataset rebuilds |
| `capability probe` | returns `degraded` with `Intl` stubbed, `full` otherwise |
| migrations | v0 → v1 for each store; unknown version resets safely |

### Deterministic clock

Every test that touches "now" injects it. `Date.now` is never read directly in `domain/` — it is a parameter. This makes the whole layer trivially testable and is why the matrix above is cheap to run.

---

## 2. Component tests

React Native Testing Library, run against the web renderer for speed, with native-specific assertions where behaviour differs.

| Component | Assertions |
|---|---|
| `Numeral` | tabular width stable across `000`→`111`→`888`; roll only on the changed digit; cut on a jump > 2 |
| `Card` | `selected` flips descendant text colour without per-leaf props |
| `SegmentedPill` | thumb position follows value; arrow keys work; `role="radiogroup"` |
| `CityRow` | renders **once** per unchanged tick; one accessible node; correct label string |
| `HeroClock` | single `aria-label`; digits hidden; `aria-live` off |
| `Sheet` | web focus trap, `Esc` closes, focus restored to trigger |
| `SearchSheet` | debounce, empty state, already-added state, keyboard list nav |
| every story | `jest-axe` zero violations, **both themes** |

### Render-count test — the one people forget

```ts
it('re-renders one component per tick', () => {
  const renders = trackRenders()
  advanceClock(5_000)                 // 5 ticks
  expect(renders.get('CityRow')).toBe(0)   // rows are memo'd on display string
  expect(renders.get('CityList')).toBe(5)
})
```

With `showSecondsOnList` off, rows re-render only on the minute. This test is what stops a future refactor from quietly making the list 60× more expensive.

---

## 3. Device matrix

The `Intl` capability probe is the single highest risk in the project, so the matrix exists primarily to exercise it.

| Tier | Device | Why |
|---|---|---|
| iOS high | iPhone 16 Pro | baseline |
| iOS low | iPhone SE 3 (small screen, 375 pt) | layout stress, 200 % text |
| Android high | Pixel 8 | baseline |
| Android mid | Pixel 6a | **the 60 fps meridian budget** |
| Android low | a 3 GB Go-edition device or an emulator with reduced ICU | **the `Intl` degraded path** |
| Tablet | iPad (split view at 1/3, 1/2, 2/3) | breakpoints |
| Web | Chrome, Safari, Firefox — desktop + iOS Safari | hydration, fonts, `tabular-nums` |

On every device, before release: launch, check four cities' times against a known-good reference (`time.is`), background for 10 minutes, resume, re-check.

`eas-simulator` can drive the iOS and Android tiers from CI; the low-tier Android and real Safari passes are manual.

---

## 4. The DST calendar — a release gate

A scheduled CI job runs **weekly** and again **72 h before every known DST transition worldwide**:

1. Rebuild the transition table from the current tz database.
2. Diff it against the committed snapshot.
3. If any zone's rules changed, fail loudly and open an issue.

This catches the real-world case that breaks clock apps: a government changing the rules with 2 weeks' notice (Lebanon 2023, Mexico 2022, Chile repeatedly). Because the app reads `Intl`, the fix usually requires no release at all — but you want to *know*.

---

## 5. Accessibility tests

| Layer | Tool | Gate |
|---|---|---|
| Tokens | `pnpm tokens:contrast` | blocking |
| Components | `jest-axe`, all stories, both themes | blocking |
| Web routes | `@axe-core/playwright` | blocking |
| Web | Lighthouse CI, a11y = 100 | blocking |
| Manual | VoiceOver, TalkBack, keyboard-only, 200 % text, RTL, reduced motion | per release, checklist in `09` §7 |

---

## 6. Visual regression

Every story, both themes, three viewports (393, 768, 1440) → 240 snapshots. Playwright screenshots for web; `eas-simulator` screenshots for native.

Tolerance 0.1 %. Font rendering differences across platforms mean native and web baselines are kept separately.

**Fixed clock for snapshots:** all visual tests pin the clock to `2026-03-20T08:40:15Z` — otherwise every snapshot fails every second.

---

## 7. E2E flows

Maestro (native) and Playwright (web), same 15 flows:

1. Cold start → correct time visible < 900 ms
2. Add a city by search
3. Add a city with diacritics ("Zürich")
4. Reorder by drag; relaunch; order held
5. Delete; undo; city restored to its position
6. Focus a city; relaunch; focus held
7. Toggle 12/24 h; propagates to every screen
8. Toggle theme; no flash; persisted
9. Drag the meridian; card updates; snaps
10. Meridian by keyboard (web)
11. Background 10 min → resume → time correct
12. Device clock changed → app corrects without an absurd animation
13. Offline (airplane mode) → every feature works
14. 40 cities → scroll performance holds
15. Web: `/time/tokyo` loads, shows the right time, deep-links to the app

---

## 8. Performance tests

| Metric | Budget | Instrument | Gate |
|---|---|---|---|
| Cold start → readable clock | < 900 ms p75 | custom trace | blocking |
| Meridian drag | 60 fps | Perfetto / React DevTools profiler | blocking |
| List scroll, 40 cities | < 2 dropped frames per swipe | Perfetto | warning |
| Web LCP | < 1.2 s p75 | Lighthouse CI | blocking |
| Web initial JS | < 180 KB gz | bundle analyser | blocking |
| Native JS bundle | < 2.5 MB | `expo export` | warning |
| Memory, 40 cities | < 120 MB | Xcode / Android Studio | warning |

---

## 9. What is deliberately not tested

- The exact pixel output of the SVG map — snapshot the path data, not the raster.
- Third-party libraries' internals.
- `suncalc`'s astronomy — only that we call it correctly and handle its polar `null`s.
- Store submission flows.

## 10. CI

```yaml
on: [pull_request]
  typecheck → lint → token-check → contrast → domain tests
  → component tests → a11y → visual regression → web build + Lighthouse
on: [push: main]
  + EAS preview build (iOS + Android)
on: [tag: v*]
  + production builds + web deploy
on: [schedule: weekly]
  + DST transition-table diff
```

Total PR time target: **under 8 minutes**. The domain suite runs first because it is a second long and catches the most dangerous class of bug.
