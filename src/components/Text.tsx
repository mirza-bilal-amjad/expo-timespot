import { ReactNode, forwardRef, ForwardedRef } from "react"
// eslint-disable-next-line no-restricted-imports
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native"
import { TOptions } from "i18next"

import { isRTL, TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle, ThemedStyleArray } from "@/theme/types"
import { typography } from "@/theme/typography"

type Sizes = keyof typeof $sizeStyles
type Weights = keyof typeof typography.primary
type Presets =
  | "default"
  | "bold"
  | "heading"
  | "subheading"
  | "formLabel"
  | "formHelper"
  | "screenTitle"
  | "cityName"
  | "cityTitle"
  | "offset"
  | "caption"

/** Presets built on TimeSpot's display scale — font scaling is capped so a
 * hero numeral can't grow past the point it blows the layout (docs/02-design-system.md). */
const $bigPresets = new Set<Presets>(["cityName"])
const $bigSizes = new Set<Sizes>(["display", "displayXl", "hero"])

export interface TextProps extends RNTextProps {
  /**
   * Text which is looked up via i18n.
   */
  tx?: TxKeyPath
  /**
   * The text to display if not using `tx` or nested components.
   */
  text?: string
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TOptions
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<TextStyle>
  /**
   * One of the different types of text presets.
   */
  preset?: Presets
  /**
   * Text weight modifier.
   */
  weight?: Weights
  /**
   * Text size modifier.
   */
  size?: Sizes
  /**
   * Children components.
   */
  children?: ReactNode
}

/**
 * For your text displaying needs.
 * This component is a HOC over the built-in React Native one.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Text/}
 * @param {TextProps} props - The props for the `Text` component.
 * @returns {JSX.Element} The rendered `Text` component.
 */
export const Text = forwardRef(function Text(props: TextProps, ref: ForwardedRef<RNText>) {
  const { weight, size, tx, txOptions, text, children, style: $styleOverride, ...rest } = props
  const { themed } = useAppTheme()

  const i18nText = tx && translate(tx, txOptions)
  const content = i18nText || text || children

  const preset: Presets = props.preset ?? "default"
  const $styles: StyleProp<TextStyle> = [
    $rtlStyle,
    themed($presets[preset]),
    weight && $fontWeightStyles[weight],
    size && $sizeStyles[size],
    $styleOverride,
  ]

  const isBig = $bigPresets.has(preset) || (!!size && $bigSizes.has(size))

  return (
    <RNText maxFontSizeMultiplier={isBig ? 1.3 : undefined} {...rest} style={$styles} ref={ref}>
      {content}
    </RNText>
  )
})

const $sizeStyles = {
  // Ignite's original scale
  xxl: { fontSize: 36, lineHeight: 44 } satisfies TextStyle,
  xl: { fontSize: 24, lineHeight: 34 } satisfies TextStyle,
  lg: { fontSize: 20, lineHeight: 32 } satisfies TextStyle,
  md: { fontSize: 18, lineHeight: 26 } satisfies TextStyle,
  sm: { fontSize: 16, lineHeight: 24 } satisfies TextStyle,
  xs: { fontSize: 14, lineHeight: 21 } satisfies TextStyle,
  xxs: { fontSize: 12, lineHeight: 18 } satisfies TextStyle,
  // TimeSpot's display scale (docs/02-design-system.md §2.2)
  display: { fontSize: 56, lineHeight: 57, letterSpacing: -1.4 } satisfies TextStyle,
  displayXl: { fontSize: 72, lineHeight: 66, letterSpacing: -2.2 } satisfies TextStyle,
  hero: { fontSize: 144, lineHeight: 124, letterSpacing: -5 } satisfies TextStyle,
  numeralMd: { fontSize: 32, lineHeight: 32, letterSpacing: -0.5 } satisfies TextStyle,
  numeralLg: { fontSize: 48, lineHeight: 48, letterSpacing: -1 } satisfies TextStyle,
}

const $fontWeightStyles = Object.entries(typography.primary).reduce((acc, [weight, fontFamily]) => {
  return { ...acc, [weight]: { fontFamily } }
}, {}) as Record<Weights, TextStyle>

const $baseStyle: ThemedStyle<TextStyle> = (theme) => ({
  ...$sizeStyles.sm,
  ...$fontWeightStyles.normal,
  color: theme.colors.text,
  // Android sits every display-size block ~8% low without this.
  includeFontPadding: false,
})

const $presets: Record<Presets, ThemedStyleArray<TextStyle>> = {
  default: [$baseStyle],
  bold: [$baseStyle, { ...$fontWeightStyles.bold }],
  heading: [
    $baseStyle,
    {
      ...$sizeStyles.xxl,
      ...$fontWeightStyles.bold,
    },
  ],
  subheading: [$baseStyle, { ...$sizeStyles.lg, ...$fontWeightStyles.medium }],
  formLabel: [$baseStyle, { ...$fontWeightStyles.medium }],
  formHelper: [$baseStyle, { ...$sizeStyles.sm, ...$fontWeightStyles.normal }],
  // TimeSpot's presets
  screenTitle: [
    $baseStyle,
    { ...$sizeStyles.xxl, ...$fontWeightStyles.normal, letterSpacing: -0.7 },
  ],
  cityName: [$baseStyle, { ...$sizeStyles.display, ...$fontWeightStyles.normal }],
  cityTitle: [$baseStyle, { ...$sizeStyles.lg, ...$fontWeightStyles.normal }],
  offset: [$baseStyle, (theme) => ({ ...$sizeStyles.xs, color: theme.colors.textDim })],
  caption: [$baseStyle, (theme) => ({ ...$sizeStyles.xxs, color: theme.colors.textDim })],
}
const $rtlStyle: TextStyle = isRTL ? { writingDirection: "rtl" } : {}
