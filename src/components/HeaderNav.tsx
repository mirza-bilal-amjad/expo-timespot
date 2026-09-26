import { TextStyle, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useBreakpoint } from "@/hooks/useBreakpoint"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon, PressableIcon } from "./Icon"
import { Pressable } from "./Pressable"
import type { TabBarItem } from "./TabBar"
import { Text } from "./Text"

/**
 * docs/07-responsive-strategy.md §2: at `lg` and wider the floating tab bar
 * gives way to a header nav — "the only structural change", made once in
 * the tabs layout by swapping the `tabBar` renderer; the screens don't know
 * which is mounted. Same items, same `tablist`/`tab` semantics as <TabBar>.
 *
 * Left: the app mark (opens Settings, as it does on the phone clock screen)
 * and the name. Right: the three destinations as pills, the active one
 * inverted like the tab bar's. Laid out inside the 1312 container.
 */
export interface HeaderNavProps {
  items: TabBarItem[]
  activeKey: string
  onSelect: (key: string) => void
  onOpenSettings: () => void
}

export function HeaderNav({ items, activeKey, onSelect, onOpenSettings }: HeaderNavProps) {
  const { theme, themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { gutter } = useBreakpoint()

  return (
    <View style={[themed($bar), { paddingTop: insets.top + theme.spacing.sm }]}>
      <View style={[themed($inner), { paddingHorizontal: gutter }]}>
        <View style={themed($brand)}>
          <PressableIcon
            icon="clock"
            size="md"
            color={theme.colors.textOnInverse}
            accessibilityLabel={translate("clock:openSettings")}
            containerStyle={themed($mark)}
            onPress={onOpenSettings}
          />
          <Text preset="cityTitle" tx="common:appName" />
        </View>
        <View style={themed($nav)} accessibilityRole="tablist">
          {items.map((item) => {
            const active = item.key === activeKey
            const color = active ? theme.colors.textOnInverse : theme.colors.text
            return (
              <Pressable
                key={item.key}
                onPress={() => onSelect(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.accessibilityLabel}
                style={themed([$item, active && $itemActive])}
              >
                <Icon icon={item.icon} size="sm" color={color} />
                <Text preset="default" text={item.label} style={active && themed($labelActive)} />
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const $bar: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.background,
  paddingBottom: theme.spacing.sm,
})

const $inner: ThemedStyle<ViewStyle> = (theme) => ({
  width: "100%",
  maxWidth: theme.spacing.container + 2 * theme.spacing.gutterWide,
  alignSelf: "center",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
})

const $brand: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.sm,
})

const $mark: ThemedStyle<ViewStyle> = (theme) => ({
  width: theme.spacing.avatar,
  height: theme.spacing.avatar,
  borderRadius: theme.radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.inverseBackground,
})

const $nav: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  gap: theme.spacing.xxs,
  padding: theme.spacing.xxs,
  borderRadius: theme.radius.pill,
  backgroundColor: theme.colors.controlBackground,
})

const $item: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.xs,
  minHeight: theme.spacing.hitTarget,
  paddingHorizontal: theme.spacing.md,
  borderRadius: theme.radius.pill,
})

const $labelActive: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textOnInverse })

const $itemActive: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.inverseBackground,
})
