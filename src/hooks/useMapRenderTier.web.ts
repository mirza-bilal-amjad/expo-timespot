import type { MapRenderTier } from "@/domain/map/renderTier"

/**
 * docs/07-responsive-strategy.md exception #8: the raster fallback is
 * "never" on web — browsers cope. A separate file so the web build doesn't
 * bundle `expo-device` (and its user-agent parser) for a check it never runs.
 */
export function useMapRenderTier(): MapRenderTier {
  return "vector"
}
