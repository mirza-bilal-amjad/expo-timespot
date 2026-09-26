import { getAllCities } from "../cities/search"
import type { City } from "../types"
import { projectLonLat } from "./projection"

/**
 * docs/04-screen-specs.md "S3 · Map" — "point anywhere". Which city a touch
 * at map pixel (x, y) means, scored in *screen* space so "near" matches
 * what the finger covered:
 *
 *   score = distancePx − POP_WEIGHT_PX × log10(population)    (lowest wins)
 *
 * A 10× bigger city beats a nearer one only if it is within
 * POP_WEIGHT_PX more pixels — tapping just off central London means London,
 * not a suburb 3 px closer, but tapping on Algiers still means Algiers,
 * not Madrid 20 px away. A hard "most populous within radius" rule got
 * exactly that wrong at map zoom, where 24 px is ~10° of longitude. The
 * open ocean still resolves to *somewhere*, never nothing.
 *
 * Projected positions are cached per map size; the scan is 5,000
 * multiply-adds, cheap enough for the 60 ms-throttled live drag preview.
 */

const POP_WEIGHT_PX = 6

const typed = getAllCities()
const popScore = Float64Array.from(
  typed,
  (c) => POP_WEIGHT_PX * Math.log10(Math.max(c.population, 1)),
)

let cacheKey = ""
let xs = new Float64Array(0)
let ys = new Float64Array(0)

function ensureProjected(width: number, height: number) {
  const key = `${width}x${height}`
  if (key === cacheKey) return
  xs = new Float64Array(typed.length)
  ys = new Float64Array(typed.length)
  typed.forEach((c, i) => {
    const p = projectLonLat(c.lon, c.lat, width, height)
    xs[i] = p.x
    ys[i] = p.y
  })
  cacheKey = key
}

export function pickCityAt(x: number, y: number, width: number, height: number): City {
  ensureProjected(width, height)
  let best = 0
  let bestScore = Infinity
  for (let i = 0; i < typed.length; i++) {
    const dx = xs[i] - x
    const dy = ys[i] - y
    const score = Math.sqrt(dx * dx + dy * dy) - popScore[i]
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  }
  return typed[best]
}
