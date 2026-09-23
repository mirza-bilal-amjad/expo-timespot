---
description: Run the automated accessibility suite and print the manual checklist
argument-hint: [component or screen to scope to — omit for the whole app]
---

Run a WCAG 2.2 AA accessibility pass${1:+ scoped to **$1**}.

Load the `timespot-a11y-audit` skill first.

## 1. Automated

```bash
pnpm tokens:contrast          # both themes, all documented pairs
pnpm test:a11y                # jest-axe on every story, both themes
pnpm exec playwright test tests/a11y   # @axe-core/playwright on every web route
pnpm lighthouse               # a11y score must be 100
```

Report each result. A failure here is blocking.

## 2. Static review

Read the code in scope and check:

- [ ] **The clock is one accessible node** with a natural-language label and **no live region**. This is the highest-value check in the app.
- [ ] Composite elements (rows, cards) are one node, not four
- [ ] Offsets announced as "9 hours ahead of UTC", not "UTC+9"
- [ ] `accessibilityState` reflects selection
- [ ] Reorder is available without dragging (`moveUp` / `moveDown` actions — WCAG 2.2 §2.5.7)
- [ ] `ink.tertiary` appears only at ≥ 24 pt
- [ ] Touch targets ≥ 44/48 via `hitSlop`, not by inflating the visual
- [ ] Focus never obscured by the floating tab bar (§2.4.11)
- [ ] `Esc` closes every overlay; focus returns to the trigger
- [ ] The map SVG is `aria-hidden` and the meridian is `adjustable`
- [ ] The clock is not mirrored under RTL
- [ ] Reduced motion degrades every animation but loses no information

## 3. Print the manual checklist

Automation catches roughly 40 %. Output this as an unchecked list for me to work through:

- [ ] VoiceOver full pass — **start with the hero clock**
- [ ] TalkBack full pass
- [ ] Keyboard-only pass on web
- [ ] 200 % text scale on every screen
- [ ] Reduced motion on
- [ ] RTL locale
- [ ] Dark theme contrast pass
- [ ] Map screen with the map visually hidden

## 4. Report

Findings grouped blocking / warning, each with the WCAG criterion and the fix. If clean, say so.
