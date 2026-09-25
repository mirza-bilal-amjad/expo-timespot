# 02 — Design System

Single source of truth for every visual decision. Canonical machine-readable record: `design/tokens.json` (DTCG format). What the app actually consumes: `design/ignite-theme/*` → `src/theme/*`.

**Rule:** no raw hex, no magic number, no ad-hoc font size anywhere in `src/` outside `src/theme/`. If a value is not in this document, it does not go in the code. `/token-check` enforces this.

> **Token names.** This document uses semantic names like `ink.secondary` and `bg.card`. The project builds on Ignite, whose theme spells them `theme.colors.textDim` and `theme.colors.cardBackground`. The values are identical; the translation table is `14-ignite-integration.md` §3.5.

---

## 0. Naming

`category.role.variant` — semantic, never literal.

✅ `color.ink.secondary`, `space.gutter.mobile`, `radius.md`
❌ `color.grey500`, `space.28`, `radius.16`

Primitives (the raw ramp) exist in `tokens.json` under `_primitive` and are **private**. Components consume semantic tokens only. This is what lets dark theme, density modes and future rebrands land without touching a component.

---

## 1. Colour

### 1.1 Primitive ramp (private)

```
neutral.0    #FFFFFF      neutral.700  #5C5C5C
neutral.50   #F5F5F5      neutral.800  #3D3D3D
neutral.100  #EDEDED      neutral.900  #1A1A1A
neutral.150  #EAEAEA      neutral.950  #0B0B0B
neutral.200  #E8E8E8      neutral.1000 #000000
neutral.300  #DCDCDC
neutral.400  #C4C4C4      orange.500   #D44F24   ← sampled from board
neutral.500  #A8A8A8      orange.600   #BF4620
neutral.600  #7A7A7A      orange.700   #A93B18
```

### 1.2 Semantic — light theme (default, matches the boards)

| Token | Value | Where it appears |
|---|---|---|
| `bg.canvas` | `#E8E8E8` | every screen background |
| `bg.card` | `#EAEAEA` | list rows, city cards (+2 over canvas — see audit §3) |
| `bg.inverse` | `#000000` | selected row, active tab, primary button |
| `bg.control` | `#FFFFFF` | inactive tab buttons, `+` FAB, pill track |
| `bg.scrim` | `rgba(0,0,0,0.44)` | behind sheets and modals |
| `bg.frame` | `#D44F24` | web page bezel only |
| `ink.primary` | `#000000` | clocks, titles, city names |
| `ink.secondary` | `#5C5C5C` | offsets, captions, helper text **(< 24 pt)** |
| `ink.tertiary` | `#7A7A7A` | **only** at ≥ 24 pt — decorative / large labels |
| `ink.onInverse` | `#FFFFFF` | text on `bg.inverse` |
| `ink.onInverseSecondary` | `#A8A8A8` | offsets inside a selected row (8.83 : 1 ✓) |
| `ink.accent` | `#A93B18` | orange text and links (never `#D44F24`) |
| `stroke.raised` | `#F3F3F3` | card top/left hairline |
| `stroke.sunken` | `#DCDCDC` | card bottom/right hairline, dividers |
| `stroke.focus` | `#000000` | focus ring (2 px, 2 px offset) |
| `state.day` | `#E8A317` | daytime indicator |
| `state.night` | `#6E7BA8` | night-time indicator |
| `state.meridian` | `#D9433B` | map meridian rule |
| `map.land` | `#828282` | landmass fill |
| `map.landActive` | `#000000` | country of the focused city |
| `map.night` | `rgba(0,0,0,0.10)` | terminator hatch overlay |

### 1.3 Semantic — dark theme (designed from first principles; absent from the boards)

The inversion is **not** a straight negation. Two deliberate departures:

- `bg.canvas` is `#0B0B0B`, not `#000000`, so that OLED black can still be used for the *selected* row — preserving the boards' core idea that selection reads as a solid block against the field.
- The selected row inverts to **near-white** (`#F2F2F2`), keeping "selected = maximum contrast against the field" true in both themes.

