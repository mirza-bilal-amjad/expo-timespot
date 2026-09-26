# TimeSpot — project instructions

A universal world-clock app (iOS, Android, web) built on **Ignite + Expo Router + `@expo/ui`**.
Full specification in `docs/`. This file is the contract; the docs are the detail.

---

## Read before you write

| Doing this | Read first |
|---|---|
| **anything at all, first time** | `docs/14-ignite-integration.md` — how Ignite, Expo Router and `@expo/ui` fit together |
| anything visual | `docs/02-design-system.md` + `14` §3 for the Ignite token names |
| building a screen | `docs/04-screen-specs.md` |
| building a component | `docs/03-component-library.md` + `14` §5 |
| anything involving time | `docs/06-data-model.md` §4 + `adr/0004-intl-time-engine.md` |
| adding a dependency | `docs/14-ignite-integration.md` §1 — Ignite may already ship it |
| animating | `docs/08-motion-spec.md` |
| any user-facing element | `docs/09-accessibility.md` |
| what to build next | `docs/10-implementation-plan.md` (Phase 0 is superseded by `14` §10) |

`docs/01-design-audit.md` records what the source mockups got **wrong**. Read it before implementing anything that looks like them.

---

## The six rules

### 1. Time is derived, never stored

The only persisted time fact is an **IANA zone ID** (`'Asia/Tokyo'`). Offsets, abbreviations and DST status are computed at display time from `Intl`.

```ts
// ❌ all bugs
const offset = -8
city.utcOffset = 9
const tz = "PST"
new Date(now + offset * 3600_000)

// ✅
getZonedTime(now, city.zone, prefs)
```

The mockups contain four DST/offset errors. Do not copy them. Run `/tz-audit`.

### 2. Everything comes off `theme` — Ignite's `ThemedStyle` way

No hex, no raw font size, no magic number anywhere in `src/`.

```tsx
// ❌
const $row: ViewStyle = { padding: 13, backgroundColor: "#EAEAEA", borderRadius: 16 }
<Text style={{ fontSize: 20 }}>Tokyo</Text>

// ✅
const $row: ThemedStyle<ViewStyle> = (theme) => ({
  padding: theme.spacing.md,
  backgroundColor: theme.colors.cardBackground,
  borderRadius: theme.radius.md,
})
const { themed } = useAppTheme()
<View style={themed($row)} />
<Text preset="cityTitle" tx="city:tokyo" />
```

`$`-prefixed style constants, declared **below** the component. `ThemedStyle<T>` when it touches the theme; a plain `ViewStyle` when it does not. Run `/token-check`.

**NativeWind is not installed** — see `adr/0008`. If you find yourself reaching for `className`, stop.

### 3. One clock

`useClock()` owns the only interval in the app. Screens subscribe; components receive derived values as **props** and are `React.memo`'d. Screens pass `active: useIsFocused()`, because tabs stay mounted and a hidden clock must not tick. A screen that shows no seconds passes `coalesceToMinute`. A memo is only as good as its props: hand rows stable callbacks that take the row's id, never `() => onX(item)` built per render. That pattern defeated every row memo on the list.

```tsx
// ❌ N subscriptions, N re-renders per second
function CityRow({ city }) { const now = useClock(); … }

// ✅ one subscription, memo'd rows
function ListScreen() {
  const now = useClock()
  return rows.map(c => <CityRow key={c.id} city={c} time={getZonedTime(now, c.zone, prefs)} />)
}
```

### 4. Every digit goes through `<Numeral>`

Never `<Text>{time}</Text>`. `<Numeral>` pins a measured per-character width **and** sets `tabular-nums`, which is what stops the clock twitching every second.

### 5. `src/domain/` is pure

No React, no React Native, no Ignite imports. Plain TypeScript, tested in plain Node in under a second. It is where all the logic that can be *wrong* lives.

### 6. Strings go through i18n

