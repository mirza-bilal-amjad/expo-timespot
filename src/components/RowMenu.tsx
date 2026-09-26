import { View, ViewStyle } from "react-native"
import { MenuView } from "@expo/ui/community/menu"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "./Icon"

/**
 * The "⋯" city-row menu (docs/04-screen-specs.md S1, "Row menu"). The only
 * file that imports @expo/ui's `MenuView` (docs/14-ignite-integration.md §6):
 * a SwiftUI `Menu` on iOS, a Material `DropdownMenu` on Android — the real
 * platform menu, anchored to our own brand "⋯" glyph.
 *
 * The glyph is a plain view, not a button: MenuView wraps the trigger in its
 * own pressable (Android) or makes it the SwiftUI Menu's label (iOS), and a
 * pressable of ours inside would swallow the tap. Screen readers reach every
 * item through <CityRow>'s own accessibilityActions instead — the row is a
 * single accessible node, so nothing inside it is separately focusable.
 *
 * Web has its own implementation (RowMenu.web.tsx): MenuView renders the
 * trigger there but never fires its actions.
 */
export interface RowMenuItem {
  id: string
  title: string
  destructive?: boolean
  disabled?: boolean
}

export interface RowMenuProps {
  items: RowMenuItem[]
  onSelect: (id: string) => void
  accessibilityLabel: string
  color: string
}

export function RowMenu({ items, onSelect, color }: RowMenuProps) {
  const { themed, themeContext } = useAppTheme()

  return (
    <MenuView
      colorScheme={themeContext}
      actions={items.map((item) => ({
        id: item.id,
        title: item.title,
        attributes: { destructive: item.destructive, disabled: item.disabled },
      }))}
      onPressAction={({ nativeEvent }) => onSelect(nativeEvent.event)}
    >
      <View style={themed($trigger)}>
        <Icon icon="ellipsis" size="md" color={color} />
      </View>
    </MenuView>
  )
}

// A full touch target around a 20 pt glyph. MenuView owns the pressable, so
// `hitSlop` isn't available; the negative margins keep the target from
// growing the row's own line height ((44 − 20) / 2 = spacing.sm).
const $trigger: ThemedStyle<ViewStyle> = (theme) => ({
  width: theme.spacing.hitTarget,
  height: theme.spacing.hitTarget,
  marginVertical: -theme.spacing.sm,
  alignItems: "center",
  justifyContent: "center",
})
