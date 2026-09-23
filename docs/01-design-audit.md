# 01 — Design Audit & Pixel Read

**Source material:** two mockups supplied by the client — a 3-screen mobile board and a 1-screen desktop/web board for the same product.
**Method:** raster analysis of both PNGs (dominant-colour histogram, edge-transition scanning along rows/columns, glyph bounding boxes, corner-radius curve fitting), then conversion into logical units using a derived export scale.

Everything in §1–§6 is *measured*. Everything in §7 is *judgement*. §8 lists defects in the mockups that must **not** be reproduced in code.

---

## 1. Reference frames and export scale

### Mobile board (`2048 × 1460 px`)

| Measurement | Value |
|---|---|
| Device screen bounds (phone 1) | x 158 → 682, y 224 → 1358 |
| Screen size in image px | **524 × 1135** |
| Aspect ratio | 2.166 |
| Closest real device | iPhone 15 / 16 — 393 × 852 pt (ratio 2.168) |
| **Derived export scale** | **0.75 pt per image px** (i.e. the board was drawn at 393 pt and exported at 4/3×) |

> The 4/3 export scale is a strong signal: it makes every derived value land on or very near a whole point. All mobile numbers below are `image px × 0.75`.

### Web board (`1878 × 1354 px`)

| Measurement | Value |
|---|---|
| App panel bounds | x 33 → 1851, y 33 → 1313 |
| Panel size in image px | **1819 × 1281** |
| Content block (card row) | x 118 → 1766 = 1648 px |
| Panel inset (gutter) | 85 px each side |
| **Derived export scale** | **0.792 px per image px** |

Cross-check: `1648 × 0.792 = 1305 px` content + `2 × 67 px` gutter = **1439 px ≈ 1440 px viewport**. The board is a 1440-wide desktop frame. Accepted as the web reference viewport.

---

## 2. Colour — sampled, not eyeballed

Dominant-colour histogram over both boards, plus point samples at 18 locations.

| Role | Sampled RGB | Hex | Notes |
|---|---|---|---|
| App canvas | (232, 232, 232) | `#E8E8E8` | 690 k px on web board — the single dominant colour |
| Card interior | (233, 232, 233) | `#E9E8E9` | **Within 1/255 of the canvas** — see §3 |
| Ink / selected card fill | (0, 0, 0) | `#000000` | 166 k px |
| Web page frame | (212, 79, 36) | `#D44F24` | 52 k px — brand orange, used only as the page bezel |
| Secondary label ("Current") | (122, 122, 122) | `#7A7A7A` | ⚠️ fails AA — see §8.5 |
| Map landmass | (129, 130, 130) | `#828282` | phone 3 |
| Map meridian line | ~(193, 99, 100) at 1-px width, heavily anti-aliased | ≈ `#D9433B` | thin red rule, 1 pt |
| Mockup board backdrop | (130, 130, 130) | `#828282` | presentation only — not a product colour |

**There is no white in the light theme except inside pill controls and circular buttons.** The palette is effectively three values: one grey, black, and orange.

## 3. The card is a *stroke*, not a *fill*

This is the single most important finding and the easiest thing to get wrong.

Edge-scanning a column through the phone-1 list gives this transition sequence at each card boundary:

```
…232, 232, 235, 253, 255, 248, 235, 232, 232…
                  ▲
                  1-px highlight, near-white
```

The card interior (`#E9E8E9`) and the page canvas (`#E8E8E8`) differ by **one level out of 255** — imperceptible. What separates a card from the background is a **1-px near-white highlight stroke on the top/left and a 1-px shadow stroke on the bottom/right**. A soft-emboss hairline, not a raised panel.

**Implementation consequence:** do *not* build cards as `backgroundColor: '#FFF'` with a drop shadow. Build them as `backgroundColor: surface.card` (+2 levels over canvas) with `borderWidth: 1` and a two-tone border, or a 1-px inset highlight. Shadows are reserved for genuinely floating elements only (tab bar, FAB, map card) — see §6.

## 4. Geometry — mobile (converted to pt)

| Element | Image px | **pt** | Token |
|---|---|---|---|
| Screen gutter (left/right) | 39–40 | **29.5 → 28** | `space.gutter.mobile` |
| List card width | 445 | 334 | derived: `screen − 2 × gutter` |
| List card height | 124 | **93 → 92** | `size.row.height` |
| List card vertical pitch | 141 | 105.75 | — |
| Gap between cards | 17 | **12.75 → 12** | `space.3` |
| List card corner radius | 24 | **18 → 16** | `radius.md` |
| Tab bar button diameter | ~72 | **54 → 56** | `size.control.lg` |

Corner-radius fit (black "Los Angeles" card, top-left corner, loose threshold):

```
Δy from top:  0   2   4   6   8  10  12  14  16  18  20  22  24
inset (px):  23  16  12  10   8   6   5   3   2   2   1   0   0
```

Inset reaches zero at Δy ≈ 22–24 px → **r ≈ 24 px = 18 pt**. Normalised to **16 pt** (the web board measures 16 px for the same component; a 2-pt delta is not perceptible and one token is worth more than two).

