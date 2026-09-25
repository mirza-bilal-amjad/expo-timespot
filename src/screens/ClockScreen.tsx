import { TextStyle, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { EntranceView } from "@/components/EntranceView"
import { PressableIcon } from "@/components/Icon"
import { Numeral } from "@/components/Numeral"
import { Screen } from "@/components/Screen"
import { SegmentedPill } from "@/components/SegmentedPill"
import { SunBlock } from "@/components/SunBlock"
import { useTabBarClearance } from "@/components/TabBar"
import { Text } from "@/components/Text"
import { getCityById, getCityByZone } from "@/domain/cities/search"
import { getDeviceZone, getZonedTime } from "@/domain/time/zone"
import { useClock } from "@/hooks/useClock"
import { useShouldPlayEntrance } from "@/hooks/useShouldPlayEntrance"
import { translate } from "@/i18n/translate"
import { useFocusStore } from "@/store/focus"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md "S2 · Clock — focused city detail". The one
 * useClock() subscription for this screen (CLAUDE.md rule 3) drives both the
 * hero numerals and <SunBlock>, which is a pure function of the tick it's
 * handed, not a subscriber of its own.
 */
export function ClockScreen() {
  const { theme, themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  const tabBarClearance = useTabBarClearance()
  const now = useClock()
  const shouldPlayEntrance = useShouldPlayEntrance("clock")

  const focusedCityId = useFocusStore((s) => s.focusedCityId)
  const { prefs, setPrefs } = usePrefsStore()

  const city =
    (focusedCityId && getCityById(focusedCityId)) ?? getCityByZone(getDeviceZone()) ?? null

  if (!city) {
    // Unreachable in practice — cities.min.json always covers the device's
    // own zone — but the type is nullable, so render *something* correct
    // rather than crash.
    return (
      <Screen preset="fixed" contentContainerStyle={themed($screen)}>
        <View style={themed($empty)}>
          <Text preset="default" tx="clock:noCity" />
        </View>
      </Screen>
    )
  }

  const time = getZonedTime(now, city.zone, prefs)
  const [weekdayPart, ...dateRest] = time.dateLabel.split(", ")
  const dateLine2 = dateRest.join(", ")

  const locationText = city.admin1
    ? `${city.name}, ${city.admin1}, ${city.country}`
    : `${city.name}, ${city.country}`

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)}>
      <View
        style={[
          themed($header),
          { paddingTop: insets.top + theme.spacing.sm, paddingBottom: theme.spacing.xl },
        ]}
      >
        <PressableIcon
          icon="clock"
          size="md"
          color={theme.colors.textOnInverse}
          accessibilityLabel={translate("clock:openSettings")}
          containerStyle={themed($mark)}
          // Settings (S7) isn't built yet — outside Phase 3's scope, same
          // pattern as the header add-button placeholder was before task 3.7.
          onPress={() => {}}
        />
        <SegmentedPill
          options={[
            { value: "12h", label: "12h" },
            { value: "24h", label: "24h" },
          ]}
          value={prefs.timeFormat}
          onChange={(timeFormat) => setPrefs({ timeFormat })}
          accessibilityLabel={translate("clock:formatToggle")}
        />
      </View>

      <View style={themed($body)}>
        {/* docs/08-motion-spec.md §7: "Hero clock / screen title | 0 |
         opacity 0→1, translateY 8→0, 320ms ease.decelerate." */}
        <EntranceView play={shouldPlayEntrance}>
          <View
            style={$heroRow}
            accessible
            accessibilityLiveRegion="none"
            accessibilityLabel={`${time.hours}:${time.minutes}:${time.seconds}${time.meridiem ? ` ${time.meridiem}` : ""}, ${time.dateLabel}`}
          >
            <View style={$heroLeft} importantForAccessibility="no-hide-descendants">
              {/* docs/08-motion-spec.md §3: "Minutes roll on the same mechanism...
               hours do not roll — an hour change is rare enough that a cut
               reads as intentional and a roll reads as a glitch." */}
              <Numeral value={time.hours} size="hero" />
              <View style={themed($minuteRow)}>
                <Numeral value={time.minutes} size="hero" animate="roll" />
                <View style={themed($secondsBlock)}>
                  <Numeral value={time.seconds} size="displayXl" animate="roll" />
                  {time.meridiem && <Text preset="offset" text={time.meridiem} />}
                </View>
              </View>
            </View>
            <View style={$dateBlock} importantForAccessibility="no-hide-descendants">
              <Text size="xxl" text={`${weekdayPart},`} style={$dateRight} />
              <Text size="xxl" text={dateLine2} style={$dateRight} />
            </View>
          </View>
        </EntranceView>

        <View style={themed($cityRow)}>
          <Text size="display" text={locationText} style={themed($cityText)} />
          <SunBlock lat={city.lat} lon={city.lon} zone={city.zone} now={now} />
        </View>
      </View>

      <View style={{ height: tabBarClearance }} />
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  backgroundColor: theme.colors.background,
})

const $header: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: theme.spacing.gutter,
})

const $mark: ThemedStyle<ViewStyle> = (theme) => ({
  width: theme.spacing.avatar,
  height: theme.spacing.avatar,
  borderRadius: theme.radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.inverseBackground,
})

const $body: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  paddingHorizontal: theme.spacing.gutter,
  justifyContent: "center",
  gap: theme.spacing.xxl,
})

const $heroRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
}

const $heroLeft: ViewStyle = { alignItems: "flex-start" }

const $minuteRow: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "flex-end",
  gap: theme.spacing.xs,
})

const $secondsBlock: ThemedStyle<ViewStyle> = (theme) => ({
  alignItems: "center",
  paddingBottom: theme.spacing.sm,
})

const $dateBlock: ViewStyle = { alignItems: "flex-end" }
const $dateRight: TextStyle = { textAlign: "right" }

const $cityRow: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: theme.spacing.md,
})

const $cityText: ThemedStyle<TextStyle> = () => ({ flex: 1, flexShrink: 1 })

const $empty: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing.gutter,
})
