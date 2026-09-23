import { ComponentType } from "react"
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native"

import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle, ThemedStyleArray } from "@/theme/types"

import { Text, TextProps } from "./Text"

type Presets = "default" | "filled" | "reversed" | "pill"

/** docs/03-component-library.md — Button sizes. Only the `pill` preset uses
 * this; Ignite's original presets keep their own fixed height, untouched. */
export type ButtonSize = "sm" | "md" | "lg"
const $pillHeights: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 }

export interface ButtonAccessoryProps {
  style: StyleProp<any>
  pressableState: PressableStateCallbackType
  disabled?: boolean
}

export interface ButtonProps extends PressableProps {
  /**
   * Text which is looked up via i18n.
   */
  tx?: TextProps["tx"]
  /**
   * The text to display if not using `tx` or nested components.
   */
  text?: TextProps["text"]
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TextProps["txOptions"]
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
  /**
   * An optional style override for the "pressed" state.
   */
  pressedStyle?: StyleProp<ViewStyle>
  /**
   * An optional style override for the button text.
   */
  textStyle?: StyleProp<TextStyle>
  /**
   * An optional style override for the button text when in the "pressed" state.
   */
  pressedTextStyle?: StyleProp<TextStyle>
  /**
   * An optional style override for the button text when in the "disabled" state.
   */
  disabledTextStyle?: StyleProp<TextStyle>
  /**
   * One of the different types of button presets.
   */
  preset?: Presets
  /**
   * An optional component to render on the right side of the text.
   * Example: `RightAccessory={(props) => <View {...props} />}`
   */
  RightAccessory?: ComponentType<ButtonAccessoryProps>
  /**
   * An optional component to render on the left side of the text.
   * Example: `LeftAccessory={(props) => <View {...props} />}`
   */
  LeftAccessory?: ComponentType<ButtonAccessoryProps>
  /**
   * Children components.
   */
  children?: React.ReactNode
  /**
   * disabled prop, accessed directly for declarative styling reasons.
   * https://reactnative.dev/docs/pressable#disabled
   */
  disabled?: boolean
  /**
   * An optional style override for the disabled state
   */
  disabledStyle?: StyleProp<ViewStyle>
  /**
   * Height for the `pill` preset only — sm 36 / md 44 / lg 52. Ignored by
   * every other preset, which keeps Ignite's original fixed height.
   */
  size?: ButtonSize
  /**
   * Replaces the label with an inline spinner, same width, so the button
   * doesn't jump between idle and loading.
   */
  loading?: boolean
}

/**
 * A component that allows users to take actions and make choices.
 * Wraps the Text component with a Pressable component.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Button/}
 * @param {ButtonProps} props - The props for the `Button` component.
 * @returns {JSX.Element} The rendered `Button` component.
 * @example
 * <Button
 *   tx="common:ok"
 *   style={styles.button}
 *   textStyle={styles.buttonText}
 *   onPress={handleButtonPress}
 * />
 */