| Token | Dark value | Contrast check |
|---|---|---|
| `bg.canvas` | `#0B0B0B` | — |
| `bg.card` | `#161616` | ΔL keeps the hairline idea readable |
| `bg.inverse` | `#F2F2F2` | — |
| `bg.control` | `#1F1F1F` | — |
| `bg.scrim` | `rgba(0,0,0,0.64)` | — |
| `ink.primary` | `#FFFFFF` | 19.68 : 1 ✓ AAA |
| `ink.secondary` | `#A8A8A8` | 8.28 : 1 ✓ AAA |
| `ink.tertiary` | `#7A7A7A` | 4.27 : 1 ✓ AA |
| `ink.onInverse` | `#000000` | 17.1 : 1 on `#F2F2F2` ✓ |
| `ink.onInverseSecondary` | `#5C5C5C` | 5.2 : 1 ✓ |
| `ink.accent` | `#E8703F` | 6.9 : 1 on canvas ✓ |
| `stroke.raised` | `#242424` | — |
| `stroke.sunken` | `#000000` | — |
| `map.land` | `#3A3A3A` | — |
| `state.day` / `state.night` | `#F0B54A` / `#8F9CC9` | both ≥ 7 : 1 |

### 1.4 Contrast ledger (measured, not assumed)

| Pair | Ratio | AA normal | AA large | AAA |
|---|---|---|---|---|
| `#000000` on `#E8E8E8` | 17.14 | ✓ | ✓ | ✓ |
| `#5C5C5C` on `#E8E8E8` | 5.46 | ✓ | ✓ | ✗ |
| `#7A7A7A` on `#E8E8E8` | 3.50 | ✗ | ✓ | ✗ |
| `#FFFFFF` on `#000000` | 21.00 | ✓ | ✓ | ✓ |
| `#A8A8A8` on `#000000` | 8.83 | ✓ | ✓ | ✓ |
| `#A93B18` on `#E8E8E8` | 5.15 | ✓ | ✓ | ✗ |
| `#D44F24` on `#FFFFFF` | 4.25 | ✗ | ✓ | ✗ |
| `#FFFFFF` on `#0B0B0B` | 19.68 | ✓ | ✓ | ✓ |
| `#A8A8A8` on `#0B0B0B` | 8.28 | ✓ | ✓ | ✓ |

Regenerate with `pnpm tokens:contrast` — the check runs in CI and fails the build on a regression.

---

## 2. Typography

### 2.1 Family

