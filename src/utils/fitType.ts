/**
 * docs/04-screen-specs.md S2 "Fitting the type" — pure layout arithmetic
 * for the Clock screen, one shot.
 *
 * Everything is measured once, at scale 1, in a hidden reference layout.
 * Type widths and heights grow in proportion to the font size, and a line
 * break depends only on the width available *in scale-1 units*, so the
 * layout at any scale can be predicted without rendering it. The screen
 * renders once, at the answer.
 *
 * ~~Measure → next scale → re-render → re-measure~~ — replaced 2026-09-26.
 * Every pass after the first was a visible resize, a resize changed the
 * digit cells' calibrated width a frame later, and that re-opened the loop:
 * the clock visibly jittered on Android.
 */

export interface Size {
  width: number
  height: number
}

export interface ScaleBounds {
  min: number
  max: number
}

/** The city name's words, measured at scale 1. */
export interface CityMetrics {
  /** Each word's width, punctuation included ("Angeles,"). */
  words: number[]
  /** One space's width. */
  space: number
  /** One line's height. */
  lineHeight: number
}

/** Lines a greedy (first-fit) wrap needs to set `words` within `maxWidth`. */
export function lineCount(words: number[], space: number, maxWidth: number): number {
  if (words.length === 0) return 0
  let lines = 1
  let lineWidth = words[0]
  for (let i = 1; i < words.length; i++) {
    const next = lineWidth + space + words[i]
    if (next <= maxWidth) {
      lineWidth = next
    } else {
      lines += 1
      lineWidth = words[i]
    }
  }
  return lines
}

/** Lines the city name takes at `scale` within `width`. */
export function cityLinesAt(city: CityMetrics, scale: number, width: number): number {
  return lineCount(city.words, city.space, width / scale)
}

/** The city name's height at `scale` within `width`. */
export function cityHeightAt(city: CityMetrics, scale: number, width: number): number {
  return cityLinesAt(city, scale, width) * city.lineHeight * scale
}

const SEARCH_STEPS = 24

/**
 * The largest scale within `bounds` for which `fits` holds, assuming `fits`
 * holds for everything below some threshold and nothing above it. `null`
 * when even `bounds.min` doesn't fit.
 */
export function largestScale(fits: (scale: number) => boolean, bounds: ScaleBounds): number | null {
  if (!fits(bounds.min)) return null
  if (fits(bounds.max)) return bounds.max
  let lo = bounds.min
  let hi = bounds.max
  for (let i = 0; i < SEARCH_STEPS; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return lo
}

export interface ClockFitInput {
  /** The content box the composition is centred in. */
  width: number
  height: number
  /** The hero's size at a scale — exact, from calibrated digit cells. */
  heroSize: (scale: number) => Size
  /** The hero may take at most this share of the height. */
  heroMaxHeightShare: number
  /** Everything that doesn't scale: the gaps and the sun row. */
  fixedHeight: number
  city: CityMetrics
  /** Share of the width the city name wraps within — headroom for the
   * platform's line breaker measuring a hair wider than the words did. */
  wrapSafety: number
  heroBounds: ScaleBounds
  cityBounds: ScaleBounds
}

export interface ClockFit {
  hero: number
  city: number
  /** Lines the city name wraps to at `city`. */
  cityLines: number
}

export function fitClock(input: ClockFitInput): ClockFit {
  const { width, height, heroSize, heroMaxHeightShare, fixedHeight, city } = input
  const { heroBounds, cityBounds } = input
  const cityWidth = width * input.wrapSafety
  const widestWord = Math.max(0, ...city.words)

  const heroFits = (scale: number) => {
    const size = heroSize(scale)
    return size.width <= width && size.height <= height * heroMaxHeightShare
  }
  // The city fits at `scale` when no single word has to break, and all its
  // lines fit under a hero at `heroScale`.
  const cityFits = (heroScale: number, scale: number) =>
    widestWord * scale <= cityWidth &&
    cityHeightAt(city, scale, cityWidth) <= height - heroSize(heroScale).height - fixedHeight

  // The hero fills the width; then, if even the smallest city name can't
  // fit below it, the hero gives up height until it can.
  let hero = largestScale(heroFits, heroBounds) ?? heroBounds.min
  if (!cityFits(hero, cityBounds.min)) {
    hero =
      largestScale((s) => cityFits(s, cityBounds.min), { min: heroBounds.min, max: hero }) ??
      heroBounds.min
  }
  const cityScale = largestScale((s) => cityFits(hero, s), cityBounds) ?? cityBounds.min

  return { hero, city: cityScale, cityLines: cityLinesAt(city, cityScale, cityWidth) }
}
