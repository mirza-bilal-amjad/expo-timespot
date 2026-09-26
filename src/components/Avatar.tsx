import { useEffect } from "react"
import { View, ViewStyle, TextStyle, ImageStyle } from "react-native"
import { Image } from "expo-image"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

/**
 * docs/03-component-library.md. 44pt squircle city image, expo-image-backed.
 * No city in the current dataset has a `photo` yet (GeoNames doesn't supply
 * one — see scripts/build-cities.ts), so the monogram fallback is what
 * actually renders today; the photo path is built and typed correctly but
 * only exercisable once a photo pipeline exists.
 */
export interface AvatarProps {
  /** Photo URL — city.photo, once a photo asset pipeline exists. */
  uri?: string
  blurhash?: string
  /** Used for the monogram fallback and the default accessibility label. */
  label: string
  focused?: boolean
  size?: number
  style?: ViewStyle
  accessibilityLabel?: string
}

const DEFAULT_SIZE = 44
// A true squircle is a superellipse, not a rounded rect — this is the usual
// cheap approximation (radius as a fraction of size), close enough at 44pt.
const SQUIRCLE_RADIUS_RATIO = 0.32

function monogram(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return "?"
  const words = trimmed.split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function Avatar(props: AvatarProps) {
  const {
    uri,
    blurhash,
    label,
    focused = false,
    size = DEFAULT_SIZE,
    style,
    accessibilityLabel,
  } = props
  const { theme, themed } = useAppTheme()

  // expo-image has no grayscale filter, and no cross-platform pixel-level
  // desaturation is available without a native shader — approximated with an
  // animated neutral overlay that fades out on focus instead of a true
  // grayscale-to-color conversion of the source image.
  const overlayOpacity = useSharedValue(focused ? 0 : 1)
  useEffect(() => {
    overlayOpacity.value = withTiming(focused ? 0 : 1, { duration: theme.timing.base })
  }, [focused, overlayOpacity, theme.timing.base])
  const $overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }))

  const radius = size * SQUIRCLE_RADIUS_RATIO
  const dimensions = { width: size, height: size, borderRadius: radius }

  return (
    <View
      style={[dimensions, themed($tile), style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessible
    >
      {uri ? (
        <>
          <Image
            source={{ uri }}
            placeholder={blurhash}
            contentFit="cover"
            recyclingKey={uri}
            style={[dimensions, $image]}
          />
          <Animated.View style={[dimensions, themed($grayscaleOverlay), $overlayStyle]} />
        </>
      ) : (
        <Text text={monogram(label)} style={themed($monogramText)} />
      )}
    </View>
  )
}

const $tile: ThemedStyle<ViewStyle> = (theme) => ({
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.controlBackground,
})

const $image: ImageStyle = { position: "absolute" }

const $grayscaleOverlay: ThemedStyle<ViewStyle> = (theme) => ({
  pointerEvents: "none",
  position: "absolute",
  backgroundColor: theme.colors.palette.neutral600,
  mixBlendMode: "saturation",
})

const $monogramText: ThemedStyle<TextStyle> = (theme) => ({
  color: theme.colors.textDim,
  fontFamily: theme.typography.primary.medium,
})
