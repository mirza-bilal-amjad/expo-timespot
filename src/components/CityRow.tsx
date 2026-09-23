import { memo } from "react"
import { View, ViewStyle } from "react-native"

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
 * docs/04-screen-specs.md "City row — anatomy". Receives `time` as a prop —
 * it does not subscribe to the clock (CLAUDE.md rule 3, "one clock"): the S1
 * list ticks once and re-renders N memo'd rows, not N subscriptions.
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

export const CityRow = memo(
  function CityRow(props: CityRowProps) {
    const { city, time, selected, onPress, onLongPress } = props
    const { theme, themed } = useAppTheme()

    const cityData = getCityById(city.cityId)
    const name = city.label ?? cityData?.name ?? city.cityId

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={citySpeechLabel(name, time)}
        accessibilityState={{ selected }}
        accessibilityHint="Double tap to focus"
        style={themed([$row, selected && $rowSelected])}
      >
        <View style={$topLine}>
          <Text
            preset="offset"
            text={time.offsetLabel}
            style={themed(selected ? $offsetSelected : undefined)}
          />
          <Icon
            icon={time.isDay ? "sun" : "moon"}
            size="md"
            color={time.isDay ? theme.colors.day : theme.colors.night}
            accessibilityLabel={time.isDay ? "day" : "night"}
          />
        </View>
        <View style={$bottomLine}>
          <Text
            preset="cityTitle"
            text={name}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[$cityName, selected && themed($cityNameSelected)]}
          />
          <Numeral
            value={time.display}
            size="numeralLg"
            color={selected ? "textOnInverse" : "text"}
            style={themed($time)}
          />
        </View>
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
  backgroundColor: theme.colors.cardBackground,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.md,
  justifyContent: "space-between",
})

const $rowSelected: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.inverseBackground,
})

const $offsetSelected: ThemedStyle<{ color: string }> = (theme) => ({
  color: theme.colors.textOnInverseDim,
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

const $cityNameSelected: ThemedStyle<{ color: string }> = (theme) => ({
  color: theme.colors.textOnInverse,
})

const $time: ThemedStyle<ViewStyle> = (theme) => ({ marginLeft: theme.spacing.xs })
