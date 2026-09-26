import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AccessibilityActionEvent, Platform, View, ViewStyle } from "react-native"
import * as Haptics from "expo-haptics"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { Line, Path, Svg } from "react-native-svg"
import { scheduleOnRN } from "react-native-worklets"

import { getNearestRepresentativeCity } from "@/domain/cities/search"
import { MAX_OFFSET_MINUTES, MIN_OFFSET_MINUTES } from "@/domain/map/meridian"
import { pickCityAt } from "@/domain/map/pick"
import { MAP_ASPECT, projectLonLat } from "@/domain/map/projection"
import { stepToAdjacentOffset } from "@/domain/map/snap"
import { meridianValueText } from "@/domain/time/speech"
import { getOffsetMinutes, getZonedTime } from "@/domain/time/zone"
import type { City, Prefs } from "@/domain/types"
import { useAppTheme } from "@/theme/context"

import { FloatingCityCard } from "./FloatingCityCard"
import { WorldMap } from "./WorldMap"

/**
 * docs/03-component-library.md "<MeridianMap>", docs/04-screen-specs.md
 * "S3 · Map" — "point anywhere". The world, zoomed so its height fills the
 * viewport (the board's framing), panned horizontally beneath a pointer:
 * a vertical meridian line and a ring marker.
 *
 *   touch / drag anywhere  the line and ring jump under the finger and
 *                          follow it in both axes, on the UI thread; the
 *                          card and the active-country fill preview the
 *                          city under the finger, throttled to 60 ms
 *                          (CLAUDE.md: never per-frame JS during the drag)
 *   release                `pickCityAt` resolves the nearest real city; the
 *                          ring springs onto it and the map pans to centre
 *                          it (`onSelectCity`)
 *   drag near an edge      the world scrolls under the finger, so every
 *                          place is reachable without a second gesture
 *
 * ~~The meridian is dragged by its own 44 pt strip; x ↔ UTC offset by
 * longitude~~ — corrected 2026-09-25. Pointing picks a *place*, and the
 * zone is that place's real one: Madrid is UTC+2 in summer, not London's
 * zone as its longitude would imply.
 *
 * a11y (docs/09-accessibility.md §2): the surface is the one `adjustable`
 * control; increment/decrement (and ←/→ on web) step to the adjacent real
 * UTC offset's best-known city. The SVG stays hidden.
 */
export interface MeridianMapProps {
  width: number
  height: number
  city: City
  onSelectCity: (city: City) => void
  /** The city under the finger mid-drag, `null` once released — lets the
   * ruler track the preview, not just the committed selection. */
  onPreviewCity?: (city: City | null) => void
  /** The one clock tick (CLAUDE.md rule 3). */
  now: number
  prefs: Prefs
  /** Where the floating city card sits — see FloatingCityCard's `dock`. */
  cardDock?: "pointer" | "right"
}

const PREVIEW_THROTTLE_MS = 60
// Edge auto-scroll: within EDGE_ZONE pt of either side, the world scrolls
// at up to EDGE_SPEED pt/s, proportional to how deep into the zone the
// finger is.
const EDGE_ZONE = 40
const EDGE_SPEED = 700
// The board's pointer: a 1 pt rule with small triangular caps top and
// bottom, and a ring-and-dot marker.
const LINE_STROKE = 1
const CAP_WIDTH = 8
const CAP_HEIGHT = 6
const RING_SIZE = 14
const RING_STROKE = 2
const DOT_SIZE = 6

const MINUTE_MS = 60_000

const MemoWorldMap = memo(WorldMap)

function clamp(value: number, min: number, max: number): number {
  "worklet"
  return Math.min(Math.max(value, min), max)
}

function triggerHaptic() {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {})
}

