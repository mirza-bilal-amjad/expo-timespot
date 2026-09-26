import { useId, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { ClipPath, Defs, G, Line, Path, Pattern, Svg } from "react-native-svg"

import { getCountrySvgPath } from "@/domain/map/countries"
import { getBordersSvgPath, getLandSvgPath } from "@/domain/map/land"
import { getNightRegionPath } from "@/domain/sun/terminator"
import { useMapRenderTier } from "@/hooks/useMapRenderTier"
import { useAppTheme } from "@/theme/context"

const landRaster = require("@/assets/map/land-raster.png")

/**
 * docs/03-component-library.md "<WorldMap>", docs/04-screen-specs.md "S3 ·
 * Map". The whole projected world at the given *content* size (the caller
 * pans it; this owns no layout). One SVG, painted in the board's order:
 *
 *   1. land, `map.land`
 *   2. night — diagonal hatching clipped to land, so the sea stays clean
 *      exactly as on the board (task 4.2; replaces the old flat
 *      `map.night` wash, which read as a grey blob over the ocean)
 *   3. country borders, hairlines in the background colour
 *   4. the active country, `map.landActive`, above the hatching
 *
 * Land, borders and the active country all come from one topology with
 * shared arcs (scripts/build-map.ts), so the active fill sits exactly on
 * the land under it.
 *
 * Night is recomputed once per minute, not per tick
 * (docs/08-motion-spec.md §5 row 13): the memo key is the minute bucket.
 *
 * Task 4.9 raster tier: the base layer (land with borders already knocked
 * out) swaps to one tinted `expo-image`; night becomes a flat unclipped
 * `map.night` wash (clipping to a bitmap isn't available), and the active
 * country stays a real path — it's one country, cheap on any device.
 */
export interface WorldMapProps {
  width: number
  height: number
  activeCountryCode?: string
  /** The one clock tick (CLAUDE.md rule 3). Omit for no night layer. */
  now?: number
}

const MINUTE_MS = 60_000
// The board's hatching: hairlines ~4 pt apart at 45°.
const HATCH_SPACING = 4
const HATCH_STROKE = 1
const BORDER_STROKE = 0.75

export function WorldMap({ width, height, activeCountryCode, now }: WorldMapProps) {
  const { theme } = useAppTheme()
  const tier = useMapRenderTier()
  // useId() yields ":r1:"-style ids; colons inside url(#…) trip some SVG
  // renderers, so they're stripped.
  const idBase = useId().replace(/:/g, "")
  const hatchId = `hatch${idBase}`
  const clipId = `land${idBase}`

  const landPath = useMemo(
    () => (tier === "vector" ? getLandSvgPath(width, height) : ""),
    [tier, width, height],
  )
  const bordersPath = useMemo(
    () => (tier === "vector" ? getBordersSvgPath(width, height) : ""),
    [tier, width, height],
  )
  const activeCountryPath = useMemo(
    () => (activeCountryCode ? getCountrySvgPath(activeCountryCode, width, height) : undefined),
    [activeCountryCode, width, height],
  )
  const minuteBucket = now === undefined ? undefined : Math.floor(now / MINUTE_MS)
  const nightPath = useMemo(
    () =>
      minuteBucket === undefined
        ? undefined
        : getNightRegionPath(minuteBucket * MINUTE_MS, width, height),
    [minuteBucket, width, height],
  )

  if (width <= 0 || height <= 0) return null

  return (
    // Decorative: the map's a11y contract lives on <MeridianMap>'s adjustable
    // surface. The props sit on a View because react-native-svg's web build
    // renders a bare DOM <svg> that ignores RN accessibility props.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {tier === "raster" ? (
        <>
          <Image
            source={landRaster}
            tintColor={theme.colors.mapLand}
            contentFit="fill"
            style={{ width, height }}
          />
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {nightPath && <Path d={nightPath} fill={theme.colors.mapNight} />}
            {activeCountryPath && <Path d={activeCountryPath} fill={theme.colors.mapLandActive} />}
          </Svg>
        </>
      ) : (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <Pattern
              id={hatchId}
              patternUnits="userSpaceOnUse"
              width={HATCH_SPACING}
              height={HATCH_SPACING}
              patternTransform="rotate(45)"
            >
              <Line
                x1={0}
                y1={0}
                x2={0}
                y2={HATCH_SPACING}
                stroke={theme.colors.background}
                strokeWidth={HATCH_STROKE}
              />
            </Pattern>
            <ClipPath id={clipId}>
              <Path d={landPath} />
            </ClipPath>
          </Defs>
          <Path d={landPath} fill={theme.colors.mapLand} />
          {nightPath && (
            <G clipPath={`url(#${clipId})`}>
              <Path d={nightPath} fill={`url(#${hatchId})`} />
            </G>
          )}
          <Path
            d={bordersPath}
            fill="none"
            stroke={theme.colors.background}
            strokeWidth={BORDER_STROKE}
            strokeLinejoin="round"
          />
          {activeCountryPath && <Path d={activeCountryPath} fill={theme.colors.mapLandActive} />}
        </Svg>
      )}
    </View>
  )
}
