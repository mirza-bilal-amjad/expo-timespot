import { useEffect, useRef, useState } from "react"
import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { EntranceView } from "@/components/EntranceView"
import { PressableIcon } from "@/components/Icon"
import { Numeral } from "@/components/Numeral"
import { Screen } from "@/components/Screen"
import { SegmentedPill } from "@/components/SegmentedPill"
import { SettingsSheet } from "@/components/SettingsSheet"
import { SunBlock } from "@/components/SunBlock"
import { useTabBarClearance } from "@/components/TabBar"
import { $sizeStyles, Text } from "@/components/Text"
import { getCityById, getCityByZone } from "@/domain/cities/search"
import { getDeviceZone, getZonedTime } from "@/domain/time/zone"
import { useClock } from "@/hooks/useClock"
import { useShouldPlayEntrance } from "@/hooks/useShouldPlayEntrance"
import { translate } from "@/i18n/translate"
import { useFocusStore } from "@/store/focus"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { isSettled, nextCityScale, nextHeroScale } from "@/utils/fitType"

interface Size {
  width: number
  height: number
}

const sizeOf = (e: LayoutChangeEvent): Size => ({
  width: e.nativeEvent.layout.width,
  height: e.nativeEvent.layout.height,
})

// How far the hero and the city name may scale from their design sizes
// (hero 144 pt, city 56 pt), and the hero's cap on the body's height so the
// city always keeps room.
const HERO_SCALE = { min: 0.6, max: 1.6 }
const CITY_SCALE = { min: 0.75, max: 2 }
const HERO_MAX_HEIGHT_SHARE = 0.62
const HERO_SHRINK_STEP = 0.92
const MAX_FIT_PASSES = 12
const FIT_REVEAL_TIMEOUT_MS = 300

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
  const [settingsOpen, setSettingsOpen] = useState(false)

  // docs/04-screen-specs.md S2 "Fitting the type": the hero scales until its
  // widest row fills the width; the city name then grows into whatever
  // height is left. Measure → next scale → re-render → re-measure, until
  // both settle (utils/fitType.ts). ~~Hero pinned top, city pinned bottom~~
  // — corrected 2026-09-26: on a tall phone with a short name that left a
  // screen-sized hole between them.
  const [fit, setFit] = useState({ hero: 1, city: 1, settled: false })
  const [body, setBody] = useState<Size | null>(null)
  // Each measurement carries the scale it was taken at: a layout event from
  // an older render can arrive after the scale has already moved on, and
  // pairing it with the *current* scale over-corrects.
  const [hero, setHero] = useState<{ size: Size; scale: number } | null>(null)
  const [sunHeight, setSunHeight] = useState(0)
  const [cityText, setCityText] = useState<{ height: number; scale: number } | null>(null)
  const passes = useRef(0)

  const cityId = focusedCityId
  useEffect(() => {
    // A new city, format or screen size re-opens the fitting budget.
    passes.current = 0
  }, [cityId, prefs.timeFormat, body])

  useEffect(() => {
    if (!body || !hero || !cityText || cityText.height <= 0) return
    // Judge only a layout taken at the scales currently rendered.
    if (hero.scale !== fit.hero || cityText.scale !== fit.city) return
    const contentWidth = body.width - 2 * theme.spacing.gutter
    const contentHeight = body.height - 2 * theme.spacing.sm
    let nextHero = nextHeroScale(
      fit.hero,
      hero.size,
      contentWidth,
      contentHeight,
      HERO_MAX_HEIGHT_SHARE,
      HERO_SCALE,
    )
    const overflowAtMin = (room: number) =>
      cityText.height > room + 1 && fit.city <= CITY_SCALE.min + 0.001
    const roomFor = (heroScale: number) =>
      contentHeight -
      hero.size.height * (heroScale / fit.hero) -
      theme.spacing.xl -
      sunHeight -
      theme.spacing.sm
    // Small screens: the city name is already as small as it may get and
    // still doesn't fit — make the room by shrinking the hero instead.
    if (overflowAtMin(roomFor(nextHero))) {
      nextHero = Math.max(HERO_SCALE.min, Math.min(nextHero, fit.hero * HERO_SHRINK_STEP))
    }
    const cityRoom = roomFor(nextHero)
    const nextCity = nextCityScale(fit.city, cityText.height, cityRoom, CITY_SCALE)
    const overflowing = cityText.height > cityRoom + 1 && nextCity < fit.city
    const done =
      passes.current >= MAX_FIT_PASSES ||
      (isSettled(fit.hero, nextHero) && isSettled(fit.city, nextCity) && !overflowing)
    passes.current += 1
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measure → resize is inherently an effect: the next size depends on the committed layout
    if (done) setFit((f) => (f.settled ? f : { ...f, settled: true }))
    else setFit({ hero: nextHero, city: nextCity, settled: fit.settled })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only on new measurements
  }, [body, hero, sunHeight, cityText])

  // Never leave the composition hidden if a measurement doesn't arrive.
  useEffect(() => {
    const timer = setTimeout(
      () => setFit((f) => (f.settled ? f : { ...f, settled: true })),
      FIT_REVEAL_TIMEOUT_MS,
    )
    return () => clearTimeout(timer)
  }, [])

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

  const dateStyle: TextStyle = {
    fontSize: $sizeStyles.xxl.fontSize * fit.hero,
    lineHeight: $sizeStyles.xxl.lineHeight * fit.hero,
  }
  const cityStyle: TextStyle = {
    fontSize: $sizeStyles.display.fontSize * fit.city,
    lineHeight: $sizeStyles.display.lineHeight * fit.city,
    letterSpacing: $sizeStyles.display.letterSpacing * fit.city,
  }

  return (
    // The sheet is a sibling of <Screen>, never inside its scroll view
    // (docs/14-ignite-integration.md §6 rule 4).
    <View style={$root}>
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
            onPress={() => setSettingsOpen(true)}
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

        <View style={themed($body)} onLayout={(e) => setBody(sizeOf(e))}>
          {/* One composition, fitted to the space (see the fit effect above):
           hidden for the few frames it takes to settle, so the resizing is
           never seen. */}
          <View style={[themed($composition), !fit.settled && $hidden]}>
            {/* docs/08-motion-spec.md §7: "Hero clock / screen title | 0 |
             opacity 0→1, translateY 8→0, 320ms ease.decelerate." */}
            <EntranceView play={shouldPlayEntrance}>
              <View
                style={$hero}
                onLayout={(e) => setHero({ size: sizeOf(e), scale: fit.hero })}
                accessible
                accessibilityLiveRegion="none"
                accessibilityLabel={`${time.hours}:${time.minutes}:${time.seconds}${time.meridiem ? ` ${time.meridiem}` : ""}, ${time.dateLabel}`}
              >
                {/* The board's arrangement: hours beside the date, minutes
                 beside the seconds. docs/08-motion-spec.md §3: minutes and
                 seconds roll; hours cut. */}
                <View style={$heroLine}>
                  <Numeral value={time.hours} size="hero" scale={fit.hero} />
                  <View style={themed($dateBlock)}>
                    <Text text={`${weekdayPart},`} numberOfLines={1} style={dateStyle} />
                    <Text text={dateLine2} numberOfLines={1} style={dateStyle} />
                  </View>
                </View>
                <View style={$heroLine}>
                  <Numeral value={time.minutes} size="hero" animate="roll" scale={fit.hero} />
                  <View style={themed($secondsBlock)}>
                    <Numeral
                      value={time.seconds}
                      size="displayXl"
                      animate="roll"
                      scale={fit.hero}
                    />
                    {time.meridiem && <Text preset="offset" text={time.meridiem} />}
                  </View>
                </View>
              </View>
            </EntranceView>

            <View style={themed($cityBlock)}>
              <View style={$sunRow} onLayout={(e) => setSunHeight(sizeOf(e).height)}>
                <SunBlock lat={city.lat} lon={city.lon} zone={city.zone} now={now} />
              </View>
              <Text
                text={locationText}
                style={cityStyle}
                onLayout={(e) => setCityText({ height: sizeOf(e).height, scale: fit.city })}
              />
            </View>
          </View>
        </View>

        <View style={{ height: tabBarClearance + theme.spacing.lg }} />
      </Screen>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </View>
  )
}

const $root: ViewStyle = { flex: 1 }

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

// The vertical padding keeps the hero's glyphs, which rise above their
// deliberately tight line box, clear of the header.
const $body: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  paddingHorizontal: theme.spacing.gutter,
  paddingVertical: theme.spacing.sm,
  justifyContent: "center",
})

const $composition: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.xl })

const $hidden: ViewStyle = { opacity: 0 }

// Natural width, so the fit can measure how wide the hero really is.
const $hero: ViewStyle = { alignSelf: "flex-start" }

const $heroLine: ViewStyle = { flexDirection: "row", alignItems: "center" }

const $dateBlock: ThemedStyle<ViewStyle> = (theme) => ({ marginLeft: theme.spacing.md })

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
