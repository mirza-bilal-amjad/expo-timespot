import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { EntranceView } from "@/components/EntranceView"
import { PressableIcon } from "@/components/Icon"
import {
  Numeral,
  numeralCellWidth,
  type NumeralSize,
  useNumeralCalibrated,
} from "@/components/Numeral"
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
import { type CityMetrics, type ClockFit, fitClock, type Size } from "@/utils/fitType"

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
// The city wraps within 96 % of the width: headroom for the platform's line
// breaker measuring a whole line a hair wider than the separate words did.
const WRAP_SAFETY = 0.96
// If the platform still needs more lines than predicted, it may shrink the
// name this far rather than truncate it (iOS/Android `adjustsFontSizeToFit`).
const CITY_MIN_FONT_SCALE = 0.8
// Never leave the composition hidden if a measurement doesn't arrive.
const FIT_REVEAL_TIMEOUT_MS = 300
// The hidden reference layout is this wide so no reference text ever wraps.
const REFERENCE_LAYER_WIDTH = 4096
const NO_BREAK_SPACE = "\u00A0"

const HERO_NUMERALS: NumeralSize[] = ["hero", "displayXl"]

// The type styles, at a scale. The hidden reference and the visible
// composition must use exactly these, or the prediction is off.
const dateStyleAt = (scale: number): TextStyle => ({
  fontSize: $sizeStyles.xxl.fontSize * scale,
  lineHeight: $sizeStyles.xxl.lineHeight * scale,
})
const cityStyleAt = (scale: number): TextStyle => ({
  fontSize: $sizeStyles.display.fontSize * scale,
  lineHeight: $sizeStyles.display.lineHeight * scale,
  letterSpacing: $sizeStyles.display.letterSpacing * scale,
})

