/**
 * TimeSpot's clock-face mark, as SVG: a black dial at the watchmaker's
 * 10:10:30, the second hand in the bezel orange. Shared by the share
 * images (build-og-images.ts) and the web app icons (build-pwa.ts), and
 * drawn from theme tokens in a 400-unit box.
 */
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"

const UNITS = 400
const C = UNITS / 2

function hand(deg: number, length: number, width: number, color: string, tail = 0): string {
  const a = ((deg - 90) * Math.PI) / 180
  const [x1, y1] = [C - Math.cos(a) * tail, C - Math.sin(a) * tail]
  const [x2, y2] = [C + Math.cos(a) * length, C + Math.sin(a) * length]
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`
}

function tick(i: number): string {
  const a = (i * 30 * Math.PI) / 180
  const major = i % 3 === 0
  const [r1, r2] = [C - spacing.xl, C - (major ? spacing.xxxl : spacing.xxl)]
  return `<line x1="${C + Math.sin(a) * r1}" y1="${C - Math.cos(a) * r1}" x2="${C + Math.sin(a) * r2}" y2="${C - Math.cos(a) * r2}" stroke="${colors.textOnInverseDim}" stroke-width="${major ? spacing.xs : spacing.xxs}" stroke-linecap="round"/>`
}

const DIAL =
  `<circle cx="${C}" cy="${C}" r="${C}" fill="${colors.inverseBackground}"/>` +
  Array.from({ length: 12 }, (_, i) => tick(i)).join("") +
  hand(10 * 30 + 10 * 0.5, C * 0.5, spacing.md, colors.textOnInverse) +
  hand(10 * 6, C * 0.72, spacing.sm, colors.textOnInverse) +
  hand(30 * 6, C * 0.78, spacing.xxs, colors.frame, spacing.xl) +
  `<circle cx="${C}" cy="${C}" r="${spacing.sm}" fill="${colors.frame}"/>`

/**
 * A `size`-pixel square SVG. With a `background`, the square is filled and
 * the dial drawn at `scale` of its width, centred (a maskable icon keeps
 * the mark inside the 80 % safe circle); without one, the dial fills it.
 */
export function dialSvg(size: number, options: { background?: string; scale?: number } = {}) {
  const { background, scale = 1 } = options
  const inset = (UNITS / scale - UNITS) / 2
  const box = UNITS + 2 * inset
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-inset} ${-inset} ${box} ${box}">` +
    (background
      ? `<rect x="${-inset}" y="${-inset}" width="${box}" height="${box}" fill="${background}"/>`
      : "") +
    DIAL +
    `</svg>`
  )
}

export const svgDataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
