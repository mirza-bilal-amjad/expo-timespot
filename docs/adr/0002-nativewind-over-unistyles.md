# ADR-0002 — NativeWind 4.2.7 as the styling layer

**Status:** ⛔ **SUPERSEDED by [ADR-0008](0008-ignite-theming-over-nativewind.md)** · 2026-09-23

> This decision was made for a bare `create-expo-app` scaffold. The project now builds on
> Ignite ([ADR-0007](0007-ignite-boilerplate.md)), which ships its own typed `ThemedStyle`
> theming system that every Ignite component already uses. **NativeWind is not installed.**
> The reasoning below is kept because the trade-off analysis is still the right one to
> revisit if the project ever moves off Ignite.

---

**Original status:** accepted · 2026-09-23 · revisit at SDK 58

## Context

The design is token-dense: one grey, one black, a strict 4-pt grid, a fixed type scale, and two themes. Whatever styling layer is chosen must make it *hard* to write a value that is not in `design/tokens.json`, and must produce identical output on native and web.

Candidates:

| | Pros | Cons |
|---|---|---|
| **NativeWind 4.2.7** (Tailwind 3.4) | explicit Expo SDK 57 support confirmed; huge ecosystem; `dark:` variants; web output is real CSS | Tailwind 3 config (not v4's CSS-first); class strings are stringly-typed |
| **NativeWind 5** (Tailwind 4, `react-native-css`) | CSS-first `@theme`, closer web/native parity | release candidate at time of writing |
| **react-native-unistyles 3** | excellent theming, variants, no re-render on theme change, strong TS types | needs its own Babel plugin; SDK 57 compatibility not verified here |
| **StyleSheet + a tokens object** | zero deps, fully typed | no `dark:` ergonomics, verbose, theme switching re-renders |

## Decision

**NativeWind 4.2.7 + Tailwind 3.4**, with the Tailwind theme **generated from `design/tokens.json`**, and token-typed props on tier-1 primitives.

## Rationale

- SDK 57 support is documented and explicit for 4.2.7. For a solo developer, "known to work with my exact SDK" beats "newer" every time.
- The `tokens.json → tailwind.config.js` generator makes the design system the source of truth, so `bg-canvas` and `text-ink-secondary` are the *only* spellings available — there is no `bg-[#7A7A7A]` escape hatch once `/token-check` bans arbitrary values.
- The stringly-typed weakness is neutralised where it matters: `Box`, `Text` and `Numeral` take **token unions**, not class strings, so the type system catches a bad value before the linter does.
- NativeWind v5 is the right destination but not while it is an RC and the project is starting.

## Consequences

- `tailwind.config.js` is generated; editing it by hand is a lint error.
- `/token-check` bans arbitrary-value classes (`bg-[…]`, `text-[…]`, `p-[…]`) in `src/`.
- A v5 migration is a known future task: Tailwind v4 `@theme` blocks, PostCSS config, Babel changes. The generator means the token source itself will not need rewriting.
- **Revisit at SDK 58**, or sooner if NativeWind 5 reaches stable.
