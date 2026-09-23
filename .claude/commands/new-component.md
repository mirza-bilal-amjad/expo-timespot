---
description: Scaffold a new TimeSpot component at the correct tier
argument-hint: <ComponentName> [brief description]
---

Create the **$1** component.

Load the `timespot-universal-component` and `timespot-ignite-conventions` skills first.

## 1. Decide, and tell me

- **Does Ignite already ship it?** Check `docs/14-ignite-integration.md` §5 — Ignite has `Screen`, `Text`, `Button`, `Icon`, `EmptyState`, `TextField`, `Switch`, `Card`, `ListItem` and more. Some are kept, some wrapped, some replaced.
- **Tier** — tier 1 (touches RN directly) · tier 2 (reusable, no domain knowledge) · tier 3 (domain-aware). This is a dependency rule, not a folder; Ignite keeps components flat.
- **`@expo/ui` or custom?** Check the table in `docs/adr/0003-expo-ui-boundary.md`. If `@expo/ui`, it goes in an adapter with `<Host>` mounted **inside** the adapter, never at the call site.
- Whether it is already specified in `docs/03-component-library.md` — if so, follow that spec rather than inventing one.

State these decisions before writing code.

## 2. Scaffold

```bash
npx ignite-cli generate component <Name>
```

Then rewrite the body. Add `<Name>.web.tsx` **only** if genuinely unavoidable, with a comment explaining why, and add it to the closed exception list in `docs/07-responsive-strategy.md` §3.

## 3. Requirements

- Styles are `$`-prefixed constants **below** the component; `ThemedStyle<T>` where they read the theme
- Every value comes off `theme` — no literals, no `className`
- `React.memo` with an explicit comparator if it renders in a list
- `accessibilityLabel` / `accessibilityRole`, or a comment saying why not
- Composite → **one** accessible node, not several
- Every digit through `<Numeral>`; every user-facing string through `tx`
- No `Platform.OS` in a tier-3 component
- Works in both themes

## 4. Story

Add `src/stories/<Name>.stories.tsx` rendering every state × both themes. This is what `/visual-qa` screenshots.

## 5. Test

RNTL + `jest-axe`. If it is list-rendered, include a **render-count** test.

## 6. Report

Files created, the three decisions from step 1, and anything you need from me. Then run `/token-check` on the new files.
