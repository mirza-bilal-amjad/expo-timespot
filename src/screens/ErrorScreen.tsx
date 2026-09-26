import { useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import type { ErrorBoundaryProps } from "expo-router"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useCitiesStore } from "@/store/cities"
import { useFocusStore } from "@/store/focus"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { storage } from "@/utils/storage"

/**
 * docs/10-implementation-plan.md task 5.7. What an error nothing else caught
 * turns into — mounted as the tab routes' Expo Router `ErrorBoundary`, so
 * it covers the tab layout and every screen in it. The bundled city data
 * being unusable (`DatasetError`) gets its own message; anything else gets
 * a general one.
 *
 * Two ways out, in the order to try them:
 *  1. **Try again** — re-renders the routes (Expo Router's `retry`). Most
 *     errors are transient.
 *  2. **Reset saved data** — clears everything TimeSpot stored and resets
 *     the stores in memory, then retries: the way out of an error that
 *     saved state keeps re-triggering, which retrying alone can't escape.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const { theme, themed } = useAppTheme()
  const [busy, setBusy] = useState(false)
  const isDataset = error.name === "DatasetError"

  if (__DEV__) console.error(error)

  const run = (action: () => void) => {
    setBusy(true)
    action()
    retry().finally(() => setBusy(false))
  }

  const resetSavedData = () => {
    storage.clearAll()
    useCitiesStore.setState(useCitiesStore.getInitialState(), true)
    usePrefsStore.setState(usePrefsStore.getInitialState(), true)
    useFocusStore.setState(useFocusStore.getInitialState(), true)
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={themed($screen)}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={themed($body)} accessibilityRole="alert">
        <Icon icon="globe" size={theme.spacing.xxl} color={theme.colors.textFaint} />
        <Text preset="heading" tx="errors:title" style={$center} />
        <Text
          preset="default"
          tx={isDataset ? "errors:dataset" : "errors:body"}
          style={themed($message)}
        />
      </View>
      <View style={themed($actions)}>
        <Button
          preset="pill"
          size="lg"
          tx="errors:retry"
          disabled={busy}
          onPress={() => run(() => {})}
        />
        <Button
          preset="default"
          tx="errors:reset"
          accessibilityHint={translate("errors:resetHint")}
          disabled={busy}
          onPress={() => run(resetSavedData)}
        />
      </View>
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  justifyContent: "center",
  padding: theme.spacing.gutter,
  gap: theme.spacing.xl,
  backgroundColor: theme.colors.background,
})

const $body: ThemedStyle<ViewStyle> = (theme) => ({
  alignItems: "center",
  gap: theme.spacing.sm,
})

const $center: TextStyle = { textAlign: "center" }

const $message: ThemedStyle<TextStyle> = (theme) => ({
  textAlign: "center",
  color: theme.colors.textDim,
})

const $actions: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.sm })
