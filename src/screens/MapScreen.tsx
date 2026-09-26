import { useCallback, useEffect, useMemo, useState } from "react"
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
import { useBreakpoint } from "@/hooks/useBreakpoint"
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

  const [area, setArea] = useState({ width: 0, height: 0 })
  const [rulerHeight, setRulerHeight] = useState(0)
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

  // docs/04-screen-specs.md S3 "Web adaptation": from md the map is a band
  // inside the container — the largest 16:9 (4:3 under 900 px) box the space
  // allows — and from 1200 px the floating card docks to its right.
  const { atLeast, gutter, width: windowWidth } = useBreakpoint()
  const band = atLeast("md")
  const aspect = windowWidth >= BAND_WIDE_MIN_WIDTH ? BAND_ASPECT.wide : BAND_ASPECT.narrow
  const cardDock = windowWidth >= CARD_DOCK_MIN_WIDTH ? "right" : "pointer"

  const handleMapAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setArea({ width, height })
  }

  // Phone: the map fills the area. Band: the largest box of the band's
  // aspect that leaves room for the ruler right under it.
  const rulerGap = theme.spacing.md
  const mapSize = useMemo(() => {
    if (!band) return area
    const room = Math.max(0, area.height - rulerHeight - rulerGap)
    const width = Math.min(area.width, room * aspect)
    return { width, height: width / aspect }
  }, [band, area, rulerHeight, rulerGap, aspect])

  const ruler = <UtcRuler offsetMinutes={rulerOffset} onSettle={handleRulerSettle} />

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)}>
      <View
        style={[
          $column,
          band && { maxWidth: theme.spacing.container + 2 * gutter, paddingHorizontal: gutter },
        ]}
      >
        <Text preset="screenTitle" tx="list:title" style={[themed($title), band && $titleInBand]} />
        <View
          style={[themed($mapArea), band && themed($mapAreaBand)]}
          onLayout={handleMapAreaLayout}
        >
          {mapSize.width > 0 && (
            <View style={band && themed($bandFrame)}>
              <MeridianMap
                width={mapSize.width}
                height={mapSize.height}
                city={selected}
                onSelectCity={setSelected}
                onPreviewCity={setPreview}
                now={now}
                prefs={prefs}
                cardDock={band ? cardDock : "pointer"}
              />
            </View>
          )}
          {band && (
            <View
              style={{ width: mapSize.width, marginTop: rulerGap }}
              onLayout={(e) => setRulerHeight(e.nativeEvent.layout.height)}
            >
              {ruler}
            </View>
          )}
        </View>
        {!band && <View style={{ marginBottom: tabBarClearance }}>{ruler}</View>}
        {band && <View style={{ height: tabBarClearance }} />}
      </View>
    </Screen>
  )
}

const BAND_ASPECT = { wide: 16 / 9, narrow: 4 / 3 }
const BAND_WIDE_MIN_WIDTH = 900
const CARD_DOCK_MIN_WIDTH = 1200

const $column: ViewStyle = { flex: 1, width: "100%", alignSelf: "center" }

const $titleInBand: TextStyle = { paddingHorizontal: 0 }

// The band: the map sits centred in the space, framed with the card radius.
const $mapAreaBand: ThemedStyle<ViewStyle> = () => ({
  borderTopWidth: 0,
  borderBottomWidth: 0,
  alignItems: "center",
  justifyContent: "center",
})

const $bandFrame: ThemedStyle<ViewStyle> = (theme) => ({
  borderRadius: theme.radius.md,
  overflow: "hidden",
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.separator,
})

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
