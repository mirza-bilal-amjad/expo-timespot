import { View, ViewStyle } from "react-native"
import type { TOptions } from "i18next"

import { formatDayLength, getNextSunrise, getSunTimes } from "@/domain/sun/sun"
import { getZonedTime } from "@/domain/time/zone"
import type { Prefs } from "@/domain/types"
import type { TxKeyPath } from "@/i18n"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon, IconTypes } from "./Icon"
import { Text } from "./Text"

/**
 * docs/04-screen-specs.md "S2 · Clock" sun block. Pure function of
 * (lat, lon, now, zone) per docs/03-component-library.md's `<SunBlock>`
 * entry — no clock subscription of its own, `now` comes from the parent's
 * single tick (CLAUDE.md rule 3).
 */
export interface SunBlockProps {
  lat: number
  lon: number
  zone: string
  now: number
  /** `end` (default) — the phone clock's right-aligned block; `start` — the
   * wide clock's meta row, where it heads a left-aligned column. */
  align?: "start" | "end"
}

// Sunrise/sunset are always shown in 24h form (matches the doc's own
// "07:12 – 17:17" example) regardless of the hero clock's 12h/24h pill —
// that toggle is about the *user's* reading preference for the live clock,
// not this block's fixed reference times.
const SUN_BLOCK_PREFS: Prefs = {
  timeFormat: "24h",
  theme: "system",
  showSecondsOnList: false,
  dayNightStyle: "icon",
}

function SunLine({
  icon,
  tx,
  txOptions,
}: {
  icon: IconTypes
  tx: TxKeyPath
  txOptions?: TOptions
}) {
  const { theme, themed } = useAppTheme()
  return (
    <View style={themed($line)}>
      <Icon icon={icon} size="sm" color={theme.colors.textDim} accessibilityLabel="" />
      <Text preset="offset" tx={tx} txOptions={txOptions} />
    </View>
  )
}

export function SunBlock(props: SunBlockProps) {
  const { lat, lon, zone, now, align = "end" } = props
  const { themed } = useAppTheme()
  const $aligned = [themed($block), align === "start" && $blockStart]

  const sun = getSunTimes(lat, lon, new Date(now), zone)

  if (sun.kind === "midnight-sun") {
    return (
      <View style={$aligned}>
        <SunLine icon="sun" tx="sun:midnightSun" />
      </View>
    )
  }

  if (sun.kind === "polar-night") {
    const nextSunrise = getNextSunrise(lat, lon, now, zone)
    const nextDate = nextSunrise ? getZonedTime(nextSunrise.getTime(), zone, SUN_BLOCK_PREFS) : null
    return (
      <View style={$aligned}>
        <SunLine icon="moon" tx="sun:polarNight" />
        {nextDate && (
          <Text
            preset="offset"
            tx="sun:sunRises"
            txOptions={{ date: nextDate.dateLabel }}
            style={themed($second)}
          />
        )}
      </View>
    )
  }

  const sunrise = getZonedTime(sun.sunrise!.getTime(), zone, SUN_BLOCK_PREFS)
  const sunset = getZonedTime(sun.sunset!.getTime(), zone, SUN_BLOCK_PREFS)

  return (
    <View style={$aligned}>
      <SunLine
        icon="sun"
        tx="sun:dayLength"
        txOptions={{ duration: formatDayLength(sun.dayLengthMinutes) }}
      />
      <Text
        preset="offset"
        text={`${sunrise.display} – ${sunset.display}`}
        style={themed($second)}
      />
    </View>
  )
}

const $blockStart: ViewStyle = { alignItems: "flex-start" }

const $block: ThemedStyle<ViewStyle> = (theme) => ({
  alignItems: "flex-end",
  gap: theme.spacing.xxxs,
})

const $line: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.xxs,
})

const $second: ThemedStyle<{ color: string }> = (theme) => ({ color: theme.colors.textDim })
