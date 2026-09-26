import { useRef, useState } from "react"
import { Modal, StyleSheet, TextStyle, useWindowDimensions, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Card } from "./Card"
import { Icon } from "./Icon"
import { Pressable } from "./Pressable"
import type { RowMenuProps } from "./RowMenu"
import { Text } from "./Text"

/**
 * Web implementation of <RowMenu> (see RowMenu.tsx for the native one and
 * the shared contract). @expo/ui's MenuView renders only its trigger on web
 * and never fires actions, so this is a small themed popover instead: a
 * transparent Modal (so no row's overflow or stacking can clip it), a
 * floating <Card> anchored under the "⋯" — or above it, near the bottom of
 * the window — and ARIA `menu` / `menuitem` roles. Escape closes it.
 */
export type { RowMenuItem, RowMenuProps } from "./RowMenu"

interface Anchor {
  x: number
  y: number
  width: number
  height: number
}

export function RowMenu({ items, onSelect, accessibilityLabel, color }: RowMenuProps) {
  const { theme, themed } = useAppTheme()
  const window = useWindowDimensions()
  const triggerRef = useRef<View>(null)
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  const open = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }))
  }
  const close = () => setAnchor(null)

  const menuHeight = items.length * theme.spacing.hitTarget + theme.spacing.xs * 2
  const opensUpward = anchor ? anchor.y + anchor.height + menuHeight > window.height : false
  const $position: ViewStyle | undefined = anchor
    ? {
        right: Math.max(window.width - (anchor.x + anchor.width), theme.spacing.xs),
        ...(opensUpward ? { bottom: window.height - anchor.y } : { top: anchor.y + anchor.height }),
      }
    : undefined

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        style={themed($trigger)}
      >
        <Icon icon="ellipsis" size="md" color={color} />
      </Pressable>

      <Modal visible={!!anchor} transparent animationType="none" onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <View style={[$menuLayer, $position]} role="menu" aria-label={accessibilityLabel}>
          <Card elevation="float" interactive={false} style={themed($menu)}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                aria-disabled={item.disabled}
                onPress={() => {
                  close()
                  onSelect(item.id)
                }}
                style={themed($item)}
              >
                <Text
                  text={item.title}
                  style={[
                    item.destructive && themed($destructive),
                    item.disabled && themed($disabled),
                  ]}
                />
              </Pressable>
            ))}
          </Card>
        </View>
      </Modal>
    </>
  )
}

const $trigger: ThemedStyle<ViewStyle> = (theme) => ({
  width: theme.spacing.hitTarget,
  height: theme.spacing.hitTarget,
  marginVertical: -theme.spacing.sm,
  alignItems: "center",
  justifyContent: "center",
})

const $menuLayer: ViewStyle = { position: "absolute" }

// Wide enough that "Move down" and translations like "Descendre" never wrap;
// no spacing token is a menu width.
const MENU_MIN_WIDTH = 180

const $menu: ThemedStyle<ViewStyle> = (theme) => ({
  paddingVertical: theme.spacing.xs,
  minWidth: MENU_MIN_WIDTH,
  backgroundColor: theme.colors.background,
})

const $item: ThemedStyle<ViewStyle> = (theme) => ({
  height: theme.spacing.hitTarget,
  justifyContent: "center",
  paddingHorizontal: theme.spacing.md,
})

const $destructive: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.error })

const $disabled: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textFaint })
