import { ViewStyle } from "react-native"
import { Host, TextInput } from "@expo/ui"

import { useAppTheme } from "@/theme/context"

/**
 * The text input inside <InlineField> — the only file that imports
 * @expo/ui's universal `TextInput` (docs/14-ignite-integration.md §6). iOS
 * and web; Android has its own InlineFieldInput.android.tsx, because the
 * universal Android field pins its placeholder top-start and unstyled.
 */
export interface InlineFieldInputProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  autoFocus: boolean
  returnKeyType: "search" | "done"
  onSubmitEditing?: (text: string) => void
  selectTextOnFocus?: boolean
}

// docs/02-design-system.md's `headline` size (24pt) — @expo/ui's input is a
// separate render tree from Ignite's <Text>, so it can't read $sizeStyles;
// matched to the same token value by hand.
export const FIELD_FONT_SIZE = 24

export function InlineFieldInput(props: InlineFieldInputProps) {
  const { theme } = useAppTheme()
  return (
    <Host style={$host} matchContents>
      <TextInput
        defaultValue={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={theme.colors.textDim}
        autoFocus={props.autoFocus}
        returnKeyType={props.returnKeyType}
        onSubmitEditing={props.onSubmitEditing}
        selectTextOnFocus={props.selectTextOnFocus}
        textStyle={{ fontSize: FIELD_FONT_SIZE, color: theme.colors.text }}
      />
    </Host>
  )
}

const $host: ViewStyle = { flex: 1 }
