import { useCallback, useEffect, memo } from "react"
import { AccessibilityActionEvent, Platform, View, ViewStyle } from "react-native"
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
 * "Row selection", docs/09-accessibility.md §2 (the row's exact a11y
 * contract) and §4 "Drag has a non-drag alternative" (2.5.7). Receives
 * `time` as a prop — it does not subscribe to the clock (CLAUDE.md rule 3,
 * "one clock"): the S1 list ticks once and re-renders N memo'd rows, not N
 * subscriptions.
 *
 * The drag-to-reorder gesture and swipe-to-delete gesture both live in the
 * wrapping `<ReorderableCityRow>` (task 3.6), not here — this stays a plain
 * presentational row. `onDelete`/`onMoveUp`/`onMoveDown` exist so the
 * accessibility actions below trigger the *identical* store operation a
 * gesture would, not a parallel code path.
 */
export interface CityRowProps {
  city: SavedCity
  time: ZonedTime
  selected: boolean
  onPress: () => void
  onLongPress?: () => void
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  dragHandleProps?: Record<string, unknown>
}

/**
 * docs/09-accessibility.md §2's own worked example: "Tokyo, 1:40 AM,
 * night-time, 9 hours ahead of UTC" — screen readers read "UTC+9" as "utc
 * plus nine" at best, so the offset is spelled out, and the clock face is
 * spoken as printed ("1:40 AM"), not digit-by-digit.
 */
function citySpeechLabel(name: string, time: ZonedTime): string {
  // time.hours is always 2-digit ("01") for <Numeral>'s fixed-width cells —
  // strip the leading zero for speech, matching the doc's own worked
  // example ("1:40 AM", not "01:40 AM").
  const hour = String(parseInt(time.hours, 10))
  const clock = time.meridiem
    ? `${hour}:${time.minutes} ${time.meridiem}`
    : `${hour}:${time.minutes}`
  const dayPart = time.isDay ? "day-time" : "night-time"
  return `${name}, ${clock}, ${dayPart}, ${spokenOffset(time.offsetMinutes)}`
}

function spokenOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC"
  const direction = offsetMinutes > 0 ? "ahead of" : "behind"
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  const parts = [
    hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
    minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}` : null,
  ].filter(Boolean)
  return `${parts.join(" ")} ${direction} UTC`
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
    const { city, time, selected, onPress, onLongPress, onDelete, onMoveUp, onMoveDown } = props
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

    // docs/09-accessibility.md §2 and §4 (WCAG 2.5.7): reorder and delete
    // both need a non-drag, non-swipe path. `magicTap` (S5 city detail) is
    // a documented no-op for now — that screen doesn't exist yet (it's
    // outside Phase 3's scope), same as the header add-button placeholder.
    const handleAccessibilityAction = useCallback(
      (event: AccessibilityActionEvent) => {
        switch (event.nativeEvent.actionName) {
          case "activate":
            handlePress()
            break
          case "delete":
            onDelete?.()
            break
          case "moveUp":
            onMoveUp?.()
            break
          case "moveDown":
            onMoveDown?.()
            break
        }
      },
      [handlePress, onDelete, onMoveUp, onMoveDown],
    )

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={citySpeechLabel(name, time)}
        accessibilityState={{ selected }}
        accessibilityHint="Double tap to focus"
        accessibilityActions={[
          { name: "activate", label: "Focus" },
          { name: "magicTap", label: "Open details" },
          { name: "delete", label: "Remove city" },
          { name: "moveUp", label: "Move up" },
          { name: "moveDown", label: "Move down" },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
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
    prev.city.label === next.city.label &&
    prev.onDelete === next.onDelete &&
    prev.onMoveUp === next.onMoveUp &&
    prev.onMoveDown === next.onMoveDown,
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
