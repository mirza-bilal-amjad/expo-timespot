---
name: timespot-screen-builder
description: Implement a TimeSpot screen from its specification — List, Clock, Map, Search, City detail, Settings or a public web city page. Use when building or modifying any screen, wiring a route, or adapting a screen across breakpoints.
---

# Building a screen

Specs: `docs/04-screen-specs.md`. Responsive rules: `docs/07-responsive-strategy.md`.
Ignite conventions: `docs/14-ignite-integration.md` — load `timespot-ignite-conventions` alongside this skill.

## Order of work

1. **Read the screen's section in `04-screen-specs.md` in full**, including the states table at the end. Half the work is the states, not the happy path.
2. Check `docs/01-design-audit.md` for anything the mockup got wrong on this screen.
3. List the components you need. Build any that are missing **first**, bottom-up, using `timespot-universal-component`.
4. Build the screen body in `src/screens/`, not in `app/`.
5. Wire the route in `app/` as a thin shell.
6. Implement every state: default, empty, loading, error, overflow.
7. Responsive: verify at 393, 768 and 1440.
8. Accessibility pass.

## Route shells stay thin

```tsx
// src/app/(tabs)/index.tsx  — this is the whole file
import { ListScreen } from "@/screens/ListScreen"
export default ListScreen
```

Anything more than an export plus route options belongs in `src/screens/`. This keeps routing swappable and makes screens testable without a router.

## Always wrap in Ignite's `<Screen>`

It solves safe areas, keyboard avoidance and scroll behaviour once. `preset="fixed"` for Clock and Map, `"scroll"` for List, `"auto"` when unsure.

## The one-clock pattern

Every screen that shows time follows this shape. Getting it wrong costs 60× the renders.

```tsx
export function ListScreen() {
  const { themed, theme } = useAppTheme()
  const now     = useClock()                    // ← the ONLY subscription
  const cities  = useCities()
  const prefs   = usePrefs()
  const focused = useFocusedId()

  const rows = useMemo(
    () => cities.map(c => ({ city: c, time: getZonedTime(now, c.zone, prefs) })),
    [cities, now, prefs]
  )

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screen)}>
      <FlashList
        data={rows}
        estimatedItemSize={theme.spacing.rowHeight + theme.spacing.rowGap}
        renderItem={({ item }) => (
          <CityRow {...item} selected={item.city.cityId === focused} onPress={…} />
        )}
        contentContainerStyle={{ paddingBottom: tabBarHeight + theme.spacing.md }}
      />
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  paddingHorizontal: theme.spacing.gutter,
})
```

Four things to notice: Ignite's `Screen`, one `useClock()`, times computed in the screen and passed down, and `paddingBottom` for the floating tab bar — the tab bar floats over content on every screen, so every scroll container needs it.

## Responsive

Adapt by **breakpoint**, never by platform:

```tsx
const bp = useBreakpoint()
const layout = bp >= 'md' ? 'grid' : 'list'
```

What changes where is tabulated in `docs/07-responsive-strategy.md` §2. The only structural change is tab bar → header nav at `lg`, and it is implemented once in `app/(tabs)/_layout.tsx` — screens do not know which is mounted.

## States you must implement

| State | Where specified |
|---|---|
| empty (zero cities) | `04` S1 → icon, headline, body, primary CTA |
| single city | avatar strip hides |
| overflow (40 cities) | FlashList + `+N` avatar tile |
| long name ("Ho Chi Minh City") | one line, tail ellipsis, fixed time column |
| loading (dataset fetch on web) | skeleton rows, never a spinner over the whole screen |
| error (dataset failed) | message + retry, and the already-saved cities still work |
| degraded `Intl` | app works via the fallback; a single quiet notice in Settings |
| offline | indistinguishable from online — nothing in v1 needs the network |

A screen without its empty and error states is not done.

## Accessibility per screen

- One heading per screen (`accessibilityRole="header"`), matching the visible title.
- Focus order matches visual order.
- The floating tab bar must never obscure a focused element → `scroll-padding-bottom` on web, `contentInset` on native (WCAG 2.2 — 2.4.11).
- Live regions only for genuine status changes (undo toast). **Never** for the clock.
- On the Map screen: the screen must be fully usable with the map hidden. The SVG is `aria-hidden`; the ruler is an `adjustable` slider and the card carries the information.

## Before you call it done

- [ ] Geometry within 2 pt of the spec at the reference size
- [ ] Every state in the table above implemented
- [ ] 393 / 768 / 1440 all correct
- [ ] Both themes
- [ ] Wrapped in Ignite's `<Screen>` with the right preset
- [ ] One `useClock()` in the screen; rows memo'd; render count tested
- [ ] Scroll container clears the tab bar
- [ ] Strings via `tx`
- [ ] Heading, focus order, labels
- [ ] 200 % text scale does not break the layout
- [ ] Story or E2E flow added
