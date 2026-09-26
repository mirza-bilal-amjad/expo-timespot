# 00 — Product Brief (PRD)

**Product:** TimeSpot — world clock for people who live across time zones
**Surfaces:** iOS, Android, Web — one Expo codebase
**Owner:** Bilal (solo)
**Status:** pre-development. This document plus `01`–`13` is the complete input to implementation.

---

## 1. One-line

A world clock that treats time as the interface: enormous, legible, honest about daylight, and identical on your phone and in your browser tab.

## 2. Why this, why now

The category is crowded and uniformly bad. Every incumbent falls into one of three traps:

| Trap | Who does it | What it costs the user |
|---|---|---|
| **Widget-dense dashboards** | most "world clock" apps | you can't read the time at a glance from across the room |
| **Correct but ugly** | OS built-ins | no sense of *day-feel* — is it a reasonable hour to call? |
| **Pretty but wrong** | many indie clocks | fixed UTC offsets that break twice a year on DST boundaries |

TimeSpot's position: **the legibility of a wall clock, the correctness of the IANA database, on every screen you own.**

The web surface is not an afterthought. A world clock is one of the few app categories with genuine search demand (`time in tokyo`, `london to new york time difference`) — the website is the acquisition channel, and it is only cheap to build if it is the same codebase.

## 3. Users

**P1 — The distributed worker.** Works with 2–6 colleagues across 3+ zones. Needs: *is it rude to message them right now?* Opens the app 4–10×/day, for under 5 seconds each time. **This is the design target.** Every decision optimises their glance.

**P2 — The long-distance tie.** Family or partner in one other zone. Needs: one other city, always right, on the home screen. Wants a widget more than an app.

**P3 — The traveller.** Zone changes under them. Needs: home-vs-here without re-configuring anything.

**P4 — The search visitor.** Lands on `timespot.app/time/tokyo` from Google, gets an answer in under a second, may never open the app. Is the top of the funnel and must be served a fast, static, correct page.

## 4. Principles

1. **The time is the layout.** If a feature shrinks the clock, the feature loses.
2. **Correctness is invisible but non-negotiable.** DST, half-hour zones, 45-minute zones, year-boundary crossings, the device clock being wrong. Silent correctness is the product.
3. **One glance, one answer.** The focused city answers the question. Everything else is context.
4. **Same app everywhere.** Not "mobile app plus marketing site." One product, three renderings.
5. **No account required, ever, for the core loop.** Local-first.
6. **Offline by default.** A clock that needs the network is not a clock. Zero network calls are required to display the correct time in any zone.

## 5. Scope

### v1.0 — MVP (the three mobile screens + the web view)

| # | Capability | Surfaces | Screen |
|---|---|---|---|
| F1 | Saved-city list with live times, day/night state, UTC offset | all | List |
| F2 | Focus a city → detail clock with seconds, date, sunrise/sunset/day-length | all | Clock |
| F3 | Add city — search over ~5 000 cities, offline, fuzzy, diacritic-insensitive | all | Search sheet |
| F4 | Reorder and delete saved cities | all | List |
| F5 | 12 h / 24 h global toggle, persisted | all | all |
| F6 | World map with draggable meridian + UTC ruler, terminator shading | all | Map |
| F7 | Light + dark theme, following system with manual override | all | all |
| F8 | Local persistence of cities, order, focus, preferences | all | — |
| F9 | Static per-city web routes (`/time/:slug`) with SEO metadata + JSON-LD | web | — |
| F10 | Full keyboard navigation and screen-reader support | all | all |

### v1.1 — fast-follow

- Home-screen widgets (iOS via `expo-widgets`, Android via a config-plugin glance widget)
- Meeting planner — drag the meridian, see every saved city's local time move together, shade working hours
- Share a moment: "14:00 my time" → a link that renders correctly in the recipient's zone
- Watch complication (iOS)

### v2 — considered, not committed

