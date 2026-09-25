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
      Text: require("react-native").Text,
      ScrollView: require("react-native").ScrollView,
    },
    useSharedValue: (initial: unknown) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedRef: () => React.useRef(null),
    useAnimatedReaction: () => {},
    // <MeridianMap>'s derived anchors and edge auto-scroll: a derived value
    // is just its factory's current result here, and a frame callback never
    // fires (there are no frames under jest).
    useDerivedValue: (factory: () => unknown) => ({ value: factory() }),
    useFrameCallback: () => ({ setActive: () => {}, isActive: false }),
    cancelAnimation: () => {},
    useAnimatedScrollHandler: (handlers: unknown) => handlers,
    scrollTo: () => {},
    useEvent: () => undefined,
    // The optional 3rd-arg completion callback is invoked synchronously
    // with `true` (finished) — Numeral's roll animation (task 5.1) relies
    // on it firing to settle the digit after the strip's translateY
    // animation; every earlier 2-arg call site is unaffected since there's
    // no callback to invoke.
    withSpring: (toValue: unknown, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true)
      return toValue
    },
    withTiming: (toValue: unknown, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true)
      return toValue
    },
    withDelay: (_delay: unknown, animation: unknown) => animation,
    useReducedMotion: () => false,
    // A real cubic-bezier curve isn't meaningful under this mock (withTiming
    // itself is stubbed to skip straight to the end value) — a stand-in
    // that satisfies the `Easing.bezier(...)` call shape EntranceView
    // (task 5.4) and SegmentedPill already both use is enough.
    Easing: {
      bezier: () => (t: number) => t,
    },
    Extrapolation: { IDENTITY: "identity", CLAMP: "clamp", EXTEND: "extend" },
    // Plain linear interpolation, clamped to the output range regardless of
    // the requested extrapolation mode — every call site in this codebase
    // asks for Extrapolation.CLAMP, so a fuller identity/extend
    // implementation isn't needed here.
    interpolate: (value: number, input: [number, number], output: [number, number]) => {
      const [x0, x1] = input
      const [y0, y1] = output
      if (x1 === x0) return y0
      const t = Math.min(Math.max((value - x0) / (x1 - x0), 0), 1)
      return y0 + t * (y1 - y0)
    },
    interpolateColor: (value: number, input: number[], output: string[]) => {
      let closest = 0
      let closestDistance = Infinity
      input.forEach((v, i) => {
        const distance = Math.abs(v - value)
        if (distance < closestDistance) {
          closestDistance = distance
          closest = i
        }
      })
      return output[closest]
    },
  }
})

// react-native-worklets' own native initializer has the same jest/jsdom
// problem as reanimated's mock.js above — scheduleOnRN is the only export
// TimeSpot actually calls (from gesture callbacks), so it's stubbed
// straight through to a plain function call.
jest.mock("react-native-worklets", () => ({
  __esModule: true,
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
}))

// react-native-keyboard-controller's native module isn't linked under jest
// (no real device/simulator) — its own bindings.native.ts throws just from
// being required. <Screen>'s native (non-web) branch is the only caller
// (src/components/Screen.tsx), and it only needs a scrollable container, so
// KeyboardAwareScrollView stands in as a plain ScrollView here.
jest.mock("react-native-keyboard-controller", () => {
  const { ScrollView } = require("react-native")
  return {
    __esModule: true,
    KeyboardAwareScrollView: ScrollView,
    KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

// Same "not linked under jest" problem as keyboard-controller above, one
// layer earlier: useSafeAreaInsets() throws without a real
// <SafeAreaProvider> ancestor measuring a native view. The library ships
// its own jest mock (fixed 0-inset metrics) for exactly this; every screen
// pulls in useSafeAreaInsets somewhere (directly or via <Screen>/<TabBar>),
// so it's registered globally rather than per test file.
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
)

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
