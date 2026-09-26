/**
 * react-native-keyboard-controller is native-only. Everything imports it
 * through here so the web build gets `keyboardController.web.ts` instead
 * and never bundles the library (~95 KB, task 6.1).
 */
export {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
  KeyboardProvider,
} from "react-native-keyboard-controller"
