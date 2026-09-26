import { StyleSheet, ViewStyle } from "react-native"

/**
 * `pointerEvents` as a style (the prop form is deprecated). `"box-none"`
 * isn't a CSS value: react-native-web emulates it with a child-selector
 * rule, but only for styles compiled through `StyleSheet.create` — an inline
 * object silently falls back to `auto` and swallows every click beneath it.
 * So pass-through layers use this, never an inline `{ pointerEvents: "box-none" }`.
 */
const pointerEventStyles = StyleSheet.create({
  passThrough: { pointerEvents: "box-none" },
})

/* Use this file to define styles that are used in multiple places in your app. */
export const $styles = {
  row: { flexDirection: "row" } as ViewStyle,
  flex1: { flex: 1 } as ViewStyle,
  flexWrap: { flexWrap: "wrap" } as ViewStyle,
  /** A layer that never takes a touch itself (it falls through to what's beneath), while its children still can. */
  passThrough: pointerEventStyles.passThrough,

  toggleInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  } as ViewStyle,
}
