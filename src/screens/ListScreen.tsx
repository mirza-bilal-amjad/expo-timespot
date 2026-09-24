import { useMemo } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AvatarStrip, AvatarStripItem } from "@/components/AvatarStrip"
import { Button } from "@/components/Button"
import { CityRow } from "@/components/CityRow"
import { Icon, PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { getCityById } from "@/domain/cities/search"
import { getZonedTime } from "@/domain/time/zone"
import type { SavedCity } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { useCitiesStore } from "@/store/cities"
import { useFocusStore } from "@/store/focus"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/04-screen-specs.md "S1 · List". Route: src/app/(tabs)/index.tsx.
 * Ticks the app's one clock (CLAUDE.md rule 3) and hands each <CityRow> its
 * own derived `ZonedTime` as a prop — the list itself is the only clock
 * subscriber on this screen.
 */

// Doc-measured 20pt title-to-list gap has no exact token on the 4pt scale
// used elsewhere (nearest is spacing.lg at 24) — same normalisation call as
// radius.md in theme/radius.ts.
const TITLE_GAP = 20

export function ListScreen() {
  const { theme, themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  const now = useClock()

  const cities = useCitiesStore((s) => s.cities)
  const addCity = useCitiesStore((s) => s.addCity)
  const { prefs } = usePrefsStore()
  const focusedCityId = useFocusStore((s) => s.focusedCityId)
  const setFocusedCityId = useFocusStore((s) => s.setFocusedCityId)

  const orderedCities = useMemo(() => [...cities].sort((a, b) => a.order - b.order), [cities])

  const avatarItems: AvatarStripItem[] = useMemo(
    () =>
      orderedCities.map((c) => {
        const city = getCityById(c.cityId)
        return { id: c.cityId, label: c.label ?? city?.name ?? c.cityId }
      }),
    [orderedCities],
  )

  const renderItem = ({ item }: { item: SavedCity }) => {
    const city = getCityById(item.cityId)
    const time = getZonedTime(now, city?.zone ?? "UTC", prefs)
    return (
      <CityRow
        city={item}
        time={time}
        selected={item.cityId === focusedCityId}
        onPress={() => setFocusedCityId(item.cityId)}
      />
    )
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)}>
      <View style={[themed($header), { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={$headerRow}>
          {avatarItems.length > 1 && (
            <AvatarStrip
              items={avatarItems}
              focusedId={focusedCityId ?? undefined}
              onSelect={setFocusedCityId}
              accessibilityLabel="Cities"
            />
          )}
          <View style={$spacer} />
          <PressableIcon
            icon="plus"
            size="md"
            accessibilityLabel="Add a city"
            containerStyle={themed($addButton)}
            // Search sheet (S4) isn't wired until task 3.7 — placeholder no-op.
            onPress={addCityPlaceholder(addCity)}
          />
        </View>
        <Text preset="screenTitle" tx="list:title" style={themed($title)} />
      </View>

      {orderedCities.length === 0 ? (
        <EmptyState onAddFirst={addCityPlaceholder(addCity)} />
      ) : (
        <FlashList
          data={orderedCities}
          keyExtractor={(item) => item.cityId}
          renderItem={renderItem}
          contentContainerStyle={themed($listContent)}
        />
      )}
    </Screen>
  )
}

// Placeholder until task 3.7 (S4 Search sheet) exists to hand `addCity` a
// real city id — keeps the button wired and testable without a fake city
// silently entering the real store.
function addCityPlaceholder(_addCity: (cityId: string, label?: string) => void) {
  return () => {}
}

function EmptyState({ onAddFirst }: { onAddFirst: () => void }) {
  const { theme, themed } = useAppTheme()
  return (
    <View style={themed($empty)}>
      <Icon icon="globe" size={48} color={theme.colors.textFaint} />
      <Text preset="heading" tx="list:emptyTitle" style={themed($emptyHeading)} />
      <Text preset="default" tx="list:emptyBody" style={themed($emptyBody)} />
      <Button
        preset="pill"
        size="lg"
        tx="list:emptyCta"
        onPress={onAddFirst}
        style={themed($emptyCta)}
      />
    </View>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  backgroundColor: theme.colors.background,
})

const $header: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  gap: theme.spacing.xl,
})

const $headerRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $spacer: ViewStyle = { flex: 1 }

const $addButton: ThemedStyle<ViewStyle> = (theme) => ({
  width: theme.spacing.avatar,
  height: theme.spacing.avatar,
  borderRadius: theme.radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.controlBackground,
})

const $title: TextStyle = { marginTop: TITLE_GAP }

const $listContent: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingTop: theme.spacing.lg,
  gap: theme.spacing.rowGap,
})

const $empty: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: theme.spacing.gutter,
  gap: theme.spacing.sm,
})

const $emptyHeading: TextStyle = { textAlign: "center" }

const $emptyBody: ThemedStyle<TextStyle> = (theme) => ({
  textAlign: "center",
  color: theme.colors.textDim,
})

const $emptyCta: ThemedStyle<ViewStyle> = (theme) => ({ marginTop: theme.spacing.sm })
