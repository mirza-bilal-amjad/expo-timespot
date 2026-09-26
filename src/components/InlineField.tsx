import { View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon, IconTypes, PressableIcon } from "./Icon"
import { InlineFieldInput } from "./InlineFieldInput"

/**
 * A one-line native text field with a leading icon and a trailing close
 * button — docs/04-screen-specs.md S4's search field ("`headline` 24,
 * `search` icon leading, `close` trailing, autofocus") and the rename
 * sheet's name field. The row is laid out here, at a full touch-target
 * height with everything centred; the field itself is <InlineFieldInput>,
 * the @expo/ui adapter (one per platform family).
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
      <InlineFieldInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        selectTextOnFocus={selectTextOnFocus}
      />
      <PressableIcon
        icon="close"
        size="md"
        accessibilityLabel={closeAccessibilityLabel}
        onPress={onClose}
      />
    </View>
  )
}

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  minHeight: theme.spacing.hitTarget,
  gap: theme.spacing.sm,
  paddingHorizontal: theme.spacing.gutter,
  paddingBottom: theme.spacing.sm,
})
