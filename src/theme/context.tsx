import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react"
import { StyleProp, useColorScheme } from "react-native"
import { useMMKVString } from "react-native-mmkv"

import { storage } from "@/utils/storage"

import { setImperativeTheming } from "./context.utils"
import { darkTheme, lightTheme } from "./theme"
import type {
  AllowedStylesT,
  Colors,
  ImmutableThemeContextModeT,
  Theme,
  ThemeContextModeT,
  ThemedFnT,
  ThemedStyle,
} from "./types"

function createThemedFn(theme: Theme): ThemedFnT {
  return <T,>(styleOrStyleFn: AllowedStylesT<T>) => {
    const flatStyles = [styleOrStyleFn].flat(3) as (ThemedStyle<T> | StyleProp<T>)[]
    const stylesArray = flatStyles.map((f) => {
      if (typeof f === "function") {
        return (f as ThemedStyle<T>)(theme)
      } else {
        return f
      }
    })
    // Flatten the array of styles into a single object
    return Object.assign({}, ...stylesArray) as T
  }
}

/**
 * docs/03-component-library.md's <Card> spec: "a ThemeContext flip so every
 * descendant's ink.primary resolves to ink.onInverse automatically." Maps
 * each color a selected surface's descendants read to its inverse-surface
 * counterpart — see docs/14-ignite-integration.md §3.5 for the ink.* -> theme
 * name translation this mirrors.
 */
const INVERSE_COLOR_MAP: Partial<Record<keyof Colors, keyof Colors>> = {
  text: "textOnInverse",
  textDim: "textOnInverseDim",
  background: "inverseBackground",
  cardBackground: "inverseBackground",
}

function invertTheme(theme: Theme): Theme {
  const colors = { ...theme.colors }
  for (const [from, to] of Object.entries(INVERSE_COLOR_MAP) as [keyof Colors, keyof Colors][]) {
    // @ts-expect-error -- colors is a union of the light/dark palettes; every
    // key in INVERSE_COLOR_MAP exists on both, but TS can't see that through
    // the loop's generic key type.
    colors[from] = theme.colors[to]
  }
  return { ...theme, colors }
}

export type ThemeContextType = {
  setThemeContextOverride: (newTheme: ThemeContextModeT) => void
  /** The user's explicit choice, or `undefined` when following the OS —
   * what a System / Light / Dark picker shows as selected. */
  themeOverride: "light" | "dark" | undefined
  theme: Theme
  themeContext: ImmutableThemeContextModeT
  themed: ThemedFnT
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

export interface ThemeProviderProps {
  initialContext?: ThemeContextModeT
}

/**
 * The ThemeProvider is the heart and soul of the design token system. It provides a context wrapper
 * for your entire app to consume the design tokens as well as global functionality like the app's theme.
 *
 * To get started, you want to wrap your entire app's JSX hierarchy in `ThemeProvider`
 * and then use the `useAppTheme()` hook to access the theme context.
 *
 * Documentation: https://docs.infinite.red/ignite-cli/boilerplate/app/theme/Theming/
 */
export const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  initialContext,
}) => {
  // The operating system theme:
  const systemColorScheme = useColorScheme()
  // Our saved theme context: can be "light", "dark", or undefined (system theme)
  const [themeScheme, setThemeScheme] = useMMKVString("ignite.themeScheme", storage)

  /**
   * This function is used to set the theme context and is exported from the useAppTheme() hook.
   *  - setThemeContextOverride("dark") sets the app theme to dark no matter what the system theme is.
   *  - setThemeContextOverride("light") sets the app theme to light no matter what the system theme is.
   *  - setThemeContextOverride(undefined) the app will follow the operating system theme.
   */
  const setThemeContextOverride = useCallback(
    (newTheme: ThemeContextModeT) => {
      setThemeScheme(newTheme)
    },
    [setThemeScheme],
  )

  /**
   * initialContext is the theme context passed in from the app.tsx file and always takes precedence.
   * themeScheme is the value from MMKV. If undefined, we fall back to the system theme
   * systemColorScheme is the value from the device. If undefined, we fall back to "light"
   */
  const themeContext: ImmutableThemeContextModeT = useMemo(() => {
    const t = initialContext || themeScheme || (!!systemColorScheme ? systemColorScheme : "light")
    return t === "dark" ? "dark" : "light"
  }, [initialContext, themeScheme, systemColorScheme])

  const theme: Theme = useMemo(() => {
    switch (themeContext) {
      case "dark":
        return darkTheme
      default:
        return lightTheme
    }
  }, [themeContext])

  useEffect(() => {
    setImperativeTheming(theme)
  }, [theme])

  const themed = useMemo(() => createThemedFn(theme), [theme])

  const themeOverride: ThemeContextType["themeOverride"] =
    themeScheme === "light" || themeScheme === "dark" ? themeScheme : undefined

  const value = {
    theme,
    themeContext,
    themeOverride,
    setThemeContextOverride,
    themed,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * This is the primary hook that you will use to access the theme context in your components.
 * Documentation: https://docs.infinite.red/ignite-cli/boilerplate/app/theme/useAppTheme.tsx/
 */
export const useAppTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useAppTheme must be used within an ThemeProvider")
  }
  return context
}

/**
 * Wraps children in an inverted-surface theme — `<Card selected>` is the
 * motivating case, but anything that needs "ink.primary reads correctly on a
 * bg.inverse surface" can reach for this directly.
 */
export const InvertedTheme: FC<PropsWithChildren> = ({ children }) => {
  const ctx = useAppTheme()
  const invertedTheme = useMemo(() => invertTheme(ctx.theme), [ctx.theme])
  const themed = useMemo(() => createThemedFn(invertedTheme), [invertedTheme])
  const value = useMemo(
    () => ({ ...ctx, theme: invertedTheme, themed }),
    [ctx, invertedTheme, themed],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
