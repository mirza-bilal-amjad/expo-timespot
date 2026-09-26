import { useLayoutEffect, useState } from "react"
import { Platform } from "react-native"

let hydrated = Platform.OS !== "web"

/**
 * docs/10-implementation-plan.md task 6.5. `false` during the static web
 * render and during the hydration render that must match it; `true` from
 * the layout effect after hydration — which runs *before* the browser
 * paints, so nothing rendered behind this gate is ever seen in its
 * build-time state. Always `true` on native (there is no server render),
 * and for anything mounted after the first hydration.
 *
 * `useLayoutEffect`, never `useEffect`: a passive effect runs after paint,
 * which is exactly the one frame of stale content this exists to prevent.
 */
export function useIsHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(hydrated)
  useLayoutEffect(() => {
    if (isHydrated) return
    hydrated = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the post-hydration flip is the point: it re-renders before the browser paints
    setIsHydrated(true)
  }, [isHydrated])
  return isHydrated
}
