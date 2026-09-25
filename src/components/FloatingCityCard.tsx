import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated"

import { getNearestRepresentativeCity } from "@/domain/cities/search"
import { offsetMinutesToX } from "@/domain/map/meridian"
import { getZonedTime } from "@/domain/time/zone"
import type { Prefs } from "@/domain/types"
import { useThrottledSharedValue } from "@/hooks/useThrottledSharedValue"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Card } from "./Card"
import { Icon } from "./Icon"
import { Numeral } from "./Numeral"
import { Text } from "./Text"

/**
 * docs/03-component-library.md "<MeridianMap>" (task 4.6 of the composite),
 * docs/04-screen-specs.md "S3 · Map" "Floating card". "Identical anatomy to
 * the S1 row (offset / city / time / day-night) but `elev.float`,
 * `bg.inverse`, positioned at the map's lower third, horizontally centred
 * on the meridian and clamped to the gutter so it never leaves the screen."
 *
 * Two different update rates, deliberately: the horizontal position tracks
 * `offsetMinutes` directly on the UI thread via `useAnimatedStyle` — it has
 * to move exactly as fast as `<MeridianLine>` itself, every frame, or the
 * card would visibly lag the line it's centred on. The city/time content
 * updates at most every 60ms instead, via `useThrottledSharedValue` — 16
 * dataset lookups a second reads as instant, and there's no reason to pay
 * for one every frame.
 *
 * That throttled bridge deliberately watches `offsetMinutes` itself rather
 * than piggybacking on `<MeridianLine>`'s own gesture (task 4.5's first
 * attempt did that, and broke: `offsetMinutes` is shared with `<UtcRuler>`,
 * and a ruler tap or scroll writes it directly, never through
 * `<MeridianLine>`'s gesture at all). See `useThrottledSharedValue`'s own
 * doc comment for the full story.
 *
 * Decorative, not the real accessible interface: task 4.8 makes
 * `<MeridianLine>` itself the screen-reader-facing slider, with an
 * `accessibilityValue.text` reading this exact "UTC+1, Algiers, 5:40 PM"
 * content (`domain/time/speech.ts`'s `meridianValueText`) — announcing the
 * same content again from this card would be a duplicate, not an addition,
 * so it stays `accessibilityElementsHidden` for good, not just "until 4.8."
 */
export interface FloatingCityCardProps {
  width: number
  height: number
  offsetMinutes: SharedValue<number>
  /** The one clock tick (CLAUDE.md rule 3) — this component doesn't
   * subscribe itself, same convention as `<Terminator now={now}>`. */
  now: number
  prefs: Prefs
}

// "positioned at the map's lower third" — the card's own top edge, not a
// vertical centre (its height is intrinsic to its content, unmeasured).
const CARD_VERTICAL_FRACTION = 2 / 3

const OFFSET_CHANGE_THROTTLE_MS = 60

export function FloatingCityCard(props: FloatingCityCardProps) {
  const { width, height, offsetMinutes, now, prefs } = props
  const { theme, themed } = useAppTheme()

  // Measured on layout so the horizontal clamp below knows the card's own
  // width — "Ho Chi Minh City" and "Suva" can't share a clamp margin.
  const cardWidth = useSharedValue(0)
  const handleLayout = (event: LayoutChangeEvent) => {
    cardWidth.value = event.nativeEvent.layout.width
  }

  const resolvedOffsetMinutes = useThrottledSharedValue(offsetMinutes, OFFSET_CHANGE_THROTTLE_MS)
  const city = getNearestRepresentativeCity(resolvedOffsetMinutes, now)
  const time = getZonedTime(now, city.zone, prefs)

  const $animatedPosition = useAnimatedStyle(() => {
    const centerX = offsetMinutesToX(offsetMinutes.value, width)
    // The map area (`width`) is already inset from the screen edge by
    // `theme.spacing.gutter` (MapScreen's own padding) — staying inside
    // [0, width] here is what "clamped to the gutter" means in practice,
    // not a second gutter subtracted from an already-gutter'd area.
    const maxLeft = Math.max(width - cardWidth.value, 0)
    const left = Math.min(Math.max(centerX - cardWidth.value / 2, 0), maxLeft)
    return { transform: [{ translateX: left }] }
  })

  if (width <= 0 || height <= 0) return null

  return (
    <View style={[$layer, { top: height * CARD_VERTICAL_FRACTION }]}>
      <Animated.View
        onLayout={handleLayout}
        style={[$positioned, $animatedPosition]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Card elevation="float" interactive={false} style={themed($card)}>
          <View style={$topLine}>
            <Text preset="offset" text={time.offsetLabel} style={themed($offset)} />
            <Icon
              icon={time.isDay ? "sun" : "moon"}
              size="md"
              color={time.isDay ? theme.colors.day : theme.colors.night}
              accessibilityLabel={time.isDay ? "day" : "night"}
            />
          </View>
          <View style={themed($bottomLine)}>
            <Text
              preset="cityTitle"
              text={city.name}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[$cityName, themed($cityNameColor)]}
            />
            <Numeral
              value={time.display}
              size="numeralLg"
              color="textOnInverse"
              style={themed($time)}
            />
          </View>
        </Card>
      </Animated.View>
    </View>
  )
}

const $layer: ViewStyle = { position: "absolute", left: 0, right: 0 }

const $positioned: ViewStyle = { position: "absolute", left: 0 }

const $card: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.md,
  backgroundColor: theme.colors.inverseBackground,
})

const $topLine: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $bottomLine: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-end",
  marginTop: theme.spacing.xxxs,
})

const $offset: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textOnInverseDim })

const $cityNameColor: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textOnInverse })

const $cityName: TextStyle = { flex: 1 }

const $time: ThemedStyle<ViewStyle> = (theme) => ({ marginLeft: theme.spacing.xs })
