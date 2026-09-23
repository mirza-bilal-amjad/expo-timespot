---
name: timespot-a11y-audit
description: Audit or implement accessibility in TimeSpot against WCAG 2.2 AA — screen-reader labels, contrast, keyboard navigation, touch targets, reduced motion, RTL. Use when adding any user-facing element, reviewing a component or screen for a11y, or running a pre-release accessibility pass.
---

# Accessibility

Target: **WCAG 2.2 AA on all three surfaces**. Full spec: `docs/09-accessibility.md`.

A clock is one of the most common things a screen-reader user checks, and it is very easy to build one that is unusable. The single highest-value item in this skill is §1.

---

## 1. The clock — the thing most apps get wrong

```tsx
<View
  accessible
  accessibilityRole="text"
  accessibilityLabel="8:40 AM, Thursday 20 March, Los Angeles"
  aria-live="off"
>
  {/* every digit inside: aria-hidden / importantForAccessibility="no-hide-descendants" */}
</View>
```

Three rules:

1. **One node, one sentence.** Otherwise VoiceOver reads "zero, eight, colon, four, zero, one, five".
2. **No live region.** A clock that announces every second is unusable. `aria-live="off"`, no `accessibilityLiveRegion`.
3. **Natural language, not the display string.** "8:40 AM", not "08:40". Build it from `Intl.DateTimeFormat` with the user's locale.

Same principle for offsets: `"9 hours ahead of UTC"`, not `"UTC+9"` — screen readers pronounce the latter as "utc plus nine" at best.

---

## 2. Composite elements are one node

```tsx
// ❌ four separate announcements
<View><Text>UTC+9</Text><Text>Tokyo</Text><Text>01:40</Text><Icon name="moon"/></View>

// ✅
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel="Tokyo, 1:40 AM, night-time, 9 hours ahead of UTC"
  accessibilityState={{ selected }}
  accessibilityHint="Double tap to focus this city"
  accessibilityActions={[
    { name: 'activate',  label: 'Focus' },
    { name: 'magicTap',  label: 'Open details' },
    { name: 'delete',    label: 'Remove city' },
    { name: 'moveUp',    label: 'Move up' },      // WCAG 2.2 — 2.5.7
    { name: 'moveDown',  label: 'Move down' },
  ]}
>
```

`moveUp`/`moveDown` matter: **drag must never be the only way to reorder** (2.5.7 Dragging Movements).

---

## 3. Contrast — already resolved at the token layer

| Use | Token | Ratio |
|---|---|---|
| text under 24 pt | `ink.secondary` `#5C5C5C` | 5.46 ✓ |
| text ≥ 24 pt only | `ink.tertiary` `#7A7A7A` | 3.50 — large only |
| orange text | `ink.accent` `#A93B18` | 5.15 ✓ |
| orange surfaces | `bg.frame` `#D44F24` | 4.25 — **never text** |

The mockups use `#7A7A7A` for body text everywhere. That is a defect (`docs/01-design-audit.md` §8.5). Do not reintroduce it.

Non-text contrast (1.4.11): the card hairline is ~1.2 : 1 and is **decorative** — it can never be the only indicator of state. Selection is a full inversion (17 : 1); focus is a 2 px `stroke.focus` ring.

Run `pnpm tokens:contrast` — it checks both themes and blocks CI.

---

## 4. The map

The meridian is a **slider**, and the map is decoration:

```tsx
accessibilityRole="adjustable"
accessibilityLabel="Time zone selector"
accessibilityValue={{ min: -12, max: 14, now: 1, text: 'UTC plus 1, Algiers, 5:40 PM' }}
```

The SVG is `aria-hidden`. **Test the screen with the map visually hidden** — if it is not usable, the information is in the wrong place.

---

## 5. Keyboard (web)

- Visible focus on everything (2.4.7) and **never obscured by the floating tab bar** (2.4.11) → `scroll-padding-bottom: tabBarHeight + 16px`.
- Logical tab order; no positive `tabIndex` anywhere.
- Focus trap in modals; focus returned to the trigger on close.
- `Esc` closes every overlay.
- Skip link as the first focusable element.
- Single-key shortcuts are disabled while an input has focus and can be turned off in Settings (2.1.4).

---

## 6. Touch and motor

- ≥ 44 × 44 (iOS) / 48 × 48 (Android) / 24 × 24 (web) via `hitSlop`, **never by inflating the visual**. The ruler ticks look 13 pt and hit 44 pt.
- No path-based gestures required (2.5.1).
- Every destructive action has undo (3.3.4).
- Long-press uses the OS threshold — do not hardcode one.

---

## 7. RTL and i18n

- `start`/`end`, never `left`/`right`.
- **The clock stays LTR in every locale.** `08:40` is not mirrored in Arabic or Hebrew — wrap it in `direction: ltr` / a U+2066 isolate.
- Dates, times and numbers from `Intl` with the user's locale.
- Pseudo-localisation (`en-XA`) in CI catches hardcoded strings and +40 % length overflow.

---

## 8. Audit procedure

**Automated** (run these first — `/a11y-sweep` does it):
```
pnpm tokens:contrast          both themes
pnpm test:a11y                jest-axe on every story, both themes
pnpm exec playwright test     @axe-core/playwright on every route
pnpm lighthouse               a11y score must be 100
```

**Manual** (automation catches ~40 % — these are not optional):
- [ ] VoiceOver: full pass. **Start with the hero clock** — it is the most likely thing to be broken.
- [ ] TalkBack: full pass
- [ ] Keyboard only, web: reach and operate everything, never trapped
- [ ] 200 % text scale: no clipping, no overlap, no horizontal scroll
- [ ] Reduced motion: every animation degrades, every value still updates
- [ ] RTL: layout mirrors, clock does not
- [ ] Dark theme: repeat the contrast pass
- [ ] Map screen with the map hidden: still usable