Ignite wires `i18next` and `Text` takes a `tx` prop. Use it from the first commit — `<Text tx="list:title" />`, not `<Text text="World Time" />`. Retrofitting i18n is miserable; getting it free is not.

---

## Stack

**Ignite** (Expo Router conversion) · Expo SDK 57 · RN 0.86 · React 19.2 · `@expo/ui` · Ignite `ThemedStyle` theming · Reanimated 4 · Zustand 5 over Ignite's MMKV · `Intl` + `@date-fns/tz` · `suncalc` · `react-native-svg` · FlashList · Space Grotesk

**Already in Ignite — do not re-add:** MMKV, i18next, date-fns, expo-localization, Reanimated, Gesture Handler, Safe Area, Edge-to-Edge, Keyboard Controller, Reactotron.

**Never pin a version from memory.** `npx expo install <pkg>`, then `npx expo-doctor`.

Install the official Expo agent skills first — they are the source of truth for Expo APIs and carry the SDK-upgrade skill:

```bash
claude plugin install expo@claude-plugins-official
```

---

## Structure

```
src/
  app/            ← Expo Router routes ONLY. Thin shells that re-export a screen.
  screens/        real screen bodies
  components/     flat, Ignite-style. Ignite's + TimeSpot's.
  domain/         PURE TypeScript. No React. No RN. No Ignite.
  store/          Zustand slices over Ignite's MMKV storage
  theme/          colors, colorsDark, spacing, radius, typography, timing, context
  i18n/  utils/  services/
```

Ignite keeps components **flat**, so the tiering in `03-component-library.md` is a **dependency rule**, not a directory layout:

> `Numeral`, `Text`, `Icon` may not import `CityRow`. Feature components may not import each other.

Scaffold with `npx ignite-cli generate component <Name>`, then rewrite the body.

---

## Ignite components — keep, wrap or replace

