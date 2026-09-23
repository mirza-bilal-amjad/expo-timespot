# ADR-0005 — Zustand + MMKV, local-first, no accounts in v1

**Status:** accepted · 2026-09-23

## Context

State is small: a list of saved cities, an order, a focused id, four preferences. It is read during the **first render** (the list must paint immediately) and written rarely. The web board shows a `Log In` affordance, implying eventual sync.

## Decision

**Zustand 5 with `persist`, behind a `StorageAdapter` (MMKV on native, `localStorage` on web, in-memory in tests). No accounts, no server, no network in v1.**

## Rationale

- ~1 KB, no provider, no context re-render cascade. The clock ticks every second; a context-based store would re-render the tree 60 times a minute for data that did not change.
- Selector subscriptions mean `CityRow` re-renders only when *its* city changes.
- **MMKV is synchronous.** AsyncStorage is not, which means a flash of an empty list on every cold start — unacceptable against a 900 ms time-to-readable-clock budget.
- Three separate persisted slices (`cities`, `prefs`, `focus`) so a corrupt preferences blob cannot cost the user their city list, and each migrates independently.
- No accounts means no auth screens, no password reset, no GDPR data-subject flow, no server bill, and a privacy manifest that honestly reads "no data collected". For a v1 utility that is a feature, not a limitation.

## Consequences

- No cross-device sync. Acceptable for v1; the data is four cities and takes ten seconds to re-enter.
- When sync arrives, the adapter is the seam: swap the persist backend, keep the store shape. Design the schema now so it will merge later — hence `addedAt` and an explicit `order` rather than relying on array position.
- `Log In` from the web board is **deferred**, not built and hidden. A dead button is worse than no button.
- Every store declares a `version` and a `migrate` from the first commit, including in development. Bumping a schema without a migration is how people lose their data.
