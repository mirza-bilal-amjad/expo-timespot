import { useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"

import { getCityById } from "@/domain/cities/search"
import type { SavedCity } from "@/domain/types"
import { translate } from "@/i18n/translate"
import { useCitiesStore } from "@/store/cities"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Button } from "./Button"
import { InlineField } from "./InlineField"
import { Pressable } from "./Pressable"
import { Sheet } from "./Sheet"
import { Text } from "./Text"

/**
 * docs/04-screen-specs.md S1 "Row menu" → Rename. Sets `SavedCity.label`
 * ("Mum", "Home") via the store's `renameCity`. An empty name, or one equal
 * to the dataset's own, clears the label rather than storing a copy — so a
 * later dataset correction to the name still shows through.
 */
export interface RenameSheetProps {
  /** The city being renamed; `null` closes the sheet. */
  city: SavedCity | null
  onClose: () => void
}

export function RenameSheet({ city, onClose }: RenameSheetProps) {
  return (
    <Sheet
      open={!!city}
      onOpenChange={(open) => !open && onClose()}
      title={translate("list:renameTitle")}
      snapPoints={["half"]}
    >
      {/* Keyed per city: @expo/ui's TextInput is uncontrolled (the draft is
       its `defaultValue`), so the draft has to exist on the very first
       render of each open, not be seeded by an effect afterwards. */}
      {city && <RenameBody key={city.cityId} city={city} onClose={onClose} />}
    </Sheet>
  )
}

function RenameBody({ city, onClose }: { city: SavedCity; onClose: () => void }) {
  const { themed } = useAppTheme()
  const renameCity = useCitiesStore((s) => s.renameCity)
  const originalName = getCityById(city.cityId)?.name ?? city.cityId
  const [draft, setDraft] = useState(() => city.label ?? originalName)

  const save = (value: string) => {
    const trimmed = value.trim()
    renameCity(city.cityId, trimmed && trimmed !== originalName ? trimmed : undefined)
    onClose()
  }

  return (
    <View style={themed($body)}>
      <InlineField
        value={draft}
        onChangeText={setDraft}
        onClose={onClose}
        placeholder={originalName}
        icon={null}
        returnKeyType="done"
        onSubmitEditing={save}
        selectTextOnFocus
        closeAccessibilityLabel={translate("list:renameCancel")}
      />
      {city.label && (
        <Pressable onPress={() => save(originalName)} accessibilityRole="button">
          <Text
            preset="default"
            text={translate("list:useOriginalName", { name: originalName })}
            style={themed($reset)}
          />
        </Pressable>
      )}
      <Button preset="pill" tx="list:save" onPress={() => save(draft)} style={themed($save)} />
    </View>
  )
}

const $body: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.md })

const $reset: ThemedStyle<TextStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  color: theme.colors.textDim,
  textDecorationLine: "underline",
})

const $save: ThemedStyle<ViewStyle> = (theme) => ({
  marginHorizontal: theme.spacing.gutter,
  marginBottom: theme.spacing.lg,
})
