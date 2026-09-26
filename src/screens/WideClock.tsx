import { useState } from "react"
import { LayoutChangeEvent, StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native"

import { EntranceView } from "@/components/EntranceView"
import { PressableIcon } from "@/components/Icon"
import { Numeral, useNumeralCalibrated } from "@/components/Numeral"
import { SegmentedPill } from "@/components/SegmentedPill"
import { SunBlock } from "@/components/SunBlock"
import { $sizeStyles, Text } from "@/components/Text"
import type { City, Prefs, ZonedTime } from "@/domain/types"
import { useBreakpoint } from "@/hooks/useBreakpoint"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md S2 "Web adaptation" — the web board's hero band,
 * from `md` (768) up:
 *
 *   08:15:40                                   display.hero clamp(96, 22vw, 320)
 *   Current        Sun ☀ : 07:12 – 17:17         [12h|24h]
 *                  Sat, Sep 26
 *   ─────────────────────────────────────────  stroke.sunken
 *
 * The hero is one line, as large as `clamp(96px, 22vw, 320px)` allows and
 * never wider than the container. Its width at scale 1 is measured once in
 * a hidden copy (`00:00:00` — every digit has the same cell), so the scale
 * is one division, not a measure-and-resize loop (see S2 "Fitting the type").
 * The meta row is three columns from 900 px and stacks below.
 */

const HERO_FONT = { min: 96, vw: 0.22, max: 320 }
const HERO_BASE_FONT = $sizeStyles.hero.fontSize
// The hidden reference is laid out this wide so its line never wraps.
const REFERENCE_WIDTH = 4096
const META_COLUMNS_MIN_WIDTH = 900

export interface WideClockProps {
  city: City
  time: ZonedTime
  isDeviceCity: boolean
  now: number
  timeFormat: Prefs["timeFormat"]
  onTimeFormat: (format: Prefs["timeFormat"]) => void
  /** The phone header's settings mark — shown until the header nav (lg)
   * takes it over. */
  onOpenSettings?: () => void
  topClearance: number
  bottomClearance: number
  playEntrance: boolean
}

export function WideClock(props: WideClockProps) {
  const { city, time, isDeviceCity, now, timeFormat, onTimeFormat, onOpenSettings } = props
  const { theme, themed } = useAppTheme()
  const { width } = useWindowDimensions()
  const { gutter, contentWidth } = useBreakpoint()
  const calibrated = useNumeralCalibrated(theme.typography.primary.normal, ["hero"])
  const [heroWidthAtBase, setHeroWidthAtBase] = useState<number | null>(null)

  const clampedFont = Math.min(HERO_FONT.max, Math.max(HERO_FONT.min, width * HERO_FONT.vw))
  const fitScale = heroWidthAtBase ? contentWidth / heroWidthAtBase : Infinity
  const heroScale = Math.min(clampedFont / HERO_BASE_FONT, fitScale)
  const ready = calibrated && heroWidthAtBase !== null
  const columns = width >= META_COLUMNS_MIN_WIDTH

  const onReference = (e: LayoutChangeEvent) => setHeroWidthAtBase(e.nativeEvent.layout.width)

  return (
    <View style={$root}>
      {/* The hero at scale 1, never shown: its width is the one measurement. */}
      <View
        style={$reference}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View onLayout={onReference} style={$hug}>
          <Numeral value="00:00:00" size="hero" />
        </View>
      </View>

      <View
        style={[
          $column,
          {
            maxWidth: theme.spacing.container + 2 * gutter,
            paddingHorizontal: gutter,
            paddingTop: props.topClearance + theme.spacing.sm,
            paddingBottom: props.bottomClearance + theme.spacing.lg,
          },
        ]}
      >
        {onOpenSettings && (
          <View style={$header}>
            <PressableIcon
              icon="clock"
              size="md"
              color={theme.colors.textOnInverse}
              accessibilityLabel={translate("clock:openSettings")}
              containerStyle={themed($mark)}
              onPress={onOpenSettings}
            />
          </View>
        )}

        <View style={[themed($band), !ready && $hidden]}>
          <EntranceView play={props.playEntrance}>
            <View
              style={$heroLine}
              accessible
              accessibilityLiveRegion="none"
              accessibilityLabel={`${time.hours}:${time.minutes}:${time.seconds}${time.meridiem ? ` ${time.meridiem}` : ""}, ${time.dateLabel}`}
            >
              <Numeral
                value={`${time.hours}:${time.minutes}:${time.seconds}`}
                size="hero"
                animate="roll"
                scale={heroScale}
              />
              {time.meridiem && <Text preset="heading" text={time.meridiem} />}
            </View>
          </EntranceView>

          <View style={[themed($meta), columns ? $metaColumns : themed($metaStacked)]}>
            <View style={themed($metaCity)}>
              <Text
                preset="cityTitle"
                text={isDeviceCity ? translate("clock:current") : city.name}
                numberOfLines={1}
              />
              <Text preset="offset" text={isDeviceCity ? city.name : time.offsetLabel} />
            </View>
            <View style={themed($metaSun)}>
              <SunBlock lat={city.lat} lon={city.lon} zone={city.zone} now={now} align="start" />
              <Text preset="offset" text={time.dateLabel} />
            </View>
            <SegmentedPill
              options={[
                { value: "12h", label: "12h" },
                { value: "24h", label: "24h" },
              ]}
              value={timeFormat}
              onChange={onTimeFormat}
              accessibilityLabel={translate("clock:formatToggle")}
            />
          </View>

          <View style={themed($divider)} />
        </View>
      </View>
    </View>
  )
}

const $root: ViewStyle = { flex: 1, overflow: "hidden" }

const $reference: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: REFERENCE_WIDTH,
  opacity: 0,
  pointerEvents: "none",
  flexDirection: "row",
}

const $hug: ViewStyle = { alignSelf: "flex-start" }

const $column: ViewStyle = { flex: 1, width: "100%", alignSelf: "center" }

const $header: ViewStyle = { flexDirection: "row" }

const $mark: ThemedStyle<ViewStyle> = (theme) => ({
  width: theme.spacing.avatar,
  height: theme.spacing.avatar,
  borderRadius: theme.radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.inverseBackground,
})

const $band: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  justifyContent: "center",
  gap: theme.spacing.xl,
})

const $hidden: ViewStyle = { opacity: 0 }

const $heroLine: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
}

const $meta: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.lg })

const $metaColumns: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
}

const $metaStacked: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "column",
  alignItems: "flex-start",
  gap: theme.spacing.md,
})

const $metaCity: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.xxs, flexShrink: 1 })

const $metaSun: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.xxs })

const $divider: ThemedStyle<ViewStyle> = (theme) => ({
  height: StyleSheet.hairlineWidth,
  backgroundColor: theme.colors.strokeSunken,
})
