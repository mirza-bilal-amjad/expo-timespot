// we always make sure 'react-native' gets included first
// eslint-disable-next-line no-restricted-imports
import * as ReactNative from "react-native"

import mockFile from "./mockFile"

// libraries to mock
jest.doMock("react-native", () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

// react-native-reanimated v4's own mock.js pulls in react-native-worklets'
// real native initializer (it needs the new-architecture turbo module, which
// doesn't exist under jest/jsdom) and throws before a single test runs. None
// of TimeSpot's components run a worklet in a test — <Pressable>'s spring
// press feedback is purely visual — so a minimal stand-in of the handful of
// APIs actually used (Animated.createAnimatedComponent, useSharedValue,
// useAnimatedStyle, withSpring) is enough, and sidesteps the native module
// entirely rather than trying to shim it.
jest.mock("react-native-reanimated", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: unknown) => Component,
      View: require("react-native").View,
    },
    useSharedValue: (initial: unknown) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withSpring: (toValue: unknown) => toValue,
    withTiming: (toValue: unknown) => toValue,
  }
})

jest.mock("i18next", () => ({
  currentLocale: "en",
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

jest.mock("expo-localization", () => ({
  ...jest.requireActual("expo-localization"),
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("../src/i18n/index.ts", () => ({
  i18n: {
    isInitialized: true,
    language: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}
