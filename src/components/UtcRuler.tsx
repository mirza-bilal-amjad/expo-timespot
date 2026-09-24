import { useMemo } from "react"
import { TextStyle, ViewStyle } from "react-native"
import Animated, {
  scrollTo,
  SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { getRulerTicks, offsetToRulerX, rulerXToOffset } from "@/domain/map/ruler"
import { formatOffset } from "@/domain/time/zone"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Pressable } from "./Pressable"
import { Text } from "./Text"

/**
 * docs/03-component-library.md "<MeridianMap>" (task 4.4 of the composite),
 * docs/04-screen-specs.md "S3 · Map" "Ruler". "The ruler and the meridian
 * are two views of one shared value — moving either moves the other, with
 * no JS round-trip." Both directions run on the UI thread: dragging the
 * ruler writes `offsetMinutes.value` from `onScroll`; dragging the meridian
 * (or tapping a tick) is picked up by `useAnimatedReaction` and scrolled
 * into view with `scrollTo`. `isUserDriven` breaks the loop that would
 * otherwise form between those two directions.
 *
 * Whole-hour ticks only (UTC-12..+14, 27 of them) — the continuous
 * scroll position underneath still represents any offset, including the
 * real 45-minute zones (Kathmandu +5:45, Chatham +12:45), which is what
 * `domain/map/ruler.ts`'s own tests pin down; this component only needs to
 * *label* the whole hours.
 */
export interface UtcRulerProps {
  offsetMinutes: SharedValue<number>
}

// docs/04-screen-specs.md: "active tick... with a radius.xs bg.card chip
// behind it" is the nearest whole-hour label to the continuous value — this
// is the window (mins) that counts as "at" that tick.
const ACTIVE_THRESHOLD_MINUTES = 30

const AnimatedText = Animated.createAnimatedComponent(Text)

export function UtcRuler({ offsetMinutes }: UtcRulerProps) {
  const { theme, themed } = useAppTheme()
  const tickWidth = theme.spacing.xxxl
  const ticks = useMemo(() => getRulerTicks(), [])
  const scrollRef = useAnimatedRef<Animated.ScrollView>()
  const isUserDriven = useSharedValue(false)

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      isUserDriven.value = true
    },
    onScroll: (event) => {
      if (!isUserDriven.value) return
      // offsetMinutes is a shared value passed as a prop, shared with
      // <MeridianLine> by design — same false positive as that
      // component's own suppressed write.
      // eslint-disable-next-line react-hooks/immutability
      offsetMinutes.value = rulerXToOffset(event.contentOffset.x, tickWidth)
    },
    onEndDrag: () => {
      isUserDriven.value = false
    },
    onMomentumEnd: () => {
      isUserDriven.value = false
    },
  })

  useAnimatedReaction(
    () => offsetMinutes.value,
    (current) => {
      if (isUserDriven.value) return
      scrollTo(scrollRef, offsetToRulerX(current, tickWidth), 0, false)
    },
  )

  const handleTickPress = (tickOffset: number) => {
    // docs/04-screen-specs.md: "Tapping a ruler tick animates the meridian
    // to it over duration.base" — a plain JS callback writing into a shared
    // value, which Reanimated supports directly from either thread.
    // eslint-disable-next-line react-hooks/immutability
    offsetMinutes.value = withTiming(tickOffset, { duration: theme.timing.base })
  }

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={themed($content)}
      accessibilityRole="adjustable"
    >
      {ticks.map((tickOffset) => (
        <Tick
          key={tickOffset}
          offsetMinutes={offsetMinutes}
          tickOffset={tickOffset}
          tickWidth={tickWidth}
          onPress={handleTickPress}
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

const $content: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: theme.spacing.md,
})

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
