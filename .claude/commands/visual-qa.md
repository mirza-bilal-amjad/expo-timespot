---
description: Render every story in both themes and check them against the spec
argument-hint: [component or screen to scope to]
---

Run a visual QA pass${1:+ on **$1**}.

## 1. Render

```bash
pnpm exec playwright test tests/visual        # web: 393 / 768 / 1440, both themes
pnpm eas-simulator screenshot --all-stories   # native: iOS + Android, both themes
```

All visual tests pin the clock to `2026-03-20T08:40:15Z` — otherwise every snapshot fails every second. If a snapshot is non-deterministic, that is the bug.

## 2. Diff

Report any snapshot exceeding the 0.1 % tolerance. Native and web keep separate baselines (font rasterisation differs); do not cross-compare them.

## 3. Check against the spec

For each screen in scope, compare with `docs/04-screen-specs.md`:

- [ ] Geometry within 2 pt at the reference size (393 pt mobile, 1440 px web)
- [ ] Card is a **hairline**, not a filled panel with a shadow
- [ ] Selected row/card is a full black inversion, text inverted with it
- [ ] Clock uses tabular figures — `11:11` and `08:88` occupy the same width
- [ ] Time column is right-aligned and forms a clean column across rows
- [ ] Offset format: `UTC+9`, `UTC+0`, `UTC+5:45`, U+2212 for minus, no space after `UTC`
- [ ] Day/night is a **vector icon**, not an emoji
- [ ] Dark theme correct on every state — it is not in the mockups, so it is never "obviously fine"
- [ ] Long city name ("Ho Chi Minh City") does not break the layout
- [ ] Empty and overflow (40-city) states render

## 4. Report

- Snapshots changed, with the likely cause of each
- Spec deviations, with the measured delta
- Anything that looks wrong but is not covered by a snapshot

Attach or reference the contact sheet.
