import { useMemo } from "react"
import { View } from "react-native"
import { Path, Svg } from "react-native-svg"

import { getCountrySvgPath } from "@/domain/map/countries"
import { getLandSvgPath } from "@/domain/map/land"
import { useAppTheme } from "@/theme/context"

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
 */
export interface WorldMapProps {
  width: number
  height: number
  activeCountryCode?: string
}

export function WorldMap({ width, height, activeCountryCode }: WorldMapProps) {
  const { theme } = useAppTheme()
  const landPath = useMemo(() => getLandSvgPath(width, height), [width, height])
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
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={landPath} fill={theme.colors.mapLand} />
        {activeCountryPath && <Path d={activeCountryPath} fill={theme.colors.mapLandActive} />}
      </Svg>
    </View>
  )
}
