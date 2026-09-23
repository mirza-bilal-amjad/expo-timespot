# ADR-0008 — Ignite's `ThemedStyle` as the styling layer

**Status:** accepted · 2026-09-23 · **supersedes ADR-0002**

## Context

`ADR-0002` chose NativeWind 4.2.7, with a generator turning `design/tokens.json` into a Tailwind theme. That decision was made for a bare Expo scaffold with no styling opinion of its own.

Ignite arrives with one: `ThemeProvider`, `useAppTheme()`, `themed()`, and a typed `ThemedStyle<T>` that resolves against a light or dark `Theme` object. It is used by every component Ignite ships.

Running both means two styling systems in one codebase — Ignite's components styled by `ThemedStyle`, TimeSpot's by class strings — with two sources of truth for colour and two places a dark-theme bug can hide.

## Decision

**Use Ignite's `ThemedStyle` system. Do not install NativeWind.**
`design/tokens.json` remains the source of truth and is now compiled into Ignite's five theme files (shipped ready-made in `design/ignite-theme/`).

## Rationale

- **One system beats a better system plus a worse coexistence.** Every Ignite component already reads `theme.colors.*`. Adding NativeWind means either rewriting them or living with the split.
- **`ThemedStyle` is genuinely well-suited here.** It is typed — `theme.colors.cardBackground` autocompletes and a typo fails the build, which is strictly stronger than `className="bg-card"`, where a typo is a silent no-op. That was NativeWind's main weakness in `ADR-0002` and it was already being papered over with token-union props.
- **Theme switching is free.** `useAppTheme()` re-resolves style functions; there is no class-generation step and no `dark:` variant to forget.
- **It is the developer's daily convention.** `ADR-0007` exists for this reason and the styling layer is where it is felt most.
- **One fewer build-time dependency.** No Tailwind config generation, no PostCSS, no NativeWind/Metro/Babel interaction to debug during an SDK upgrade — which matters given `ADR-0007` already carries a two-SDK jump.

## What is lost

- Utility-class terseness. `$row` style objects are more verbose than `className="h-[92px] px-4 rounded-2xl"`. Accepted: this app has perhaps 25 components, and verbosity that the type system checks is cheaper than terseness it does not.
- Tailwind's responsive variants. TimeSpot uses an explicit `useBreakpoint()` hook instead (`07-responsive-strategy.md` §1), which works identically on native and web — Tailwind's width-based breakpoints never mapped cleanly to React Native anyway.
- Arbitrary-value escape hatches. Not a loss.

## Consequences

- `/token-check` changes target: it now looks for hex literals, raw font sizes and magic numbers inside `$`-prefixed style objects, instead of arbitrary-value Tailwind classes.
- `02-design-system.md`'s token names map onto Ignite's spellings via the table in `14-ignite-integration.md` §3.5. **The token values themselves do not change** — the design system is independent of how it is expressed.
- `design/tokens.ts` and `tokens.css` are no longer generated for the app; `tokens.json` compiles to `design/ignite-theme/*` instead. `tokens.json` stays as the canonical, tool-readable record.
- If web-only styling ever needs real CSS (the public `/time/[slug]` pages), emit it from `tokens.json` at build time rather than reaching for a runtime styling library.
