# 03 — Component Library

Every component in `src/components/`. Each entry: purpose, props, anatomy, states, accessibility, platform notes.

> ⚠️ **Read [`14-ignite-integration.md`](14-ignite-integration.md) §5 first.** The project builds on
> Ignite, which already ships `Screen`, `Text`, `Button`, `Icon`, `EmptyState`, `TextField`,
> `Switch`, `Card` and others. Some are kept, some wrapped, some replaced — §5 has the table.
> Components below that duplicate an Ignite one are marked.
>
> Ignite keeps components **flat** in `src/components/`, so the tiers below are a
> **dependency rule**, not a directory layout. Styling is Ignite's `ThemedStyle`, not
> token props ([ADR-0008](adr/0008-ignite-theming-over-nativewind.md)) — the prop
> signatures shown here describe the *contract*, and the style implementation is
> `$`-prefixed `ThemedStyle` constants.

**Layering.** Three tiers, and a component may only import from tiers below it.

```
tier 3  domain-aware        CityRow, HeroClock, MeridianMap, SearchSheet, CityCard …
tier 2  reusable            Button, SegmentedPill, Card, Sheet, Avatar, Icon, Divider …
tier 1  touches RN directly Text, Numeral, Pressable
```

Tier 1 is the only place that touches raw `react-native` or `react-dom`. Everything above composes tier 1. This is what makes the web and native renderings identical without `Platform.select` scattered through feature code.

---

## Tier 1 — primitives

> Ignite already provides the layout and typography atoms. **Do not build `<Box>` or `<Stack>`** —
> a parallel token-prop system alongside `ThemedStyle` is exactly the two-styling-systems problem
> [ADR-0008](adr/0008-ignite-theming-over-nativewind.md) exists to avoid. Use `<View>` with a
> `$`-prefixed `ThemedStyle` constant.

### `<Text>` — Ignite's, extended

Ignite's `Text` already handles i18n (`tx`), RTL, ref forwarding and presets. TimeSpot extends its `$sizeStyles` and `$presets` rather than replacing it — see `14-ignite-integration.md` §4.1.

```tsx
<Text preset="cityTitle" tx="list:tokyo" />
<Text preset="offset" text={time.offsetLabel} />
```

Presets: Ignite's `default bold heading subheading formLabel formHelper`, plus TimeSpot's `screenTitle cityName cityTitle offset caption`.
Sizes: Ignite's `xxs…xxl`, plus `display displayXl hero numeralMd numeralLg`.

Add `includeFontPadding: false` to `$baseStyle`, or every display-size block sits ~8 % low on Android. Display presets cap font scaling at 1.3×; body and label scale unbounded.

### `<Numeral>` ⭐ — new

The most important component in the app. Every digit on every screen goes through it. Ignite has no equivalent.

```ts
interface NumeralProps {
  value: string                      // '08', '08:40', '15'
  size?: 'numeralMd' | 'numeralLg' | 'display' | 'displayXl' | 'hero'
  color?: keyof Theme['colors']
  animate?: 'none' | 'roll'          // odometer
  accessibilityLabel?: string
}
```

Guarantees, in priority order:

1. **A measured fixed width per character cell**, derived from the size token, so a `1` occupies the same box as an `8` and nothing reflows on a tick. This is the primary mechanism and it does not depend on the font.
2. `fontVariant: ['tabular-nums']` as a belt-and-braces enhancement.
3. **Colons are glyphs, not layout** — no separate views, so kerning stays correct.
4. `animate="roll"` renders a 3-cell vertical strip (prev / current / next) in an overflow-hidden box and translates it on change. See `08-motion-spec.md` §3.

> If you find yourself writing `<Text>{time}</Text>`, that is a bug. Use `<Numeral>`.

### `<Pressable>`

Wraps RN `Pressable` with: `spring.press` scale feedback, `hitSlop` padding to the platform minimum touch target, `expo-haptics` on native, a web `:focus-visible` ring from `colors.focusRing`, and `disabled` → 40 % opacity + `aria-disabled`.

### `<Icon>` — Ignite's, re-sourced

