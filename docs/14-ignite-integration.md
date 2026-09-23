# 14 — Ignite Integration Guide

How TimeSpot is built on **Ignite** (Infinite Red's boilerplate) with **Expo Router** and **`@expo/ui`**.

This document supersedes the stack and structure sections of `05-architecture.md` and the styling decision in `ADR-0002`. Where this file and an earlier doc disagree, **this file wins**.

---

## 1. What Ignite gives you, and what has to change

Verified against `infinitered/ignite@master` on 2026-09-23.

### Already there — keep it

| Ignite ships | TimeSpot needed | Verdict |
|---|---|---|
| `react-native-mmkv` 3.3.3 + `@/utils/storage` | MMKV persistence | ✅ exactly what `ADR-0005` specified |
| `i18next` + `react-i18next` + `tx` props + `isRTL` | strings externalised day one, RTL | ✅ better than what I specced — it is enforced at the component level |
| `date-fns` 4.1 | time maths | ✅ add `@date-fns/tz` alongside |
| `expo-localization` | device zone resolution | ✅ |
| `react-native-reanimated` 4.2 + `react-native-worklets` | odometer, meridian drag | ✅ |
| `react-native-gesture-handler` 2.30 | meridian pan | ✅ |
| `react-native-safe-area-context`, `react-native-edge-to-edge` | floating tab bar insets | ✅ |
| `react-native-keyboard-controller` | search sheet | ✅ |
| `ThemeProvider` / `useAppTheme` / `ThemedStyle` | theming, light + dark | ✅ **replaces NativeWind entirely** |
| Reactotron | debugging | ✅ |
| `Screen`, `Text`, `Card`, `Button`, `ListItem`, `Icon`, `TextField`, `Switch`, `Header`, `EmptyState`, `AutoImage`, `Checkbox`, `Radio` | base components | ⚠️ some kept, some replaced — §5 |
| `npx ignite-cli generate component` | scaffolding | ✅ use it |

### Has to change

| # | Issue | Action |
|---|---|---|
| 1 | Ignite targets **Expo SDK 55 / RN 0.83** | **Upgrade to SDK 57 / RN 0.86** — §2.3. Required: `@expo/ui` universal components (the ones that run on web) are only production-ready from SDK 56. |
| 2 | Ignite uses **React Navigation v7**, not Expo Router | Apply the Expo Router conversion — §2.2 |
| 3 | Ignite's theme is Ignite's brand (`#C76542` orange, Space Grotesk) | Replace the five theme files with TimeSpot tokens — §3 |
| 4 | `Text` sizes stop at `xxl: 36` | Extend `$sizeStyles` and `$presets` — §4 |
| 5 | `spacing` has no 20 / 28 / 40 / 56 | Add semantic layout tokens — §3.2 |
| 6 | `timing` has only `quick: 300` | Extend with the full motion token set — §3.4 |
| 7 | No `@expo/ui` | Add at the `ADR-0003` boundary, in Ignite-style adapters — §6 |
| 8 | No state library (Ignite is BYO since v10) | Add Zustand per `ADR-0005` |
| 9 | Ignite has no web config | Add `web.output: 'static'` — §7 |

**Nothing in the design system or the domain layer changes.** The tokens, the screen specs, the time engine and the test matrix are all boilerplate-agnostic. What changes is how styles are *expressed*.

---

## 2. Setup

### 2.1 Create

```bash
npx ignite-cli@latest new timespot --yes
cd timespot
git init && git add -A && git commit -m "chore: ignite baseline"
```

Commit the untouched baseline first. You will want to diff against it.

### 2.2 Convert to Expo Router

Follow the [Ignite Cookbook Expo Router recipe](https://ignitecookbook.com/docs/recipes/ExpoRouter/). The working reference implementation is [`Jpoliachik/ignite-expo-router`](https://github.com/Jpoliachik/ignite-expo-router).

```bash
npx expo install expo-router expo-constants expo-linking
```

Then:

1. **`app/` → `src/`.** Expo Router reserves `app/` for routes.
   ```bash
   git mv app src
   ```
2. **Create `src/app/`** for routes. The `@/` alias already points at the moved folder — check `tsconfig.json` and `babel.config.js` and update the path if it says `./app/*`.
3. **`package.json`** → `"main": "expo-router/entry"`.
4. **`src/app/_layout.tsx`** replaces `App.tsx` — carries the providers and renders `<Slot />`.
5. Delete `src/navigators/`; the file tree is the navigator now.
6. `ListItem` needs `React.forwardRef()` to work as an Expo Router `<Link asChild>` target. Ignite's `Text` already forwards refs; `ListItem` may not.
7. The `ignite-cli generate screen` template no longer applies — screens now live under `src/screens/` and are re-exported by route files.

### 2.3 Upgrade to SDK 57

```bash
npx expo install expo@^57.0.0 --fix
npx expo-doctor@latest
rm -rf ios android           # if they exist — CNG regenerates them
```

**Why this is required:** `@expo/ui`'s *universal* components — the ones with a web implementation — became production-ready in SDK 56, and SDK 57 is the current stable with no breaking changes from 56. Staying on 55 means either no `@expo/ui` or no web, and you want both.

**Risk, stated plainly.** This is a two-SDK jump (55 → 56 → 57) and it is the least certain step in this plan. 55 → 56 carries real changes; 56 → 57 is designed to be trivial. Mitigations:

- Do it on the untouched baseline, **before** writing any TimeSpot code, so a failure costs you an afternoon and nothing else.
- Use the Expo `expo-upgrade` agent skill (`claude plugin install expo@claude-plugins-official`) — it is built for exactly this.
- Pin `expo@>=57.0.17`: earlier 57 builds carry a Hermes memory regression affecting Reanimated/Worklets, which Ignite uses heavily.
- **Fallback:** if the upgrade fights you, stay on SDK 55, ship native-only with `@expo/ui/swift-ui` + `@expo/ui/jetpack-compose`, and defer web to a second pass. The design system and domain layer are unaffected either way.

Verify before going further:

```bash
npx expo start --clear     # iOS, Android and web all boot
npx expo-doctor
```

### 2.4 Add TimeSpot's dependencies

```bash
npx expo install @expo/ui @date-fns/tz react-native-svg @shopify/flash-list expo-image expo-haptics
npm i zustand suncalc @uiw/react-use-fuzzy   # or uFuzzy
npx expo install @expo-google-fonts/geist
npm uninstall @expo-google-fonts/space-grotesk
```

Always `npx expo install`, never `npm i`, for anything with a native side — it resolves the SDK-compatible version.

---

## 3. Theme: mapping TimeSpot tokens onto Ignite

Ignite's theme lives in `src/theme/`. Five files change. Drop-in replacements are in `design/ignite-theme/` in this bundle.

Ignite's dark theme works by **inverting the palette numbering** — `neutral100` is white in light and black in dark — so every semantic name keeps working across themes. TimeSpot follows the same trick.

### 3.1 `src/theme/colors.ts` and `colorsDark.ts`

```ts
// src/theme/colors.ts
const palette = {
  neutral100: "#FFFFFF",
  neutral200: "#F5F5F5",
  neutral300: "#EDEDED",
  neutral350: "#EAEAEA",   // card
  neutral400: "#E8E8E8",   // ⭐ canvas — the dominant colour of both mockups
  neutral500: "#DCDCDC",   // hairline shade
  neutral600: "#A8A8A8",
  neutral700: "#7A7A7A",   // large text only — 3.50:1
  neutral800: "#5C5C5C",   // secondary text — 5.46:1 ✓ AA
  neutral900: "#000000",

  brand100: "#F6DCD2", brand500: "#D44F24", brand700: "#A93B18",
  day500: "#E8A317", night500: "#6E7BA8", meridian500: "#D9433B",
  angry100: "#F2D6CD", angry500: "#C03403",
  overlay20: "rgba(0,0,0,0.20)", overlay50: "rgba(0,0,0,0.44)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // ── Ignite's semantic names — keep ALL of these, Ignite's own components use them
  text: palette.neutral900,
  textDim: palette.neutral800,          // ⭐ #5C5C5C, not the mockup's failing #7A7A7A
  background: palette.neutral400,       // ⭐ #E8E8E8
  border: palette.neutral500,
  tint: palette.neutral900,             // TimeSpot's "tint" is black, not a colour
  tintInactive: palette.neutral600,
  separator: palette.neutral500,
  error: palette.angry500,
  errorBackground: palette.angry100,

  // ── TimeSpot additions
  textFaint: palette.neutral700,        // ONLY at >=24pt — see 09-accessibility §3
  textOnInverse: palette.neutral100,
  textOnInverseDim: palette.neutral600,
  textAccent: palette.brand700,
  cardBackground: palette.neutral350,
  inverseBackground: palette.neutral900,
  controlBackground: palette.neutral100,
  strokeRaised: "#F3F3F3",
  strokeSunken: palette.neutral500,
  focusRing: palette.neutral900,
  scrim: palette.overlay50,
  frame: palette.brand500,              // web bezel — surface only, never text
  day: palette.day500,
  night: palette.night500,
  meridian: palette.meridian500,
  mapLand: "#828282",
  mapLandActive: palette.neutral900,
  mapNight: "rgba(0,0,0,0.10)",
} as const
```

`colorsDark.ts` keeps **identical keys** with the palette inverted — full file in `design/ignite-theme/colorsDark.ts`. Two deliberate departures from a straight inversion, both explained in `02-design-system.md` §1.3: the dark canvas is `#0B0B0B` rather than pure black, and `inverseBackground` becomes near-white so "selected = maximum contrast against the field" stays true in both themes.

> **Rule:** never delete one of Ignite's original semantic keys. `Screen`, `Text`, `Card`, `TextField` and friends read them. Add; don't remove.

### 3.2 `src/theme/spacing.ts`

Keep Ignite's nine steps exactly as they are — its components depend on them — and add TimeSpot's layout constants as **semantic names**:

```ts
export const spacing = {
  // Ignite's scale — DO NOT CHANGE THESE VALUES
  xxxs: 2, xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,

  // TimeSpot layout constants (docs/02-design-system.md §3)
  gutter: 28,        // mobile screen gutter — measured 29.5pt
  gutterWide: 64,    // web, >=1280
  rowGap: 12,        // between city rows/cards
  sectionGap: 32,
  rowHeight: 92,     // city row — measured 93pt
  cardHeight: 180,   // web city card
  container: 1312,   // web content max-width (1312 + 2*64 = 1440 ✓)
  frame: 26,         // web orange bezel
} as const
```

`spacingDark.ts` re-exports the same object — TimeSpot does not vary spacing by theme.

### 3.3 `src/theme/typography.ts` — Space Grotesk → Geist

```ts
import {
  Geist_400Regular as geistRegular,
  Geist_500Medium  as geistMedium,
  Geist_600SemiBold as geistSemiBold,
} from "@expo-google-fonts/geist"

export const customFontsToLoad = { geistRegular, geistMedium, geistSemiBold }

const fonts = {
  geist: { normal: "geistRegular", medium: "geistMedium", semiBold: "geistSemiBold",
           light: "geistRegular", bold: "geistSemiBold" },   // aliases so Ignite presets still resolve
  // …keep Ignite's platform fonts for fallbacks
}

export const typography = {
  fonts,
  primary: fonts.geist,
  secondary: fonts.geist,
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),
}
```

Keep the `light` and `bold` aliases: Ignite's own presets reference `typography.primary.bold`, and a missing key silently falls back to the system font.

Load only three weights. Every extra weight is a font file on the critical path, and the design uses exactly three.

> **Tabular figures.** Geist has them; enable with `fontVariant: ['tabular-nums']`. But `<Numeral>` does **not** rely on that — it also pins a measured per-digit width, so the clock stays stable even if a font or platform ignores the feature. See §4.2.

### 3.4 `src/theme/timing.ts`

```ts
export const timing = {
  quick: 300,        // Ignite's original — keep, its components use it
  instant: 0, fast: 140, base: 220, slow: 320, deliberate: 480,
  ease: { standard: [0.2,0,0,1], decelerate: [0,0,0,1], accelerate: [0.3,0,1,1] },
  spring: {
    numeral: { damping: 22, stiffness: 220, mass: 0.9 },
    press:   { damping: 18, stiffness: 320, mass: 0.7 },
  },
} as const
```

### 3.5 Token name translation

When a doc in this bundle names a token, this is its Ignite spelling:

| Doc token | Ignite |
|---|---|
| `bg.canvas` | `theme.colors.background` |
| `bg.card` | `theme.colors.cardBackground` |
| `bg.inverse` | `theme.colors.inverseBackground` |
| `bg.control` | `theme.colors.controlBackground` |
| `bg.scrim` | `theme.colors.scrim` |
| `ink.primary` | `theme.colors.text` |
| `ink.secondary` | `theme.colors.textDim` |
| `ink.tertiary` | `theme.colors.textFaint` |
| `ink.onInverse` | `theme.colors.textOnInverse` |
| `ink.accent` | `theme.colors.textAccent` |
| `stroke.raised` / `.sunken` | `theme.colors.strokeRaised` / `.strokeSunken` |
| `state.day` / `.night` / `.meridian` | `theme.colors.day` / `.night` / `.meridian` |
| `space.7` (28) | `theme.spacing.gutter` |
| `space.3` (12) | `theme.spacing.rowGap` / `spacing.sm` |
| `radius.md` (16) | `theme.spacing.md` used as a radius, or the `radius` const in `src/theme/radius.ts` |
| `duration.base` | `theme.timing.base` |

Ignite has no radius scale — add `src/theme/radius.ts` and export it from the theme object:

```ts
export const radius = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const
```

Add `radius` to the `Theme` interface in `src/theme/types.ts` and to both `lightTheme` and `darkTheme` in `theme.ts`.

---

## 4. Extending Ignite's `Text`

Ignite's `Text` already does what TimeSpot needs — i18n via `tx`, RTL, presets, ref forwarding — it just tops out at 36 pt. Extend it rather than replacing it.

### 4.1 New sizes and presets

```ts
// src/components/Text.tsx
const $sizeStyles = {
  // Ignite's — keep
  xxs: { fontSize: 12, lineHeight: 18 },
  xs:  { fontSize: 14, lineHeight: 21 },
  sm:  { fontSize: 16, lineHeight: 24 },
  md:  { fontSize: 18, lineHeight: 26 },
  lg:  { fontSize: 20, lineHeight: 32 },
  xl:  { fontSize: 24, lineHeight: 34 },
  xxl: { fontSize: 36, lineHeight: 44 },
  // TimeSpot display scale (docs/02-design-system.md §2.2)
  display:     { fontSize: 56,  lineHeight: 57,  letterSpacing: -1.4 },
  displayXl:   { fontSize: 72,  lineHeight: 66,  letterSpacing: -2.2 },
  hero:        { fontSize: 144, lineHeight: 124, letterSpacing: -5 },
  numeralMd:   { fontSize: 32,  lineHeight: 32,  letterSpacing: -0.5 },
  numeralLg:   { fontSize: 48,  lineHeight: 48,  letterSpacing: -1 },
} satisfies Record<string, TextStyle>

type Presets =
  | "default" | "bold" | "heading" | "subheading" | "formLabel" | "formHelper"   // Ignite's
  | "screenTitle" | "cityName" | "cityTitle" | "offset" | "caption"              // TimeSpot's

const $presets: Record<Presets, ThemedStyleArray<TextStyle>> = {
  // …Ignite's presets unchanged…
  screenTitle: [$baseStyle, { ...$sizeStyles.xxl, ...$fontWeightStyles.medium, letterSpacing: -0.7 }],
  cityName:    [$baseStyle, { ...$sizeStyles.display, ...$fontWeightStyles.medium }],
  cityTitle:   [$baseStyle, { ...$sizeStyles.lg, ...$fontWeightStyles.medium }],
  offset:      [$baseStyle, (t) => ({ ...$sizeStyles.xs, color: t.colors.textDim })],
  caption:     [$baseStyle, (t) => ({ ...$sizeStyles.xxs, color: t.colors.textDim })],
}
```

**Android:** add `includeFontPadding: false` to `$baseStyle`, or every display-size block sits ~8 % low.

### 4.2 `<Numeral>` — new, and mandatory for every digit

Ignite has no equivalent. It is the most important component in the app.

```tsx
// src/components/Numeral.tsx
export interface NumeralProps {
  value: string                      // '08', '08:40', '15'
  size?: keyof typeof numeralSizes   // 'numeralLg' | 'hero' | …
  color?: keyof Theme["colors"]
  animate?: "none" | "roll"
  accessibilityLabel?: string
}
```

Guarantees, in priority order:

1. **A measured fixed width per character cell**, derived from the size token. A `1` occupies the same box as an `8`. This is the primary mechanism and it does not depend on the font.
2. `fontVariant: ['tabular-nums']` as a belt-and-braces enhancement.
3. Colons are rendered as glyphs inside the string, not as separate views, so kerning survives.
4. `animate="roll"` renders the 3-cell odometer strip per `08-motion-spec.md` §3.

> Writing `<Text>{time}</Text>` anywhere is a bug. The clock will twitch on every tick, and once you have seen it you cannot unsee it.

---

## 5. Which Ignite components to keep, wrap or replace

| Ignite | Verdict | Why |
|---|---|---|
| `Screen` | **keep, always** | safe areas, keyboard avoidance, scroll presets. Use `preset="fixed"` on Clock and Map, `"scroll"` on List. |
| `Text` | **keep, extended** | §4.1 |
| `Icon` | **keep, re-source** | keep the API, swap the asset set for the 20 SVG icons in `02-design-system.md` §7 via `react-native-svg` so they inherit `currentColor` |
| `AutoImage` | **replace** with `expo-image` | blurhash placeholders, `recyclingKey`, `contentFit` — all needed by `Avatar` |
| `Card` | **replace** | Ignite's Card is a filled panel with elevation. TimeSpot's is a **hairline** (`01-design-audit.md` §3). Different component, same name — build `src/components/Card.tsx` fresh. |
| `ListItem` | **not used** | city rows are a bespoke two-column layout |
| `Button` | **keep, restyle** | add a `pill` preset; the API is fine |
| `TextField` | **wrap `@expo/ui` `TextInput`** | keyboard, autofill, dictation and IME are worth the native implementation |
| `Switch`, `Checkbox`, `Radio` | **wrap `@expo/ui`** | Settings only; platform-native is correct there |
| `Header` | **not used on mobile** | screens have bespoke headers with the avatar strip; useful on web |
| `EmptyState` | **keep** | matches the S1 empty state almost exactly |

**New components** (`03-component-library.md`): `Numeral`, `SegmentedPill`, `Avatar`, `AvatarStrip`, `CityRow`, `CityCard`, `HeroClock`, `SunBlock`, `MeridianMap`, `UtcRuler`, `TabBar`, `Sheet`, `DifferenceStrip`, `OverlapBand`.

Scaffold each with `npx ignite-cli generate component <Name>` so it lands with Ignite's file conventions, then rewrite the body.

---

## 6. Wiring `@expo/ui` into Ignite

The boundary is unchanged from `ADR-0003` — `@expo/ui` owns system affordances, custom code owns branded surfaces. What changes is the *shape* of the adapter, which now follows Ignite conventions.

```tsx
// src/components/Sheet.tsx — the ONLY file that imports @expo/ui for sheets
import { Host, BottomSheet } from "@expo/ui"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const { themed } = useAppTheme()
  return (
    <Host style={themed($host)}>          {/* Host lives HERE, once, never at call sites */}
      <BottomSheet isOpened={open} onIsOpenedChange={onOpenChange}>
        {children}
      </BottomSheet>
    </Host>
  )
}

const $host: ThemedStyle<ViewStyle> = () => ({ position: "absolute" })
```

Four rules:

1. **One `<Host>` per adapter**, mounted inside the adapter. Never nest `Host`, never put one in a screen.
2. **Feature code never imports `@expo/ui`.** It imports `@/components/Sheet`. A future swap touches one file.
3. **`@expo/ui` components do not read Ignite's theme.** They take their own style props. The adapter is the bridge: read `useAppTheme()` there and pass explicit values down. This is the one place where two styling models meet, and it is contained on purpose.
4. **Do not put `@expo/ui` content inside Ignite's `Screen`'s scroll view.** On iOS a SwiftUI host inside a RN `ScrollView` fights for gestures. Sheets and overlays are siblings of `Screen`, not children.

Approved `@expo/ui` surface for v1:

```
BottomSheet   → Sheet          (search, settings)
TextInput     → SearchField    (keyboard, autofill, dictation, IME)
Picker        → Settings: theme, day/night style
Switch        → Settings: 12/24h, show seconds
FieldGroup    → Settings groups
ContextMenu   → long-press city menu
```

Anything else needs an update to `ADR-0003`.

---

## 7. Web

Ignite ships `react-native-web` but no web configuration.

```ts
// app.config.ts
export default {
  // …
  web: { output: "static", bundler: "metro" },
}
```

Then per `docs/adr/0006-static-web-seo.md` and `14` §2.2's route tree. Things to check specifically because Ignite was not built with web in mind:

- `react-native-mmkv` has no web implementation → `src/utils/storage/` needs a `.web.ts` sibling backed by `localStorage`. Ignite's `ThemeProvider` calls `useMMKVString` directly, so this must be fixed **before** the first web boot.
- Reactotron imports are dev-only; confirm they are tree-shaken out of the web production bundle.
- `react-native-keyboard-controller` is native-only; guard its provider with `Platform.OS !== 'web'`.
- Ignite's `Screen` uses `useSafeAreaInsetsStyle`; on web that returns zeros, so use CSS `env(safe-area-inset-*)` for installed-PWA insets.

---

## 8. Folder structure, final

```
timespot/
├─ src/
│   ├─ app/                        ← Expo Router routes ONLY (thin shells)
│   │   ├─ _layout.tsx             providers: ThemeProvider, SafeArea, i18n, fonts
│   │   ├─ (tabs)/{_layout,index,clock,map}.tsx
│   │   ├─ search.tsx  settings.tsx  city/[id].tsx
│   │   ├─ time/[slug].tsx         web-only public page
│   │   └─ +not-found.tsx
│   ├─ screens/                    real screen bodies
│   ├─ components/                 Ignite's + TimeSpot's, flat, Ignite-style
│   ├─ domain/                     ⚠ PURE TypeScript — no React, no RN
│   │   ├─ time/  sun/  cities/  types.ts
│   ├─ store/                      Zustand slices over Ignite's MMKV storage
│   ├─ theme/                      colors, colorsDark, spacing, radius, typography, timing, context
│   ├─ i18n/                       Ignite's — all strings live here
│   ├─ utils/                      Ignite's + storage.web.ts
│   └─ services/                   Ignite's api (unused in v1 — no network)
├─ design/  docs/  .claude/  CLAUDE.md
└─ app.config.ts  eas.json  tsconfig.json
```

Ignite keeps components **flat** in `src/components/` rather than tiered in folders. Keep that — it is the convention you know, and the tiering from `03-component-library.md` survives as a **dependency rule** instead of a directory layout:

> `Numeral`, `Text`, `Icon` may not import `CityRow`. Feature components may not import each other.

---

## 9. Conventions — the Ignite way

```tsx
// ✅ this is the TimeSpot house style now
import { View, ViewStyle } from "react-native"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function CityRow({ city, time, selected, onPress }: CityRowProps) {
  const { themed } = useAppTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <View style={[themed($row), selected && themed($rowSelected)]}>
        <Text preset="offset" text={time.offsetLabel} />
        <Text preset="cityTitle" text={city.name} />
        <Numeral value={time.display} size="numeralLg" />
      </View>
    </Pressable>
  )
}

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  height: theme.spacing.rowHeight,
  paddingHorizontal: theme.spacing.md,
  borderRadius: theme.radius.md,
  backgroundColor: theme.colors.cardBackground,
  borderWidth: 1,
  borderTopColor: theme.colors.strokeRaised,
  borderLeftColor: theme.colors.strokeRaised,
  borderBottomColor: theme.colors.strokeSunken,
  borderRightColor: theme.colors.strokeSunken,
})

const $rowSelected: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.inverseBackground,
  borderColor: theme.colors.inverseBackground,
})
```

- `$`-prefixed style constants, declared **below** the component.
- `ThemedStyle<T>` for anything touching the theme; a plain `ViewStyle` object for static styles.
- `themed($x)` at the call site; arrays for composition.
- **No literal hex, no raw font size, no magic number.** Every value comes off `theme`.
- Strings via `tx`, never inline text — Ignite's i18n is already wired and `Text` enforces it.

---

## 10. Revised Phase 0

Replaces Phase 0 in `10-implementation-plan.md`. ~1.5 days.

| # | Task | Acceptance |
|---|---|---|
| 0.1 | `npx ignite-cli@latest new timespot --yes`; commit the baseline | boots on iOS + Android |
| 0.2 | Expo Router conversion (§2.2) | `src/app/(tabs)/index.tsx` renders; deep link works |
| 0.3 | **SDK 55 → 57 upgrade** (§2.3); pin `expo@>=57.0.17` | `expo-doctor` clean; boots on iOS, Android **and web** |
| 0.4 | `storage.web.ts` localStorage adapter | `ThemeProvider` works on web without MMKV |
| 0.5 | Replace the 5 theme files + add `radius.ts`, wire into `Theme` | a sample screen renders in TimeSpot colours, both themes |
| 0.6 | Geist swap in `typography.ts` | fonts load on all three platforms |
| 0.7 | Extend `Text` sizes + presets; add `includeFontPadding: false` | `preset="hero"` renders at 144 and is vertically centred on Android |
| 0.8 | Build `<Numeral>` (no roll yet) | `08:40 → 08:41` causes zero layout shift, measured |
| 0.9 | Add `@expo/ui`; build the `Sheet` adapter | sheet opens on iOS, Android and web |
| 0.10 | Zustand stores over Ignite's MMKV storage | survives relaunch on all three platforms |
| 0.11 | CI: typecheck, lint, test, `/token-check`, contrast | green |

**Gate G0:** a sample screen in TimeSpot's theme, both schemes, on all three platforms, with a stable clock rendering through `<Numeral>`.

Phases 1–7 are unchanged — they were written against the design system and the domain layer, neither of which depends on the boilerplate.

---

## 11. What this changed in the rest of the bundle

| Doc | Change |
|---|---|
| `ADR-0002` (NativeWind) | **superseded by ADR-0008.** Ignite's `ThemedStyle` is the styling layer; NativeWind is not installed. |
| `ADR-0007` | new — why Ignite |
| `ADR-0008` | new — Ignite theming over NativeWind |
| `02-design-system.md` | tokens unchanged; §3.5 above is the naming bridge |
| `03-component-library.md` | tier *directories* become a dependency *rule*; Ignite components mapped in §5 |
| `05-architecture.md` | structure and stack superseded by §8 and §1 |
| `10-implementation-plan.md` | Phase 0 superseded by §10 |
| everything else | unchanged |
