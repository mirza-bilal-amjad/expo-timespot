# 08 — Motion Specification

Motion in this product has one job: **make a change in time legible**. Nothing moves for delight alone.

Tokens are in `02-design-system.md` §6. This document says what uses them, and why.

---

## 1. Principles

1. **The clock is the only thing that moves on its own.** Everything else moves because the user did something.
2. **Direction carries meaning.** Time moves *up* (the next value rises from below, like an odometer). Navigation moves *sideways*. Sheets move *up* from the bottom.
3. **Nothing animates longer than 480 ms.** A clock app is used in 5-second bursts; a 600 ms transition is a third of the session.
4. **Reduced motion is honoured everywhere, but information is never lost.** Animations become instant cuts, not omissions.
5. **Everything at 60 fps, on the UI thread.** If an animation needs JS per frame, it is the wrong animation.

---

## 2. Inventory

| # | Animation | Trigger | Duration | Easing | Thread |
|---|---|---|---|---|---|
| 1 | Second-digit roll | clock tick | 380 ms | `spring.numeral` | UI |
| 2 | Minute roll | minute boundary | 420 ms | `spring.numeral` | UI |
| 3 | Row press | touch down/up | 140 ms | `spring.press` | UI |
| 4 | Row select | tap | 180 ms | `ease.standard` | UI |
| 5 | Pill thumb slide | 12/24 h toggle | 220 ms | `ease.standard` | UI |
| 6 | Tab change | tab tap | 220 ms | `ease.standard` | UI |
| 7 | Sheet present | add / settings | 320 ms | `ease.decelerate` | native |
| 8 | List reorder | drag release | 260 ms | `ease.standard` | UI |
| 9 | Delete + undo | swipe | 220 ms out / 180 ms in | `ease.accelerate` / `decelerate` | UI |
| 10 | Meridian drag | pan | follows finger | none | UI |
| 11 | Meridian snap | pan release | ~300 ms | `spring.press` | UI |
| 12 | Avatar focus | focus change | 220 ms | `ease.standard` | UI |
| 13 | Terminator update | per minute | 900 ms | `linear` | UI |
| 14 | Hero enter | screen mount | 320 ms | `ease.decelerate` | UI |
| 15 | Theme change | toggle | 200 ms | `linear` | native/CSS |

---

## 3. The second-digit roll ⭐

The signature animation. Visible in the mobile board as the ghosted `14` above and `46` below the live `15`.

### Structure

```
        ┌──────────┐
        │    14    │  ← previous  · opacity .18 · blur 3 · ink.tertiary
   clip │  ▶ 15 ◀  │  ← current   · opacity 1   · ink.primary
        │    16    │  ← next      · opacity .18 · blur 3 · ink.tertiary
        └──────────┘
        height = 1 cell = fontSize × lineHeight
```

A 3-cell vertical strip inside an `overflow: hidden` box exactly one cell tall. On each tick the strip translates **up** by one cell height, then the cell contents are rotated and `translateY` resets to 0 — so the strip never grows and the transform stays within one cell.

```ts
// Reanimated 4
const y = useSharedValue(0)
useEffect(() => {
  y.value = withSpring(-CELL, SPRING_NUMERAL, (finished) => {
    if (finished) { runOnJS(rotate)(); y.value = 0 }
  })
}, [value])
```

### Rules

- **Blur** on the neighbour cells is what sells the effect. Native: `expo-blur` is too heavy per-digit — use opacity + a 0.94 scale instead, which reads as blur at this size and costs nothing. Web: a real `filter: blur(3px)`.
- **Only the changing digit rolls.** When `15 → 16` only the units digit moves; when `19 → 20` both do. Diff per character position, never on the whole string.
- **Direction is always up.** Counting down (if a future timer feature lands) reverses it.
- **Clock-jump guard:** if the value changes by more than 2, cut instead of rolling. A device clock correction must not animate through 40 frames of nonsense.
- **Reduced motion:** hard cut, no strip, no neighbours. The digit still updates — never suppress the information.
- Minutes roll on the same mechanism at `duration.deliberate`; **hours do not roll** — an hour change is rare enough that a cut reads as intentional and a roll reads as a glitch.

---

