import { useState } from "react"
import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Terminator } from "@/components/Terminator"
import { Text } from "@/components/Text"
import { WorldMap } from "@/components/WorldMap"
import { useClock } from "@/hooks/useClock"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md "S3 · Map". Tasks 4.1-4.2 of Phase 4 so far — the
 * static `<WorldMap>` land silhouette with the `<Terminator>` night overlay
 * stacked on top, "fills available height" below the title.
 * `<MeridianLine>`/`<UtcRuler>` (4.3-4.4) and `<FloatingCityCard>` (4.6)
 * layer on top of the same measured (width, height) in later tasks — that's
 * also when the avatar strip + add-button header row the mockup shows gets
 * pulled out into shared chrome; for now this screen owns just its own
 * title, like ClockScreen did before 3.9.
 */
export function MapScreen() {
  const { themed } = useAppTheme()
  const now = useClock()
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })

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
            <WorldMap width={mapSize.width} height={mapSize.height} />
            <View style={$overlay}>
              <Terminator now={now} width={mapSize.width} height={mapSize.height} />
            </View>
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
