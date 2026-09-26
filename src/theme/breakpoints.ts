import { spacing } from "./spacing"

/**
 * docs/07-responsive-strategy.md §1. The layout adapts by *width*, never by
 * platform — an iPad in landscape gets the same layout as a laptop browser.
 * Pure, so the whole table is unit-tested.
 */
export const breakpoints = {
  "xs": 0,
  "sm": 390,
  "md": 768,
  "lg": 1024,
  "xl": 1280,
  "2xl": 1600,
} as const

export type Breakpoint = keyof typeof breakpoints

const ORDER: Breakpoint[] = ["xs", "sm", "md", "lg", "xl", "2xl"]

export function breakpointFor(width: number): Breakpoint {
  let current: Breakpoint = "xs"
  for (const bp of ORDER) if (width >= breakpoints[bp]) current = bp
  return current
}

export function isAtLeast(current: Breakpoint, target: Breakpoint): boolean {
  return ORDER.indexOf(current) >= ORDER.indexOf(target)
}

/**
 * The page gutter per breakpoint: 32 at md, 48 at lg, 64 from xl (the web
 * board's measured 67 px). ~~20 at xs~~ — corrected 2026-09-26: every
 * mobile row, sheet and header carries the 28 gutter internally, so a 20 pt
 * page gutter on small phones misaligned the screen against its own sheets.
 * Phones keep 28 at xs and sm.
 */
export function gutterFor(bp: Breakpoint): number {
  if (isAtLeast(bp, "xl")) return spacing.gutterWide
  if (bp === "lg") return spacing.xxl
  if (bp === "md") return spacing.xl
  return spacing.gutter
}

/** Content width inside the gutters, capped at the 1312 container. */
export function contentWidthFor(width: number): number {
  const gutter = gutterFor(breakpointFor(width))
  return Math.max(0, Math.min(width - 2 * gutter, spacing.container))
}

/**
 * docs/04-screen-specs.md S1 web: city-card columns by *content* width —
 * 1 / 2 / 3 / 4 at < 560 / < 900 / < 1200 / ≥ 1200.
 */
export function cardColumnsFor(contentWidth: number): number {
  if (contentWidth >= 1200) return 4
  if (contentWidth >= 900) return 3
  if (contentWidth >= 560) return 2
  return 1
}