export function Button(props: ButtonProps) {
  const {
    tx,
    text,
    txOptions,
    style: $viewStyleOverride,
    pressedStyle: $pressedViewStyleOverride,
    textStyle: $textStyleOverride,
    pressedTextStyle: $pressedTextStyleOverride,
    disabledTextStyle: $disabledTextStyleOverride,
    children,
    RightAccessory,
    LeftAccessory,
    disabled,
    disabledStyle: $disabledViewStyleOverride,
    size = "md",
    loading = false,
    ...rest
  } = props

  const { theme, themed } = useAppTheme()

  const preset: Presets = props.preset ?? "default"
  /**
   * @param {PressableStateCallbackType} root0 - The root object containing the pressed state.
   * @param {boolean} root0.pressed - The pressed state.
   * @returns {StyleProp<ViewStyle>} The view style based on the pressed state.
   */
  function $viewStyle({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> {
    return [
      themed($viewPresets[preset]),
      preset === "pill" && {
        height: $pillHeights[size],
        borderRadius: theme.radius.pill,
      },
      $viewStyleOverride,
      !!pressed && themed([$pressedViewPresets[preset], $pressedViewStyleOverride]),
      !!disabled && $disabledViewStyleOverride,
    ]
  }
  /**
   * @param {PressableStateCallbackType} root0 - The root object containing the pressed state.
   * @param {boolean} root0.pressed - The pressed state.
   * @returns {StyleProp<TextStyle>} The text style based on the pressed state.
   */
  function $textStyle({ pressed }: PressableStateCallbackType): StyleProp<TextStyle> {
    return [
      themed($textPresets[preset]),
      $textStyleOverride,
      !!pressed && themed([$pressedTextPresets[preset], $pressedTextStyleOverride]),
      !!disabled && $disabledTextStyleOverride,
    ]
  }

  return (
    <Pressable
      style={$viewStyle}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: loading }}
      {...rest}
      disabled={disabled || loading}
    >
      {(state) => (
        <>
          {!!LeftAccessory && (
            <LeftAccessory style={$leftAccessoryStyle} pressableState={state} disabled={disabled} />
          )}

          {loading && (
            <ActivityIndicator
              style={$loadingIndicator}
              color={(themed($textPresets[preset]).color as string) ?? theme.colors.text}
            />
          )}

          <Text
            tx={tx}
            text={text}
            txOptions={txOptions}
            style={[$textStyle(state), loading && $loadingHiddenText]}
          >
            {children}
          </Text>

          {!!RightAccessory && (
            <RightAccessory
              style={$rightAccessoryStyle}
              pressableState={state}
              disabled={disabled}
            />
          )}
        </>
      )}
    </Pressable>
  )
}

const $baseViewStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 56,
  borderRadius: 4,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.sm,
  overflow: "hidden",
})

const $baseTextStyle: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontSize: 16,
  lineHeight: 20,
  fontFamily: typography.primary.medium,
  textAlign: "center",
  flexShrink: 1,
  flexGrow: 0,
  zIndex: 2,
})

const $rightAccessoryStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginStart: spacing.xs,
  zIndex: 1,
})
const $leftAccessoryStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginEnd: spacing.xs,
  zIndex: 1,
})

const $viewPresets: Record<Presets, ThemedStyleArray<ViewStyle>> = {
  default: [
    $styles.row,
    $baseViewStyle,
    ({ colors }) => ({
      borderWidth: 1,
      borderColor: colors.palette.neutral400,
      backgroundColor: colors.palette.neutral100,
    }),
  ],
  filled: [
    $styles.row,
    $baseViewStyle,
    ({ colors }) => ({ backgroundColor: colors.palette.neutral300 }),
  ],
  reversed: [
    $styles.row,
    $baseViewStyle,
    ({ colors }) => ({ backgroundColor: colors.palette.neutral800 }),
  ],
  // docs/03-component-library.md's "primary" variant — bg.inverse, always
  // radius.pill. Height comes from the `size` prop at render time, not here.
  pill: [
    $styles.row,
    ({ spacing, colors, radius }) => ({
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.inverseBackground,
      overflow: "hidden",
    }),
  ],
}

const $textPresets: Record<Presets, ThemedStyleArray<TextStyle>> = {
  default: [$baseTextStyle],
  filled: [$baseTextStyle],
  reversed: [$baseTextStyle, ({ colors }) => ({ color: colors.palette.neutral100 })],
  pill: [$baseTextStyle, ({ colors }) => ({ color: colors.textOnInverse })],
}

const $pressedViewPresets: Record<Presets, ThemedStyle<ViewStyle>> = {
  default: ({ colors }) => ({ backgroundColor: colors.palette.neutral200 }),
  filled: ({ colors }) => ({ backgroundColor: colors.palette.neutral400 }),
  reversed: ({ colors }) => ({ backgroundColor: colors.palette.neutral700 }),
  pill: () => ({ transform: [{ scale: 0.97 }] }),
}

const $pressedTextPresets: Record<Presets, ThemedStyle<TextStyle>> = {
  default: () => ({ opacity: 0.9 }),
  filled: () => ({ opacity: 0.9 }),
  reversed: () => ({ opacity: 0.9 }),
  pill: () => ({ opacity: 0.9 }),
}

const $loadingHiddenText: TextStyle = { opacity: 0 }
const $loadingIndicator: ViewStyle = { position: "absolute" }
