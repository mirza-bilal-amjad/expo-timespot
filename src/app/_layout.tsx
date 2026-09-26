import { useEffect } from "react"
import { Platform, ViewStyle } from "react-native"
import { useFonts } from "expo-font"
import { Slot, SplashScreen } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { getTimeCapability } from "@/domain/time/capability"
import { configureTimeEngine } from "@/domain/time/zone"
import { useIsHydrated } from "@/hooks/useIsHydrated"
import { useSeedFirstLaunch } from "@/hooks/useSeedFirstLaunch"
import { initI18n } from "@/i18n"
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
  // docs/10 task 6.5: the app's routes are per-visitor — saved cities from
  // local storage, the current time, the browser's language — so none of it
  // is rendered statically. The server and the hydration render both
  // produce the same empty, themed page (+html.tsx paints the background);
  // the real UI mounts from a layout effect, before the first paint. No
  // mismatch by construction, and never a build-time clock on screen.
  const hydrated = useIsHydrated()

  useSeedFirstLaunch()

  const loaded = fontsLoaded && hydrated

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
    <ThemeProvider>
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

const $gestureRoot: ViewStyle = { flex: 1 }
