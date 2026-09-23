---
description: Full pre-release gate — run every automated check and print the manual checklist
---

Run the complete pre-release gate from `docs/12-release-ops.md` §9.

## 1. Automated — all must be green

```bash
pnpm tsc --noEmit                # strict
pnpm lint
pnpm test                        # includes the full DST matrix
pnpm tokens:build --check        # generated files are in sync with tokens.json
pnpm tokens:contrast             # both themes
pnpm test:a11y
pnpm exec playwright test
pnpm lighthouse                  # a11y 100, SEO 100, best practices 100, LCP < 1.2s
pnpm exec expo export -p web     # bundle < 180 KB gz initial route
npx expo-doctor
```

Then run `/token-check`, `/tz-audit`, `/a11y-sweep` and report each result.

## 2. Release-blocking specifics

- [ ] **DST matrix**: all 17 fixture zones × every transition 2026–2028. Report the assertion count.
- [ ] `Intl` capability probe present and tested on both paths
- [ ] No numeric offset anywhere in the codebase
- [ ] Both `Intl` and fallback paths produce identical output for every fixture
- [ ] Weekly transition-table diff job is green (no upstream tz rule changes since the last snapshot)

## 3. Manual checklist — print unchecked

**Devices** (`docs/11-testing-strategy.md` §3)
- [ ] iPhone 16 Pro · iPhone SE 3 · Pixel 8 · Pixel 6a · low-tier Android (degraded `Intl` path) · iPad split view · Chrome / Safari / Firefox
- [ ] On each: 4 cities verified against `time.is`, background 10 min, resume, re-verify

**Accessibility**
- [ ] VoiceOver · TalkBack · keyboard-only · 200 % text · reduced motion · RTL · dark theme

**Behaviour**
- [ ] Offline (airplane mode) — every v1 feature works
- [ ] Device clock changed by an hour — app corrects, no absurd animation
- [ ] 40 cities — scroll holds
- [ ] Meridian drag at 60 fps on the Pixel 6a

**Release hygiene**
- [ ] Privacy manifest + Play Data Safety match reality ("no data collected")
- [ ] Screenshots regenerated from the current build
- [ ] Release notes written
- [ ] Previous OTA group identified for rollback
- [ ] Version tagged; EAS `appVersionSource: remote` owns the build number

## 4. Verdict

State **SHIP** or **BLOCKED**, and if blocked, list exactly what must change. Do not soften a failure — a wrong time is a P0 and this gate is the last place to catch one.
