# 04 — Screen Specifications

Every screen, every state, with the measured geometry from `01-design-audit.md`. Mobile values are **pt** at a 393 × 852 reference. Web values are **px** at a 1440 reference unless a breakpoint is named.

Route map (Expo Router):

```
app/
├─ _layout.tsx                    root: providers, fonts, theme, safe area
├─ (tabs)/
│   ├─ _layout.tsx                floating tab bar (native) / header nav (web)
│   ├─ index.tsx                  S1 · List            →  /
│   ├─ clock.tsx                  S2 · Clock           →  /clock
│   └─ map.tsx                    S3 · Map             →  /map
├─ search.tsx                     S4 · Add city (modal / sheet)
├─ city/[id].tsx                  S5 · City detail (native push, web page)
├─ time/[slug]+api.ts             SEO route data loader (web)
├─ time/[slug].tsx                S6 · Public city page (web-only, statically generated)
├─ settings.tsx                   S7 · Settings (sheet)
└─ +not-found.tsx
```

---

## S1 · List — "World Time"

The home screen. Reference: mobile board, phone 1.

### Layout (mobile, 393 × 852)

```
 ┌───────────────────────────────────────────┐
 │ ← 28 →                          ← 28 →    │  safe-area top + 12
 │ ▣▣▣▣▣                              ( + )  │  avatar strip 44h · FAB 44⌀
 │                                            │  32
 │ World Time                                 │  display.md 36
 │                                            │  20
 │ ┌────────────────────────────────────┐    │
 │ │ UTC+9                       ☾      │    │  row · 334 × 92 · radius 16
 │ │ Tokyo               01:40          │    │
 │ └────────────────────────────────────┘    │
 │                                       12   │
 │ ┌────────────────────────────────────┐    │
 │ │ …                                  │    │
 │                                            │
 │              ( ⌕ ) ( ◷ ) (🌐)              │  tab bar, floating
 └───────────────────────────────────────────┘  safe-area bottom + 16
```

### Header — avatar strip

| Property | Value |
|---|---|
| Avatar size | 44 × 44, `radius.sm` squircle |
| Overlap | −8 (each avatar sits 36 pt after the previous) |
| Max visible | 6, then a `+N` tile in `bg.card` / `ink.secondary` |
| Scroll | horizontal, `showsHorizontalScrollIndicator={false}`, snaps to avatar |
| Focused avatar | full saturation + 2 pt `ink.primary` ring at 2 pt offset; others `grayscale(1)` |
| Tap | focuses that city (does **not** navigate) |
| Order | mirrors list order exactly — dragging a row reorders the strip |
| a11y | `role="tablist"`, each avatar `role="tab"`, label `"{city}, {time}, {day|night}"` |

### Header — add button

44 ⌀ circle · `bg.control` · `elev.float` · `plus` icon 20 · `ink.primary`
`accessibilityLabel="Add a city"` · opens `S4` as a sheet (native) / modal (web).

### City row — anatomy

```
┌──────────────────────────────────────────────┐
│  16                                     16   │  padding
│  UTC+9                              ☾        │  label 15 · ink.secondary
│  Tokyo                    01:40              │  title 20        numeral.lg 48
│                                              │
└──────────────────────────────────────────────┘
   ← 334 →                            92 tall
```

| Zone | Content | Type | Colour (default) | Colour (selected) |
|---|---|---|---|---|
| top-left | UTC offset | `label` 15 | `ink.secondary` | `ink.onInverseSecondary` |
| bottom-left | city name | `title` 20 | `ink.primary` | `ink.onInverse` |
| right | local time | `numeral.lg` 48, tabular | `ink.primary` | `ink.onInverse` |
| top-right | day/night icon | `icon.md` 20 | `state.day` / `state.night` | same |

- Time is **right-aligned and baseline-locked** to the city name's baseline, so all rows' times form a clean right column regardless of name length.
- City name truncates at **one line**, `ellipsizeMode="tail"`. The time column is fixed-width (computed from `"00:00"` at `numeral.lg` + tabular figures), so the name gets `flex: 1` of whatever remains.
- Offset formatting: `UTC+9`, `UTC−7`, `UTC+5:45`, `UTC+0`. Minus is **U+2212**, not a hyphen. No space after `UTC`.

### Row states

