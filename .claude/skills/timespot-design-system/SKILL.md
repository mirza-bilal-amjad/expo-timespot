---
name: timespot-design-system
description: Apply TimeSpot's design tokens when writing or reviewing any UI code — colours, type, spacing, radius, elevation. Use whenever styling a component or screen, converting a mockup to code, adding a new token, or checking that code contains no hardcoded visual values.
---

# TimeSpot design system

Canonical record: `design/tokens.json`. **Compiled into Ignite's theme files** — `design/ignite-theme/*` → `src/theme/*`.
Rationale and measurement provenance: `docs/02-design-system.md`, `docs/01-design-audit.md`.
Ignite token spellings: `docs/14-ignite-integration.md` §3.

## The rule

**No literal visual value in `src/`.** No hex, no font size, no spacing number, no radius, no duration.

```tsx
// ❌ rejected in review and by /token-check
const $row: ViewStyle = { padding: 13, backgroundColor: "#EAEAEA", borderRadius: 16 }
<Text style={{ fontSize: 20, color: "#5C5C5C" }}>
<View className="bg-card p-4">              // NativeWind is not installed — adr/0008

// ✅
const $row: ThemedStyle<ViewStyle> = (theme) => ({
  padding: theme.spacing.md,
  backgroundColor: theme.colors.cardBackground,
  borderRadius: theme.radius.md,
})
const { themed } = useAppTheme()
<View style={themed($row)} />
<Text preset="cityTitle" tx="list:tokyo" />
```

`$`-prefixed style constants, declared **below** the component. `ThemedStyle<T>` when it reads the theme; a plain `ViewStyle` when it does not.

## Token quick reference (Ignite spellings)

**`theme.colors`** — `text` `textDim` `textFaint` `textOnInverse` `textOnInverseDim` `textAccent` · `background` `cardBackground` `inverseBackground` `controlBackground` `scrim` `frame` · `strokeRaised` `strokeSunken` `focusRing` `border` `separator` · `day` `night` `meridian` · `mapLand` `mapLandActive` `mapNight` · `error` `errorBackground` `tint` `tintInactive`

**`Text` presets** — Ignite's `default bold heading subheading formLabel formHelper` + TimeSpot's `screenTitle cityName cityTitle offset caption`
**`Text` sizes** — `xxs xs sm md lg xl xxl` + `display displayXl hero numeralMd numeralLg`

**`theme.spacing`** — `xxxs 2 · xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48 · xxxl 64`
plus `gutter 28 · gutterWide 64 · rowGap 12 · sectionGap 32 · rowHeight 92 · cardWidth 320 · cardHeight 180 · container 1312 · avatar 44`

**`theme.radius`** — `xs 6 · sm 10 · md 16 · lg 24 · xl 32 · pill 999`

**`theme.timing`** — `quick 300 · instant 0 · fast 140 · base 220 · slow 320 · deliberate 480` + `ease.*` + `spring.*`

## Two Ignite rules you must not break

1. **Never delete an Ignite semantic colour key** — `text`, `textDim`, `background`, `border`, `tint`, `tintInactive`, `separator`, `error`, `errorBackground`. Ignite's own `Screen`, `Text`, `Card`, `TextField` and `Button` read them by name.
2. **Never change Ignite's nine spacing values.** Add semantic layout tokens alongside instead.

## Four things people get wrong

### 1. Cards are a stroke, not a fill

The measured card interior and the page canvas differ by **one level out of 255**. What makes a card visible is a 1-px near-white highlight on top/left and a 1-px shade on bottom/right.

```tsx
// ❌ this is a different design — and it is what Ignite's own Card does
<View style={{ backgroundColor: "#FFF", shadowOpacity: 0.1 }}>

// ✅ TimeSpot's Card — a hairline
const $card: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.cardBackground,
  borderRadius: theme.radius.md,
  borderWidth: 1,
  borderTopColor: theme.colors.strokeRaised,
  borderLeftColor: theme.colors.strokeRaised,
  borderBottomColor: theme.colors.strokeSunken,
  borderRightColor: theme.colors.strokeSunken,
})
```

Shadows are only for things that genuinely float: the tab bar, the FAB, the map's floating card.

### 2. `textFaint` is size-restricted

`#7A7A7A` on `#E8E8E8` is **3.50 : 1** — it fails WCAG AA below 24 pt. It exists only for large decorative text (odometer ghosts, oversized ruler labels).

**For any text under 24 pt use `theme.colors.textDim` (`#5C5C5C`, 5.46 : 1).**

The mockups use the failing grey everywhere. That is a defect, recorded in `docs/01-design-audit.md` §8.5.

### 3. Orange is not a text colour

`theme.colors.frame` (`#D44F24`) is 4.25 : 1 on white — surfaces only. For orange text use `theme.colors.textAccent` (`#A93B18`).

### 4. Selection inverts through a context, not prop drilling

`<Card selected>` provides an inverted colour context, so descendants resolve to the inverse ink automatically.

```tsx
// ❌ every leaf has to know about selection
<Text style={{ color: selected ? theme.colors.textOnInverse : theme.colors.text }} />

// ✅
<Card selected={isSelected}>
  <Text preset="cityTitle" />   {/* resolves correctly in both states */}
```

## Adding a token

1. Add it to `design/tokens.json` (the canonical record) **and** to the matching `design/ignite-theme/*.ts` file.
2. If it is a text/background pair, add it to `_contractedPairs` in `tokens.json` with its measured ratio.
3. Copy the changed theme file into `src/theme/`.
4. Run `pnpm tokens:contrast`.
5. Document it in `docs/02-design-system.md` in the same commit.
6. If it is a colour, **add it to both `colors.ts` and `colorsDark.ts`** — the keys must stay identical or the dark theme breaks at runtime, not at compile time.

Adding a token is a design decision. If the value exists only to solve one component's problem, the component is probably wrong.

## Checklist before saying a UI task is done

- [ ] No hex, no `fontSize`, no numeric `padding`/`margin`/`borderRadius` in the diff
- [ ] No `className` anywhere — NativeWind is not installed
- [ ] Styles are `$`-prefixed, below the component, `ThemedStyle` where they read the theme
- [ ] Renders correctly in **both** themes (check dark explicitly — it is not in the mockups)
- [ ] Any text under 24 pt uses `textDim`, never `textFaint`
- [ ] Cards use TimeSpot's `<Card>` (hairline), not Ignite's (elevated panel)
- [ ] Text uses a `preset` or `size`, never a raw `fontSize`
- [ ] Any new colour key exists in **both** `colors.ts` and `colorsDark.ts`