| Role | Family | Licence | Why |
|---|---|---|---|
| **Primary** | **Space Grotesk** | OFL | The board's actual face (audit §6, corrected 2026-09-25). Ships **tabular figures** (`tnum`). |
| Fallback stack | `'Space Grotesk', -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | — | Web |

Ship four weights via `@expo-google-fonts/space-grotesk` + `expo-font`: **300** (light), **400** (regular — titles, city names and every numeral, matching the board), **500** (medium — buttons, monograms), **600** (semibold; also the `bold` alias). ~~Geist Variable~~ — **corrected 2026-09-25**, see audit §6.

> **Non-negotiable:** every clock, offset, and countdown uses `fontVariantNumeric: ['tabular-nums']` (native) / `font-variant-numeric: tabular-nums` (web). Proportional figures make the clock twitch on every tick. See `03-component-library.md` → `<Numeral>`.

### 2.2 Scale

Mobile in **pt**, web in **px @ 1440**. Web hero uses a fluid `clamp()`.

| Token | Mobile | Web | Weight | Tracking | Line-height | Used for |
|---|---|---|---|---|---|---|
| `display.hero` | **144** | `clamp(96px, 22vw, 320px)` | 500 | −0.035em | 0.86 | the big clock |
| `display.xl` | 72 | 120 | 500 | −0.03em | 0.92 | hero seconds block |
| `display.lg` | **56** | **64** | 500 | −0.025em | 1.02 | focused city name |
| `display.md` | **36** | 44 | 500 | −0.02em | 1.08 | screen title ("World Time") |
| `numeral.lg` | **48** | **80** | 500 | −0.02em | 1.0 | row / card time |
| `numeral.md` | 32 | 44 | 500 | −0.015em | 1.0 | secondary times |
| `headline` | 24 | 28 | 500 | −0.01em | 1.2 | section headers, sheet titles |
| `title` | **20** | 24 | 500 | 0 | 1.25 | city name in a row |
| `body` | 16 | 18 | 400 | 0 | 1.45 | prose, descriptions |
| `label` | **15** | 16 | 400 | +0.005em | 1.3 | UTC offsets, "Current" |
| `caption` | 13 | 13 | 400 | +0.01em | 1.3 | ruler ticks, metadata |
| `mono` | 14 | 14 | 400 | 0 | 1.4 | debug / dev-only |

Bold (600) is used **only** for the active ruler tick and the active pill segment. This design says emphasis with *colour and size*, not weight.

### 2.3 Rules

1. Never more than **three** type sizes visible in one viewport region.
2. Optical alignment over metric alignment for the hero: the leading `0` in `08` carries a small negative left inset (`-0.04em`) so the numeral block aligns to the gutter, not to the glyph's side bearing.
3. Hero line-height < 1 is intentional. Set `includeFontPadding: false` (Android) and `textAlignVertical: 'center'` or the block will sit low by ~8 %.
4. City names **never truncate mid-word**. Two lines max, then ellipsis. "Ho Chi Minh City" and "Nizhny Novgorod" are the stress cases.

---

## 3. Space

4-pt base grid. Mobile values are pt; web values are px (identical numbers, different units, because the reference grids align).

```
space.0   0     space.5  20     space.10  48
space.1   4     space.6  24     space.11  56
space.2   8     space.7  28     space.12  64
space.3   12    space.8  32     space.14  80
space.4   16    space.9  40     space.16  96
```

Named:

| Token | Mobile | Web | Measured from board |
|---|---|---|---|
| `space.gutter` | **28** | **64** | 29.5 pt / 67 px |
| `space.rowGap` | **12** | **12** | 12.75 pt / 9 px |
| `space.sectionGap` | 32 | 64 | — |
| `space.frame` | — | 26 | 26 px (orange bezel) |
| `size.container` | — | **1312** | 1305 px |

Responsive gutter ramp (web): `20 / 32 / 48 / 64` at `<480 / <768 / <1200 / ≥1200`.

---

## 4. Radius

| Token | Value | Applied to |
|---|---|---|
| `radius.xs` | 6 | ruler tick highlight, chips |
| `radius.sm` | 10 | city avatar squircle |
| `radius.md` | **16** | list rows, city cards, floating map card |
| `radius.lg` | 24 | bottom sheets, modals |
| `radius.xl` | 32 | web app panel |
| `radius.pill` | 999 | toggles, tab buttons, FAB |

City avatars are **squircles**, not rounded rects — `radius.sm` with a superellipse mask where available (`expo-image` + `borderCurve: 'continuous'` on iOS, an SVG `clipPath` on web/Android).

---

## 5. Elevation

This design is almost flat. Shadow is a signal that something **floats above the plane** — use it only where that is literally true.

| Token | Definition (light) | Definition (dark) | Applied to |
|---|---|---|---|
| `elev.0` | none | none | everything by default |
| `elev.hairline` | `1px stroke.raised` top/left + `1px stroke.sunken` bottom/right | `1px stroke.raised` all round | **cards, rows** |
| `elev.float` | `0 8 24 rgba(0,0,0,.12)` + `0 2 6 rgba(0,0,0,.06)` | `0 8 24 rgba(0,0,0,.50)` | tab bar, FAB, floating map card |
| `elev.overlay` | `0 24 64 rgba(0,0,0,.18)` | `0 24 64 rgba(0,0,0,.60)` | sheets, dialogs |

On Android, `elev.float` maps to `elevation: 8` **and** the explicit shadow, since RN's Android shadow ignores colour on API < 28. On web, use `box-shadow`. Never use `shadowOpacity` on a transparent-background view — it renders the shadow *through* the view on Android.

---

## 6. Motion

Full choreography in `08-motion-spec.md`. The token layer:

| Token | Value |
|---|---|
| `duration.instant` | 0 ms |
| `duration.fast` | 140 ms |
| `duration.base` | 220 ms |
| `duration.slow` | 320 ms |
| `duration.deliberate` | 480 ms |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease.decelerate` | `cubic-bezier(0, 0, 0, 1)` |
| `ease.accelerate` | `cubic-bezier(0.3, 0, 1, 1)` |
| `spring.numeral` | `{ damping: 22, stiffness: 220, mass: 0.9 }` |
| `spring.press` | `{ damping: 18, stiffness: 320, mass: 0.7 }` |

