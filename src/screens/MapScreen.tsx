import { useCallback, useEffect, useState } from "react"
import { LayoutChangeEvent, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { useIsFocused } from "expo-router"
import { useSharedValue, withTiming } from "react-native-reanimated"

import { MeridianMap } from "@/components/MeridianMap"
import { Screen } from "@/components/Screen"
import { useTabBarClearance } from "@/components/TabBar"
import { Text } from "@/components/Text"
import { UtcRuler } from "@/components/UtcRuler"
import { getCityById, getCityByZone, getNearestRepresentativeCity } from "@/domain/cities/search"
import { snapToNearestOffset } from "@/domain/map/snap"
import { getDeviceZone, getOffsetMinutes } from "@/domain/time/zone"
import type { City } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { useFocusStore } from "@/store/focus"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md "S3 · Map". The map runs edge to edge, as on the
 * board; only the title keeps the gutter.
 *
 * The map's selection is this screen's own state — a city, not an offset.
 * It opens on the focused city (else the device's zone) and changes when
 * the user points at the map (<MeridianMap>) or settles the ruler on an
 * offset (<UtcRuler>), which resolves to that zone's best-known city.
 * Pointing at the map doesn't change the app-wide focus.
 *
 * `rulerOffset` is the ruler's display value, animated to the offset of
 * the city under the finger mid-drag, else the selected city's.
 */
export function MapScreen() {
  const { theme, themed } = useAppTheme()
  const now = useClock({ active: useIsFocused() })
  const tabBarClearance = useTabBarClearance()
  const { prefs } = usePrefsStore()
  const focusedCityId = useFocusStore((s) => s.focusedCityId)

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })
  const [selected, setSelected] = useState<City>(
    () =>
      (focusedCityId ? getCityById(focusedCityId) : undefined) ??
      getCityByZone(getDeviceZone()) ??
      getNearestRepresentativeCity(0, now),
  )

  const [preview, setPreview] = useState<City | null>(null)

  const rulerOffset = useSharedValue(getOffsetMinutes(now, selected.zone))
  const shownOffset = getOffsetMinutes(now, (preview ?? selected).zone)
  useEffect(() => {
    rulerOffset.value = withTiming(shownOffset, { duration: theme.timing.base })
  }, [shownOffset, rulerOffset, theme.timing.base])

  const handleRulerSettle = useCallback(
    (offset: number) => {
      const target = snapToNearestOffset(offset)
      setSelected((current) =>
        getOffsetMinutes(now, current.zone) === target
          ? current
          : getNearestRepresentativeCity(target, now),
      )
    },
    [now],
  )

  const handleMapAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setMapSize({ width, height })
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)}>
      <Text preset="screenTitle" tx="list:title" style={themed($title)} />
      <View style={themed($mapArea)} onLayout={handleMapAreaLayout}>
        {mapSize.width > 0 && (
          <MeridianMap
            width={mapSize.width}
            height={mapSize.height}
            city={selected}
            onSelectCity={setSelected}
            onPreviewCity={setPreview}
            now={now}
            prefs={prefs}
          />
        )}
      </View>
      <View style={{ marginBottom: tabBarClearance }}>
        <UtcRuler offsetMinutes={rulerOffset} onSettle={handleRulerSettle} />
      </View>
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  backgroundColor: theme.colors.background,
})

const $title: ThemedStyle<TextStyle> = (theme) => ({
  marginTop: theme.spacing.xl,
  marginBottom: theme.spacing.md,
  paddingHorizontal: theme.spacing.gutter,
})

const $mapArea: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.separator,
})
