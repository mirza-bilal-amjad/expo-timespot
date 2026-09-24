import { useState } from "react"
import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { WorldMap } from "@/components/WorldMap"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md "S3 · Map". This is only task 4.1 of Phase 4 — the
 * static `<WorldMap>` land silhouette, "fills available height" below the
 * title. `<Terminator>` (4.2), `<MeridianLine>`/`<UtcRuler>` (4.3-4.4) and
 * `<FloatingCityCard>` (4.6) layer on top of the same measured (width,
 * height) in later tasks — that's also when the avatar strip + add-button
 * header row the mockup shows gets pulled out into shared chrome; for now
 * this screen owns just its own title, like ClockScreen did before 3.9.
 */
export function MapScreen() {
  const { themed } = useAppTheme()
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })

  const handleMapAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setMapSize({ width, height })
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)}>
      <Text preset="screenTitle" tx="list:title" style={themed($title)} />
      <View style={$mapArea} onLayout={handleMapAreaLayout}>
        {mapSize.width > 0 && <WorldMap width={mapSize.width} height={mapSize.height} />}
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
