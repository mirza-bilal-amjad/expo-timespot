import { useMemo } from "react"
import { View } from "react-native"
import { Path, Svg } from "react-native-svg"

import { getNightRegionPath } from "@/domain/sun/terminator"
import { useAppTheme } from "@/theme/context"

const MINUTE_MS = 60_000

/**
 * docs/03-component-library.md "<MeridianMap>" (task 4.2 of the composite),
 * docs/04-screen-specs.md "S3 · Map" — the night hemisphere as a `map.night`
 * overlay, "recomputed once per minute, not per second"
 * (docs/08-motion-spec.md §5, table row 13). `now` still comes from the
 * screen's one clock (CLAUDE.md rule 3) so this stays in step with
 * everything else on the tick, but the expensive suncalc solve
 * (`getNightRegionPath`) is only re-run when the minute bucket changes, not
 * on every second-granular `now` update — `useMemo`'s dep is the bucket,
 * not `now` itself.
 */
export interface TerminatorProps {
  now: number
  width: number
  height: number
}

export function Terminator({ now, width, height }: TerminatorProps) {
  const { theme } = useAppTheme()
  const minuteBucket = Math.floor(now / MINUTE_MS)
  const nightPath = useMemo(
    () => getNightRegionPath(minuteBucket * MINUTE_MS, width, height),
    [minuteBucket, width, height],
  )

  if (width <= 0 || height <= 0) return null

  return (
    // Decorative, same as WorldMap — see its own comment for why these a11y
    // props live on a wrapping View rather than on <Svg> itself.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={nightPath} fill={theme.colors.mapNight} />
      </Svg>
    </View>
  )
}
