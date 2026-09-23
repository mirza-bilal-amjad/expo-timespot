---
name: timespot-ignite-conventions
description: Follow Ignite boilerplate conventions in TimeSpot — ThemedStyle and the $ prefix, useAppTheme, the theme files, Ignite's built-in components, ignite-cli generators, i18n tx props, and the Expo Router conversion. Use when writing any component or screen, touching the theme, or adding a dependency.
---

# Ignite conventions

TimeSpot is built on Ignite with Expo Router. Full integration detail: `docs/14-ignite-integration.md`.

## Styling — the `ThemedStyle` pattern

```tsx
import { View, ViewStyle } from "react-native"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function CityRow(props: CityRowProps) {
  const { themed } = useAppTheme()
  return <View style={[themed($row), props.selected && themed($rowSelected)]} />
}

// styles go BELOW the component, $-prefixed
const $row: ThemedStyle<ViewStyle> = (theme) => ({
  height: theme.spacing.rowHeight,
  paddingHorizontal: theme.spacing.md,
  borderRadius: theme.radius.md,
  backgroundColor: theme.colors.cardBackground,
})

const $static: ViewStyle = { flexDirection: "row" }   // no theme → plain object
```

Rules:
- `ThemedStyle<T>` when the style reads the theme; a plain `ViewStyle`/`TextStyle` when it does not.
- `themed($x)` at the call site. Arrays compose, and React Native merges them properly.
- Styles are declared **after** the component, not inside it.
- **No hex, no raw font size, no magic number.** Every value comes off `theme`.
- **NativeWind is not installed** (`adr/0008`). No `className`, ever.

## The theme object

```ts
theme.colors.*    // text textDim textFaint background cardBackground inverseBackground
                  // controlBackground textOnInverse textAccent strokeRaised strokeSunken
                  // day night meridian mapLand focusRing scrim border separator error
theme.spacing.*   // xxxs xxs xs sm md lg xl xxl xxxl
                  // + gutter rowGap sectionGap rowHeight cardWidth cardHeight container avatar
theme.radius.*    // xs sm md lg xl pill
theme.timing.*    // quick instant fast base slow deliberate + ease.* + spring.*
theme.typography  // primary secondary code
theme.isDark
```

Token-name bridge from the design docs → Ignite spellings: `docs/14-ignite-integration.md` §3.5.

### Two rules that will bite if broken

1. **Never delete an Ignite semantic colour key.** `text`, `textDim`, `background`, `border`, `tint`, `tintInactive`, `separator`, `error`, `errorBackground` are read by Ignite's own `Screen`, `Text`, `Card`, `TextField`, `Button`. Add keys; never remove one.
2. **Never change Ignite's nine spacing values** (`xxxs` 2 … `xxxl` 64). Its components depend on them. TimeSpot's layout constants are added alongside as semantic names.

Same principle for `typography.primary`: it must keep `light` and `bold` keys even as aliases, because Ignite's presets reference them and a missing key silently falls back to the system font.

## Text and i18n

```tsx
<Text preset="cityTitle" tx="list:tokyo" />        // ✅ i18n from the first commit
<Text preset="offset" text={time.offsetLabel} />   // ✅ dynamic, not translatable
<Text style={{ fontSize: 20 }}>Tokyo</Text>        // ❌ both counts
```

Presets: Ignite's `default bold heading subheading formLabel formHelper`, plus TimeSpot's `screenTitle cityName cityTitle offset caption`. Sizes go up to `hero` (144). Extension detail: `14` §4.1.

**Every digit goes through `<Numeral>`, never `<Text>`.**

## Screens

Always wrap in Ignite's `Screen` — it solves safe areas, keyboard avoidance and scroll presets:

```tsx
<Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screen)}>
```

`preset="fixed"` for Clock and Map, `"scroll"` for List, `"auto"` when unsure. Route files in `src/app/` are thin shells that re-export from `src/screens/`.

Scroll containers need bottom padding for the floating tab bar: `contentContainerStyle={{ paddingBottom: tabBarHeight + theme.spacing.md }}`.

## Components — keep, wrap, replace

| Keep | Wrap `@expo/ui` | Replace |
|---|---|---|
| `Screen`, `Text`, `Button`, `EmptyState`, `Icon` | `TextField`, `Switch`, `Checkbox`, `Radio`, sheets, pickers | `Card` (TimeSpot's is a **hairline**, not an elevated panel), `AutoImage` → `expo-image` |

`ListItem` and `Header` are unused on mobile. Scaffold new components with `npx ignite-cli generate component <Name>`, then rewrite the body.

## `@expo/ui` adapters

```tsx
// src/components/Sheet.tsx — the ONLY file importing @expo/ui for sheets
import { Host, BottomSheet } from "@expo/ui"

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const { themed } = useAppTheme()
  return (
    <Host style={themed($host)}>       {/* Host lives HERE, once */}
      <BottomSheet isOpened={open} onIsOpenedChange={onOpenChange}>{children}</BottomSheet>
    </Host>
  )
}
```

1. One `<Host>` per adapter, inside the adapter. Never nested, never in a screen.
2. Feature code imports `@/components/Sheet`, never `@expo/ui`.
3. `@expo/ui` components do not read Ignite's theme — the adapter reads `useAppTheme()` and passes explicit values down. This is the one place two styling models meet, and it is contained on purpose.
4. Never put `@expo/ui` content inside `Screen`'s scroll view — a SwiftUI host inside an RN `ScrollView` fights for gestures on iOS.

## Before adding a dependency

Check `docs/14-ignite-integration.md` §1 — Ignite already ships MMKV, i18next, date-fns, expo-localization, Reanimated, Gesture Handler, Safe Area, Edge-to-Edge, Keyboard Controller and Reactotron. Then `npx expo install`, never `npm i`, for anything with a native side.

## Web

Ignite was not built with web in mind. Before touching the web target:

- `storage.web.ts` — MMKV has no web build and `ThemeProvider` calls it directly
- guard `react-native-keyboard-controller`'s provider with `Platform.OS !== 'web'`
- confirm Reactotron is tree-shaken from the production web bundle
- `useSafeAreaInsetsStyle` returns zeros on web — use CSS `env(safe-area-inset-*)` for installed PWAs

## Checklist

- [ ] Styles are `$`-prefixed, below the component, `ThemedStyle` where themed
- [ ] Every value comes off `theme` — no literals
- [ ] Strings via `tx`
- [ ] Digits via `<Numeral>`
- [ ] Screen wrapped in Ignite's `Screen` with the right preset
- [ ] `@expo/ui` only through an adapter, `<Host>` inside it
- [ ] Both themes checked (dark is not in the mockups — it is never "obviously fine")
- [ ] No Ignite semantic key deleted, no Ignite spacing value changed
