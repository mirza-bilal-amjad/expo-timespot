---
description: Implement a TimeSpot screen from its specification
argument-hint: <screen name — list | clock | map | search | city-detail | settings | web-city>
---

Implement the **$1** screen.

Load the `timespot-screen-builder` and `timespot-ignite-conventions` skills, then work in this order. Do not skip step 1.

## 1. Read the spec

- The screen's full section in `docs/04-screen-specs.md`, **including its states table**
- `docs/01-design-audit.md` for anything the mockup got wrong on this screen
- `docs/07-responsive-strategy.md` §2 for what changes at each breakpoint

Tell me in two or three sentences what you understood the screen to be, and flag anything ambiguous, **before** writing code.

## 2. Inventory components

List the components the screen needs and mark each *exists* / *missing*. Build the missing ones first, bottom-up, using `timespot-universal-component`. Do not inline a component into the screen because it is "only used here".

## 3. Build

- Screen body in `src/screens/`; the file in `src/app/` is a thin re-export
- Wrap in Ignite's `<Screen>` with the right preset (`fixed` for Clock and Map, `scroll` for List)
- **One `useClock()`** in the screen; derived times passed down as props; rows memo'd
- Everything off `theme` — no literals; strings via `tx`
- Scroll containers clear the floating tab bar

## 4. States

Implement every one: default, empty, loading, error, overflow, long-name. A screen without its empty and error states is not done.

## 5. Responsive

Verify at 393, 768 and 1440. Adapt by breakpoint, never by platform.

## 6. Accessibility

One heading, logical focus order, labels on every interactive element, nothing obscured by the tab bar, 200 % text scale intact.

## 7. Report

- Files created or changed
- Geometry deviations from the spec, with the reason
- Any spec ambiguity you resolved and how
- What is **not** done yet

Then run `/token-check` and report the result.
