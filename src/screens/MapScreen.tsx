import { useCallback, useState } from "react"
import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"

import { MeridianLine } from "@/components/MeridianLine"
import { Screen } from "@/components/Screen"
import { Terminator } from "@/components/Terminator"
import { Text } from "@/components/Text"
import { WorldMap } from "@/components/WorldMap"
import { getCityById } from "@/domain/cities/search"
import { getOffsetMinutes } from "@/domain/time/zone"
import { useClock } from "@/hooks/useClock"
import { useFocusStore } from "@/store/focus"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md "S3 · Map". Tasks 4.1-4.3 of Phase 4 so far — the
 * static `<WorldMap>` land silhouette, the `<Terminator>` night overlay and
 * the draggable `<MeridianLine>`, all stacked on the same measured (width,
 * height) below the title, "fills available height". `<UtcRuler>` (4.4) and
 * `<FloatingCityCard>` (4.6) layer on top in later tasks — that's also when
 * the avatar strip + add-button header row the mockup shows gets pulled out
 * into shared chrome; for now this screen owns just its own title, like
 * ClockScreen did before 3.9.
 */
export function MapScreen() {
  const { themed } = useAppTheme()
  const now = useClock()
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })
  const focusedCityId = useFocusStore((s) => s.focusedCityId)

  const handleMapAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setMapSize({ width, height })
  }

  // No ruler/floating-card to drive yet (4.4/4.6) — the callback exists on
  // <MeridianLine> so the throttled drag plumbing is already in place for
  // them to consume without touching the gesture again.
  const handleOffsetChange = useCallback((_offsetMinutes: number) => {}, [])

  const focusedCity = focusedCityId ? getCityById(focusedCityId) : undefined
  const markerLat = focusedCity?.lat ?? 0
  const initialOffsetMinutes = focusedCity ? getOffsetMinutes(now, focusedCity.zone) : 0

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)}>
      <Text preset="screenTitle" tx="list:title" style={themed($title)} />
      <View style={$mapArea} onLayout={handleMapAreaLayout}>
        {mapSize.width > 0 && (
          <>
            <WorldMap width={mapSize.width} height={mapSize.height} />
            <View style={$overlay}>
              <Terminator now={now} width={mapSize.width} height={mapSize.height} />
            </View>
            <MeridianLine
              width={mapSize.width}
              height={mapSize.height}
              markerLat={markerLat}
              initialOffsetMinutes={initialOffsetMinutes}
              onOffsetChange={handleOffsetChange}
            />
          </>
        )}
      </View>
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  backgroundColor: theme.colors.background,
  paddingHorizontal: theme.spacing.gutter,
})

const $title: ThemedStyle<TextStyle> = (theme) => ({ marginTop: theme.spacing.xl })

const $mapArea: ViewStyle = { flex: 1 }

const $overlay: ViewStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }
