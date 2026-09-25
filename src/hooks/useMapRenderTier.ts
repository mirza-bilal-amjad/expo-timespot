import { useEffect, useRef, useState } from "react"
import { Platform } from "react-native"
import * as Device from "expo-device"

import { decideMapRenderTier, MapRenderTier } from "@/domain/map/renderTier"

/**
 * docs/04-screen-specs.md "S3 · Map", docs/07-responsive-strategy.md's
 * platform-exception table #8: "Map raster fallback | device-tier check |
 * never (browsers cope)" — web always renders the vector map; the tier
 * check (and the `expo-device` read behind it) never runs there at all.
 *
 * `deviceYearClass` is checked once and, when it already flags a low-end
 * device, decides the render tier before the map has painted a single
 * frame — no need to measure anything to know. Otherwise the vector map
 * mounts first (optimistic default) and this measures the time from mount
 * to its next paint; a slow first paint downgrades subsequent renders to
 * raster. This can only ever go vector -> raster within a mount, never
 * back — a tier that recovers mid-session would mean the map silently
 * changing rendering strategy under the user's thumb.
 */
export function useMapRenderTier(): MapRenderTier {
  const deviceYearClass = Platform.OS === "web" ? null : (Device.deviceYearClass ?? null)

  const [tier, setTier] = useState<MapRenderTier>(() =>
    decideMapRenderTier({ deviceYearClass, firstPaintMs: null }),
  )

  const hasMeasured = useRef(false)

  useEffect(() => {
    if (Platform.OS === "web" || tier === "raster" || hasMeasured.current) return
    hasMeasured.current = true

    const mountedAt = performance.now()
    const frame = requestAnimationFrame(() => {
      const firstPaintMs = performance.now() - mountedAt
      const next = decideMapRenderTier({ deviceYearClass, firstPaintMs })
      if (next !== tier) setTier(next)
    })
    return () => cancelAnimationFrame(frame)
  }, [tier, deviceYearClass])

  return tier
}
