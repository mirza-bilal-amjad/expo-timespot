import { View, ViewStyle } from "react-native"
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
    <Screen preset="auto" contentContainerStyle={themed($screen)}>
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
            accessible
            accessibilityLiveRegion="none"
            accessibilityLabel={`${time.hours}:${time.minutes}:${time.seconds}${time.meridiem ? ` ${time.meridiem}` : ""}, ${time.dateLabel}`}
          >
            {/* The board's arrangement: hours beside the date, minutes beside
             the seconds — two rows, so the date only competes with two hero
             digits for width, never with the whole stack.
             docs/08-motion-spec.md §3: minutes and seconds roll; hours cut. */}
            <View style={$heroLine}>
              <Numeral value={time.hours} size="hero" />
              <View style={themed($dateBlock)}>
                <Text size="xxl" text={`${weekdayPart},`} numberOfLines={1} />
                <Text size="xxl" text={dateLine2} numberOfLines={1} />
              </View>
            </View>
            <View style={$heroLine}>
              <Numeral value={time.minutes} size="hero" animate="roll" />
              <View style={themed($secondsBlock)}>
                <Numeral value={time.seconds} size="displayXl" animate="roll" />
                {time.meridiem && <Text preset="offset" text={time.meridiem} />}
              </View>
            </View>
          </View>
        </EntranceView>

        <View style={themed($cityBlock)}>
          <View style={$sunRow}>
            <SunBlock lat={city.lat} lon={city.lon} zone={city.zone} now={now} />
          </View>
          <Text size="display" text={locationText} />
        </View>
      </View>

      <View style={{ height: tabBarClearance + theme.spacing.lg }} />
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
  justifyContent: "space-between",
  gap: theme.spacing.xl,
})

const $heroLine: ViewStyle = { flexDirection: "row", alignItems: "center" }

const $dateBlock: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  marginLeft: theme.spacing.md,
})

const $secondsBlock: ThemedStyle<ViewStyle> = (theme) => ({
  marginLeft: theme.spacing.md,
  alignItems: "center",
})

const $cityBlock: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.sm })

const $sunRow: ViewStyle = { alignItems: "flex-end" }

const $empty: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing.gutter,
})
