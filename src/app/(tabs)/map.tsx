import { View } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

/** S3 · Map — placeholder route. Real screen is Phase 4 (docs/10-implementation-plan.md). */
export default function Map() {
  const { themed } = useAppTheme()
  return (
    <Screen preset="fixed">
      <View
        style={themed(({ spacing }) => ({
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.gutter,
        }))}
      >
        <Text preset="heading" text="Map" />
      </View>
    </Screen>
  )
}
