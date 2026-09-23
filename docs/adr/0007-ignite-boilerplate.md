# ADR-0007 — Build on Ignite with Expo Router

**Status:** accepted · 2026-09-23 · supersedes the structure section of `ADR-0001`

## Context

`ADR-0001` settled on one Expo codebase for all three platforms but assumed a bare `create-expo-app` scaffold. The developer is a solo builder who already works in **Ignite** daily — Infinite Red's boilerplate — and knows its conventions, generators and theming system.

The fastest codebase to build in is not the theoretically cleanest one; it is the one whose conventions you do not have to think about.

## Decision

**Build on Ignite, converted to Expo Router, upgraded to Expo SDK 57.**

## Rationale

Ignite already ships, correctly configured, most of what `05-architecture.md` specified independently:

- `react-native-mmkv` — synchronous storage, which `ADR-0005` specifically required so the city list paints on the first frame
- `i18next` + `tx` props + `isRTL` — string externalisation enforced at the component level, which is stronger than "we'll remember to do it"
- `date-fns` v4, `expo-localization` — the base of the time engine
- Reanimated 4 + Worklets, Gesture Handler, Safe Area, Edge-to-Edge, Keyboard Controller
- `ThemeProvider` / `useAppTheme` / `ThemedStyle` — a typed, light/dark theming system
- `Screen` — safe areas, keyboard avoidance and scroll presets, solved once
- Reactotron, ESLint/Prettier, Jest + RNTL, dependency-cruiser
- Component and model generators

Roughly 60 % of Phase 0 as originally written was re-implementing things Ignite already does. Adopting it removes that work and, more importantly, removes the chance of doing it slightly differently from how the developer expects.

The familiarity argument is not sentimental. A solo developer's throughput is dominated by how often they have to stop and look something up.

## Consequences

**Costs, stated honestly:**

1. **Expo Router is not built in.** Ignite defaults to React Navigation v7. The conversion is a documented Cookbook recipe with a working reference repo, and it mostly amounts to `app/ → src/`, a new `src/app/` route tree and an entry-point change. One session.
2. **Ignite targets SDK 55; TimeSpot needs 57.** `@expo/ui`'s universal (web-capable) components are production-ready from SDK 56. A two-SDK upgrade is the riskiest step in the plan. Mitigated by doing it on the untouched baseline before any product code exists, using the official `expo-upgrade` agent skill, and pinning `expo@>=57.0.17`. **Fallback:** stay on 55, ship native-only with the SwiftUI/Compose APIs, add web in a second pass — the design system and domain layer are unaffected.
3. **Ignite has no web configuration** — `web.output` needed setting explicitly (`docs/14-ignite-integration.md` §7). The `react-native-mmkv` risk originally listed here did not materialize: v3.3.3 ships its own web implementation, and Ignite's `ThemeProvider` (which calls it directly) works on web unmodified — **corrected 2026-09-24**, verified by testing persistence across a reload.
4. **Ignite's brand is not TimeSpot's.** Five theme files are replaced wholesale. Drop-in versions ship in `design/ignite-theme/`.
5. **Ignite's `Card` is a filled, elevated panel**; TimeSpot's is a hairline. Same name, different component — rebuilt rather than restyled.

**Benefits:** Phase 0 drops from ~2 days to ~1.5 even including the SDK upgrade, and every later phase is written in conventions the developer does not have to translate.

Full integration detail: `docs/14-ignite-integration.md`.
