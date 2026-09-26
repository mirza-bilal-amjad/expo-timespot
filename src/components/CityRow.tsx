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
import { citySpeechLabel } from "@/domain/time/speech"
import type { SavedCity, ZonedTime } from "@/domain/types"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "./Icon"
import { Numeral } from "./Numeral"
import { Pressable } from "./Pressable"
import { RowMenu, RowMenuItem } from "./RowMenu"
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
  onRename?: () => void
  /** Whether "Move up" / "Move down" apply (false at the list's ends). */
  canMoveUp?: boolean
  canMoveDown?: boolean
  dragHandleProps?: Record<string, unknown>
}

const AnimatedText = Animated.createAnimatedComponent(Text)

// docs/08-motion-spec.md §4: the incoming row's fade-in starts 40ms after
// the outgoing row's fade-out — simultaneous fades read as "both half
// selected" instead of the selection visibly moving. No named timing token
// is this short (theme/timing.ts's durations are all cross-fade lengths,
// not offsets), so it's a local constant, same pattern as Card's shadow
// constants where the design system has no token for it yet.
const SELECT_STAGGER_MS = 40

// docs/08-motion-spec.md §4: both the outgoing and incoming row cross-fades
// are explicitly "180ms" — theme/timing.ts's nearest token (`base`, 220ms)
// is a real, noticeable 40ms off from the doc's own choreography, where the
// exact stagger timing is called out as mattering. Same "no token for this
// yet" reasoning as SELECT_STAGGER_MS above.
const SELECT_CROSSFADE_MS = 180

export const CityRow = memo(
  function CityRow(props: CityRowProps) {
    const {
      city,
      time,
      selected,
      onPress,
      onLongPress,
      onDelete,
      onMoveUp,
      onMoveDown,
      onRename,
      canMoveUp = true,
      canMoveDown = true,
    } = props
    const { theme, themed } = useAppTheme()

    const cityData = getCityById(city.cityId)
    const name = city.label ?? cityData?.name ?? city.cityId

    // 0 = unselected (bg.card), 1 = selected (bg.inverse). Starts at the
    // current value with no animation on mount — only a later prop change
    // (a real selection move) should cross-fade.
    const progress = useSharedValue(selected ? 1 : 0)
    useEffect(() => {
      progress.value = selected
        ? withDelay(SELECT_STAGGER_MS, withTiming(1, { duration: SELECT_CROSSFADE_MS }))
        : withTiming(0, { duration: SELECT_CROSSFADE_MS })
    }, [selected, progress])

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
          case "rename":
            onRename?.()
            break
        }
      },
      [handlePress, onDelete, onMoveUp, onMoveDown, onRename],
    )

    // docs/04-screen-specs.md S1 "Row menu": the same four operations as the
    // row's accessibility actions, through the same callbacks — no parallel
    // code path.
    const hasMenu = !!(onRename || onDelete || onMoveUp || onMoveDown)
    const menuItems: RowMenuItem[] = [
      ...(onRename ? [{ id: "rename", title: translate("list:rename") }] : []),
      ...(onMoveUp
        ? [{ id: "moveUp", title: translate("list:moveUp"), disabled: !canMoveUp }]
        : []),
      ...(onMoveDown
        ? [{ id: "moveDown", title: translate("list:moveDown"), disabled: !canMoveDown }]
        : []),
      ...(onDelete ? [{ id: "remove", title: translate("list:remove"), destructive: true }] : []),
    ]
    const handleMenuSelect = (id: string) => {
      if (id === "rename") onRename?.()
      else if (id === "moveUp") onMoveUp?.()
      else if (id === "moveDown") onMoveDown?.()
      else if (id === "remove") onDelete?.()
    }

    return (
      <View>
        <Pressable
          onPress={handlePress}
          onLongPress={onLongPress}
          pressedScale={0.985}
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
            { name: "rename", label: "Rename" },
          ]}
          onAccessibilityAction={handleAccessibilityAction}
        >
          <Animated.View style={[themed($row), $animatedRow]}>
            <View style={$topLine}>
              <AnimatedText preset="offset" text={time.offsetLabel} style={$animatedOffset} />
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
        {/* The top-right cluster is a *sibling* of the row's pressable, laid
       over it — never inside it. On web a button inside a button is invalid
       HTML (and a hydration error); on native it's nested touchables. The
       day/night glyph ignores touches, so tapping it still hits the row
       underneath; it's decorative, since the row's label already says
       "day-time" / "night-time". */}
        <View style={[themed($topRight), $styles.passThrough]}>
          {hasMenu && (
            <RowMenu
              items={menuItems}
              onSelect={handleMenuSelect}
              accessibilityLabel={translate("list:moreOptions", { name })}
              color={selected ? theme.colors.textOnInverseDim : theme.colors.textDim}
            />
          )}
          <View
            style={$decorative}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon
              icon={time.isDay ? "sun" : "moon"}
              size="md"
              color={time.isDay ? theme.colors.day : theme.colors.night}
            />
          </View>
        </View>
      </View>
    )
  },
  (prev, next) =>
    prev.time.display === next.time.display &&
    prev.selected === next.selected &&
    prev.city.cityId === next.city.cityId &&
    prev.city.label === next.city.label &&
    prev.onDelete === next.onDelete &&
    prev.onMoveUp === next.onMoveUp &&
    prev.onMoveDown === next.onMoveDown &&
    prev.onRename === next.onRename &&
    prev.canMoveUp === next.canMoveUp &&
    prev.canMoveDown === next.canMoveDown,
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

// Laid over the row's top-right, inside its md padding, so it lines up
// with the offset label on the same top line.
const $topRight: ThemedStyle<ViewStyle> = (theme) => ({
  position: "absolute",
  top: theme.spacing.md,
  right: theme.spacing.md,
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.xxs,
})

const $decorative: ViewStyle = { pointerEvents: "none" }

const $bottomLine: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-end",
}

const $cityName = { flex: 1 }

const $time: ThemedStyle<ViewStyle> = (theme) => ({ marginLeft: theme.spacing.xs })
