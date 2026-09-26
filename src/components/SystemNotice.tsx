import { View, ViewStyle } from "react-native"

import type { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { type Notice, useNoticesStore } from "@/store/notices"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Button } from "./Button"
import { Card } from "./Card"
import { Text } from "./Text"

/**
 * docs/10-implementation-plan.md task 5.7, docs/04-screen-specs.md S1
 * "System notices". Something the app recovered from on its own — a store
 * it had to reset or repair, a device whose `Intl` ignores time zones — told
 * once, in plain words, with one way to acknowledge it. The recovery itself
 * already happened (defaults restored, a copy kept, the bundled time tables
 * in use); this is the "real message" half.
 *
 * Shows the oldest pending notice; the next appears when it's dismissed.
 * Renders nothing when there are none.
 */
export function SystemNotice() {
  const { themed } = useAppTheme()
  const notice = useNoticesStore((s) => s.notices[0])
  const dismiss = useNoticesStore((s) => s.dismiss)

  if (!notice) return null

  return (
    <Card interactive={false} style={themed($card)}>
      {/* A polite live region, so a screen reader announces it once. */}
      <View accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Text preset="default" tx={messageFor(notice)} />
      </View>
      <View style={$actions}>
        <Button
          preset="pill"
          size="sm"
          tx="notices:dismiss"
          accessibilityLabel={translate("notices:dismissLabel")}
          onPress={() => dismiss(notice)}
          style={themed($button)}
        />
      </View>
    </Card>
  )
}

function messageFor(notice: Notice): TxKeyPath {
  switch (notice.kind) {
    case "timeEngineDegraded":
      return "notices:timeEngineDegraded"
    case "storageRepaired":
      return "notices:storageRepaired"
    case "storageReset":
      if (notice.key === "ts.cities.v1") return "notices:citiesReset"
      if (notice.key === "ts.prefs.v1") return "notices:prefsReset"
      return "notices:storageReset"
  }
}

const $card: ThemedStyle<ViewStyle> = (theme) => ({
  padding: theme.spacing.md,
  gap: theme.spacing.sm,
})

const $actions: ViewStyle = { flexDirection: "row", justifyContent: "flex-end" }

const $button: ThemedStyle<ViewStyle> = (theme) => ({ paddingHorizontal: theme.spacing.lg })
