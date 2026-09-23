# TimeSpot — agent instructions

This project's full instructions live in **`CLAUDE.md`** at the repo root. Read it first.

Built on **Ignite + Expo Router + `@expo/ui`** — read `docs/14-ignite-integration.md` before writing any code.
Specification: `docs/` (start with `00-product-brief.md`, then `14-ignite-integration.md` §10 for Phase 0).
Design tokens: `design/tokens.json` (canonical record) → `design/ignite-theme/*` (what the app consumes).

The six rules, in brief:

1. **Time is derived, never stored.** The only persisted time fact is an IANA zone ID (`'Asia/Tokyo'`). Any numeric offset in `src/` is a bug.
2. **Everything comes off `theme`.** Ignite's `ThemedStyle` with `$`-prefixed style constants below the component. No hex, no raw font size, no magic number — and no `className`, because NativeWind is not installed.
3. **One clock.** `useClock()` owns the only interval; components receive derived times as props and are memo'd.
4. **Every digit through `<Numeral>`** — measured width plus tabular figures.
5. **`src/domain/` is pure TypeScript** — no React, no React Native, no Ignite.
6. **Strings via `tx`.** Ignite's i18n is already wired; use it from the first commit.

Two Ignite rules that fail at runtime rather than compile time if broken: never delete one of Ignite's semantic colour keys (`text`, `textDim`, `background`, `border`, `tint`, `tintInactive`, `separator`, `error`, `errorBackground`), and never change Ignite's nine spacing values. Add alongside; don't remove.

Before implementing anything that resembles the source mockups, read `docs/01-design-audit.md` §8: they contain four time-correctness defects and two WCAG failures that must not be reproduced.
