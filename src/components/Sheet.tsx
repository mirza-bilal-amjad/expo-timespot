import { ReactNode } from "react"
import { Platform, TextStyle, useWindowDimensions, View, ViewStyle } from "react-native"
import { BottomSheet, RNHostView, type SnapPoint } from "@expo/ui"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  snapPoints?: SnapPoint[]
  /** Give the content a definite height (most of the screen), so a list or
   * scroll view inside it has bounds to scroll within. */
  fill?: boolean
  children: ReactNode
}

// How much of the window a `fill` sheet's content claims — the rest is the
// status bar, the drag handle and the sheet's own top inset.
const FILL_FRACTION = 0.88

/**
 * The only file that imports @expo/ui for sheets (docs/14-ignite-integration.md §6).
 * Feature code imports this, never @expo/ui directly — a future swap touches one file.
 *
 * The content is React Native, so it goes through `RNHostView` — @expo/ui's
 * bridge for React Native views inside a native tree. On Android the sheet
 * is a Compose dialog in its own window, with no React root above it;
 * RNHostView supplies one, dispatching the content's touches and acting as
 * the root a scroll view looks up when it starts a gesture. ~~React Native
 * children placed straight into the sheet~~ — corrected 2026-09-26: the
 * first drag on the search results (any tap that moved a little) made
 * ReactScrollView assert on a missing root view, and the app crashed
 * (`RootViewUtil.getRootView` ← `NativeGestureUtil.notifyNativeGestureStarted`).
 *
 * The frame has an explicit window width (a native host measures a React
 * Native view at its intrinsic size — on Android the search results laid out
 * only as wide as their widest row), so the host matches its contents.
 * @expo/ui's own horizontal inset is zeroed: every sheet's rows already
 * carry `spacing.gutter`.
 *
 * ~~Wrapped in our own `<Host>`~~ — removed 2026-09-26: the universal
 * BottomSheet mounts its own Host on iOS and Android, so ours nested one
 * native host inside another.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  snapPoints = ["half", "full"],
  fill = false,
  children,
}: SheetProps) {
  const { theme, themed } = useAppTheme()
  const window = useWindowDimensions()

  const $frame: ViewStyle =
    Platform.OS === "web"
      ? { width: "100%", height: fill ? window.height * FILL_FRACTION : undefined }
      : { width: window.width, height: fill ? window.height * FILL_FRACTION : undefined }

  const content = (
    <View style={$frame}>
      {title ? <Text preset="cityTitle" text={title} style={themed($title)} /> : null}
      {children}
    </View>
  )

  // Web's drawer is a plain DOM box — no bridge needed, and RNHostView's
  // `fit-content` wrapper there would collapse the full-width frame.
  return (
    <BottomSheet
      isPresented={open}
      onDismiss={() => onOpenChange(false)}
      snapPoints={snapPoints}
      containerColor={theme.colors.cardBackground}
      contentPadding={{ top: Platform.OS === "ios" ? theme.spacing.md : 0 }}
    >
      {Platform.OS === "web" ? content : <RNHostView matchContents>{content}</RNHostView>}
    </BottomSheet>
  )
}

const $title: ThemedStyle<TextStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingBottom: theme.spacing.xs,
})
