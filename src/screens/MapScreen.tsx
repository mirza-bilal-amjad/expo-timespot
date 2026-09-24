import { useState } from "react"
import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"
import { useSharedValue } from "react-native-reanimated"

import { FloatingCityCard } from "@/components/FloatingCityCard"
import { MeridianLine } from "@/components/MeridianLine"
import { Screen } from "@/components/Screen"
import { useTabBarClearance } from "@/components/TabBar"
import { Terminator } from "@/components/Terminator"
import { Text } from "@/components/Text"
import { UtcRuler } from "@/components/UtcRuler"
import { WorldMap } from "@/components/WorldMap"
import { getCityById } from "@/domain/cities/search"
import { getOffsetMinutes } from "@/domain/time/zone"
import { useClock } from "@/hooks/useClock"
import { useFocusStore } from "@/store/focus"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md "S3 · Map". Tasks 4.1-4.4 of Phase 4 so far — the
 * static `<WorldMap>` land silhouette, the `<Terminator>` night overlay, the
 * draggable `<MeridianLine>` and the `<UtcRuler>` below it, all sharing one
 * `offsetMinutes` Reanimated shared value ("the ruler and the meridian are
 * two views of one shared value... no JS round-trip") created here and
 * seeded once from the focused city's current offset — it does not resync
 * if the focused city changes elsewhere while this screen is mounted; that
 * kind of cross-screen sync is more naturally task 4.6's job once the
 * floating card exists to show what it resolved to.
 * `<FloatingCityCard>` (task 4.6) now layers on top, reading `offsetMinutes`
 * directly rather than through another prop threaded from here — it owns
 * its own throttled bridge to the dataset lookup (see its own doc comment
 * for why that has to live there and not on `<MeridianLine>`).
 * `activeCountryCode` (task 4.7) uses the same `focusedCity` this screen
 * already resolves for `markerLat` — docs/04-screen-specs.md's "the country
 * of the focused city" sits right next to "the focused city's latitude" in
 * the same paragraph, so both read as the one persistently-focused city
 * (`useFocusStore`), not wherever the meridian is currently being dragged.
 * The avatar strip + add-button header row the mockup shows is still out of
 * scope — pulling that into shared chrome is unrelated to the map itself;
 * for now this screen owns just its own title, like ClockScreen did before
 * 3.9.
 */
export function MapScreen() {
  const { themed } = useAppTheme()
  const now = useClock()
  const tabBarClearance = useTabBarClearance()
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })
  const focusedCityId = useFocusStore((s) => s.focusedCityId)
  const { prefs } = usePrefsStore()

  const focusedCity = focusedCityId ? getCityById(focusedCityId) : undefined
  const markerLat = focusedCity?.lat ?? 0
  const initialOffsetMinutes = focusedCity ? getOffsetMinutes(now, focusedCity.zone) : 0

  // Only read once, at mount, to seed the shared value — useSharedValue
  // ignores this argument on every render after the first, which is
  // exactly what's wanted here: re-seeding on every clock tick would fight
  // the user's own drag.
  const offsetMinutes = useSharedValue(initialOffsetMinutes)

  const handleMapAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setMapSize({ width, height })
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)}>
      <Text preset="screenTitle" tx="list:title" style={themed($title)} />
      <View style={$mapArea} onLayout={handleMapAreaLayout}>
        {mapSize.width > 0 && (
          <>
            <WorldMap
              width={mapSize.width}
              height={mapSize.height}
              activeCountryCode={focusedCity?.countryCode}
            />
            <View style={$overlay}>
              <Terminator now={now} width={mapSize.width} height={mapSize.height} />
            </View>
            <MeridianLine
              width={mapSize.width}
              height={mapSize.height}
              markerLat={markerLat}
              offsetMinutes={offsetMinutes}
            />
            <FloatingCityCard
              width={mapSize.width}
              height={mapSize.height}
              offsetMinutes={offsetMinutes}
              now={now}
              prefs={prefs}
            />
          </>
        )}
      </View>
      <View style={[themed($rulerRow), { marginBottom: tabBarClearance }]}>
        <UtcRuler offsetMinutes={offsetMinutes} />
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

const $rulerRow: ThemedStyle<ViewStyle> = (theme) => ({ marginTop: theme.spacing.sm })
