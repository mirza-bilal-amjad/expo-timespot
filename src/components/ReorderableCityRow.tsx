import { useCallback, useEffect, useMemo } from "react"
import { ViewStyle } from "react-native"
import * as Haptics from "expo-haptics"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import type { SavedCity, ZonedTime } from "@/domain/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { CityRow } from "./CityRow"
import { Icon } from "./Icon"

/**
 * docs/10-implementation-plan.md task 3.6. Wraps the presentational
 * <CityRow> with the two gestures the row-states/interactions tables specify
 * — long-press-then-drag to reorder, swipe left to delete — so CityRow
 * itself stays a plain memoized row. Both gestures have a documented
 * non-gesture alternative (docs/09-accessibility.md §4, WCAG 2.5.7):
 * CityRow's own accessibilityActions cover delete/moveUp/moveDown.
 */
export interface ReorderableCityRowProps {
  city: SavedCity
  time: ZonedTime
  selected: boolean
  index: number
  itemCount: number
  onPress: () => void
  onDelete: (city: SavedCity) => void
  onMoveUp: () => void
  onMoveDown: () => void
  /** Called mid-drag whenever the dragged row crosses into a neighbour's slot. */
  onDragMove: (cityId: string, toIndex: number) => void
  onDragEnd: () => void
}

function clamp(value: number, min: number, max: number) {
  "worklet"
  return Math.min(Math.max(value, min), max)
}

// docs/08-motion-spec.md #8 "List reorder | drag release | 260ms | ease.standard"
// — no existing timing token is exactly 260ms (base is 220, slow is 320),
// same normalisation gap as CityRow's SELECT_STAGGER_MS.
const REORDER_SETTLE_MS = 260
// Row-states table (docs/04-screen-specs.md): "dragging: scale 1.03, elev.overlay".
const DRAG_SCALE = 1.03
const DRAG_SHADOW_OPACITY = 0.18

export function ReorderableCityRow(props: ReorderableCityRowProps) {
  const {
    city,
    time,
    selected,
    index,
    itemCount,
    onPress,
    onDelete,
    onMoveUp,
    onMoveDown,
    onDragMove,
    onDragEnd,
  } = props
  const { theme, themed } = useAppTheme()

  // Every row is the same fixed height, so the target index during a drag is
  // pure arithmetic against the finger's translationY — no per-row onLayout
  // measurement needed.
  const ROW_STEP = theme.spacing.rowHeight + theme.spacing.rowGap

  const translateY = useSharedValue(0)
  const isDragging = useSharedValue(0)
  const indexShared = useSharedValue(index)
  const startIndexShared = useSharedValue(index)

  useEffect(() => {
    indexShared.value = index
    // eslint-disable-next-line react-hooks/exhaustive-deps -- indexShared is a Reanimated shared value (a stable ref), not reactive state; including it as a dep doesn't apply here.
  }, [index])

  const handleDragStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  }, [])

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(500)
        .onStart(() => {
          startIndexShared.value = indexShared.value
          isDragging.value = 1
          scheduleOnRN(handleDragStart)
        })
        .onUpdate((e) => {
          const rawIndex = startIndexShared.value + e.translationY / ROW_STEP
          const nextIndex = clamp(Math.round(rawIndex), 0, itemCount - 1)
          if (nextIndex !== indexShared.value) {
            // react-hooks/immutability can't distinguish a Reanimated shared
            // value (intentionally mutable outside React's render model,
            // written in an effect elsewhere in this component) from React
            // state — same false positive as Screen.tsx's react-hooks/refs.
            // eslint-disable-next-line react-hooks/immutability
            indexShared.value = nextIndex
            scheduleOnRN(onDragMove, city.cityId, nextIndex)
          }
          translateY.value =
            e.translationY - (indexShared.value - startIndexShared.value) * ROW_STEP
        })
        .onEnd(() => {
          translateY.value = withTiming(0, { duration: REORDER_SETTLE_MS })
          isDragging.value = 0
          scheduleOnRN(onDragEnd)
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gesture callbacks are workletized; shared values are stable refs and don't need to be deps.
    [ROW_STEP, itemCount, city.cityId, handleDragStart, onDragMove, onDragEnd],
  )

  const $animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: isDragging.value ? DRAG_SCALE : 1 }],
    zIndex: isDragging.value ? 1 : 0,
    shadowOpacity: isDragging.value ? DRAG_SHADOW_OPACITY : 0,
  }))

  const handleSwipeOpen = useCallback(() => onDelete(city), [onDelete, city])

  const renderRightActions = useCallback(
    (progress: SharedValue<number>) => (
      <DeleteAction progress={progress} accessibilityLabel={`Remove ${city.cityId}`} />
    ),
    [city.cityId],
  )

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      rightThreshold={80}
      overshootFriction={8}
      onSwipeableOpen={handleSwipeOpen}
      containerStyle={themed($swipeContainer)}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={$animatedRowStyle}>
          <CityRow
            city={city}
            time={time}
            selected={selected}
            onPress={onPress}
            onDelete={() => onDelete(city)}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        </Animated.View>
      </GestureDetector>
    </Swipeable>
  )
}

function DeleteAction(props: { progress: SharedValue<number>; accessibilityLabel: string }) {
  const { progress, accessibilityLabel } = props
  const { theme, themed } = useAppTheme()
  const $animatedOpacity = useAnimatedStyle(() => ({ opacity: progress.value }))
  return (
    <Animated.View style={[themed($deleteAction), $animatedOpacity]}>
      <Icon icon="trash" color={theme.colors.textAccent} accessibilityLabel={accessibilityLabel} />
    </Animated.View>
  )
}

const $swipeContainer: ThemedStyle<ViewStyle> = (theme) => ({
  marginBottom: theme.spacing.rowGap,
})

const $deleteAction: ThemedStyle<ViewStyle> = (theme) => ({
  width: theme.spacing.rowHeight,
  height: theme.spacing.rowHeight,
  borderRadius: theme.radius.md,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.cardBackground,
  marginLeft: theme.spacing.sm,
})
