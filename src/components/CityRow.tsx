import { useCallback, useEffect, memo } from "react"
import { Platform, View, ViewStyle } from "react-native"
import * as Haptics from "expo-haptics"
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"

import { getCityById } from "@/domain/cities/search"
import type { SavedCity, ZonedTime } from "@/domain/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "./Icon"
import { Numeral } from "./Numeral"
import { Pressable } from "./Pressable"
import { Text } from "./Text"

/**
 * docs/03-component-library.md "<CityRow> — S1 list row",
 * docs/04-screen-specs.md "City row — anatomy", docs/08-motion-spec.md §4
 * "Row selection". Receives `time` as a prop — it does not subscribe to the
 * clock (CLAUDE.md rule 3, "one clock"): the S1 list ticks once and
 * re-renders N memo'd rows, not N subscriptions.
 *
 * `dragHandleProps` is accepted per the doc's type but unused until task 3.6
 * wires reorder — passing it through now avoids a signature change later.
 */
export interface CityRowProps {
  city: SavedCity
  time: ZonedTime
  selected: boolean
  onPress: () => void
  onLongPress?: () => void
  dragHandleProps?: Record<string, unknown>
}

function citySpeechLabel(name: string, time: ZonedTime): string {
  const hour = parseInt(time.hours, 10)
  const spokenTime = time.meridiem
    ? `${hour} ${time.minutes} ${time.meridiem}`
    : `${hour} ${time.minutes}`
  const dayOrNight = time.isDay ? "day" : "night"
  const spokenOffset = time.offsetLabel
    .replace("UTC", "UTC ")
    .replace("+", "plus ")
    .replace("−", "minus ")
  return `${name}, ${spokenTime}, ${dayOrNight}, ${spokenOffset}`
}

const AnimatedText = Animated.createAnimatedComponent(Text)

// docs/08-motion-spec.md §4: the incoming row's fade-in starts 40ms after
// the outgoing row's fade-out — simultaneous fades read as "both half
// selected" instead of the selection visibly moving. No named timing token
// is this short (theme/timing.ts's durations are all cross-fade lengths,
// not offsets), so it's a local constant, same pattern as Card's shadow
// constants where the design system has no token for it yet.
const SELECT_STAGGER_MS = 40

export const CityRow = memo(
  function CityRow(props: CityRowProps) {
    const { city, time, selected, onPress, onLongPress } = props
    const { theme, themed } = useAppTheme()

    const cityData = getCityById(city.cityId)
    const name = city.label ?? cityData?.name ?? city.cityId

    // 0 = unselected (bg.card), 1 = selected (bg.inverse). Starts at the
    // current value with no animation on mount — only a later prop change
    // (a real selection move) should cross-fade.
    const progress = useSharedValue(selected ? 1 : 0)
    useEffect(() => {
      progress.value = selected
        ? withDelay(SELECT_STAGGER_MS, withTiming(1, { duration: theme.timing.base }))
        : withTiming(0, { duration: theme.timing.base })
    }, [selected, progress, theme.timing.base])

    const $animatedRow = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [theme.colors.cardBackground, theme.colors.inverseBackground],
      ),
    }))
    const $animatedCityName = useAnimatedStyle(() => ({
      color: interpolateColor(
        progress.value,
        [0, 1],
        [theme.colors.text, theme.colors.textOnInverse],
      ),
    }))
    const $animatedOffset = useAnimatedStyle(() => ({
      color: interpolateColor(
        progress.value,
        [0, 1],
        [theme.colors.textDim, theme.colors.textOnInverseDim],
      ),
    }))

    // Fired once per selection move, not per press — matches
    // docs/08-motion-spec.md §4's "Haptics.selectionAsync() on native",
    // distinct from Pressable's own per-tap impact feedback. Tapping an
    // already-selected row (which pushes S5 instead, per the interactions
    // table) isn't a selection move, so no haptic there.
    const handlePress = useCallback(() => {
      if (!selected && Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {})
      }
      onPress()
    }, [selected, onPress])

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={citySpeechLabel(name, time)}
        accessibilityState={{ selected }}
        accessibilityHint="Double tap to focus"
      >
        <Animated.View style={[themed($row), $animatedRow]}>
          <View style={$topLine}>
            <AnimatedText preset="offset" text={time.offsetLabel} style={$animatedOffset} />
            <Icon
              icon={time.isDay ? "sun" : "moon"}
              size="md"
              color={time.isDay ? theme.colors.day : theme.colors.night}
              accessibilityLabel={time.isDay ? "day" : "night"}
            />
          </View>
          <View style={$bottomLine}>
            <AnimatedText
              preset="cityTitle"
              text={name}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[$cityName, $animatedCityName]}
            />
            {/* <Numeral>'s colour swap is an instant cut, not part of this
             cross-fade — animating per-digit colour would mean threading an
             animated value through every measured digit cell, which rule 4's
             "every digit through Numeral" contract doesn't expose a hook for
             yet. Acceptable: the digits are the last thing the eye settles
             on mid-transition anyway. */}
            <Numeral
              value={time.display}
              size="numeralLg"
              color={selected ? "textOnInverse" : "text"}
              style={themed($time)}
            />
          </View>
        </Animated.View>
      </Pressable>
    )
  },
  (prev, next) =>
    prev.time.display === next.time.display &&
    prev.selected === next.selected &&
    prev.city.cityId === next.city.cityId &&
    prev.city.label === next.city.label,
)

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  height: theme.spacing.rowHeight,
  borderRadius: theme.radius.md,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.md,
  justifyContent: "space-between",
})

const $topLine: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $bottomLine: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-end",
}

const $cityName = { flex: 1 }

const $time: ThemedStyle<ViewStyle> = (theme) => ({ marginLeft: theme.spacing.xs })
