import { View, ViewStyle } from "react-native"
import { Host, TextInput } from "@expo/ui"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon, IconTypes, PressableIcon } from "./Icon"

/**
 * A one-line `@expo/ui` `TextInput` with a leading icon and a trailing close
 * button — docs/04-screen-specs.md S4's search field ("`headline` 24,
 * `search` icon leading, `close` trailing, autofocus") and the rename
 * sheet's name field. The only file that imports @expo/ui's `TextInput`
 * (docs/14-ignite-integration.md §6); feature code never touches @expo/ui
 * directly. One `<Host>`, mounted here.
 */
export interface InlineFieldProps {
  value: string
  onChangeText: (text: string) => void
  onClose: () => void
  placeholder?: string
  autoFocus?: boolean
  closeAccessibilityLabel: string
  /** Leading glyph; `null` for none. */
  icon?: IconTypes | null
  returnKeyType?: "search" | "done"
  onSubmitEditing?: (text: string) => void
  selectTextOnFocus?: boolean
}

export function InlineField(props: InlineFieldProps) {
  const {
    value,
    onChangeText,
    onClose,
    placeholder,
    autoFocus = true,
    closeAccessibilityLabel,
    icon = "search",
    returnKeyType = "search",
    onSubmitEditing,
    selectTextOnFocus,
  } = props
  const { theme, themed } = useAppTheme()

  return (
    <View style={themed($row)}>
      {icon && <Icon icon={icon} size="md" color={theme.colors.textDim} />}
      <Host style={$host} matchContents>
        <TextInput
          defaultValue={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          selectTextOnFocus={selectTextOnFocus}
          textStyle={themed($textStyle)}
          style={$fieldStyle}
        />
      </Host>
      <PressableIcon
        icon="close"
        size="md"
        accessibilityLabel={closeAccessibilityLabel}
        onPress={onClose}
      />
    </View>
  )
}

const $host: ViewStyle = { flex: 1 }
// docs/02-design-system.md's `headline` size (24pt) — @expo/ui's TextInput
// is a separate render tree from Ignite's <Text>, so it can't read
// $sizeStyles; matched to the same token value by hand.
const HEADLINE_FONT_SIZE = 24
const FIELD_HEIGHT = 44
const $fieldStyle: ViewStyle = { height: FIELD_HEIGHT }

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.sm,
  paddingHorizontal: theme.spacing.gutter,
  paddingBottom: theme.spacing.sm,
})

const $textStyle: ThemedStyle<{ fontSize: number; color: string }> = (theme) => ({
  fontSize: HEADLINE_FONT_SIZE,
  color: theme.colors.text,
})
