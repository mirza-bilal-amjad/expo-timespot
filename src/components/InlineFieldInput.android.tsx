import { useRef } from "react"
import { ViewStyle } from "react-native"
import {
  BasicTextField,
  type BasicTextFieldRef,
  Box,
  Host,
  Text,
  useNativeState,
} from "@expo/ui/jetpack-compose"
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers"

import { useAppTheme } from "@/theme/context"

import { FIELD_FONT_SIZE, type InlineFieldInputProps } from "./InlineFieldInput"

/**
 * Android's <InlineField> input, on Compose's `BasicTextField` directly.
 *
 * @expo/ui's universal TextInput builds the same field, but its decoration
 * box has no content alignment — Compose's default is top-start — and it
 * passes the placeholder only a colour. Inside our 44 pt row the text and
 * "Search cities" therefore hugged the field's top edge, visibly above the
 * search icon, with the placeholder smaller than typed text (reported
 * 2026-09-26). Here both are centred vertically and share one text style.
 *
 * The system font is kept on purpose: an unresolvable font family name is a
 * native crash risk, and this row's job is alignment.
 */
export function InlineFieldInput(props: InlineFieldInputProps) {
  const { theme } = useAppTheme()
  const text = useNativeState(props.value)
  const fieldRef = useRef<BasicTextFieldRef>(null)

  const handleFocusChanged = (focused: boolean) => {
    if (focused && props.selectTextOnFocus) {
      fieldRef.current?.setSelection(0, text.value.length)
    }
  }

  const submit = props.onSubmitEditing
  return (
    <Host style={$host} matchContents={{ vertical: true }}>
      <BasicTextField
        ref={fieldRef}
        value={text}
        onValueChange={props.onChangeText}
        onFocusChanged={handleFocusChanged}
        autoFocus={props.autoFocus}
        singleLine
        cursorColor={theme.colors.text}
        textStyle={{ fontSize: FIELD_FONT_SIZE, color: theme.colors.text }}
        keyboardOptions={{ imeAction: props.returnKeyType }}
        keyboardActions={submit ? { onSearch: submit, onDone: submit } : undefined}
        modifiers={[fillMaxWidth()]}
      >
        <BasicTextField.DecorationBox>
          <Box modifiers={[fillMaxWidth()]} contentAlignment="centerStart">
            {props.placeholder != null && (
              <BasicTextField.Placeholder>
                <Text color={theme.colors.textDim} style={{ fontSize: FIELD_FONT_SIZE }}>
                  {props.placeholder}
                </Text>
              </BasicTextField.Placeholder>
            )}
            <BasicTextField.InnerTextField />
          </Box>
        </BasicTextField.DecorationBox>
      </BasicTextField>
    </Host>
  )
}

const $host: ViewStyle = { flex: 1 }