| Keep | Wrap `@expo/ui` | Replace |
|---|---|---|
| `Screen`, `Text` (extended), `Button`, `EmptyState`, `Icon` (re-sourced to SVG) | `TextField`, `Switch`, `Checkbox`, `Radio`, sheets, pickers | `Card` (TimeSpot's is a **hairline**, not an elevated panel), `AutoImage` → `expo-image` |

Full table and rationale: `docs/14-ignite-integration.md` §5.

## The `@expo/ui` boundary (ADR-0003)

| Use `@expo/ui` | Build custom |
|---|---|
| BottomSheet, TextInput, Picker, Switch, MenuView (row menu) | Card, CityRow, CityCard, Numeral, HeroClock, SegmentedPill, TabBar, MeridianMap, AvatarStrip |

**If the user would be annoyed by it not matching their OS → `@expo/ui`. If they'd be annoyed by it not matching the brand → build it.**

Four wiring rules (`14` §6): one `<Host>` per adapter, mounted **inside** the adapter; feature code never imports `@expo/ui`; the adapter is the theme bridge (read `useAppTheme()` there, pass explicit values down); never put `@expo/ui` content inside `Screen`'s scroll view.

---

## Definition of done

1. `tsc --noEmit` clean (strict).
2. Tests pass, including new domain fixtures.
3. `/token-check` finds no literals.
4. Renders on iOS, Android **and** web, in **both** themes.
5. Strings via `tx`.
6. Has an `accessibilityLabel`, or a comment saying why not.
7. If the implementation diverged from a doc, the doc is updated **in the same commit**.

---

## Slash commands

| Command | Use |
|---|---|
| `/ignite-setup` | Phase 0: scaffold, Expo Router conversion, SDK upgrade, theme swap |
| `/build-screen <name>` | implement a screen from its spec |
| `/new-component <name>` | scaffold a component via `ignite-cli` at the right tier |
| `/token-check` | find hardcoded values in `$` styles |
| `/tz-audit` | find fixed offsets and DST hazards |
| `/a11y-sweep` | automated a11y + manual checklist |
| `/visual-qa` | render every story, both themes, diff |
| `/ship-check` | full pre-release gate |

Project skills in `.claude/skills/` load automatically when relevant.

---

## Things that will bite

**Ignite-specific**
- ~~`react-native-mmkv` has no web build~~ — **corrected 2026-09-24**: v3.3.3 ships a real web implementation (`createMMKV.web.ts`, backed by `localStorage`) that Metro resolves automatically. No separate `storage.web.ts` adapter is needed; `src/store/storage.ts` wraps the one MMKV instance for every platform. Verified: `ThemeProvider`'s `useMMKVString` and the Zustand stores both persist correctly on web, including across a reload.
- **Never delete an Ignite semantic colour key** (`text`, `textDim`, `background`, `border`, `tint`, `tintInactive`, `separator`, `error`, `errorBackground`). Its own components read them. Add; don't remove.
- **Never change Ignite's nine spacing values.** Add semantic layout tokens alongside.
- **`typography.primary` needs `light` and `bold` keys** even as aliases — Ignite's presets reference them, and a missing key silently falls back to the system font.
- `react-native-keyboard-controller` is native-only — guard its provider with `Platform.OS !== 'web'`.
- **No lazy `@expo/ui` list inside a sheet.** On Android `FieldGroup` / `List` are Compose `LazyColumn`s; inside the Compose bottom sheet one can be measured with unbounded height, which is a fatal crash (it crashed Settings, 2026-09-26). Lay groups out in React Native; use `@expo/ui` for leaf controls, each in a small `Host`.
- **React Native content inside an `@expo/ui` sheet goes through `RNHostView`** (`Sheet` does it). The Android sheet is a Compose dialog in its own window with no React root; without `RNHostView` any `ScrollView`/`FlashList` in it crashes on the first drag (`AssertionError` in `RootViewUtil.getRootView`).
- **`pointerEvents` is a style, not a prop** (the prop is deprecated). On web `"box-none"` only works through `StyleSheet.create` (`$styles.passThrough`) — an inline object, or any Reanimated `Animated.View` (it flattens styles inline), silently becomes `auto` and swallows clicks beneath it.
- The SDK 55 → 57 upgrade is the riskiest step. Do it on the untouched baseline, before any product code. Pin `expo@>=57.0.17`.

**Product-specific**
- **`Intl` on low-end Android** may ignore `timeZone` *silently*. The boot probe in `domain/time/capability.ts` is not optional (`adr/0004`). On `degraded`, `zone.ts` reads offsets from the bundled `tz.offsets.json` instead. So **every display value must be arithmetic from `getOffsetMinutes`**: never add a zone-aware `Intl` formatter to `zone.ts`, because the fallback can't follow it. `@date-fns/tz` is not a fallback (it calls `Intl` too). Re-run `npx tsx scripts/build-tzdata.ts` before 2030 or when tz rules change.
- **Android `includeFontPadding: false`** on every display preset, or 144 pt numerals sit ~8 % low.
- **JS calls from a gesture (`scheduleOnRN`) must be throttled to 60 ms.** Per-frame JS destroys the 60 fps budget. `runOnJS` is deprecated in Reanimated 4 — use `scheduleOnRN` from `react-native-worklets`.
- **Web hydration:** the static clock is stale by definition. `suppressHydrationWarning` + `useLayoutEffect`, never `useEffect`.
- **Device clock jumps > 5 s** → cut, never animate a roll through 3 000 values.
- **45-minute zones are real** — Kathmandu `+5:45`, Chatham `+12:45`, Eucla `+8:45`.
- **`UTC+14` exists** (Kiritimati). The ruler must reach it.
- **Minus is U+2212** (`−`), not a hyphen, in every offset label.

---

## Tone for this repo

Be direct. When the spec and the mockup disagree, the spec wins and the audit says why. When something in `docs/` is wrong, say so and fix the doc — do not quietly implement around it.
