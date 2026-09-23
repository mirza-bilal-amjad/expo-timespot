---
description: Find hardcoded visual values in src/ that should be theme tokens
---

Audit `src/` for design-token violations. Report findings grouped by severity; do not fix anything unless I ask.

This project uses **Ignite's `ThemedStyle`** system, not NativeWind (`docs/adr/0008`).

## Search for

**Blocking**
1. Hex colours — `#[0-9a-fA-F]{3,8}` anywhere in `src/**` **except** `src/theme/` (also allowed: `*.test.*`, comments quoting the audit doc)
2. `rgb(` / `rgba(` / `hsl(` literals outside `src/theme/`
3. Numeric `fontSize:` — should be a `<Text preset>` or `size`
4. Numeric `borderRadius:` — should be `theme.radius.*`
5. Numeric `padding` / `margin` / `gap` / `height` not read off `theme.spacing.*`
6. **`className=`** anywhere — NativeWind is not installed
7. Numeric `duration:` / `withTiming(x, { duration: N })` not from `theme.timing.*`
8. `<Text>` rendering a time or offset — every digit must go through `<Numeral>`
9. Literal user-facing strings passed as `text=` or as children where `tx=` should be used
10. A style constant that reads `theme` but is typed `ViewStyle` / `TextStyle` instead of `ThemedStyle<…>`

**Warning**
11. `Platform.OS` inside `src/screens/` or a feature component — push it down into a lower-level component, per the closed exception list in `docs/07-responsive-strategy.md` §3
12. `theme.colors.textFaint` used below 24 pt — fails WCAG AA (`docs/09-accessibility.md` §3)
13. `shadowOpacity` / `elevation` on anything that is not the tab bar, the FAB, the map card or an overlay — this design is flat; cards use a hairline
14. A hand-rolled `View` with `borderRadius` + `backgroundColor` that should be `<Card>`
15. A style constant not `$`-prefixed, or declared above the component instead of below
16. A colour key present in `colors.ts` but missing from `colorsDark.ts`, or vice versa — this fails at runtime, not at compile time

## Report as

```
BLOCKING (n)
  src/components/CityRow.tsx:42    "#EAEAEA"      → theme.colors.cardBackground
  src/screens/ClockScreen.tsx:88   fontSize: 20   → <Text preset="cityTitle">
  src/components/TabBar.tsx:15     className=     → ThemedStyle object

WARNING (n)
  src/screens/MapScreen.tsx:31     Platform.OS    → push down into a component
```

Give the exact replacement token for each finding. If there are zero blocking findings, say so plainly and stop.

Reference: `docs/02-design-system.md`, `docs/14-ignite-integration.md` §3, `design/ignite-theme/`.
