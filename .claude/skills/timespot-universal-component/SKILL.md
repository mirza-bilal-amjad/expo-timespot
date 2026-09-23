---
name: timespot-universal-component
description: Build a TimeSpot component that works identically on iOS, Android and web. Use when creating a new component, deciding whether to reach for @expo/ui or build custom, adding a platform-specific file, or reviewing a component for cross-platform correctness.
---

# Building a universal component

Reference: `docs/03-component-library.md`, `docs/14-ignite-integration.md` §5, `docs/adr/0003-expo-ui-boundary.md`.
Load `timespot-ignite-conventions` alongside this skill.

## First decision: does it already exist?

Check `docs/14-ignite-integration.md` §5 before building anything. Ignite ships `Screen`, `Text`, `Button`, `Icon`, `EmptyState`, `TextField`, `Switch`, `Checkbox`, `Radio`, `Card`, `ListItem`, `Header`, `AutoImage` — some are kept, some wrapped, some replaced.

## Second decision: which tier?

Ignite keeps components **flat** in `src/components/`, so tiering is a **dependency rule**, not a directory layout:

```
tier 3  domain-aware        CityRow, HeroClock, MeridianMap, SearchSheet
tier 2  reusable            Card, Button, SegmentedPill, Sheet, Avatar
tier 1  touches RN directly Text, Numeral, Icon
```

A component may only import from tiers **below** it. Tier-3 components never import each other.

If it needs to know what a "city" is → tier 3. If it could ship in someone else's app → tier 2.

## Third decision: `@expo/ui` or custom?

**Rule of thumb: if the user would be annoyed by it not matching their OS → `@expo/ui`. If they'd be annoyed by it not matching the brand → build it.**

| `@expo/ui` | Custom |
|---|---|
| BottomSheet, TextInput, Picker, Switch, List/FieldGroup, ContextMenu | Card, CityRow, CityCard, Numeral, HeroClock, SegmentedPill, TabBar, MeridianMap, AvatarStrip |

Using `@expo/ui` means:

```tsx
// src/components/Sheet.tsx  ← the adapter. The ONLY file importing @expo/ui for sheets.
import { Host, BottomSheet } from "@expo/ui"
import { useAppTheme } from "@/theme/context"

export function Sheet({ open, onOpenChange, children, ...rest }: SheetProps) {
  const { themed } = useAppTheme()
  return (
    <Host style={themed($host)}>              {/* Host lives HERE, once */}
      <BottomSheet isOpened={open} onIsOpenedChange={onOpenChange} {...rest}>
        {children}
      </BottomSheet>
    </Host>
  )
}

const $host: ThemedStyle<ViewStyle> = () => ({ position: "absolute" })
```

Four rules: one `<Host>` per adapter, mounted inside it (never nested, never in a screen); feature code imports `@/components/Sheet`, never `@expo/ui`; the adapter is the theme bridge — `@expo/ui` components take their own style props, so read `useAppTheme()` there and pass explicit values down; never put `@expo/ui` content inside Ignite `Screen`'s scroll view, because a SwiftUI host inside an RN `ScrollView` fights for gestures on iOS.

Adding an `@expo/ui` component outside the table above means updating ADR-0003.

## Scaffold

```bash
npx ignite-cli generate component CityRow
```

Then rewrite the body. Add `<Name>.web.tsx` **only** if genuinely unavoidable, with a comment saying why, and add it to the closed exception list in `docs/07-responsive-strategy.md` §3.

```tsx
import { memo } from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { Text } from "@/components/Text"
import { Numeral } from "@/components/Numeral"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface CityRowProps {
  city: SavedCity
  time: ZonedTime          // ← derived value passed IN, never subscribed to
  selected: boolean
  onPress: () => void
}

export const CityRow = memo(function CityRow({ city, time, selected, onPress }: CityRowProps) {
  const { themed } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${city.name}, ${time.a11yLabel}, ${time.isDay ? "daytime" : "night-time"}`}
      accessibilityHint="Double tap to focus this city"
    >
      <View style={[themed($row), selected && themed($rowSelected)]}>
        <Text preset="offset" text={time.offsetLabel} />
        <Text preset="cityTitle" text={city.name} numberOfLines={1} />
        <Numeral value={time.display} size="numeralLg" />
      </View>
    </Pressable>
  )
}, (a, b) =>
  a.time.display === b.time.display &&
  a.selected === b.selected &&
  a.city.cityId === b.city.cityId
)

// styles below the component, $-prefixed
const $row: ThemedStyle<ViewStyle> = (theme) => ({
  height: theme.spacing.rowHeight,
  paddingHorizontal: theme.spacing.md,
  borderRadius: theme.radius.md,
  backgroundColor: theme.colors.cardBackground,
})

const $rowSelected: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.inverseBackground,
})
```

## The rules

1. **Props in, nothing else.** No component below a screen reads global state. A leaf that calls `useClock()` is a bug — it makes the list re-render N times a second instead of once.
2. **Memo with an explicit comparator** on anything rendered in a list.
3. **Everything off `theme`.** `theme.spacing.md`, not `16`. Load `timespot-design-system` if unsure.
4. **Every digit through `<Numeral>`.** Never `<Text>{time}</Text>` — the layout twitches every second.
5. **Strings via `tx`.** Ignite's i18n is already wired; use it from the first commit.
6. **One accessible node** for a composite. A row is one button, not four labels.
7. **No `Platform.OS` in a tier-3 component or a screen.** Push it down and add it to the closed exception list in `docs/07-responsive-strategy.md` §3.
8. **Both themes.** Check dark explicitly — the mockups have no dark mode, so it is never "obviously fine".
9. **A story** in `src/stories/` rendering every state × both themes. This is what `/visual-qa` screenshots.

## Cross-platform traps

| Trap | Fix |
|---|---|
| Text sits low on Android at display sizes | `includeFontPadding: false` in Ignite `Text`'s `$baseStyle` |
| MMKV has no web build | use the `storage.web.ts` adapter — never import `react-native-mmkv` in a component |
| Ignite's `Card` is an elevated panel | TimeSpot's is a hairline — use `@/components/Card`, not Ignite's original |
| `shadowOpacity` on a transparent view | Android renders the shadow *through* it — give the view a background or use `elevation` |
| `gap` support differs across versions | set it in the `ThemedStyle` object, and verify on Android |
| `borderCurve: 'continuous'` is iOS-only | fine to set; it is ignored elsewhere, and squircles fall back to rounded rects |
| Hover styles stick on touch devices | wrap in `@media (hover: hover)` |
| `onLayout` fires at different times | never derive critical layout from it — measure from tokens |
| `Dimensions.get()` at module scope | use `useWindowDimensions()`; the former never updates |

## Done when

- [ ] Renders on iOS, Android and web
- [ ] Renders in light and dark
- [ ] No token violations (`/token-check`)
- [ ] Styles `$`-prefixed, below the component, `ThemedStyle` where themed
- [ ] Strings via `tx`
- [ ] Memo'd if it appears in a list, with a tested render count
- [ ] `accessibilityLabel` present, or a comment explaining why not
- [ ] Story covers every state
- [ ] `jest-axe` clean in both themes
