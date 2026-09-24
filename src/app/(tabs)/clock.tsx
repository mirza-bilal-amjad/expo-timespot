import { View } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

/** S2 · Clock — placeholder route. Real screen is task 3.8. */
export default function Clock() {
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
        <Text preset="heading" text="Clock" />
      </View>
    </Screen>
  )
}
