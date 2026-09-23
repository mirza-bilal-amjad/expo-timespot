# 09 — Accessibility

**Target: WCAG 2.2 Level AA on all three surfaces**, verified — not assumed.

A clock is a high-value target for accessibility work: it is one of the most common things a screen-reader user checks, and it is trivially easy to build one that announces "zero eight colon four zero" sixty times a minute. Getting this right is cheap here and very visible.

---

## 1. Contrast — resolved

The mockups fail AA in two places. Both are fixed at the token layer, so no component can reintroduce them.

| Issue | Mockup | Fix | Ratio after |
|---|---|---|---|
| Secondary text | `#7A7A7A` on `#E8E8E8` = **3.50** ✗ | `ink.secondary = #5C5C5C` | **5.46** ✓ |
| Orange text | `#D44F24` on white = **4.25** ✗ | `ink.accent = #A93B18` | **6.31** ✓ |

`#7A7A7A` survives as `ink.tertiary`, usable **only at ≥ 24 pt** where the 3 : 1 large-text threshold applies (odometer ghost digits, ruler ticks at display size).

Full ledger in `02-design-system.md` §1.4. `pnpm tokens:contrast` recomputes every documented pair and fails CI on regression — including for the dark theme, which was designed against the same thresholds.

**Non-text contrast (1.4.11):** the card hairline is ~1.2 : 1 against the canvas and therefore cannot be the *only* indicator of anything. It is decorative; selection is carried by a full background inversion (17 : 1), and focus by a 2 px `stroke.focus` ring.

---

## 2. Screen readers

### The clock — the thing most apps get wrong

```tsx
<View
  accessible
  accessibilityRole="text"
  accessibilityLabel="8:40 AM, Thursday 20 March, Los Angeles"
  aria-live="off"
>
  {/* every digit below is aria-hidden / importantForAccessibility="no" */}
</View>
```

Three rules:

1. **One node, one sentence.** The hero clock is a single accessible element. Its digits, colons and the odometer strip are all hidden from the tree. Otherwise VoiceOver reads "zero, eight, colon, four, zero, one, five".
2. **`aria-live="off"` / no `accessibilityLiveRegion`.** A clock that announces itself every second is unusable. The value is read on focus, on demand.
3. **Natural language, not the display string.** "8:40 AM", not "08:40". Built from `Intl.DateTimeFormat` with the user's locale so it is correct in every language, and it respects the 12/24 h preference.

A **"Read current time"** action is exposed via `accessibilityActions` on the hero (and `⌘+.`-style on web is not needed — focus + `Enter` re-announces).

### City rows

One accessible node per row, not four:

```tsx
accessibilityRole="button"
accessibilityLabel="Tokyo, 1:40 AM, night-time, 9 hours ahead of UTC"
accessibilityState={{ selected: true }}
accessibilityHint="Double tap to focus this city"
accessibilityActions={[
  { name: 'activate', label: 'Focus' },
  { name: 'magicTap', label: 'Open details' },
  { name: 'delete',   label: 'Remove city' },
]}
```

- `"9 hours ahead of UTC"`, not `"UTC+9"` — screen readers pronounce the latter as "utc plus nine" at best.
- Day/night is in the label, never colour-only (1.4.1).
- Reordering: `accessibilityActions` `moveUp` / `moveDown`, so drag-and-drop is not the only way to reorder (2.5.7 Dragging Movements, new in WCAG 2.2).

### The map

The meridian scrubber is a **slider**:

```tsx
accessibilityRole="adjustable"
accessibilityLabel="Time zone selector"
accessibilityValue={{ min: -12, max: 14, now: 1, text: 'UTC plus 1, Algiers, 5:40 PM' }}
onAccessibilityAction={/* increment / decrement by one hour */}
```

VoiceOver swipe-up/down and TalkBack volume-key adjustment both move it one zone. The SVG map itself is `aria-hidden` — it is decorative; the information is in the card and the slider value.

**Critical:** the map screen must be fully usable without the map. The ruler + card is the accessible interface; the drawing is illustration.

---

## 3. Keyboard (web)

Full shortcut table in `07-responsive-strategy.md` §4. The requirements:

- **Visible focus everywhere** (2.4.7, and 2.4.11 *Focus Not Obscured* — the floating tab bar must never cover a focused element, so scroll containers add `scroll-padding-bottom: tabBarHeight + 16px`).
- **Logical tab order** matching the visual order. No positive `tabIndex` anywhere.
- **Focus trap in modals**, with focus returned to the trigger on close (2.4.3).
- **`Esc` closes** every overlay (2.1.2 — no keyboard trap).
- **Skip link** to main content as the first focusable element.
- Shortcuts are single-key, so per 2.1.4 they are disabled while a text input has focus and can be turned off in Settings.

---

## 4. Motor

- **Targets ≥ 44 × 44** (iOS) / **48 × 48** (Android) / **24 × 24 minimum** on web (2.5.8). Achieved with `hitSlop`, never by inflating the visual — the ruler ticks look 13 pt and hit 44 pt.
- **No path-based gestures** required (2.5.1). Everything reachable by tap.
- **Drag has a non-drag alternative** (2.5.7): reorder via accessibility actions, delete via a long-press menu as well as swipe.
- **Undo for every destructive action** (3.3.4). Delete shows a 5 s undo toast; nothing is unrecoverable without confirmation.
- Long-press threshold 500 ms, adjustable via the OS setting — do not hardcode a custom timing.

---

## 5. Cognitive & visual

| Requirement | Implementation |
|---|---|
| Text scaling to 200 % (1.4.4) | body/label scale unbounded; display variants cap at 1.3×; every screen tested at 200 % |
| Reflow at 320 px (1.4.10) | no horizontal scroll at 320 CSS px / 400 % zoom |
| Text spacing (1.4.12) | no fixed-height text containers; line-height overridable |
| Reduced motion (2.3.3) | `08-motion-spec.md` §8 |
| Reduced transparency | scrim becomes opaque `bg.canvas` at 94 % |
| Increased contrast (iOS) | swaps to a high-contrast token set: `ink.secondary → #3D3D3D`, hairlines → `#000` |
| Colour is never sole meaning (1.4.1) | day/night has icon + label; selection has inversion + `accessibilityState` |
| Consistent help (3.2.6) | Settings → About is in the same place on every surface |
| Language (3.1.1) | `lang` on the web document; `accessibilityLanguage` where content differs |

---

## 6. Internationalisation

- All strings in `src/i18n/en.json` from the first commit. No literal user-facing string in a component.
- **RTL:** `I18nManager.isRTL` on native, `dir="rtl"` on web. Use `start`/`end` not `left`/`right` throughout. **The clock itself stays LTR** — `08:40` is LTR in every locale; wrap it in an explicit `direction: ltr` / U+2066 isolate so it does not get mirrored in Arabic or Hebrew.
- Dates, times and numbers come from `Intl` with the user's locale, never hand-formatted.
- The city dataset carries `altNames`, so searching "東京" or "Tokio" finds Tokyo.
- Pseudo-localisation (`en-XA`) in CI catches hardcoded strings and layouts that break at +40 % string length.

---

## 7. Verification

| Layer | Tool | Gate |
|---|---|---|
| Tokens | `pnpm tokens:contrast` | CI, blocking |
| Components | `jest-axe` on every story, both themes | CI, blocking |
| Web pages | `@axe-core/playwright` on every route | CI, blocking |
| Web perf/a11y | Lighthouse CI, a11y score = **100** | CI, blocking |
| Native | Xcode Accessibility Inspector audit | manual, per release |
| Native | Android Accessibility Scanner | manual, per release |
| Manual | VoiceOver full pass (iOS) | manual, per release |
| Manual | TalkBack full pass (Android) | manual, per release |
| Manual | Keyboard-only pass (web) | manual, per release |
| Manual | 200 % text + reduced motion + RTL | manual, per release |

`/a11y-sweep` runs the automated half and produces the manual checklist with pass/fail boxes.

**Automated tooling catches roughly 40 % of real issues.** The manual passes are not optional, and the one that matters most is the VoiceOver pass over the hero clock — it is the single element most likely to be unusable if this document is not followed.
