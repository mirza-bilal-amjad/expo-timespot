import { useCallback, useMemo } from "react"
import { ViewStyle } from "react-native"
import * as Haptics from "expo-haptics"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"
import Animated, {
  Easing,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import type { SavedCity, ZonedTime } from "@/domain/types"
import { useAppTheme } from "@/theme/context"
import { rgbChannels } from "@/theme/shadow"
import type { ThemedStyle } from "@/theme/types"

import { CityRow } from "./CityRow"
import { EntranceView } from "./EntranceView"
import { Icon } from "./Icon"

/**
 * docs/10-implementation-plan.md task 3.6. Wraps the presentational
 * <CityRow> with the two gestures the row-states/interactions tables specify
 * — long-press-then-drag to reorder, swipe left to delete. Both have a
 * non-gesture alternative (docs/09-accessibility.md §4, WCAG 2.5.7): the
 * row's accessibility actions and its "⋯" menu.
 *
 * Every row is absolutely positioned at its slot in the list's shared
 * *visual order* (`order`, owned by ListScreen, lives on the UI thread),
 * and glides there whenever that slot changes. A drag only rewrites
 * `order` — neighbours slide out of the way, the dragged row stays glued to
 * the finger — and on release the new order is committed to the store,
 * which re-renders nothing visible: positions never came from render order.
 *
 * ~~Reorder the data mid-drag and compensate the dragged row's offset~~ —
 * replaced 2026-09-26. The compensation landed on the UI thread frames
 * before the list's re-layout (a JS round-trip), so the dragged row jumped a
 * slot at every crossing; neighbours snapped instead of sliding; the dragged
 * row passed *under* the rows below it (its zIndex was inside a list cell);
 * and the lift popped on and off.
 */
export interface ReorderableCityRowProps {
  city: SavedCity
  time: ZonedTime
  selected: boolean
  /** Position in the stored order — for "can move up/down" and the initial slot. */
  index: number
  itemCount: number
  /** The list's visual order (cityIds), shared by every row. */
  order: SharedValue<string[]>
  /** The cityId being dragged, if any — shared by every row. */
  draggingId: SharedValue<string | null>
  onPress: () => void
  onDelete: (city: SavedCity) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRename: (city: SavedCity) => void
  onDragStart: () => void
  /** The final visual order, once the dragged row is released. */
  onDragEnd: (orderedIds: string[]) => void
  /** Cold-start entrance (docs/08-motion-spec.md §7), run *inside* the
   * positioned layer — a wrapper around an absolutely placed row would
   * collapse to zero height, and Android drops touches outside a parent's
   * bounds. */
  entrance?: { play: boolean; delayMs: number; durationMs: number }
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
// elev.overlay — the same tokens Toast uses; the alpha fades with the lift.
const DRAG_SHADOW_OPACITY = 0.18
const DRAG_SHADOW_OFFSET_Y = 8
const DRAG_SHADOW_BLUR = 24
const LONG_PRESS_MS = 500

export function ReorderableCityRow(props: ReorderableCityRowProps) {
  const {
    city,
    time,
    selected,
    index,
    itemCount,
    order,
    draggingId,
    onPress,
    onDelete,
    onMoveUp,
    onMoveDown,
    onRename,
    onDragStart,
    onDragEnd,
    entrance,
  } = props
  const { theme, themed } = useAppTheme()
  const id = city.cityId

  const step = theme.spacing.rowHeight + theme.spacing.rowGap
  const settle = useMemo(
    () => ({ duration: REORDER_SETTLE_MS, easing: Easing.bezier(...theme.timing.ease.standard) }),
    [theme.timing],
  )
  const liftMs = theme.timing.fast

  // Where the row rests (animated toward its slot), where the finger has it
  // while dragging, and 0→1 for the lift's scale and shadow.
  const slotY = useSharedValue(index * step)
  const dragY = useSharedValue(index * step)
  const dragStartY = useSharedValue(0)
  const lift = useSharedValue(0)

  useAnimatedReaction(
    () => order.value.indexOf(id),
    (slot, previous) => {
      if (slot < 0 || draggingId.value === id) return
      // First placement is instant; every later slot change glides.
      slotY.value = previous === null ? slot * step : withTiming(slot * step, settle)
    },
    [id, step, settle],
  )

  const handleHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  }, [])

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
          dragStartY.value = slotY.value
          dragY.value = slotY.value
          // eslint-disable-next-line react-hooks/immutability -- list-level Reanimated shared value, written from the UI-thread gesture by design
          draggingId.value = id
          lift.value = withTiming(1, { duration: liftMs })
          scheduleOnRN(handleHaptic)
          scheduleOnRN(onDragStart)
        })
        .onUpdate((e) => {
          const maxY = (itemCount - 1) * step
          const y = clamp(dragStartY.value + e.translationY, 0, maxY)
          dragY.value = y
          const hover = clamp(Math.round(y / step), 0, itemCount - 1)
          const current = order.value.indexOf(id)
          if (hover !== current && current >= 0) {
            const next = order.value.slice()
            next.splice(current, 1)
            next.splice(hover, 0, id)
            // eslint-disable-next-line react-hooks/immutability -- list-level Reanimated shared value, written from the UI-thread gesture by design
            order.value = next
          }
        })
        .onFinalize(() => {
          if (draggingId.value !== id) return
          const slot = order.value.indexOf(id)
          // Hand over from finger to slot without a jump: start the settle
          // from exactly where the finger left the row.
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
          slotY.value = dragY.value
          slotY.value = withTiming(slot * step, settle)
          // eslint-disable-next-line react-hooks/immutability -- list-level Reanimated shared value, written from the UI-thread gesture by design
          draggingId.value = null
          lift.value = withTiming(0, { duration: REORDER_SETTLE_MS })
          scheduleOnRN(onDragEnd, order.value)
        }),
    // Shared values are stable refs; the gesture is rebuilt only when the
    // geometry or the callbacks change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, step, itemCount, settle, liftMs, handleHaptic, onDragStart, onDragEnd],
  )

  const shadowRgb = rgbChannels(theme.colors.text)
  const $position = useAnimatedStyle(() => {
    const dragging = draggingId.value === id
    return {
      transform: [
        { translateY: dragging ? dragY.value : slotY.value },
        { scale: 1 + (DRAG_SCALE - 1) * lift.value },
      ],
      // Above every sibling row while lifted, including while it settles.
      zIndex: dragging || lift.value > 0 ? 1 : 0,
      boxShadow:
        lift.value > 0
          ? `0px ${DRAG_SHADOW_OFFSET_Y}px ${DRAG_SHADOW_BLUR}px rgba(${shadowRgb}, ${DRAG_SHADOW_OPACITY * lift.value})`
          : "none",
    }
  })

  const handleSwipeOpen = useCallback(() => onDelete(city), [onDelete, city])

  const renderRightActions = useCallback(
    (progress: SharedValue<number>) => (
      <DeleteAction progress={progress} accessibilityLabel={`Remove ${city.cityId}`} />
    ),
    [city.cityId],
  )

  return (
    <Animated.View style={[themed($slot), $position]}>
      <Swipeable
        renderRightActions={renderRightActions}
        rightThreshold={80}
        overshootFriction={8}
        onSwipeableOpen={handleSwipeOpen}
      >
        <GestureDetector gesture={pan}>
          <EntranceView
            play={entrance?.play ?? false}
            delayMs={entrance?.delayMs}
            durationMs={entrance?.durationMs}
          >
            <CityRow
              city={city}
              time={time}
              selected={selected}
              onPress={onPress}
              onDelete={() => onDelete(city)}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onRename={() => onRename(city)}
              canMoveUp={index > 0}
              canMoveDown={index < itemCount - 1}
            />
          </EntranceView>
        </GestureDetector>
      </Swipeable>
    </Animated.View>
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

// Absolutely placed; `translateY` (slot × step) does the positioning. The
// radius matches the card's own: the drag shadow is drawn from this layer,
// and a square layer showed hard shadow edges beside the rounded card.
const $slot: ThemedStyle<ViewStyle> = (theme) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  borderRadius: theme.radius.md,
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