/** What the hidden reference layout measured, at scale 1. */
interface Reference {
  key: string
  heroHeight: number
  dateWidth: number
  city: CityMetrics
}

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

  // docs/04-screen-specs.md S2 "Fitting the type": the hero scales until it
  // fills the width, the city name grows into the height that's left.
  // Measured once at scale 1 in a hidden reference, computed in one shot
  // (utils/fitType.ts), rendered once. ~~Measure → resize → re-measure~~ —
  // corrected 2026-09-26: every pass was a visible resize, and it jittered.
  const fontFamily = theme.typography.primary.normal
  const numeralsReady = useNumeralCalibrated(fontFamily, HERO_NUMERALS)
  const [body, setBody] = useState<Size | null>(null)
  const [sunHeight, setSunHeight] = useState<number | null>(null)
  const [reference, setReference] = useState<Reference | null>(null)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const onBodyLayout = useCallback((e: LayoutChangeEvent) => {
    const next = sizeOf(e)
    setBody((prev) =>
      prev && prev.width === next.width && prev.height === next.height ? prev : next,
    )
  }, [])
  const onReference = useCallback((next: Reference) => {
    setReference((prev) => (prev && sameReference(prev, next) ? prev : next))
  }, [])

  const city =
    (focusedCityId && getCityById(focusedCityId)) ?? getCityByZone(getDeviceZone()) ?? null
  const time = city ? getZonedTime(now, city.zone, prefs) : null
  const [weekdayPart = "", ...dateRest] = time ? time.dateLabel.split(", ") : []
  const dateLine2 = dateRest.join(", ")
  const hoursLength = time?.hours.length ?? 2
  const locationText = !city
    ? ""
    : city.admin1
      ? `${city.name}, ${city.admin1}, ${city.country}`
      : `${city.name}, ${city.country}`

  // Everything the fit depends on that isn't a measurement. It changes when
  // the city, the day or the format does — never on a tick.
  const contentKey = `${locationText}|${weekdayPart}|${dateLine2}|${hoursLength}`

  const fit: ClockFit | null = useMemo(() => {
    if (!body || sunHeight === null || !numeralsReady) return null
    if (!reference || reference.key !== contentKey) return null
    const gap = theme.spacing.md
    const heroSize = (scale: number): Size => {
      const cell = numeralCellWidth(fontFamily, "hero", scale) ?? 0
      const secondsCell = numeralCellWidth(fontFamily, "displayXl", scale) ?? 0
      return {
        width: Math.max(
          hoursLength * cell + gap + reference.dateWidth * scale,
          2 * cell + gap + 2 * secondsCell,
        ),
        height: reference.heroHeight * scale,
      }
    }
    return fitClock({
      width: body.width - 2 * theme.spacing.gutter,
      height: body.height - 2 * theme.spacing.sm,
      heroSize,
      heroMaxHeightShare: HERO_MAX_HEIGHT_SHARE,
      fixedHeight: theme.spacing.xl + sunHeight + theme.spacing.sm,
      city: reference.city,
      wrapSafety: WRAP_SAFETY,
      heroBounds: HERO_SCALE,
      cityBounds: CITY_SCALE,
    })
  }, [body, sunHeight, numeralsReady, reference, contentKey, hoursLength, fontFamily, theme])

  // Hidden until fitted, so nothing is ever seen at a wrong size; revealed
  // anyway if a measurement never arrives.
  useEffect(() => {
    const timer = setTimeout(() => setRevealedKey(contentKey), FIT_REVEAL_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [contentKey])
  const hidden = !fit && revealedKey !== contentKey
  const heroScale = fit?.hero ?? 1
  const cityScale = fit?.city ?? 1

  if (!city || !time) {
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

  const dateStyle = dateStyleAt(heroScale)

  return (
    // The sheet is a sibling of <Screen>, never inside its scroll view
    // (docs/14-ignite-integration.md §6 rule 4).
    <View style={$root}>
      <FitReference
        key={contentKey}
        contentKey={contentKey}
        hoursLength={hoursLength}
        weekday={`${weekdayPart},`}
        dateLine2={dateLine2}
        words={locationText.split(" ")}
        onMeasured={onReference}
      />
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

        <View style={themed($body)} onLayout={onBodyLayout}>
          <View style={[themed($composition), hidden && $hidden]}>
            {/* docs/08-motion-spec.md §7: "Hero clock / screen title | 0 |
             opacity 0→1, translateY 8→0, 320ms ease.decelerate." */}
            <EntranceView play={shouldPlayEntrance}>
              <View
                style={$hero}
                accessible
                accessibilityLiveRegion="none"
                accessibilityLabel={`${time.hours}:${time.minutes}:${time.seconds}${time.meridiem ? ` ${time.meridiem}` : ""}, ${time.dateLabel}`}
              >
                {/* The board's arrangement: hours beside the date, minutes
                 beside the seconds. docs/08-motion-spec.md §3: minutes and
                 seconds roll; hours cut. */}
                <View style={$heroLine}>
                  <Numeral value={time.hours} size="hero" scale={heroScale} />
                  <View style={themed($dateBlock)}>
                    <Text text={`${weekdayPart},`} numberOfLines={1} style={dateStyle} />
                    <Text text={dateLine2} numberOfLines={1} style={dateStyle} />
                  </View>
                </View>
                <View style={$heroLine}>
                  <Numeral value={time.minutes} size="hero" animate="roll" scale={heroScale} />
                  <View style={themed($secondsBlock)}>
                    <Numeral
                      value={time.seconds}
                      size="displayXl"
                      animate="roll"
                      scale={heroScale}
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
              {/* Greedy line breaking on Android too ("simple"), because
               that's what the fit predicts. If the platform still needs
               more lines than predicted, it shrinks the name slightly
               rather than truncating it. */}
              <Text
                text={locationText}
                style={cityStyleAt(cityScale)}
                numberOfLines={fit?.cityLines}
                adjustsFontSizeToFit={!!fit}
                minimumFontScale={CITY_MIN_FONT_SCALE}
                textBreakStrategy="simple"
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

function sameReference(a: Reference, b: Reference): boolean {
  return (
    a.key === b.key &&
    a.heroHeight === b.heroHeight &&
    a.dateWidth === b.dateWidth &&
    a.city.space === b.city.space &&
    a.city.lineHeight === b.city.lineHeight &&
    a.city.words.length === b.city.words.length &&
    a.city.words.every((w, i) => w === b.city.words[i])
  )
}

interface ReferenceParts {
  heroHeight?: number
  dateWidth?: number
  words: (number | undefined)[]
  lineHeight?: number
  spaced?: number
  unspaced?: number
}

interface FitReferenceProps {
  contentKey: string
  hoursLength: number
  weekday: string
  dateLine2: string
  words: string[]
  onMeasured: (reference: Reference) => void
}

/**
 * The composition's type at scale 1, laid out invisibly and never rescaled:
 * the hero (for its height and the date's width) and each word of the city
 * name. Keyed by the content, so it re-measures only when the city, the day
 * or the format changes. Memo'd — the clock's tick never reaches it; its
 * numerals show fixed zeros, since every digit has the same cell width.
 *
 * Hidden from assistive tech: it duplicates what's on screen.
 */
const FitReference = memo(function FitReference(props: FitReferenceProps) {
  const { contentKey, hoursLength, weekday, dateLine2, words, onMeasured } = props
  const { themed } = useAppTheme()
  const parts = useRef<ReferenceParts>({ words: [] })

  const report = () => {
    const p = parts.current
    if (p.heroHeight === undefined || p.dateWidth === undefined) return
    if (p.lineHeight === undefined || p.spaced === undefined || p.unspaced === undefined) return
    const widths = words.map((_, i) => p.words[i])
    if (widths.some((w) => w === undefined)) return
    onMeasured({
      key: contentKey,
      heroHeight: p.heroHeight,
      dateWidth: p.dateWidth,
      city: {
        words: widths as number[],
        space: Math.max(0, p.spaced - p.unspaced),
        lineHeight: p.lineHeight,
      },
    })
  }

  const record = (e: LayoutChangeEvent, apply: (p: ReferenceParts, size: Size) => void) => {
    apply(parts.current, sizeOf(e))
    report()
  }

  const cityStyle = cityStyleAt(1)
  const zeros = "0".repeat(hoursLength)

  return (
    <View
      style={$reference}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={$hero} onLayout={(e) => record(e, (p, s) => (p.heroHeight = s.height))}>
        <View style={$heroLine}>
          <Numeral value={zeros} size="hero" />
          <View
            style={themed($dateBlock)}
            onLayout={(e) => record(e, (p, s) => (p.dateWidth = s.width))}
          >
            <Text text={weekday} numberOfLines={1} style={dateStyleAt(1)} />
            <Text text={dateLine2} numberOfLines={1} style={dateStyleAt(1)} />
          </View>
        </View>
        <View style={$heroLine}>
          <Numeral value="00" size="hero" />
          <View style={themed($secondsBlock)}>
            <Numeral value="00" size="displayXl" />
          </View>
        </View>
      </View>
      {words.map((word, i) => (
        <Text
          key={i}
          text={word}
          style={cityStyle}
          onLayout={(e) =>
            record(e, (p, s) => {
              p.words[i] = s.width
              if (i === 0) p.lineHeight = s.height
            })
          }
        />
      ))}
      <Text
        text={`x${NO_BREAK_SPACE}x`}
        style={cityStyle}
        onLayout={(e) => record(e, (p, s) => (p.spaced = s.width))}
      />
      <Text
        text="xx"
        style={cityStyle}
        onLayout={(e) => record(e, (p, s) => (p.unspaced = s.width))}
      />
    </View>
  )
})

// Clips the hidden reference layout, which is far wider than the screen.
const $root: ViewStyle = { flex: 1, overflow: "hidden" }

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

const $reference: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: REFERENCE_LAYER_WIDTH,
  alignItems: "flex-start",
  opacity: 0,
  pointerEvents: "none",
}

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
