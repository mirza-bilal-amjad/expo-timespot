import { ReactNode } from "react"
import { AccessibilityRole, Platform, View, ViewStyle } from "react-native"

import { InvertedTheme, useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Pressable } from "./Pressable"

/**
 * docs/03-component-library.md — Tier 2. The hairline surface from
 * docs/01-design-audit.md §3, replacing Ignite's elevated-panel Card
 * (unused anywhere in this codebase, so there was nothing to migrate).
 */
export interface CardProps {
  selected?: boolean
  interactive?: boolean
  elevation?: "hairline" | "float"
  onPress?: () => void
  onLongPress?: () => void
  style?: ViewStyle
  children?: ReactNode
  accessibilityLabel?: string
  accessibilityRole?: AccessibilityRole
  accessibilityState?: Record<string, unknown>
  accessibilityHint?: string
}

export function Card(props: CardProps) {
  const {
    selected = false,
    interactive = true,
    elevation = "hairline",
    onPress,
    onLongPress,
    style: $styleOverride,
    children,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    accessibilityHint,
  } = props

  const { themed } = useAppTheme()

  const content = (
    <View
      style={[
        themed($card),
        elevation === "float" && themed($float),
        selected && themed($selected),
        $styleOverride,
      ]}
    >
      {selected ? <InvertedTheme>{children}</InvertedTheme> : children}
    </View>
  )

  if (!interactive) return content

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, ...accessibilityState }}
    >
      {content}
    </Pressable>
  )
}

// Elevation tokens don't exist in the design system yet (docs/02-design-system.md
// has no shadow scale) — these are deliberately named constants, not bare
// magic numbers, pending a real token if `elevation="float"` gets more callers.
const FLOAT_SHADOW_OPACITY = 0.08
const FLOAT_SHADOW_RADIUS = 8
const FLOAT_SHADOW_OFFSET_Y = 2
const FLOAT_ANDROID_ELEVATION = 3

const $card: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.cardBackground,
  borderRadius: theme.radius.md,
  borderWidth: 1,
  borderTopColor: theme.colors.strokeRaised,
  borderLeftColor: theme.colors.strokeRaised,
  borderBottomColor: theme.colors.strokeSunken,
  borderRightColor: theme.colors.strokeSunken,
  ...(Platform.OS === "web"
    ? {
        boxShadow: `inset 0 1px 0 ${theme.colors.strokeRaised}`,
        borderWidth: 1,
        borderColor: theme.colors.strokeSunken,
      }
    : null),
})

const $float: ThemedStyle<ViewStyle> = (theme) => ({
  borderWidth: 0,
  shadowColor: theme.colors.text,
  shadowOpacity: FLOAT_SHADOW_OPACITY,
  shadowRadius: FLOAT_SHADOW_RADIUS,
  shadowOffset: { width: 0, height: FLOAT_SHADOW_OFFSET_Y },
  elevation: FLOAT_ANDROID_ELEVATION,
})

const $selected: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.inverseBackground,
  borderColor: theme.colors.inverseBackground,
  borderTopColor: theme.colors.inverseBackground,
  borderLeftColor: theme.colors.inverseBackground,
  borderBottomColor: theme.colors.inverseBackground,
  borderRightColor: theme.colors.inverseBackground,
})