## 5. Geometry — web (converted to px @ 1440)

| Element | Image px | **px @1440** | Token |
|---|---|---|---|
| Page bezel (orange frame) | 33 | 26 | `space.frame` |
| App panel corner radius | ~40 | 32 | `radius.xl` |
| Content gutter | 85 | **67 → 64** | `space.gutter.desktop` |
| Content max-width | 1648 | **1305 → 1312** | `size.container` |
| City card width | 404 | **320** | 4-up grid |
| City card height | 227 | **180** | `size.cityCard.height` |
| City card gap | 11 | **9 → 12** | `space.3` |
| City card radius | 20 | **16** | `radius.md` |
| Hero band height | 686 | 543 | — |
| Divider | 1 px, `#DCDCDC`-ish | 1 | `stroke.sunken` |

`1312 + 2 × 64 = 1440` ✓ — the grid closes exactly. Confirms both the scale derivation and the token values.

## 6. Typography — glyph bounding boxes

Measured cap/ascender heights, converted with each board's scale, then divided by a 0.727 cap-height ratio (typical neo-grotesk) to recover the nominal size. Advance-width cross-checks agree within ~4 %.

| Element | Board | bbox h (px) | Derived size | **Token** |
|---|---|---|---|---|
| Hero clock `08` | mobile | 143 | ~150 pt | `display.hero` **144** |
| Hero clock `08:15:40` | web | 307 | ~330 px | `display.hero` **fluid → 320** |
| City title `Los Angeles,` | mobile | 53 | ~55 pt | `display.lg` **56** |
| `London, United Kingdom` | web | 166 (2 lines) | ~64 px | `display.lg` **64** |
| Screen title `World Time` | mobile | 38 | ~38 pt | `display.md` **36** |
| Row time `01:40` | mobile | 47 | ~48 pt | `numeral.lg` **48** |
| Card time `08:15` | web | 80 | ~87 px | `numeral.lg` **80** |
| City name `Tokyo` | mobile | 24 (cap+desc) | ~19 pt | `title` **20** |
| Offset label `UTC+9` | mobile | 15 | ~15.5 pt | `label` **15** |
| `Current` | web | — | ~16 px | `label` **16** |

**Typeface identification.** Single-storey `g`, flat-sided `0`, perfectly circular colon dots, closed `4`, near-monolinear strokes, tight apertures. This is a contemporary neo-grotesk in the *PP Neue Montreal / Suisse Int'l* family. Recommended free substitutes, in order: **Geist** (OFL, excellent tabular figures), **General Sans** (Fontshare), **Space Grotesk** (OFL, quirkier). See `02-design-system.md` §2 for the final call.

**Numeral behaviour.** Every clock in both boards is horizontally stable — digits do not jitter as they change. The design *requires* **tabular (monospaced) figures**. This is non-negotiable and is the #1 thing that separates a professional clock UI from an amateur one.

## 7. Interaction model inferred from the boards

Not measurable — read from affordances and consistent across the three mobile screens.

| Screen | Evidence | Inferred behaviour |
|---|---|---|
| **List** (phone 1) | 5 rows, one black | Single-selection list. Black row = the "focused" city whose detail the Clock tab shows. |
| | Photo strip in header, 5 avatars matching 5 rows | Horizontal quick-switcher, tap to focus, order mirrors the list. |
| | `+` circle top-right | Add city → search sheet. |
| **Clock** (phone 2) | Ghosted `14` / `46` above and below `15` | **Odometer roll on the seconds digit.** Adjacent values are visible and blurred — a continuous vertical scroll, not a fade. |
| | `12h / 24h` pill | Persistent global preference, not screen-local. |
| | `Sun ☀ 10h 06m · 07:12 – 17:17` | Sunrise/sunset + day-length for the focused city and date. |
| **Map** (phone 3) | Red vertical meridian, ruler `UTC −1 … +3` with `+1` bold | **Draggable meridian.** The ruler is the scrub track; the floating card reflects whatever zone the meridian sits over. |
| | Hatched region, upper-right of the map | Night side / terminator shading. |
| | Algeria filled black, pin on it | The city matching the meridian's zone is highlighted. |
| **All** | 3 circular buttons, one black | Floating tab bar, `search · clock · globe`. Active = filled black. |
| **Web** | Same content, one viewport | Hero = focused city, card row = saved cities, no tab bar — navigation collapses into the header. |

## 8. Defects in the mockups — do **not** reproduce

These are real errors. Fixing them silently in code and documenting them here is the correct move; shipping them is not.

### 8.1 🔴 Web card UTC offsets are shuffled — wrong data

| Card | Mockup offset | Mockup time | Correct offset (24 Mar 2025) |
|---|---|---|---|
| Los Angeles | `UTC-8` | 00:15 | **UTC−7** (PDT — US DST began 9 Mar) |
| New York | `UTC+2` ❌ | 03:15 | **UTC−4** (EDT) |
| London | `UTC-5` ❌ | 08:15 | **UTC+0** (GMT — BST begins 30 Mar) |
| Paris | `UTC+0` ❌ | 09:15 | **UTC+1** (CET) |

