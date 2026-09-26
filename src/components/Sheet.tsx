import { ReactNode, useEffect, useRef } from "react"
import { Platform, TextStyle, useWindowDimensions, View, ViewStyle } from "react-native"
import { BottomSheet, type SnapPoint } from "@expo/ui"

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
  /** Called once per close, after the sheet has finished animating away and
   * its content is gone. Work that changes the app behind the sheet belongs
   * here, not in the handler that closes it. */
  onClosed?: () => void
  children: ReactNode
}

// How much of the window a `fill` sheet's content claims — the rest is the
// status bar, the drag handle and the sheet's own top inset.
const FILL_FRACTION = 0.88

// `onClosed` normally fires when the content unmounts; this is only the
// backstop, well past every platform's dismiss animation.
const CLOSED_FALLBACK_MS = 1000

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
 *
 * ~~Wrapped in our own `<Host>`~~ — removed 2026-09-26. The universal
 * BottomSheet mounts its own Host on iOS and Android, so ours nested one
 * native host inside another for no benefit.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  snapPoints = ["half", "full"],
  fill = false,
  onClosed,
  children,
}: SheetProps) {
  const { theme, themed } = useAppTheme()
  const window = useWindowDimensions()
  const closedPending = useRef(false)
  const onClosedRef = useRef(onClosed)

  useEffect(() => {
    onClosedRef.current = onClosed
  }, [onClosed])

  const fireClosed = () => {
    if (!closedPending.current) return
    closedPending.current = false
    onClosedRef.current?.()
  }

  // Every platform's BottomSheet unmounts its content once dismissed — the
  // <ClosedSignal> below reports that. Opening is what makes a close owed
  // (marked then, because the content may unmount in the same commit that
  // closes it, before this effect would run again); the timer covers a
  // platform that keeps the content mounted.
  useEffect(() => {
    if (open) {
      closedPending.current = true
      return
    }
    const timer = setTimeout(fireClosed, CLOSED_FALLBACK_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fireClosed only reads refs
  }, [open])

  const $frame: ViewStyle =
    Platform.OS === "web"
      ? { width: "100%", height: fill ? window.height * FILL_FRACTION : undefined }
      : { width: window.width, height: fill ? window.height * FILL_FRACTION : undefined }

  return (
    <BottomSheet
      isPresented={open}
      onDismiss={() => onOpenChange(false)}
      snapPoints={snapPoints}
      containerColor={theme.colors.cardBackground}
      contentPadding={{ top: Platform.OS === "ios" ? theme.spacing.md : 0 }}
    >
      <View style={$frame}>
        <ClosedSignal onUnmount={fireClosed} />
        {title ? <Text preset="cityTitle" text={title} style={themed($title)} /> : null}
        {children}
      </View>
    </BottomSheet>
  )
}

/** Renders nothing; reports when the sheet's content is torn down. */
function ClosedSignal({ onUnmount }: { onUnmount: () => void }) {
  const onUnmountRef = useRef(onUnmount)
  useEffect(() => {
    onUnmountRef.current = onUnmount
  }, [onUnmount])
  useEffect(() => () => onUnmountRef.current(), [])
  return null
}

const $title: ThemedStyle<TextStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingBottom: theme.spacing.xs,
})
