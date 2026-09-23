# ADR-0001 — One Expo codebase for iOS, Android and web

**Status:** accepted · 2026-09-23

## Context

The brief is an app *and* a website for the same product, built by one person. The mockups show the same content model in both renderings. Options:

1. Expo universal — one codebase, three targets.
2. Expo for native + Next.js for web, sharing a domain package.
3. Native (Swift/Kotlin) + a separate web app.

## Decision

**Expo SDK 57, one codebase, `output: 'static'` for web.**

## Rationale

- The two boards share their entire data model and ~80 % of their component semantics. The genuine differences are layout and navigation chrome, which is exactly what a breakpoint system handles.
- Option 2 duplicates the component layer — the most expensive part to keep visually consistent — to save on a layer (routing) that Expo Router already unifies.
- Option 3 triples the cost for a solo developer and gains nothing: no feature here needs platform-specific capability.
- SDK 57 (30 Jun 2026) is current stable: RN 0.86, React 19.2, no breaking changes from 56, and it fixes 56's Hermes memory regression. `@expo/ui` universal components reached production readiness in SDK 56 and support web.
- The web surface is the acquisition channel (`time in tokyo` has real search volume). It is only affordable because it is the same codebase.

## Consequences

**Good:** one design system, one test suite for the domain layer, one deploy story, features land on three platforms at once.

**Costs:** `@expo/ui` universal components render platform-natively, which fights a strongly branded design — mitigated by the boundary in ADR-0003. Web bundle size needs active management (ADR-0006). Some native polish (shared-element transitions) is harder; deferred to v1.1.

**Constraint accepted:** if a future feature genuinely needs per-platform divergence, it is added to the closed exception list in `07-responsive-strategy.md` §3 with its own ADR — not by sprinkling `Platform.OS` through feature code.
