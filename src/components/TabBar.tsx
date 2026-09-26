import { Platform, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useAppTheme } from "@/theme/context"
import { boxShadow } from "@/theme/shadow"
import type { ThemedStyle } from "@/theme/types"

import { Icon, IconTypes } from "./Icon"
import { Pressable } from "./Pressable"

/**
 * docs/03-component-library.md "<TabBar>", docs/01-design-audit.md §7 "3
 * circular buttons, one black" — brand-critical shape language, so it's
 * hand-built rather than wrapping @expo/ui (CLAUDE.md's boundary rule).
 *
 * The audit names the three icons literally as "search · clock · globe" —
 * matched here verbatim even though the first tab routes to "/" (S1 List,
 * per docs/04-screen-specs.md's route map), not to a search screen. There's
 * no separate persistent "list" route in the doc's own route map and no
 * dedicated list/home glyph in the icon set; the add-city *search sheet* is
 * reached from S1's own `+` button, not this tab. Read as: three tabs, one
 * per (tabs)-group route, using the icon the audit specifies for each slot.
 */
export interface TabBarItem {
  key: string
  icon: IconTypes
  label: string
  accessibilityLabel: string
}

export interface TabBarProps {
  items: TabBarItem[]
  activeKey: string
  onSelect: (key: string) => void
}

// Audit measured ~72pt, corrected to size.control.lg (54 -> normalised 56)
// — docs/01-design-audit.md §7. No shared token for this control size yet.
const BUTTON_SIZE = 56

/**
 * docs/04-screen-specs.md's cross-screen rule 2: "The tab bar floats over
 * content, so every scroll container carries `contentInset.bottom =
 * tabBarHeight + space.4`." Anything else that floats near the bottom of a
 * tabbed screen (a <Toast>, a floating action button) needs the same
 * clearance so it doesn't render underneath the bar — the single source of
 * truth for that number lives here, next to the bar's own layout constants,
 * rather than duplicated per caller.
 */
export function useTabBarClearance(): number {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const barHeight = BUTTON_SIZE + theme.spacing.xxs * 2
  return insets.bottom + theme.spacing.md + barHeight
}

export function TabBar(props: TabBarProps) {
  const { items, activeKey, onSelect } = props
  const { theme, themed } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[themed($bar), { bottom: insets.bottom + theme.spacing.md }]}
      accessibilityRole="tablist"
    >
      {items.map((item) => {
        const active = item.key === activeKey
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.accessibilityLabel}
            style={themed([$button, active && $buttonActive])}
          >
            <Icon
              icon={item.icon}
              size="md"
              color={active ? theme.colors.textOnInverse : theme.colors.text}
            />
          </Pressable>
        )
      })}
    </View>
  )
}

const FLOAT_SHADOW_OPACITY = 0.12
const FLOAT_SHADOW_RADIUS = 24
const FLOAT_SHADOW_OFFSET_Y = 8

const $bar: ThemedStyle<ViewStyle> = (theme) => ({
  position: "absolute",
  alignSelf: "center",
  flexDirection: "row",
  gap: theme.spacing.sm,
  backgroundColor: theme.colors.controlBackground,
  borderRadius: theme.radius.pill,
  padding: theme.spacing.xxs,
  boxShadow: boxShadow(
    theme.colors.text,
    FLOAT_SHADOW_OPACITY,
    FLOAT_SHADOW_OFFSET_Y,
    FLOAT_SHADOW_RADIUS,
  ),
  ...(Platform.OS === "web" ? { position: "fixed" as ViewStyle["position"] } : null),
})

const $button: ThemedStyle<ViewStyle> = (theme) => ({
  width: BUTTON_SIZE,
  height: BUTTON_SIZE,
  borderRadius: theme.radius.pill,
  alignItems: "center",
  justifyContent: "center",
})

const $buttonActive: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.inverseBackground,
})
