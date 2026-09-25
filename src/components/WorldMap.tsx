import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { Path, Svg } from "react-native-svg"

import { getCountrySvgPath } from "@/domain/map/countries"
import { getLandSvgPath } from "@/domain/map/land"
import { useMapRenderTier } from "@/hooks/useMapRenderTier"
import { useAppTheme } from "@/theme/context"

const landRaster = require("@/assets/map/land-raster.png")

/**
 * docs/03-component-library.md "<WorldMap>" (task 4.1 of the `<MeridianMap>`
 * composite), docs/04-screen-specs.md "S3 · Map". Static land silhouette,
 * equirectangular — the caller (docs/10-implementation-plan.md task 4.2+'s
 * `<MeridianMap>`) measures the available space and passes it down; this
 * component owns no layout of its own so the terminator/meridian/ruler
 * layers still to come can share the exact same (width, height) and agree
 * pixel-for-pixel with the land silhouette underneath them.
 *
 * Task 4.7: "no borders except at the country of the focused city, which
 * fills `map.landActive`." That's a second, optional `<Path>` stacked on
 * top of the same land silhouette, not a switch to per-country borders
 * everywhere — `activeCountryCode` is undefined whenever nothing is
 * focused, or when the focused city's country has no geometry at this
 * resolution (`getCountrySvgPath`'s own doc comment), and either way this
 * component just renders one path instead of two.
 *
 * Task 4.9: "Low-end devices... swap to a pre-rendered raster at 2×"
 * (`useMapRenderTier`, `scripts/build-map.ts`'s own `land-raster.png`).
 * The *base land layer* swaps to a flat `expo-image`, tinted to
 * `theme.colors.mapLand` via `tintColor` rather than shipping one PNG per
 * theme — but the active-country highlight stays a real `<Path>` even on
 * the raster tier: it's a single country's geometry, not the whole
 * world's, so it's cheap regardless, and dropping it would mean the raster
 * fallback silently loses a feature rather than just costing less to draw.
 */
export interface WorldMapProps {
  width: number
  height: number
  activeCountryCode?: string
}

export function WorldMap({ width, height, activeCountryCode }: WorldMapProps) {
  const { theme } = useAppTheme()
  const tier = useMapRenderTier()
  const landPath = useMemo(
    () => (tier === "vector" ? getLandSvgPath(width, height) : ""),
    [tier, width, height],
  )
  const activeCountryPath = useMemo(
    () => (activeCountryCode ? getCountrySvgPath(activeCountryCode, width, height) : undefined),
    [activeCountryCode, width, height],
  )

  if (width <= 0 || height <= 0) return null

  return (
    // Decorative on its own — the map's real a11y contract
    // (docs/09-accessibility.md §2, task 4.8's `adjustable` role + keyboard
    // arrows) lives on `<MeridianLine>`'s own drag surface, not this static
    // land silhouette. These props go on a wrapping View, not <Svg> itself
    // — react-native-svg's web
    // build renders a bare DOM <svg>, which doesn't understand RN's
    // accessibility prop names the way a real RN View (and react-native-web's
    // View) does.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {tier === "raster" ? (
        <>
          <Image
            source={landRaster}
            tintColor={theme.colors.mapLand}
            contentFit="fill"
            style={{ width, height }}
          />
          {activeCountryPath && (
            <Svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              style={StyleSheet.absoluteFill}
            >
              <Path d={activeCountryPath} fill={theme.colors.mapLandActive} />
            </Svg>
          )}
        </>
      ) : (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Path d={landPath} fill={theme.colors.mapLand} />
          {activeCountryPath && <Path d={activeCountryPath} fill={theme.colors.mapLandActive} />}
        </Svg>
      )}
    </View>
  )
}
