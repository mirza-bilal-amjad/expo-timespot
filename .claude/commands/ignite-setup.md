---
description: Phase 0 — scaffold Ignite, convert to Expo Router, upgrade to SDK 57, install the TimeSpot theme
argument-hint: [step number to resume from, e.g. 3]
---

Run Phase 0 from `docs/14-ignite-integration.md` §10${1:+, resuming at step **$1**}.

Load the `timespot-ignite-conventions` skill. Install the Expo plugin first if it is not present — its `expo-upgrade` skill is what makes step 3 safe:

```bash
claude plugin install expo@claude-plugins-official
```

**Commit after every step.** If a step fails, I want to be one `git reset` away from a working tree.

---

### 1 — Scaffold

```bash
npx ignite-cli@latest new timespot --yes
cd timespot && git init && git add -A && git commit -m "chore: ignite baseline"
```

✅ boots on iOS and Android.

### 2 — Expo Router conversion

Follow the [Cookbook recipe](https://ignitecookbook.com/docs/recipes/ExpoRouter/); reference implementation: [`Jpoliachik/ignite-expo-router`](https://github.com/Jpoliachik/ignite-expo-router).

- `npx expo install expo-router expo-constants expo-linking`
- `git mv app src`; update the `@/` alias in `tsconfig.json` **and** `babel.config.js`
- create `src/app/_layout.tsx` with the providers + `<Slot />`; delete `App.tsx`
- `package.json` → `"main": "expo-router/entry"`
- delete `src/navigators/`
- add `React.forwardRef()` to `ListItem` if it lacks one

Build the route tree from `docs/14-ignite-integration.md` §8.

✅ `src/app/(tabs)/index.tsx` renders; a deep link resolves.

### 3 — SDK 55 → 57 ⚠️ the risky step

```bash
npx expo install expo@^57.0.0 --fix
npx expo-doctor@latest
rm -rf ios android
```

Pin `expo@>=57.0.17` — earlier 57 builds carry a Hermes memory regression that affects Reanimated and Worklets, both of which Ignite uses heavily.

**If this fights you, stop and tell me.** The documented fallback is to stay on SDK 55 and ship native-only with `@expo/ui/swift-ui` + `@expo/ui/jetpack-compose`, adding web in a second pass. Do not improvise a third option.

✅ boots on iOS, Android **and** web. `expo-doctor` clean.

### 4 — Web storage adapter

`react-native-mmkv` has no web build and Ignite's `ThemeProvider` calls `useMMKVString` directly, so web cannot boot without this.

Create `src/utils/storage/storage.web.ts` backed by `localStorage`, wrapped in try/catch for Safari private mode, exposing the same interface as the native one.

✅ `ThemeProvider` works on web; theme choice survives a reload.

### 5 — Theme

Copy from `design/ignite-theme/` into `src/theme/`: `colors.ts`, `colorsDark.ts`, `spacing.ts`, `spacingDark.ts`, `timing.ts`, `typography.ts`, and the new `radius.ts`.

Then wire `radius` into `src/theme/theme.ts` (both themes), `src/theme/types.ts` (the `Theme` interface) and the barrel export.

✅ a sample screen renders in TimeSpot colours in both schemes; `theme.radius.md` type-checks.

### 6 — Fonts

```bash
npx expo install @expo-google-fonts/geist
npm uninstall @expo-google-fonts/space-grotesk
```

✅ Geist loads on all three platforms. Confirm `typography.primary` still has `light` and `bold` keys — Ignite's presets reference them.

### 7 — Extend `Text`

Add the display sizes and TimeSpot presets from `14` §4.1. Add `includeFontPadding: false` to `$baseStyle`.

✅ `preset="cityName"` renders at 56; a 144 pt block is vertically centred on Android, not sitting low.

### 8 — `<Numeral>`

Build it per `14` §4.2 — measured per-character width **plus** `tabular-nums`. No roll animation yet.

✅ `08:40 → 08:41` causes **zero** layout shift. Measure it; do not eyeball it.

### 9 — `@expo/ui`

```bash
npx expo install @expo/ui
```

Build the `Sheet` adapter per `14` §6.

✅ a sheet opens on iOS, Android and web.

### 10 — State

```bash
npm i zustand
```

Three persisted slices (`cities`, `prefs`, `focus`) over Ignite's MMKV storage, each with its own version and migration — `docs/06-data-model.md` §2.

✅ survives relaunch on all three platforms.

### 11 — CI

typecheck · lint · test · `/token-check` · contrast. ✅ green.

---

## Report

For each step: done / failed, and what changed. Then state whether **Gate G0** is met:

> a sample screen in TimeSpot's theme, both schemes, on all three platforms, with a stable clock rendering through `<Numeral>`.

Do not start Phase 1 until it is.
