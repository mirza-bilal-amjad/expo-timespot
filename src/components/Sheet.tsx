import { ReactNode } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { BottomSheet, Host, type SnapPoint } from "@expo/ui"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  snapPoints?: SnapPoint[]
  children: ReactNode
}

/**
 * The only file that imports @expo/ui for sheets (docs/14-ignite-integration.md §6).
 * Feature code imports this, never @expo/ui directly — a future swap touches one file.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  snapPoints = ["half", "full"],
  children,
}: SheetProps) {
  const { theme } = useAppTheme()

  return (
    <Host style={$host} matchContents>
      <BottomSheet
        isPresented={open}
        onDismiss={() => onOpenChange(false)}
        snapPoints={snapPoints}
        containerColor={theme.colors.cardBackground}
      >
        <View>
          {title ? <Text preset="cityTitle" text={title} style={$title} /> : null}
          {children}
        </View>
      </BottomSheet>
    </Host>
  )
}

const $host: ViewStyle = { position: "absolute" }
const $title: TextStyle = { paddingHorizontal: 20, paddingBottom: 8 }
