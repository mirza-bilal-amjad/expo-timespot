import { useEffect } from "react"
import { View, ViewStyle } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Pressable } from "./Pressable"
import { Text } from "./Text"

/**
 * docs/03-component-library.md: "`<Toast>` carries the undo affordance for
 * delete; it is `role="status"` with `aria-live="polite"` and never steals
 * focus." docs/09-accessibility.md §4: "Undo for every destructive action
 * (3.3.4). Delete shows a 5s undo toast." docs/08-motion-spec.md #9 covers
 * the row's own delete motion, not the toast's — this uses `ease.standard`
 * at `base` (220ms) for its own enter/exit, the general-purpose choice for
 * an element with no dedicated spec entry.
 */
export interface ToastProps {
  visible: boolean
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
  durationMs?: number
  /** Distance from the screen's bottom edge. Defaults to a bare safe-area
   * clearance; a screen with a floating <TabBar> must pass
   * `useTabBarClearance()` (+ a gap) or the toast renders underneath it. */
  bottomOffset?: number
}

const DEFAULT_DURATION_MS = 5000

export function Toast(props: ToastProps) {
  const {
    visible,
    message,
    actionLabel,
    onAction,
    onDismiss,
    durationMs = DEFAULT_DURATION_MS,
  } = props
  const { theme, themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  const bottomOffset = props.bottomOffset ?? insets.bottom + theme.spacing.xxl

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [visible, durationMs, onDismiss, message])

  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: theme.timing.base })
  }, [visible, progress, theme.timing.base])

  const $animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * ENTER_TRANSLATE_Y }],
  }))

  if (!visible) return null

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[themed($container), { bottom: bottomOffset }, $animatedStyle]}
    >
      <View style={themed($card)} accessibilityLiveRegion="polite" accessible>
        <Text text={message} style={themed($message)} />
        {actionLabel && onAction && (
          <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
            <Text text={actionLabel} style={themed($action)} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  )
}

// elev.overlay per docs/02-design-system.md — no shared token yet (same gap
// Card.tsx's own float-shadow constants document for elev.float).
const OVERLAY_SHADOW_OPACITY = 0.18
const OVERLAY_SHADOW_RADIUS = 24
const OVERLAY_SHADOW_OFFSET_Y = 8
const OVERLAY_ANDROID_ELEVATION = 8
const CARD_MIN_WIDTH = 220
const ENTER_TRANSLATE_Y = 12

const $container: ThemedStyle<ViewStyle> = (theme) => ({
  position: "absolute",
  left: theme.spacing.gutter,
  right: theme.spacing.gutter,
  alignItems: "center",
})

const $card: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing.md,
  backgroundColor: theme.colors.inverseBackground,
  borderRadius: theme.radius.lg,
  paddingVertical: theme.spacing.sm,
  paddingHorizontal: theme.spacing.md,
  minWidth: CARD_MIN_WIDTH,
  shadowColor: theme.colors.text,
  shadowOpacity: OVERLAY_SHADOW_OPACITY,
  shadowRadius: OVERLAY_SHADOW_RADIUS,
  shadowOffset: { width: 0, height: OVERLAY_SHADOW_OFFSET_Y },
  elevation: OVERLAY_ANDROID_ELEVATION,
})

const $message: ThemedStyle<{ color: string }> = (theme) => ({ color: theme.colors.textOnInverse })

const $action: ThemedStyle<{ color: string; fontFamily: string }> = (theme) => ({
  color: theme.colors.textOnInverse,
  fontFamily: theme.typography.primary.bold,
})