export function MeridianMap(props: MeridianMapProps) {
  const { width, height, city, onSelectCity, onPreviewCity, now, prefs } = props
  const { theme } = useAppTheme()

  const contentWidth = Math.max(width, height / MAP_ASPECT)
  const contentHeight = contentWidth * MAP_ASPECT
  // Wider-than-tall viewports (desktop web) crop top and bottom evenly.
  const offsetY = (height - contentHeight) / 2
  const minViewportX = width - contentWidth

  const viewportX = useSharedValue(0)
  const pointerX = useSharedValue(0)
  const pointerY = useSharedValue(0)
  const fingerX = useSharedValue(0)
  const dragging = useSharedValue(false)
  const lastPreviewMs = useSharedValue(0)

  const [preview, setPreview] = useState<City | null>(null)

  const focusOn = useCallback(
    (target: City, animate: boolean) => {
      const p = projectLonLat(target.lon, target.lat, contentWidth, contentHeight)
      const vx = clamp(width / 2 - p.x, minViewportX, 0)
      if (animate) {
        pointerX.value = withSpring(p.x, theme.timing.spring.press)
        pointerY.value = withSpring(p.y, theme.timing.spring.press)
        viewportX.value = withTiming(vx, { duration: theme.timing.slow })
      } else {
        pointerX.value = p.x
        pointerY.value = p.y
        viewportX.value = vx
      }
    },
    // Shared values are stable refs, not reactive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentWidth, contentHeight, width, minViewportX, theme.timing],
  )

  const hasPlaced = useRef(false)
  useEffect(() => {
    if (width <= 0 || height <= 0) return
    focusOn(city, hasPlaced.current)
    hasPlaced.current = true
  }, [city, focusOn, width, height])

  const updatePreview = useCallback(
    (x: number, y: number) => {
      const picked = pickCityAt(x, y, contentWidth, contentHeight)
      setPreview(picked)
      onPreviewCity?.(picked)
    },
    [contentWidth, contentHeight, onPreviewCity],
  )

  const select = useCallback(
    (next: City) => {
      focusOn(next, true)
      if (next.id !== city.id) {
        triggerHaptic()
        onSelectCity(next)
      }
    },
    [focusOn, city.id, onSelectCity],
  )

  const commit = useCallback(
    (x: number, y: number) => {
      setPreview(null)
      onPreviewCity?.(null)
      select(pickCityAt(x, y, contentWidth, contentHeight))
    },
    [select, contentWidth, contentHeight, onPreviewCity],
  )

  useAnimatedReaction(
    () => (dragging.value ? pointerX.value + pointerY.value * 1e-6 : null),
    (current) => {
      if (current === null) return
      // A UI-thread clock read gating the JS bridge — not render impurity.
      // eslint-disable-next-line react-hooks/purity
      const t = performance.now()
      if (t - lastPreviewMs.value < PREVIEW_THROTTLE_MS) return
      lastPreviewMs.value = t
      scheduleOnRN(updatePreview, pointerX.value, pointerY.value)
    },
  )

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onBegin((e) => {
          cancelAnimation(viewportX)
          dragging.value = true
          fingerX.value = e.x
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, written on the UI thread by design
          pointerX.value = clamp(e.x - viewportX.value, 0, contentWidth)
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, written on the UI thread by design
          pointerY.value = clamp(e.y - offsetY, 0, contentHeight)
        })
        .onUpdate((e) => {
          fingerX.value = e.x
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, written on the UI thread by design
          pointerX.value = clamp(e.x - viewportX.value, 0, contentWidth)
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, written on the UI thread by design
          pointerY.value = clamp(e.y - offsetY, 0, contentHeight)
        })
        .onFinalize(() => {
          if (!dragging.value) return
          dragging.value = false
          scheduleOnRN(commit, pointerX.value, pointerY.value)
        }),
    // Shared values are stable refs; the gesture is rebuilt when geometry
    // or the commit target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentWidth, contentHeight, offsetY, commit],
  )

  useFrameCallback((frame) => {
    if (!dragging.value) return
    let speed = 0
    if (fingerX.value < EDGE_ZONE) {
      speed = ((EDGE_ZONE - fingerX.value) / EDGE_ZONE) * EDGE_SPEED
    } else if (fingerX.value > width - EDGE_ZONE) {
      speed = -((fingerX.value - (width - EDGE_ZONE)) / EDGE_ZONE) * EDGE_SPEED
    }
    if (speed === 0) return
    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000
    const next = clamp(viewportX.value + speed * dt, minViewportX, 0)
    if (next === viewportX.value) return
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, written on the UI thread by design
    viewportX.value = next
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, written on the UI thread by design
    pointerX.value = clamp(fingerX.value - next, 0, contentWidth)
  })

  const anchorX = useDerivedValue(() => pointerX.value + viewportX.value)
  const anchorY = useDerivedValue(() => pointerY.value + offsetY)

  const $contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: viewportX.value }, { translateY: offsetY }],
  }))
  const $lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: anchorX.value - CAP_WIDTH / 2 }],
  }))
  const $ringStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: anchorX.value - RING_SIZE / 2 },
      { translateY: anchorY.value - RING_SIZE / 2 },
    ],
  }))

  const shown = preview ?? city
  const shownTime = getZonedTime(now, shown.zone, prefs)
  const minuteNow = Math.floor(now / MINUTE_MS) * MINUTE_MS

  const step = (direction: 1 | -1) => {
    const target = stepToAdjacentOffset(getOffsetMinutes(now, city.zone), direction)
    select(getNearestRepresentativeCity(target, now))
  }

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") step(1)
    else if (event.nativeEvent.actionName === "decrement") step(-1)
  }

  if (width <= 0 || height <= 0) return null

  const valueText = meridianValueText(shown, shownTime)
  const valueMin = MIN_OFFSET_MINUTES / 60
  const valueMax = MAX_OFFSET_MINUTES / 60
  const valueNow = shownTime.offsetMinutes / 60

  // react-native-web only makes a few roles keyboard-focusable and reads
  // flat aria-value* props, not RN's nested accessibilityValue.
  const webProps =
    Platform.OS === "web"
      ? {
          "focusable": true,
          "onKeyDown": (e: { key: string }) => {
            if (e.key === "ArrowRight") step(1)
            else if (e.key === "ArrowLeft") step(-1)
          },
          "aria-valuemin": valueMin,
          "aria-valuemax": valueMax,
          "aria-valuenow": valueNow,
          "aria-valuetext": valueText,
        }
      : undefined

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[$viewport, { width, height }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Time zone selector"
        accessibilityHint="Touch anywhere on the map to pick a city"
        accessibilityValue={{ min: valueMin, max: valueMax, now: valueNow, text: valueText }}
        accessibilityActions={[
          { name: "increment", label: "Next time zone" },
          { name: "decrement", label: "Previous time zone" },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-native-web-only props, not in RN's View typings
        {...(webProps as any)}
      >
        <Animated.View style={[$content, $contentStyle]}>
          <MemoWorldMap
            width={contentWidth}
            height={contentHeight}
            activeCountryCode={shown.countryCode}
            now={minuteNow}
          />
        </Animated.View>

        <Animated.View
          style={[$line, { height }, $lineStyle]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Svg width={CAP_WIDTH} height={height}>
            <Line
              x1={CAP_WIDTH / 2}
              y1={0}
              x2={CAP_WIDTH / 2}
              y2={height}
              stroke={theme.colors.meridian}
              strokeWidth={LINE_STROKE}
            />
            <Path
              d={`M0,0 L${CAP_WIDTH},0 L${CAP_WIDTH / 2},${CAP_HEIGHT} Z`}
              fill={theme.colors.meridian}
            />
            <Path
              d={`M0,${height} L${CAP_WIDTH},${height} L${CAP_WIDTH / 2},${height - CAP_HEIGHT} Z`}
              fill={theme.colors.meridian}
            />
          </Svg>
        </Animated.View>

        <Animated.View style={[$ring, { borderColor: theme.colors.meridian }, $ringStyle]}>
          <View style={[$dot, { backgroundColor: theme.colors.meridian }]} />
        </Animated.View>

        <FloatingCityCard
          width={width}
          height={height}
          city={shown}
          anchorX={anchorX}
          anchorY={anchorY}
          now={now}
          prefs={prefs}
          dock={props.cardDock}
        />
      </View>
    </GestureDetector>
  )
}

const $viewport: ViewStyle = { overflow: "hidden" }

const $content: ViewStyle = { position: "absolute", left: 0, top: 0 }

const $line: ViewStyle = {
  position: "absolute",
  left: 0,
  top: 0,
  width: CAP_WIDTH,
  pointerEvents: "none",
}

const $ring: ViewStyle = {
  position: "absolute",
  left: 0,
  top: 0,
  width: RING_SIZE,
  height: RING_SIZE,
  borderRadius: RING_SIZE / 2,
  borderWidth: RING_STROKE,
  pointerEvents: "none",
  alignItems: "center",
  justifyContent: "center",
}

const $dot: ViewStyle = { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 }
