# 12 — Release & Operations

---

## 1. Environments

| Profile | Purpose | Distribution | Updates channel |
|---|---|---|---|
| `development` | dev client, local Metro | internal | `development` |
| `preview` | every PR + every main push | internal / TestFlight / internal track | `preview` |
| `production` | store releases | App Store, Play Store, web | `production` |

`eas.json` sketch:

```jsonc
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal",
                     "channel": "development" },
    "preview":     { "distribution": "internal", "channel": "preview",
                     "ios": { "simulator": false }, "autoIncrement": true },
    "production":  { "channel": "production", "autoIncrement": true,
                     "env": { "EXPO_PUBLIC_ENV": "production" } }
  },
  "submit": { "production": {} }
}
```

`appVersionSource: "remote"` — EAS owns build numbers. Never hand-edit `buildNumber` / `versionCode`; that is how two builds end up sharing a number.

---

## 2. Versioning

- `version` in `app.config.ts` is the **marketing** version: `1.0.0`, semver.
- Build numbers auto-increment remotely.
- Web is versioned by deployment, with the commit SHA in a `<meta name="build">` for support.
- Tag releases `v1.0.0`; the tag triggers production builds and the web deploy.

---

## 3. CI/CD — EAS Workflows

```yaml
# .eas/workflows/pr.yml
name: PR
on: { pull_request: { branches: [main] } }
jobs:
  checks:  { steps: [typecheck, lint, token-check, contrast, test, a11y, visual] }
  web:     { steps: [expo export -p web, lighthouse-ci] }
  preview: { type: build, params: { profile: preview, platform: all } }
```

```yaml
# .eas/workflows/release.yml
name: Release
on: { push: { tags: ['v*'] } }
jobs:
  build:  { type: build,  params: { profile: production, platform: all } }
  submit: { type: submit, needs: [build] }
  web:    { steps: [expo export -p web, eas deploy --prod] }
```

The `eas-workflows` and `eas-hosting` agent skills (from the Expo plugin) know this syntax — ask Claude Code to write these rather than hand-rolling YAML.

---

## 4. OTA updates

`expo-updates` on the `production` channel.

**Rules:**

1. JS-only fixes ship OTA. Anything touching native code needs a store build.
2. Runtime version policy: `appVersion` — an OTA can never reach a binary with different native code.
3. **Roll out gradually:** 10 % → 50 % → 100 %, watching crash-free sessions at each step (`eas-update-insights` surfaces this).
4. Never OTA a change to the time engine without the full DST matrix green. This is the one subsystem where an OTA can silently break every user at once.
5. Keep a rollback: `eas update:rollback` to the previous group.

---

## 5. Store presence

### App Store

| Field | Value |
|---|---|
| Name | TimeSpot |
| Subtitle | World clock, done properly |
| Keywords | world clock, time zone, timezone converter, meeting planner, utc, jet lag, international time |
| Category | Utilities (secondary: Productivity) |
| Age | 4+ |
| Privacy | **No data collected** — matches `PrivacyInfo.xcprivacy` |
| Screenshots | 6.9" and 6.1" iPhone, 13" iPad — generated from the real app at a pinned clock value |

`PrivacyInfo.xcprivacy` must declare the `UserDefaults` API access reason (`CA92.1`) even though nothing is collected — a missing manifest is an automatic rejection.

### Play Store

| Field | Value |
|---|---|
| Short description | The world's clocks, big enough to read at a glance. |
| Category | Tools |
| Data safety | No data collected, no data shared |
| Target API | whatever Play currently requires — check before each submission |
| Screenshots | phone + 7" + 10" tablet |

### Both

Screenshots are **generated**, not hand-made: an `eas-simulator` script drives the app to each screen with a pinned clock and a fixed city set, so a copy change never means a Photoshop session.

---

## 6. Web deployment

```bash
npx expo export -p web        # → dist/, static, ~1 000 city pages
eas deploy --prod             # EAS Hosting
```

**As built (task 6.9).** The pipeline is more than `expo export`, so use the scripts:

```bash
EXPO_PUBLIC_SITE_URL=https://timespot.app npm run deploy:web   # export + OG + PWA, budget check, eas deploy --prod
npm run check:deploy -- https://timespot.app                   # verify the live site
```

- **`deploy:web`** = `export:web` (sitemap, export, finalize, 1,000 OG images, PWA) + `size:web` (bundle budget) + `npx eas-cli deploy --prod`. `EXPO_PUBLIC_SITE_URL` must be the final origin: canonical URLs, `og:image`, the sitemap and JSON-LD are built from it.
- **One-time setup, by a person with the Expo account:** `npx eas-cli login`, then `npx eas-cli init` to link the project (it writes `extra.eas.projectId`). The first `deploy` picks the hosting subdomain; the custom domain and its TLS are added in the EAS dashboard (Hosting → Custom domain).
- **`check:deploy`** (`scripts/check-deploy.ts`) fails on what breaks the site or its SEO: a non-200 page, a soft 404 for an unknown city, missing head tags, an unreachable OG image, uncompressed JS. It warns on cache headers.
- **Not deployed from the build container.** Its network policy blocks `expo.dev`, and there is no Expo token. The scripts and checker were verified against a local static server with production-like headers (brotli, immutable hashed assets, HTML `max-age=0`).
- **Cache headers matter less than written below.** The service worker revalidates pages past the HTTP cache (`cache: "no-cache"`) and registers with `updateViaCache: "none"`, so a returning visitor is never pinned to an old deploy whatever the host sends. The header rules still apply to a first visit.

- Custom domain with automatic TLS.
- Cache: HTML `max-age=0, must-revalidate` (the clock must never be stale-cached); hashed assets `max-age=31536000, immutable`.
- `sitemap.xml` and `robots.txt` emitted at build.
- Lighthouse CI runs against the deployed preview URL on every PR; a regression below the budget fails the check.

Alternative hosts (Vercel, Cloudflare Pages, Netlify) all work — it is a static directory. EAS Hosting is the recommendation only because it keeps one vendor and has an agent skill.

---

## 7. Monitoring

| Signal | Tool | Alert |
|---|---|---|
| Crashes | Sentry (`sentry-expo`) | crash-free < 99.5 % over 1 h |
| OTA health | EAS Update Insights | failed-launch rate > 0.5 % |
| Web vitals | CrUX + Lighthouse CI | LCP p75 > 1.5 s |
| `Intl` fallback rate | custom event | > 2 % of sessions on the degraded path |
| Store reviews | manual weekly | any review mentioning a wrong time → P0 |

**PII rule:** no analytics event ever carries a city name, a zone or coordinates. Event names and coarse buckets only. `city_added` with no payload; not `city_added{city:"Tehran"}`.

---

## 8. Incident response

A wrong time is a **P0**. The recovery order:

1. Confirm with `time.is` for the affected zone.
2. Check whether the tz database changed (the weekly job should already have flagged it).
3. If it is a JS bug: fix, run the full DST matrix, OTA at 10 % → 100 % within hours.
4. If it is an OS tz database issue: it will resolve with an OS update; ship a note in the affected city's detail screen in the meantime.
5. Post-mortem: which test would have caught it, and add it.

---

## 9. Pre-release checklist

Run `/ship-check` — it automates the first half and prints the rest.

- [ ] `pnpm test` green, including the full DST matrix
- [ ] `/token-check`, `/a11y-sweep`, `/tz-audit` green
- [ ] Lighthouse: a11y 100, SEO 100, best practices 100, LCP < 1.2 s
- [ ] Manual pass on all 7 device tiers
- [ ] VoiceOver + TalkBack + keyboard-only passes
- [ ] 200 % text, reduced motion, RTL, dark theme
- [ ] Offline pass (airplane mode)
- [ ] Time verified against `time.is` in 4 zones, on device
- [ ] Background 10 min → resume → correct
- [ ] Privacy manifest + Data Safety match reality
- [ ] Screenshots regenerated from the current build
- [ ] Release notes written
- [ ] Rollback plan: previous OTA group identified
