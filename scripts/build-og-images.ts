/**
 * docs/10-implementation-plan.md task 6.6, docs/04-screen-specs.md S6 —
 * one Open Graph image per city page, rendered at build with satori
 * (layout → SVG) and resvg (SVG → PNG), into `<dist>/og/<slug>.png`.
 *
 * An image is shared long after it's built, so it never shows a time:
 * the city, its country, its offset(s) for the year and the zone, beside
 * a clock face at the watchmaker's 10:10 — representative, not a reading.
 * English only, like the static pages it belongs to.
 *
 * Runs in `npm run export:web`, after `expo export`:
 *   npx tsx scripts/build-og-images.ts dist
 */
import { Resvg } from "@resvg/resvg-js"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import satori from "satori"

import { dialSvg, svgDataUri } from "./lib/dial"
import { getSeoCities } from "../src/domain/cities/seoPages"
import { getYearOffsets } from "../src/domain/time/dst"
import { formatOffset } from "../src/domain/time/zone"
import type { City } from "../src/domain/types"
import en from "../src/i18n/en"
import { colors } from "../src/theme/colors"
import { radius } from "../src/theme/radius"
import { spacing } from "../src/theme/spacing"
import { OG_IMAGE_SIZE, ogImagePath, SITE_URL } from "../src/utils/site"

const dist = path.resolve(process.argv[2] ?? "dist")
const FONTS = path.join(__dirname, "..", "node_modules", "@expo-google-fonts", "space-grotesk")
const font = (weight: 400 | 600, file: string) => ({
  name: "Space Grotesk",
  weight,
  style: "normal" as const,
  data: readFileSync(path.join(FONTS, file)),
})

const { width: W, height: H } = OG_IMAGE_SIZE
// The card is ~2× a phone screen, so the type steps are the app's
// (docs/02 §2) doubled; the dial fills the card's height inside the bezel.
const TYPE = { eyebrow: 36, country: 40, meta: 32, footer: 28 }
const NAME_SIZES = [112, 96, 80, 64, 56] as const
const DIAL = 400
/** The text column: the card minus bezel, padding, gap and dial. */
const COLUMN = W - 2 * spacing.md - 2 * spacing.xxxl - spacing.xxl - DIAL
/** Space Grotesk's average advance is ~0.53 em; a little slack for wide letters. */
const EM_PER_CHAR = 0.56

/** Lines a name wraps to at `size`, estimated with a greedy word wrap. */
function lineCount(name: string, size: number): number {
  const perLine = Math.floor(COLUMN / (size * EM_PER_CHAR))
  let lines = 1
  let used = 0
  for (const word of name.split(" ")) {
    if (word.length > perLine) return Infinity
    const need = used === 0 ? word.length : used + 1 + word.length
    if (need <= perLine) used = need
    else {
      lines++
      used = word.length
    }
  }
  return lines
}

/** The largest size that keeps the name to two lines. */
function nameSize(name: string): number {
  return NAME_SIZES.find((size) => lineCount(name, size) <= 2) ?? NAME_SIZES.at(-1)!
}

const t = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "")

type Node = { type: string; props: Record<string, unknown> }
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children },
})

/** The year's offsets: "UTC+9", "UTC−5 · UTC−4 with DST". The page's
 * og:image:alt says the same (CityPageScreen). */
export function yearOffsetsLabel(zone: string, now: number): string {
  const { standard, daylight } = getYearOffsets(now, zone)
  if (daylight === null) return formatOffset(standard)
  return t(en.cityPage.ogOffsets, {
    standard: formatOffset(standard),
    daylight: formatOffset(daylight),
  })
}

function card(city: City, now: number, dial: string): Node {
  return h(
    "div",
    {
      width: W,
      height: H,
      padding: spacing.md,
      backgroundColor: colors.frame,
      fontFamily: "Space Grotesk",
    },
    h(
      "div",
      {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        padding: spacing.xxxl,
        gap: spacing.xxl,
        backgroundColor: colors.background,
        borderRadius: radius.xl,
      },
      h(
        "div",
        { flex: 1, flexDirection: "column", justifyContent: "space-between", height: "100%" },
        h(
          "div",
          { flexDirection: "column", gap: spacing.xs },
          h("div", { fontSize: TYPE.eyebrow, color: colors.textDim }, en.cityPage.ogEyebrow),
          h(
            "div",
            {
              fontSize: nameSize(city.name),
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: -2,
              color: colors.text,
            },
            city.name,
          ),
          h("div", { fontSize: TYPE.country, color: colors.textDim }, city.country),
        ),
        h(
          "div",
          { flexDirection: "column", gap: spacing.xs },
          h("div", { fontSize: TYPE.meta, color: colors.text }, yearOffsetsLabel(city.zone, now)),
          h("div", { fontSize: TYPE.meta, color: colors.textDim }, city.zone),
          h(
            "div",
            { fontSize: TYPE.footer, fontWeight: 600, color: colors.textAccent },
            new URL(SITE_URL).host,
          ),
        ),
      ),
      { type: "img", props: { src: dial, width: DIAL, height: DIAL } },
    ),
  )
}

async function main() {
  const fonts = [
    font(400, "400Regular/SpaceGrotesk_400Regular.ttf"),
    font(600, "600SemiBold/SpaceGrotesk_600SemiBold.ttf"),
  ]
  const dial = svgDataUri(dialSvg(DIAL))
  const now = Date.now()
  // OG_ONLY=tokyo,new-york-city renders just those, for a quick look.
  const only = process.env.OG_ONLY?.split(",")
  const cities = getSeoCities().filter((c) => !only || only.includes(c.slug))
  mkdirSync(path.join(dist, "og"), { recursive: true })

  let bytes = 0
  const started = Date.now()
  for (const city of cities) {
    const svg = await satori(card(city, now, dial) as never, { width: W, height: H, fonts })
    const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng()
    writeFileSync(path.join(dist, ogImagePath(city.slug)), png)
    bytes += png.length
  }
  console.log(
    `✓ ${cities.length} OG images, ${(bytes / 1024 / 1024).toFixed(1)} MB, ` +
      `${((Date.now() - started) / 1000).toFixed(0)} s`,
  )
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
