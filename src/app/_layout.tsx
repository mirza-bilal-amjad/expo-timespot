import { useEffect, useLayoutEffect } from "react"
import { Platform, ViewStyle } from "react-native"
import { useFonts } from "expo-font"
import { Slot, SplashScreen } from "expo-router"
import Head from "expo-router/head"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { getTimeCapability } from "@/domain/time/capability"
import { configureTimeEngine } from "@/domain/time/zone"
import { useIsHydrated } from "@/hooks/useIsHydrated"
import { useSeedFirstLaunch } from "@/hooks/useSeedFirstLaunch"
import { applyDeviceLanguage, initI18n } from "@/i18n"
import { translate } from "@/i18n/translate"
import { reportNotice } from "@/store/notices"
import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { KeyboardProvider } from "@/utils/keyboardController"

SplashScreen.preventAutoHideAsync()

// docs/adr/0004: probe `Intl` before anything renders a time. A device that
// ignores `timeZone` runs on the bundled offset table instead.
const timeCapability = getTimeCapability()
configureTimeEngine(timeCapability)
if (timeCapability === "degraded") reportNotice({ kind: "timeEngineDegraded" })

if (__DEV__) {
  // Load Reactotron configuration in development. We don't want to
  // include this in our production bundle, so we are using `if (__DEV__)`
  // to only execute this in development.
  require("@/devtools/ReactotronConfig")
}

// Synchronous — strings are ready for the very first render, server included.
initI18n()

export default function Root() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  // docs/10 task 6.5. The static render and the hydration render must be
  // identical, so both use the same fixed inputs: the fallback language and
  // the light theme. From the layout effect after hydration (before paint)
  // the tree remounts with the visitor's language and theme. The public
  // city pages pre-render real content this way; the per-visitor app
  // routes additionally render nothing until hydrated (tabs layout).
  const hydrated = useIsHydrated()
  useLayoutEffect(() => {
    applyDeviceLanguage()
  }, [])

  useSeedFirstLaunch()

  // Web: fonts arrive as @font-face in the static HTML (expo-font registers
  // them during the static render), so the page never waits on them.
  const loaded = Platform.OS === "web" || fontsLoaded

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  const content = (
    <ThemeProvider
      key={hydrated ? "live" : "static"}
      initialContext={hydrated ? undefined : STATIC_THEME}
    >
      {/* Defaults for every page; a city page's own tags replace these. */}
      <Head>
        <title>{translate("common:appTitle")}</title>
        <meta name="description" content={translate("common:appDescription")} />
      </Head>
      <Slot />
    </ThemeProvider>
  )

  return (
    <GestureHandlerRootView style={$gestureRoot}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {Platform.OS === "web" ? content : <KeyboardProvider>{content}</KeyboardProvider>}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

// What the static render (and so the hydration render) uses; +html.tsx
// paints the right background underneath until the live theme mounts.
const STATIC_THEME = "light"

const $gestureRoot: ViewStyle = { flex: 1 }
