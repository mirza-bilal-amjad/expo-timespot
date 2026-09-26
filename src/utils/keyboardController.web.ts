import type { PropsWithChildren } from "react"
import { ScrollView } from "react-native"

/** Web: no keyboard controller (see keyboardController.ts). The provider is
 * a pass-through; `Screen` already renders a plain ScrollView on web. */
export const KeyboardProvider = ({ children }: PropsWithChildren) => children
export const KeyboardAwareScrollView = ScrollView
export type KeyboardAwareScrollViewRef = ScrollView