Keep Ignite's API; swap the asset set for the 20 SVG icons in `02-design-system.md` §7, rendered with `react-native-svg` so they inherit `currentColor` and survive the black selected row and dark theme.

---

## Tier 2 — UI

### `<Card>`
The hairline surface from audit §3.

| Prop | Type | Default |
|---|---|---|
| `selected` | boolean | false |
| `interactive` | boolean | true |
| `elevation` | `'hairline' \| 'float'` | `'hairline'` |

Anatomy: `bg.card` + `radius.md` + a **two-tone hairline** — `stroke.raised` on top/left, `stroke.sunken` on bottom/right. On native this is a `borderWidth: 1` with `borderTopColor`/`borderLeftColor` vs `borderBottomColor`/`borderRightColor`; on web it is `border: 1px solid` plus an `inset 0 1px 0 stroke.raised` box-shadow, which renders more crisply.

`selected` → `bg.inverse`, hairline removed, and a `ThemeContext` flip so every descendant's `ink.primary` resolves to `ink.onInverse` **automatically**. This is why the selected row "just works" — no `selected && styles.selectedText` at every leaf.

### `<Button>`
Variants: `primary` (`bg.inverse` pill) · `secondary` (`bg.control` pill) · `ghost` (text only) · `icon` (circular).
Sizes: `sm 36` · `md 44` · `lg 52`. Always `radius.pill`.
States: default, pressed (`scale 0.97`), disabled, loading (an inline spinner replacing the label, width preserved so the button does not jump).

### `<SegmentedPill>`
The `12h / 24h` control.

```ts
<SegmentedPill
  options={[{value:'12', label:'12h'}, {value:'24', label:'24h'}]}
  value={format} onChange={setFormat}
/>
```

- Track `bg.control`, `radius.pill`, 36 h. Thumb is an absolutely-positioned `bg.inverse` pill animated with `ease.standard` over `duration.base`.
- Thumb width is measured from the active segment, so `12h` and `24h` (different widths) both look right.
- `role="radiogroup"`; arrow keys move selection on web.

### `<Avatar>`
44 ⌀ squircle city image. `expo-image`, `blurhash` placeholder, `recyclingKey`, `contentFit="cover"`. Grayscale unless `focused`, animating to colour over `duration.base`. Falls back to a monogram tile.

### `<AvatarStrip>`
Horizontal, overlapping (−8), max 6 + `+N`. `role="tablist"`. Keeps its scroll offset in sync with the focused index.

### `<Sheet>`
Native: `@expo/ui` `BottomSheet` (real platform sheet — detents, rubber-banding, dismiss gesture, all free). Web: a `radius.lg` modal with a focus trap, `Escape` to close, scroll lock, and focus restored to the trigger on close.

One API over both:

```ts
<Sheet open={open} onOpenChange={setOpen} detents={['medium','large']} title="Add a city">
```

### `<Icon>`
`<Icon name="globe" size="lg" color="ink.primary" />` — `react-native-svg`, `currentColor`, `role="img"` with a label or `aria-hidden` when decorative.

### `<Divider>` · `<Toast>` · `<Spinner>` · `<EmptyState>`
Conventional. `<Toast>` carries the undo affordance for delete; it is `role="status"` with `aria-live="polite"` and never steals focus.

---

## Tier 3 — features

### `<CityRow>` — S1 list row

```ts
type CityRowProps = {
  city: SavedCity
  time: ZonedTime            // pre-computed by the parent from one clock tick
  selected: boolean
  onPress: () => void
  onLongPress?: () => void
  dragHandleProps?: DragProps
}
```

- **Receives time as a prop.** Does not subscribe to the clock itself. One subscription in the list, N pure rows — this is the difference between 40 re-renders a second and one.
- `React.memo` with a comparator on `time.display`, `selected` and `city.id`.
- Fixed time-column width via `<Numeral>`; name gets the remainder.
- a11y: one node, not four. `accessibilityRole="button"`, `accessibilityLabel="Tokyo, 1 40 AM, night, UTC plus 9"`, `accessibilityState={{selected}}`, `accessibilityHint="Double tap to focus"`.

