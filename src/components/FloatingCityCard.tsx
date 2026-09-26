import { LayoutChangeEvent, TextStyle, View, ViewStyle } from "react-native"
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { getZonedTime } from "@/domain/time/zone"
import type { City, Prefs } from "@/domain/types"
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
 * `bg.inverse`", horizontally centred on the meridian and clamped to the
 * gutter so it never leaves the screen.
 *
 * `city` is whatever the pointer means right now — the live preview under
 * the finger mid-drag, the selected city otherwise (<MeridianMap> decides).
 * Position tracks the pointer on the UI thread every frame (`anchorX` /
 * `anchorY`, viewport coordinates) so the card never lags the line.
 *
 * Vertical: the map's lower third, as on the board — unless the pointer is
 * itself in the lower half, where the card would cover the very city being
 * pointed at; then it flips to the top.
 *
 * Decorative: <MeridianMap>'s adjustable surface already announces this
 * exact content (`meridianValueText`); repeating it here would duplicate it.
 */
export interface FloatingCityCardProps {
  width: number
  height: number
  city: City
  anchorX: SharedValue<number>
  anchorY: SharedValue<number>
  /** The one clock tick (CLAUDE.md rule 3). */
  now: number
  prefs: Prefs
}

const LOWER_POSITION = 2 / 3
const UPPER_POSITION = 0.06
const FLIP_THRESHOLD = 0.5

export function FloatingCityCard(props: FloatingCityCardProps) {
  const { width, height, city, anchorX, anchorY, now, prefs } = props
  const { theme, themed } = useAppTheme()
  const gutter = theme.spacing.gutter
  const flipMs = theme.timing.fast

  // Measured, so the clamp knows the card's own width — "Ho Chi Minh City"
  // and "Suva" can't share a clamp margin.
  const cardWidth = useSharedValue(0)
  const handleLayout = (event: LayoutChangeEvent) => {
    cardWidth.value = event.nativeEvent.layout.width
  }

  const time = getZonedTime(now, city.zone, prefs)

  const $animatedPosition = useAnimatedStyle(() => {
    const maxLeft = Math.max(width - gutter - cardWidth.value, gutter)
    const left = Math.min(Math.max(anchorX.value - cardWidth.value / 2, gutter), maxLeft)
    const top =
      anchorY.value > height * FLIP_THRESHOLD ? height * UPPER_POSITION : height * LOWER_POSITION
    return {
      transform: [{ translateX: left }, { translateY: withTiming(top, { duration: flipMs }) }],
    }
  })

  if (width <= 0 || height <= 0) return null

  return (
    <View style={$layer}>
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

const $layer: ViewStyle = { position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none" }

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