| State | Treatment |
|---|---|
| default | `bg.card` + `elev.hairline` |
| pressed | `scale 0.985` over `duration.fast` with `spring.press`; no colour change |
| **selected** | `bg.inverse`, all text `ink.onInverse`, hairline removed |
| dragging | `scale 1.03`, `elev.overlay`, siblings shift with a 260 ms layout animation |
| swiped (native) | reveals a `trash` action in `ink.accent`; full swipe deletes with undo toast |
| focus-visible (web) | `stroke.focus` 2 px ring, 2 px offset |

### Interactions

| Gesture | Result |
|---|---|
| tap | focus this city (selection moves); no navigation |
| double-tap / tap on selected | push `S5` city detail |
| long-press | enter reorder mode (haptic `impactMedium`) |
| drag | reorder, persisted on release |
| swipe left | delete with 5 s undo |
| pull down | no refresh (nothing to refresh) — disabled deliberately |

### Empty state (zero cities)

Centred block, replaces the list:
- `globe` icon 48, `ink.tertiary`
- `headline` 24 — "No cities yet"
- `body` 16, `ink.secondary` — "Add a city to see its time next to yours."
- Primary button, `bg.inverse` pill, 48 h — "Add your first city"
- The user's **own** zone is auto-added on first launch, so this state is only reachable by deleting everything. It must still be correct.

### Overflow states

- **1 city:** list renders normally; the avatar strip hides (a strip of one is noise).
- **40 cities:** `FlashList` with `estimatedItemSize={104}`; the strip caps at 6 + overflow tile.
- **Long name:** `"Ho Chi Minh City"` at `title` 20 in a 334-pt row with a 48-pt time — measured to fit at 16 chars; 17+ truncates. Verified in visual tests.

### Web adaptation