### `<CityCard>` — web grid card
Same data, 320 × 180 layout from `04-screen-specs.md`. Shares the row's view-model; only the layout differs. `Platform`-free: chosen by the parent at the breakpoint.

### `<HeroClock>`

```ts
<HeroClock time={ZonedTime} format="24h" showSeconds layout="stacked" | "inline" />
```

- `stacked` = mobile (`HH` over `MM SS`); `inline` = web (`HH:MM:SS`).
- Seconds use `<Numeral animate="roll">`.
- Single `aria-label` for the whole block — "8:40:15 AM, Thursday 20 March" — with the individual digits `aria-hidden`, so a screen reader reads one sensible sentence instead of spelling out digits. `aria-live="off"`: a clock that announces every second is unusable.

### `<SunBlock>`
Sunrise, sunset, day length, polar cases. Pure function of `(lat, lon, date, tz)`.

### `<MeridianMap>` ⭐ highest risk
Composes `<WorldMap>` (one SVG: land, night hatching clipped to land, borders, active country — the night layer recomputed per minute), the pointer (line + marker) and `<FloatingCityCard>`. `<UtcRuler>` sits below it on the screen.

Contract: **the pointer's position is shared values** (`pointerX`, `pointerY`, `viewportX`) — the line, the marker, the card's position and the map's pan all derive from them on the UI thread. JS is told the city under the finger at most every 60 ms, and resolves the committed city on release. Props: `city`, `onSelectCity`, `onPreviewCity`. Full gesture and performance spec in `08-motion-spec.md` §5. ~~`<Terminator>`, `<MeridianLine>`, one offset shared value~~ — replaced 2026-09-25 by the point-anywhere design.

### `<SearchSheet>` · `<DifferenceStrip>` · `<OverlapBand>` · `<TabBar>`
Specified in `04-screen-specs.md` S4, S5 and the cross-screen rules.

---

## The `@expo/ui` boundary

`@expo/ui` universal components render as **SwiftUI on iOS, Jetpack Compose on Android, and JS on web**. That is a real superpower for anything the OS should own — and a liability for anything the brand should own, because platform-native styling is the point of them and this design is emphatically not platform-native.

The line, decided once (`ADR-0003`) and enforced in review:

| Use `@expo/ui` | Build custom |
|---|---|
| `BottomSheet` — detents, gestures, dismissal | `CityRow`, `CityCard`, `Card` |
| `TextInput` — keyboard, autofill, dictation, IME | `HeroClock`, `Numeral` |
| `Picker` — theme, format selectors in Settings | `SegmentedPill` (brand-critical) |
| `Switch` — Settings toggles | `TabBar` (brand-critical shape language) |
| `List` / `FieldGroup` — Settings groups | `MeridianMap` |
| `ContextMenu` — long-press menus | `AvatarStrip` |

Everything from `@expo/ui` is wrapped in a local adapter in `src/components/` so that a future swap touches one file. All `@expo/ui` content must sit inside a `<Host>` — wrap once at the adapter, never at the call site. The adapter is also the theme bridge: `@expo/ui` components do not read Ignite's theme, so read `useAppTheme()` there and pass explicit values down. See `14-ignite-integration.md` §6.

---

## Conventions

1. Scaffold with `npx ignite-cli generate component <Name>`, then rewrite the body. Platform splits as `Component.web.tsx` only when unavoidable, with the reason in a comment.
2. Styles are `$`-prefixed constants declared **below** the component. `ThemedStyle<T>` when they read the theme; a plain `ViewStyle`/`TextStyle` when they do not.
3. Props are the only input. No component reads global state except through a `use*` hook at the top of a **screen**, never inside a leaf.
4. Every interactive component has an explicit `accessibilityLabel` or a documented reason it inherits one.
5. No component contains a colour, size or duration literal — everything comes off `theme`. `/token-check` fails the build.
6. User-facing strings go through `tx`, never inline text.
7. Every component gets a story in `src/stories/` rendering all its states in both themes — this is what `/visual-qa` screenshots.
