/**
 * docs/04-screen-specs.md S2 "Fitting the type". Pure maths for the Clock
 * screen's fill-the-space layout: from what was just measured, the next
 * scale to try. The screen re-measures after each render, so these only
 * have to move the right way and converge — not be exact in one step.
 */

export interface ScaleBounds {
  min: number
  max: number
}

function clamp(value: number, { min, max }: ScaleBounds): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * The hero (the two digit rows with the date and seconds) never wraps, so
 * its width is linear in its scale: solve for the scale at which it exactly
 * fills `contentWidth`. It may also take no more than `maxHeightShare` of
 * the body's height, so the city name always keeps room.
 */
export function nextHeroScale(
  current: number,
  measured: { width: number; height: number },
  contentWidth: number,
  bodyHeight: number,
  maxHeightShare: number,
  bounds: ScaleBounds,
): number {
  if (measured.width <= 0 || measured.height <= 0) return current
  const byWidth = current * (contentWidth / measured.width)
  const byHeight = current * ((bodyHeight * maxHeightShare) / measured.height)
  return clamp(Math.min(byWidth, byHeight), bounds)
}

/**
 * The city name wraps, so its height grows roughly with the *square* of its
 * scale (bigger glyphs, and more lines). Growing takes the square-root step
 * toward the target; overflowing shrinks by the full ratio, so it is
 * guaranteed to come back inside rather than oscillate around the edge.
 */
export function nextCityScale(
  current: number,
  measuredHeight: number,
  targetHeight: number,
  bounds: ScaleBounds,
): number {
  if (measuredHeight <= 0 || targetHeight <= 0) return clamp(current, bounds)
  const ratio = targetHeight / measuredHeight
  const step = ratio >= 1 ? Math.sqrt(ratio) : ratio
  return clamp(current * step, bounds)
}

/** Whether `next` is close enough to `current` to stop re-measuring. */
export function isSettled(current: number, next: number, tolerance = 0.015): boolean {
  return Math.abs(next - current) <= current * tolerance
}