Accounts + sync · flight-time helper · calendar integration · Slack/Raycast surfaces · natural-language add ("my sister in Melbourne").

### Explicitly out of scope for v1

Alarms · timers · stopwatch · weather · currency · a second accent colour.

## 6. Success metrics

| Metric | Target at 90 days | Instrument |
|---|---|---|
| Time-to-first-glance (cold start → readable clock) | **< 900 ms** p75 | custom trace, `expo-insights` |
| Crash-free sessions | > 99.7 % | EAS/Sentry |
| D7 retention (installs with ≥ 2 cities) | > 35 % | analytics |
| Web LCP on `/time/:slug` | **< 1.2 s** p75 (repeat visits); cold visits measured at 1.8 s on fast 4G, 5.2 s on slow 4G — see `10` task 6.9 | CrUX / Lighthouse CI |
| Web → install conversion | > 4 % | attributed deep links |
| **Zero DST-boundary defects** | 0 | automated test matrix (`11-testing-strategy.md` §4) |

The last row is a release gate, not a metric. A DST bug ships as a hotfix within 24 h.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Cold start | < 900 ms to first correct render, p75, on an iPhone 12 / Pixel 6a |
| Tick accuracy | second boundary rendered within ±50 ms of the true boundary; re-synced on every `AppState` resume |
| Bundle | native JS < 2.5 MB; web initial route < 180 KB gzipped (excluding fonts) |
| Offline | 100 % of v1 features work with the radio off |
| Memory | < 120 MB resident with 40 cities on the list |
| Battery | no wake locks, no background tasks; ticking stops on `AppState !== 'active'` |
| Accessibility | WCAG 2.2 AA on all surfaces; full VoiceOver/TalkBack/keyboard parity |
| i18n | strings externalised from day one; RTL-correct layout; locale-aware date and number formatting |
| Privacy | no PII, no account, no third-party trackers in v1; analytics events carry no city names |

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `Intl` with `timeZone` unavailable or partial on some Android/Hermes builds | **Critical** — the whole app | Capability probe at boot + bundled `@date-fns/tz` fallback path; device matrix in `11-testing-strategy.md` §3 |
| `@expo/ui` universal components fight the custom brand | Medium — rework | Boundary is drawn up front: `@expo/ui` for *inputs and system affordances*, custom primitives for branded surfaces (`ADR-0003`) |
| Hero type at `clamp(96px, 22vw, 320px)` causing layout shift on web | Medium — CLS | `font-display: block` on the clock face + reserved aspect box; measured in Lighthouse CI |
| City dataset licensing (GeoNames CC-BY) | Low — legal | attribution in About; dataset build script records provenance |
| SVG world map cost on low-end Android | Medium — jank | 50 m topology (~210 KB), decoded once per process; rasterised fallback under a device-tier check (~~~30 KB~~, corrected 2026-09-25) |
| Solo-dev scope creep | High — schedule | v1 feature list above is frozen; `10-implementation-plan.md` is the contract |

## 9. Release plan

| Gate | Contents | Exit criteria |
|---|---|---|
| **G0 — Foundations** | repo, tokens, theming, fonts, CI | `/token-check` green; both themes render a sample screen |
| **G1 — Core loop** | List + Clock + Search + persistence | add, reorder, delete, focus a city on all three platforms |
| **G2 — Map** | map, meridian, ruler, terminator | 60 fps meridian drag on a Pixel 6a |
| **G3 — Polish** | motion, a11y sweep, empty/error states, dark theme audit | `/a11y-sweep` and `/ship-check` green |
| **G4 — Web** | static routes, SEO, OG images, PWA | LCP < 1.2 s; 100/100/100 Lighthouse a11y/SEO/best-practice |
| **G5 — Ship** | store metadata, screenshots, privacy manifests | TestFlight + internal track soak, 72 h, zero P0 |

Detailed task breakdown with acceptance criteria: `10-implementation-plan.md`.
