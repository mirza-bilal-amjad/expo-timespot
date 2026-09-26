import { useEffect, useState } from "react"
import { Platform, ViewStyle } from "react-native"
import { useFonts } from "expo-font"
import { Slot, SplashScreen } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { getTimeCapability } from "@/domain/time/capability"
import { configureTimeEngine } from "@/domain/time/zone"
import { useSeedFirstLaunch } from "@/hooks/useSeedFirstLaunch"
import { initI18n } from "@/i18n"
import { reportNotice } from "@/store/notices"
import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { loadDateFnsLocale } from "@/utils/formatDate"

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

export default function Root() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)

  useSeedFirstLaunch()

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  const loaded = fontsLoaded && isI18nInitialized

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