At `≥ 768 px` the list becomes a responsive grid of **city cards** (the web board's lower band), 180 px tall:

```
┌─────────────────────────┐
│ London          UTC+0   │  title 24 · label 16 ink.secondary
│                         │
│ 08:15        ☀ Day      │  numeral.lg 80 · label 16
└─────────────────────────┘
   320 wide · radius 16
```

Columns: `1 / 2 / 3 / 4` at `<560 / <900 / <1200 / ≥1200`, `gap 12`, container `1312`.
Selected card = `bg.inverse` (matches the board).

---

## S2 · Clock — focused city detail

Reference: mobile board, phone 2. The showpiece.

### Layout (mobile)

```
 ┌───────────────────────────────────────────┐
 │ (◐)                        [ 12h | 24h ]  │  44⌀ mark · pill 36h
 │                                            │  40
 │  08            Thu,                        │  display.hero 144
 │                20 Mar                      │  display.md 36, right-aligned
 │  40  15                                    │  hero + display.xl 72 (seconds)
 │      ⋮ghost                                │
 │                                            │  48
 │  Los          Sun ☀ : 10h 06m              │  display.lg 56   label 15
 │  Angeles,     07:12 – 17:17                │
 │  California,                               │
 │  USA                                       │
 │                                            │
 │              ( ⌕ ) (◷) (🌐)                │
 └───────────────────────────────────────────┘
```

### The hero clock

Three stacked numeral blocks:

| Block | Token | Content | Notes |
|---|---|---|---|
| hours | `display.hero` 144 | `08` | always 2 digits, tabular |
| minutes | `display.hero` 144 | `40` | |
| seconds | `display.xl` 72 | `15` | sits on the minutes' baseline, `space.4` to its right |

- Baseline grid: hour block and minute block are stacked with `lineHeight 0.86` so the two blocks nearly touch. Measured from the board: the `08` cap-bottom to `40` cap-top gap is ≈ 8 pt.
- `Thu,` / `20 Mar` is a two-line right-aligned block, top-aligned to the hour block's cap height, `display.md` 36.
- **Odometer:** the seconds block shows the previous and next values above and below, blurred and at `ink.tertiary`, sliding on each tick. Precise spec in `08-motion-spec.md` §3. In 12-h mode the `AM`/`PM` marker sits below the seconds at `label` 15, `ink.secondary`.

### City block

`display.lg` 56, `ink.primary`, wrapping naturally as `"Los Angeles, California, USA"` over up to 4 lines. Composition is `{city}, {admin1}, {country}` — `admin1` is omitted when it duplicates the city (Singapore, Monaco) or when the country has no meaningful first-level division in the dataset.

### Sun block

Right-aligned beside the city block, `label` 15:

```
Sun ☀ : 10h 05m
07:12 – 17:17
```

- Icon, not emoji. Day length is **computed** (audit §8.3).
- Polar cases: if the sun does not rise, render `Polar night` and the date the sun next rises; if it does not set, `Midnight sun`. Tromsø and Ushuaia are the test fixtures.

### Header controls

- **App mark** (left): 44 ⌀, `bg.inverse`, the sun/clock glyph in `ink.onInverse`. Tapping opens `S7` Settings.
- **12h/24h pill** (right): track `bg.control`, 36 h, `radius.pill`, two 44 × 36 segments; the active segment is a `bg.inverse` pill that **slides** between positions over `duration.base` with `ease.standard`. `role="radiogroup"`, each segment `role="radio"`.

### Web adaptation

The web board's hero band, at container width:

```
08:15:40                                   display.hero clamp(96,22vw,320)
Current        Sun ☀ : 07:12 – 17:17 (10h 05m)     [12h|24h]
               Monday, Mar 24 2025
───────────────────────────────────────────────────  stroke.sunken
```

- Hero is a single line `HH:MM:SS` with colons at `ink.primary`; on `< 560 px` it wraps to `HH:MM` over `SS`.
- Three-column meta row: `Current` label left, sun + date centre, toggle right. Collapses to stacked at `< 900 px`.
- `Current` is replaced by the city name when the focused city is not the device zone.

---

## S3 · Map — meridian scrubber

Reference: mobile board, phone 3. The most novel screen and the highest implementation risk.

### Layout (mobile)

```
 ┌───────────────────────────────────────────┐
 │ ▣▣▣▣▣                              ( + )  │
 │ World Time                                 │  display.md 36
 │ ─────────────────────────────────────────  │  stroke.sunken
 │                        ┊                   │
 │    world map           ┊ meridian          │  map fills available height
 │                        ◉ marker            │
 │      ┌──────────────────────────────┐      │
 │      │ UTC+1                  ☀     │      │  floating card, elev.float
 │      │ Algiers        17:40         │      │  radius 16
 │      └──────────────────────────────┘      │
 │  UTC−1   UTC 0   UTC+1   UTC+2   UTC+3     │  ruler, caption 13
 │              ( ⌕ ) ( ◷ ) (🌐)              │
 └───────────────────────────────────────────┘
```

### Map

- **Source:** Natural Earth 1:110 m admin-0 countries → TopoJSON → simplified to ≈ 30 KB → SVG paths, rendered with `react-native-svg`. Equirectangular projection (plate carrée) — mandatory, because it makes longitude linear, which is what makes the meridian and the ruler agree.
- Land `map.land`, no borders except at the country of the focused city, which fills `map.landActive`.
- **Terminator:** the night hemisphere as a `map.night` overlay. Computed from the solar declination and the Greenwich hour angle for the current instant, as a path with a sinusoidal boundary. Recomputed once per minute, not per second.
- Low-end devices (`expo-device` tier check or `> 16 ms` first paint): swap to a pre-rendered raster at 2×.

### Meridian

- 1-pt vertical rule in `state.meridian`, full map height, with a 10 ⌀ ring marker at the focused city's latitude.
- **Drag:** `Gesture.Pan()` from `react-native-gesture-handler`, driven on the **UI thread** with Reanimated. `translateX` is a shared value; the derived zone label is computed in a `useDerivedValue` and written back to JS with `runOnJS` **throttled to 60 ms** — never per frame.
- Snapping: releases snap to the nearest whole UTC offset with `spring.press`, plus `Haptics.selectionAsync()`. Half- and quarter-hour zones are snap targets too.
- Tapping a ruler tick animates the meridian to it over `duration.base`.

### Ruler

- Horizontal `ScrollView`, ticks every 1 h from UTC−12 to UTC+14 (**+14 is real** — Kiritimati).
- Tick label `caption` 13 `ink.secondary`; active tick `ink.primary` weight 600 with a `radius.xs` `bg.card` chip behind it.
- Hit area 44 pt tall via `hitSlop` even though the visual is 13 pt.
- The ruler and the meridian are two views of one shared value — moving either moves the other, with no JS round-trip.

### Floating card

Identical anatomy to the S1 row (offset / city / time / day-night) but `elev.float`, `bg.inverse`, positioned at the map's lower third, horizontally centred on the meridian and **clamped** to the gutter so it never leaves the screen.

If the meridian's offset matches **no saved city**, the card shows the representative city for that zone from the dataset, with a `plus` affordance — "Add Algiers".

### Web adaptation

Map becomes a full-width band inside the container, `16 : 9` at `≥ 900 px`, `4 : 3` below. Meridian drag works with the mouse and with **← / →** keys (1 h per press, `Shift` for 15 min). The ruler is always visible; the floating card docks to the right at `≥ 1200 px`.

---

## S4 · Search — add a city

Native: `@expo/ui` `BottomSheet` at 92 % height. Web: centred modal, 560 × 640, `radius.lg`, scrim `bg.scrim`.

| Element | Spec |
|---|---|
| Field | `@expo/ui` `TextInput`, `headline` 24, `search` icon leading, `close` trailing, autofocus, `returnKeyType="search"` |
| Results | `FlashList`, 64 pt rows: city `title` 20 / `ink.primary`, `{admin1}, {country}` `label` 15 / `ink.secondary`, right-side current local time `numeral.md` 32 |
| Matching | diacritic-insensitive, prefix-weighted fuzzy over `name`, `asciiName`, `altNames`; ties broken by population |
| Latency | **< 30 ms** for the whole list on a 5 000-city index — pre-built inverted index, searched off the JS thread where available |
| Empty query | "Popular cities" — top 12 by population, plus the device zone pinned first |
| No results | "No city called '{q}'." + "Search by UTC offset instead" → filters the dataset by zone |
| Already added | row is dimmed with a `check`; tapping focuses it and dismisses |
| a11y | `role="searchbox"`, `aria-controls` the listbox, `aria-activedescendant` follows arrow keys; ↑/↓/Enter/Escape all work on web |

---

## S5 · City detail (native push / web page)

Everything on `S2` for a non-focused city, plus:

- **Difference strip** — "+9 h from you", `headline` 24. Negative values use U+2212.
- **Overlap band** — a 24-h horizontal bar showing where this city's 09:00–18:00 intersects yours, shaded `ink.primary` at 12 % with the overlap hours labelled. This is the single highest-value piece of information for P1 and costs one component.
- **Actions** — `Set as focus` · `Share` · `Remove`.

## S6 · Public city page (web only)

Statically generated at build time for the top 1 000 cities. `/time/tokyo`, `/time/new-york`.

- H1 is the clock itself: `08:15:40` with `aria-label="Current time in Tokyo is 8:15 AM"`.
- Below: date, offset, DST status and the next DST transition date, sunrise/sunset, a difference table against 6 major zones.
- **SEO:** `<title>Time in Tokyo, Japan — current local time</title>`, meta description, canonical, `hreflang` when localised, and `JSON-LD` (`@type: Place` + a `WebPage` with `dateModified`).
- Rendered **server-truthful**: the static HTML carries the server's render-time value for crawlers; the client corrects to the real time on hydration within one frame. Never ship a stale time to a user.
- OG image generated at build per city (`satori` → PNG) showing the city name and a representative clock face.
- CTA to the app stores, below the fold.

## S7 · Settings (sheet)

`@expo/ui` `FieldGroup` — this is exactly the case where native-feeling system controls beat custom ones.

- Theme: System / Light / Dark (`Picker`)
- Time format: 12 h / 24 h (`Switch`)
- Show seconds on the list (`Switch`, default off — saves a per-second re-render across N rows)
- Temperature-style day/night: by icon / by card tint (`Picker`)
- About, licences (GeoNames CC-BY attribution), privacy, version + build number.

---

## Cross-screen rules

1. **One clock source.** Every time on screen derives from a single `useClock()` tick. Two independent intervals will drift and show `08:39` next to `08:40`.
2. **The tab bar floats over content**, so every scroll container carries `contentInset.bottom = tabBarHeight + space.4`.
3. **Focus is global.** Changing focus on any screen changes it on all of them, and it persists across launches.
4. **Every screen works at 200 % text scale.** Hero sizes are capped (they are already display-scale); body and label sizes scale fully. Verified in `11-testing-strategy.md` §5.