Every one of these collapses to `duration.instant` when `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled()` is true — **except** the second-digit roll, which becomes a hard cut rather than disappearing (the information must still update).

---

## 7. Iconography

- 24 × 24 grid, **1.75 px stroke**, round caps and joins, no fills.
- Single-colour, always `currentColor` — this is what makes icons survive the black selected row and dark theme.
- Delivered as `react-native-svg` components generated from source SVG via `svgr`, so they are identical on native and web. Do **not** use an icon font (bad a11y, bad web layout shift) and do **not** use emoji (audit §8.7).

Required set for v1:

```
search  clock  globe  plus  close  chevron-left  chevron-right
sun  moon  sunrise  sunset  drag-handle  check  pin  share
settings  ellipsis  trash  star  arrow-up-right
```

Sizes: `icon.sm 16` · `icon.md 20` · `icon.lg 24` · `icon.xl 28`.

---

## 8. Imagery

City avatars: 1:1, masked to `radius.sm` squircle, `expo-image` with `contentFit="cover"`, a `blurhash` placeholder, and `recyclingKey={cityId}`.

- Mobile board applies a **desaturating treatment** to all but the first avatar. Implement as a real design decision, not an accident: avatars are rendered at `saturation: 0` except the focused one, which animates to full colour over `duration.base`. On native use a `ColorMatrix` via `@shopify/react-native-skia` or an `expo-image` `tintColor` overlay; on web use `filter: grayscale()`.
- Fallback when no photo exists: a `bg.card` tile with the city's two-letter code in `title`/`ink.secondary`. Never a broken-image box.

---

## 9. Density & platform deltas

| | iOS | Android | Web |
|---|---|---|---|
| Row height | 92 | 92 | 180 (card) |
| Min touch target | 44 × 44 | 48 × 48 | 44 × 44 |
| Tab bar | floating, respects home indicator (`useSafeAreaInsets().bottom`) | floating, + `navigationBar` edge-to-edge | none — header nav |
| Haptics | `expo-haptics` selection on row tap, impact on meridian snap | same | none |
| Scroll | bounce on | overscroll glow off (`overScrollMode="never"`) | native |

Minimum touch target is enforced with `hitSlop`, never by inflating the visual. The ruler ticks on the map screen are 13 pt tall visually and 44 pt tall in hit area.

---

## 10. Token pipeline

The project builds on Ignite, whose theme system consumes these tokens directly ([ADR-0008](adr/0008-ignite-theming-over-nativewind.md)). There is no CSS or Tailwind generation step.

```
design/tokens.json          ← canonical, tool-readable record of every value
        │
        └─ compiled by hand into ↓
design/ignite-theme/
        colors.ts  colorsDark.ts        → src/theme/
        spacing.ts  spacingDark.ts
        typography.ts  timing.ts
        radius.ts  (new — Ignite has no radius scale)

pnpm tokens:contrast   → re-checks every documented pair in BOTH themes; fails CI on a regression
```

Ignite spellings for every token in this document: `14-ignite-integration.md` §3.5.

`/token-check` verifies that no `src/**` file outside `src/theme/` contains a hex literal, a bare `fontSize`, a numeric `borderRadius`, or a `className`.

**When adding a colour, add the key to `colors.ts` *and* `colorsDark.ts`.** The two files must have identical keys — a mismatch fails at runtime, not at compile time.