The *times* are internally consistent with London = 08:15 on a **standard-time** basis; the *labels* have been rotated by two positions. Three of four are wrong.

### 8.2 🔴 DST is ignored throughout

On **24 Mar 2025**, Los Angeles is on PDT (UTC−7), so with London at 08:15 LA is **01:15**, not 00:15. The same class of error appears on the mobile board (20 Mar: LA shown 8 h behind London; the true gap is 7 h).

**Rule for implementation:** offsets are *derived*, never stored. The only persisted value is the IANA zone ID (`America/Los_Angeles`). Any literal `UTC-8` in the codebase is a bug. See `06-data-model.md` §4 and the `timespot-timezone-correctness` skill.

### 8.3 🟠 Day-length arithmetic is off by one minute

`07:12 → 17:17` is 10 h 05 m; the board reads `10h 06m`. Compute, don't hardcode.

### 8.4 🟠 Web hero mixes two cities' data

The hero shows **London** as the city, but carries Los Angeles' sun times (`07:12 – 17:17`, lifted from the mobile board). Sun data must bind to the focused city.

### 8.5 🟠 Secondary text fails WCAG AA

`#7A7A7A` on `#E8E8E8` = **3.50 : 1**. AA requires 4.5 : 1 for text below 24 px / 18.66 px bold.

| Candidate | Contrast on `#E8E8E8` | Verdict |
|---|---|---|
| `#8A8A8A` | 2.82 | ✗ |
| `#7A7A7A` *(mockup)* | 3.50 | ✗ for body, ✓ for ≥24 px |
| `#6B6B6B` | 4.35 | ✗ (marginal) |
| **`#5C5C5C`** | **5.46** | **✓ AA, ✓ AAA-large** |

**Resolution:** `ink.secondary = #5C5C5C` for all text below 24 pt. The mockup grey is retained as `ink.tertiary`, permitted **only** at ≥24 pt where the 3 : 1 large-text threshold applies. The visual difference at label sizes is negligible; the compliance difference is not.

### 8.6 🟠 Brand orange is not text-safe

`#D44F24` on white = **4.25 : 1** — fails AA for body text. Keep it as a surface/bezel colour. For orange *text* or links use `accent.text = #A93B18` (6.31 : 1 on white, 5.15 : 1 on canvas).

### 8.7 🟡 Emoji used as UI iconography

`☀️` / `🌙` are system emoji. They render differently on iOS, Android, Windows and Linux; they cannot inherit `currentColor` (so they break inside the black selected card and in dark theme); they are announced verbosely by screen readers ("sun with face"). **Replace with vector icons** carrying `accessibilityLabel="Daytime" / "Night-time"`.

### 8.8 🟡 Inconsistent offset formatting

The mobile list shows `UTC +0` (with space) but `UTC+9`, `UTC-8` (without). One formatter, one output: `UTC+00:00` style or `UTC+9` style — pick one. Spec picks the compact form with no space and no `+00:00` padding for whole hours, and `UTC+5:45` for sub-hour zones (Kathmandu, Chatham, Eucla — 🇳🇵 `+5:45`, 🇳🇿 `+12:45`, 🇦🇺 `+8:45` all exist and *will* break a naïve integer-offset formatter).

### 8.9 🟡 No dark theme exists in the mockups

A clock app is opened at night more than any other category of utility. Dark theme is not optional and is specified from first principles in `02-design-system.md` §1.3.

### 8.10 🟡 No empty, loading, error or overflow states

The boards show five cities and four cards, all with short names. Specified in `04-screen-specs.md`: zero cities, one city, 40 cities, and `Asia/Ho_Chi_Minh` → "Ho Chi Minh City" at 20 pt in a 334 pt row.

---

## 9. What the mockups get right (preserve these)

1. **Monochrome discipline.** One grey, one black, one orange. The only colour in the interface carries meaning (day/night, meridian). Do not add a second accent.
2. **Type as the interface.** The clock is the layout. Resist shrinking the hero to make room for chrome.
3. **Hairline cards.** The near-zero fill delta is what makes the surface feel like paper rather than plastic.
4. **Circular controls.** Tab bar, `+`, logo — all perfect circles. This is the product's shape language.
5. **The pill toggle.** `12h/24h` as a physical switch is more legible than a settings row.
6. **Photographic city avatars** as the only imagery, always masked into a squircle, always desaturated on mobile so they never compete with the type.

---

## 10. Open questions for the client

None of these block Phase 1.

1. **Photo source for city avatars.** Licensed stock, Unsplash API, or user-picked? Affects offline behaviour and store review. *Default assumed: bundled, hand-curated set for the top 60 cities; generated monogram tile for everything else.*
2. **Account system.** The web board has `Log In`. Is cross-device sync in scope? *Default assumed: no accounts in v1; local persistence only; `Log In` deferred.*
3. **`Get the App`** implies a store presence before the web launch. *Default assumed: web ships first as an acquisition surface, deep-linking to the stores.*
4. **Meeting planner.** The strongest natural extension of the meridian scrubber, absent from the boards. *Default assumed: v1.1, designed for but not built.*
