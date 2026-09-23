---
name: timespot-motion
description: Implement or review animation in TimeSpot — the odometer digit roll, row selection, the meridian drag, sheets, transitions. Use whenever adding a Reanimated worklet, a transition, a gesture, or checking that motion respects reduced-motion and the 60 fps budget.
---

# Motion

Full choreography: `docs/08-motion-spec.md`. Tokens: `duration.*`, `ease.*`, `spring.*`.

## Principles

1. **Motion exists to make a change in time legible.** Nothing moves for delight alone.
2. **Direction carries meaning.** Time moves *up*. Navigation moves *sideways*. Sheets move *up from the bottom*.
3. **Nothing exceeds 480 ms.** Sessions here last 5 seconds.
4. **Everything on the UI thread.** If it needs JS per frame, it is the wrong animation.
5. **Reduced motion removes the animation, never the information.**

## The odometer — the signature animation

A 3-cell vertical strip in a 1-cell-tall clipped box. On each tick it translates **up** by one cell, then the contents rotate and `translateY` resets — so the strip never grows.

```ts
const y = useSharedValue(0)
useEffect(() => {
  y.value = withSpring(-CELL, spring.numeral, (finished) => {
    'worklet'
    if (finished) { runOnJS(rotateCells)(); y.value = 0 }
  })
}, [value])
```

Rules:
- **Only the digit that changed rolls.** Diff per character position. `15 → 16` moves one digit; `19 → 20` moves two.
- Neighbour cells at `ink.tertiary`, opacity 0.18. Native: opacity + `scale 0.94` reads as blur and costs nothing — do **not** use `expo-blur` per digit. Web: real `filter: blur(3px)`.
- **Jump guard:** if the value changes by more than 2, cut. A device clock correction must not animate through 3 000 frames.
- Minutes use the same mechanism at `duration.deliberate`. **Hours do not roll** — an hour change is rare enough that a roll reads as a glitch.
- Reduced motion: hard cut. The digit still updates.

## Row selection — the 40 ms stagger

Simultaneous cross-fades make two rows look half-selected. Stagger reads as the selection *moving*.

```
t=0     pressed row scales to 0.985 (spring.press)
t=0     outgoing row bg.inverse → bg.card, 180ms
t=0     Haptics.selectionAsync()
t=40ms  incoming row bg.card → bg.inverse, 180ms   ← the stagger
t=0     avatar strip scrolls + saturates over 220ms
```

Text colour comes from the `Card` theme flip — no leaf implements this.

## The meridian drag — the performance-critical path

```ts
Gesture.Pan()
  .onUpdate(e => { x.value = clamp(startX.value + e.translationX, 0, mapWidth) })
  .onEnd(e => {
    const target = snapToNearestZone(x.value, e.velocityX)
    x.value = withSpring(target, spring.press)
    runOnJS(commitZone)(zoneAt(target))
  })
```

Non-negotiables:

1. `x` is a **shared value**. The line, the ruler highlight and the card position are all `useAnimatedStyle` derivations. **No JS state during the drag.**
2. The zone *label* comes from the dataset, so it is JS — push it with `runOnJS` **throttled to 60 ms**. Per-frame `runOnJS` destroys the budget.
3. Snap targets include `+5:45`, `+8:45`, `+12:45` and `+14`. Velocity-aware.
4. Haptic on snap only, never during the drag.
5. The terminator does **not** move with the meridian — it represents the real sun.
6. Reduced motion: the drag still follows the finger (direct manipulation is not vestibular motion); only the snap becomes instant.

Budget: **60 fps on a Pixel 6a** with the full map rendered. If it drops: simplify the topology, then fall back to the raster, then trim the ruler to the visible window.

## Reduced motion

```ts
const reduced = useReducedMotion()
const config = reduced ? { duration: 0 } : { duration: duration.base, easing: ease.standard }
```

Every animation degrades gracefully and **every value still updates**. The two deliberate exceptions: the scrim still fades 200 ms (orientation cue), and the meridian still follows the finger.

## Review checklist

- [ ] Runs on the UI thread (Reanimated worklet / CSS), not `setState` per frame
- [ ] `runOnJS` throttled if it is in a gesture
- [ ] Duration and easing from tokens, never literals
- [ ] Reduced-motion variant implemented and tested
- [ ] Profiled at 60 fps on a mid-range Android
- [ ] Does not delay first paint (entrance choreography runs *after* it)
- [ ] Digit animations guard against clock jumps
- [ ] No animation longer than `duration.deliberate`
