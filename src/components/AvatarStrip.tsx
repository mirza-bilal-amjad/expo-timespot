import { memo, useEffect, useRef } from "react"
import { ScrollView, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Avatar } from "./Avatar"
import { Pressable } from "./Pressable"
import { Text } from "./Text"

/** docs/03-component-library.md. */
export interface AvatarStripItem {
  id: string
  label: string
  uri?: string
  blurhash?: string
}

export interface AvatarStripProps {
  items: AvatarStripItem[]
  focusedId?: string
  onSelect: (id: string) => void
  max?: number
  avatarSize?: number
  accessibilityLabel?: string
}

const DEFAULT_MAX = 6
const DEFAULT_AVATAR_SIZE = 44

export const AvatarStrip = memo(function AvatarStrip(props: AvatarStripProps) {
  const {
    items,
    focusedId,
    onSelect,
    max = DEFAULT_MAX,
    avatarSize = DEFAULT_AVATAR_SIZE,
    accessibilityLabel,
  } = props
  const { theme, themed } = useAppTheme()
  const scrollRef = useRef<ScrollView>(null)

  const visible = items.slice(0, max)
  const overflowCount = items.length - visible.length
  // -theme.spacing.xs is the documented -8 overlap.
  const step = avatarSize + theme.spacing.xs

  const focusedIndex = items.findIndex((i) => i.id === focusedId)
  useEffect(() => {
    if (focusedIndex < 0) return
    scrollRef.current?.scrollTo({ x: Math.max(0, focusedIndex * step - step), animated: true })
  }, [focusedIndex, step])

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={themed($content)}
    >
      {visible.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect(item.id)}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: item.id === focusedId }}
          style={index > 0 && themed($overlap)}
        >
          <Avatar
            uri={item.uri}
            blurhash={item.blurhash}
            label={item.label}
            focused={item.id === focusedId}
            size={avatarSize}
          />
        </Pressable>
      ))}
      {overflowCount > 0 && (
        <View style={[themed($overlap), themed($overflowTile($avatarDimensions(avatarSize)))]}>
          <Text text={`+${overflowCount}`} style={themed($overflowText)} />
        </View>
      )}
    </ScrollView>
  )
})

function $avatarDimensions(size: number) {
  return { width: size, height: size, borderRadius: size * 0.32 }
}

const $content: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: theme.spacing.md,
})

const $overlap: ThemedStyle<ViewStyle> = (theme) => ({ marginLeft: -theme.spacing.xs })

const $overflowTile =
  (dimensions: ViewStyle): ThemedStyle<ViewStyle> =>
  (theme) => ({
    ...dimensions,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.controlBackground,
    borderWidth: 1,
    borderColor: theme.colors.background,
  })

const $overflowText: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textDim })
