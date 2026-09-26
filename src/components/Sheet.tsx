import { ReactNode } from "react"
import { Platform, TextStyle, useWindowDimensions, View, ViewStyle } from "react-native"
import { BottomSheet, Host, type SnapPoint } from "@expo/ui"

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
 * Native hosts our React Native children inside a SwiftUI `Group` / Compose
 * `Column`, which measure a React Native view at its *intrinsic* size: on
 * Android the search results laid out only as wide as their widest row, not
 * the sheet (reported 2026-09-26). So on native the content gets an explicit
 * window-sized frame and @expo/ui's own horizontal inset is zeroed — every
 * sheet's rows already carry `spacing.gutter`. Web's drawer is a normal DOM
 * box, where filling the container is enough.
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

  return (
    <Host style={$host} matchContents>
      <BottomSheet
        isPresented={open}
        onDismiss={() => onOpenChange(false)}
        snapPoints={snapPoints}
        containerColor={theme.colors.cardBackground}
        contentPadding={{ top: Platform.OS === "ios" ? theme.spacing.md : 0 }}
      >
        <View style={$frame}>
          {title ? <Text preset="cityTitle" text={title} style={themed($title)} /> : null}
          {children}
        </View>
      </BottomSheet>
    </Host>
  )
}

const $host: ViewStyle = { position: "absolute" }

const $title: ThemedStyle<TextStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingBottom: theme.spacing.xs,
})
