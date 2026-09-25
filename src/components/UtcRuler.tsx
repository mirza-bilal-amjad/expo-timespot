import { useEffect, useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, TextStyle, ViewStyle } from "react-native"
import Animated, {
  runOnJS,
  scrollTo,
  SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"

import { getRulerTicks, offsetToRulerX, rulerXToOffset } from "@/domain/map/ruler"
import { formatOffset } from "@/domain/time/zone"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Pressable } from "./Pressable"
import { Text } from "./Text"

/**
 * docs/03-component-library.md "<MeridianMap>" (task 4.4 of the composite),
 * docs/04-screen-specs.md "S3 · Map" "Ruler". A horizontal strip of
 * whole-hour ticks, UTC−12 … UTC+14 (Kiritimati), with the active tick
 * centred under the screen's middle as on the board.
 *
 * `offsetMinutes` is the display value: the parent animates it to the
 * selected city's offset and the strip scrolls to follow, on the UI thread.
 * When the user scrolls the strip themselves, it writes `offsetMinutes`
 * live (the active chip tracks the finger) and, once scrolling has been
 * idle for SETTLE_MS, reports `onSettle(offset)` — the parent resolves that
 * to a real zone's city, which animates the ruler onto its exact tick.
 * A tick tap reports `onSettle` directly.
 *
 * "User vs programmatic" scroll is told apart by position, not by
 * begin/end-drag events: react-native-web doesn't reliably fire those, and
 * a trackpad or wheel scroll never has a "drag" at all. Every programmatic
 * `scrollTo` records where it sent the strip; a scroll event anywhere else
 * is the user.
 *
 * a11y (task 4.8): each tick is a real button (a quick-jump shortcut). The
 * one `adjustable` control for the selected zone is <MeridianMap>'s own.
 */
export interface UtcRulerProps {
  offsetMinutes: SharedValue<number>
  onSettle?: (offsetMinutes: number) => void
}

// The chip highlights the whole-hour tick nearest the continuous value.
const ACTIVE_THRESHOLD_MINUTES = 30
// How long the strip must sit still before a user scroll counts as a choice.
const SETTLE_MS = 180

const AnimatedText = Animated.createAnimatedComponent(Text)

export function UtcRuler({ offsetMinutes, onSettle }: UtcRulerProps) {
  const { theme } = useAppTheme()
  const tickWidth = theme.spacing.xxxl
  const ticks = useMemo(() => getRulerTicks(), [])
  const scrollRef = useAnimatedRef<Animated.ScrollView>()
  const expectedX = useSharedValue(-1)
  const writtenByUser = useSharedValue(false)
  const [viewportWidth, setViewportWidth] = useState(0)

  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleSettle = (offset: number) => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => onSettle?.(offset), SETTLE_MS)
  }
  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    },
    [],
  )

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const x = event.contentOffset.x
      if (Math.abs(x - expectedX.value) < 1) return
      const offset = rulerXToOffset(x, tickWidth)
      writtenByUser.value = true
      // offsetMinutes is a shared value passed as a prop — its `.value` is
      // meant to be written from here; the lint rule can't tell that from
      // mutating a plain prop.
      // eslint-disable-next-line react-hooks/immutability
      offsetMinutes.value = offset
      runOnJS(scheduleSettle)(offset)
    },
  })

  useAnimatedReaction(
    () => offsetMinutes.value,
    (current) => {
      if (writtenByUser.value) {
        writtenByUser.value = false
        return
      }
      const x = offsetToRulerX(current, tickWidth)
      expectedX.value = x
      scrollTo(scrollRef, x, 0, false)
    },
  )

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width)
    // Re-seat the strip once padding exists to centre against.
    const x = offsetToRulerX(offsetMinutes.value, tickWidth)
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, not React state
    expectedX.value = x
    scrollRef.current?.scrollTo({ x, animated: false })
  }

  // Half the viewport either side, less half a tick, so scroll x == the
  // centred tick's own ruler x — offsetToRulerX needs no viewport term.
  const sidePadding = Math.max((viewportWidth - tickWidth) / 2, 0)

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={scrollHandler}
      onLayout={handleLayout}
      scrollEventThrottle={16}
      contentContainerStyle={[$content, { paddingHorizontal: sidePadding }]}
    >
      {ticks.map((tickOffset) => (
        <Tick
          key={tickOffset}
          offsetMinutes={offsetMinutes}
          tickOffset={tickOffset}
          tickWidth={tickWidth}
          onPress={(o) => onSettle?.(o)}
        />
      ))}
    </Animated.ScrollView>
  )
}

function Tick(props: {
  offsetMinutes: SharedValue<number>
  tickOffset: number
  tickWidth: number
  onPress: (tickOffset: number) => void
}) {
  const { offsetMinutes, tickOffset, tickWidth, onPress } = props
  const { theme, themed } = useAppTheme()
  const label = formatOffset(tickOffset)

  const $animatedChip = useAnimatedStyle(() => {
    const active = Math.abs(offsetMinutes.value - tickOffset) < ACTIVE_THRESHOLD_MINUTES
    return { backgroundColor: active ? theme.colors.cardBackground : theme.colors.transparent }
  })
  const $animatedLabel = useAnimatedStyle(() => {
    const active = Math.abs(offsetMinutes.value - tickOffset) < ACTIVE_THRESHOLD_MINUTES
    return {
      color: active ? theme.colors.text : theme.colors.textDim,
      fontWeight: active ? "600" : "400",
    }
  })

  return (
    <Pressable
      onPress={() => onPress(tickOffset)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[themed($tickTouchable), { width: tickWidth }]}
    >
      <Animated.View style={[themed($tickChip), $animatedChip]}>
        <AnimatedText preset="caption" text={label} style={[$tickLabel, $animatedLabel]} />
      </Animated.View>
    </Pressable>
  )
}

const $content: ViewStyle = { flexDirection: "row", alignItems: "center" }

// A 48pt-tall touchable around a ~13pt label approximates the doc's "hit
// area 44pt tall via hitSlop even though the visual is 13pt" — spacing.xxl
// (48) is the nearest token to the measured 44.
const $tickTouchable: ThemedStyle<ViewStyle> = (theme) => ({
  height: theme.spacing.xxl,
  alignItems: "center",
  justifyContent: "center",
})

const $tickChip: ThemedStyle<ViewStyle> = (theme) => ({
  borderRadius: theme.radius.xs,
  paddingHorizontal: theme.spacing.xs,
  paddingVertical: theme.spacing.xxxs,
})

const $tickLabel: TextStyle = { textAlign: "center" }