## 4. Row selection

Tapping an unselected row:

1. `t=0` — pressed row scales to 0.985 (`spring.press`).
2. `t=0` — the **outgoing** row's `bg.inverse` cross-fades to `bg.card` over 180 ms.
3. `t=40ms` — the **incoming** row's background cross-fades to `bg.inverse` over 180 ms, and its text colours interpolate in the same window.
4. `t=0` — `Haptics.selectionAsync()` on native.
5. `t=0` — the avatar strip scrolls the new avatar into view (220 ms) and animates its saturation 0 → 1.

The 40 ms offset matters: simultaneous fades make two rows look half-selected. Staggering reads as the selection *moving*.

Text colour is interpolated via the `Card`'s theme flip (see `03-component-library.md`), so no leaf component implements this.

---

## 5. Meridian drag ⭐ — the performance-critical path

```
Gesture.Pan()
  .onBegin(()  => { pressed.value = true; runOnJS(haptic)('light') })
  .onUpdate(e  => { x.value = clamp(startX.value + e.translationX, 0, mapWidth) })
  .onEnd(e     => {
      const target = snapToNearestZone(x.value, e.velocityX)
      x.value = withSpring(target, SPRING_PRESS)
      runOnJS(commitZone)(zoneAt(target))
  })
```

### Non-negotiables

1. `x` is a **shared value**. The meridian line, the ruler highlight and the floating card's position are all `useAnimatedStyle` derivations of it. No JS state during the drag.
2. The zone **label** must be JS (it comes from the dataset), so it is pushed with `runOnJS` throttled to **60 ms** — about 16 updates/second, imperceptible as a delay, 4× cheaper than per-frame.
3. Snap targets are every real UTC offset, including `+5:45`, `+8:45`, `+12:45`, `+14`. Velocity-aware: a fast flick can travel several zones.
4. Haptic on snap (`selectionAsync`), not during the drag.
5. The terminator overlay does **not** move with the meridian — it represents the real sun and stays put. Only the meridian and its card move.
6. Web: the same gesture handler, plus `←`/`→` key steps of one hour (`Shift` → 15 min), each animated over `duration.base`.

### Budget

60 fps on a Pixel 6a with the full map rendered. If the profile shows a drop, in priority order: simplify the topology further, drop to the raster fallback, reduce the ruler to the visible window.

---

## 6. Screen transitions

| From → to | Native | Web |
|---|---|---|
| Tab → tab | cross-fade 220 ms, no slide (tabs are peers) | cross-fade 220 ms |
| List → city detail | push, native slide | route change, 180 ms fade |
| Any → search | sheet up 320 ms `ease.decelerate` | modal scale 0.96 → 1 + scrim fade, 220 ms |
| Sheet dismiss | follows the gesture, then `ease.accelerate` | 180 ms |

**Shared element (native, v1.1):** the focused city's name animates from its row position to the hero position on List → Clock, using the router's shared-transition support. Deliberately deferred — it is the single most fragile animation in the app and the product is complete without it.

---

## 7. Entrance choreography

On cold start, after fonts are ready and the first correct time is computed:

| Element | Delay | Motion |
|---|---|---|
| Hero clock / screen title | 0 | opacity 0→1, translateY 8→0, 320 ms `ease.decelerate` |
| City rows | 40 ms each, capped at 6 rows | same, 280 ms |
| Tab bar | 160 ms | opacity + translateY 16→0, 320 ms |

Total under 500 ms and it runs **after** the first meaningful paint, so it never delays time-to-readable-clock. Skipped entirely under reduced motion and on any warm start.

---

## 8. Reduced motion

```ts
const reduced = useReducedMotion()   // AccessibilityInfo on native, media query on web
```

| Animation | Reduced-motion behaviour |
|---|---|
| Digit rolls | hard cut, value still updates |
| Row select, pill, tabs | instant |
| Sheets | instant present/dismiss, scrim still fades (200 ms — orientation cue) |
| Meridian drag | still follows the finger (it is direct manipulation, not decoration); snap is instant |
| Entrance | skipped |
| Terminator | instant |

The meridian is the deliberate exception: direct manipulation is not "motion" in the vestibular sense, and freezing it would break the interaction.
