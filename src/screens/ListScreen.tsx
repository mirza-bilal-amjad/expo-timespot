import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { useIsFocused } from "expo-router"
import { ScrollView } from "react-native-gesture-handler"
import { useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AvatarStrip, AvatarStripItem } from "@/components/AvatarStrip"
import { Button } from "@/components/Button"
import { EntranceView } from "@/components/EntranceView"
import { Icon, PressableIcon } from "@/components/Icon"
import { RenameSheet } from "@/components/RenameSheet"
import { ReorderableCityRow } from "@/components/ReorderableCityRow"
import { Screen } from "@/components/Screen"
import { SearchSheet } from "@/components/SearchSheet"
import { SystemNotice } from "@/components/SystemNotice"
import { useTabBarClearance } from "@/components/TabBar"
import { Text } from "@/components/Text"
import { Toast } from "@/components/Toast"
import { getCityById } from "@/domain/cities/search"
import { getZonedTime } from "@/domain/time/zone"
import type { SavedCity } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { useShouldPlayEntrance } from "@/hooks/useShouldPlayEntrance"
import { translate } from "@/i18n/translate"
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

// docs/08-motion-spec.md §7 "Entrance choreography": "City rows | 40ms
// each, capped at 6 rows | same, 280ms." No token for either the stagger
// step or the 280ms duration (theme/timing.ts's nearest is base at 220 or
// slow at 320, both a real difference) — same "no token yet" precedent as
// CityRow's own SELECT_STAGGER_MS/SELECT_CROSSFADE_MS.
const ENTRANCE_ROW_STAGGER_MS = 40
const ENTRANCE_ROW_DURATION_MS = 280
const ENTRANCE_ROW_CAP = 6

export function ListScreen() {
  const { theme, themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  const tabBarClearance = useTabBarClearance()
  // The rows show HH:MM, never seconds — re-rendering the list every second
  // redrew ~1,000 components per tick for nothing (measured 2026-09-26).
  const now = useClock({ coalesceToMinute: true, active: useIsFocused() })
  const shouldPlayEntrance = useShouldPlayEntrance("list")

  const cities = useCitiesStore((s) => s.cities)
  const removeCity = useCitiesStore((s) => s.removeCity)
  const restoreCity = useCitiesStore((s) => s.restoreCity)
  const reorderCities = useCitiesStore((s) => s.reorderCities)
  const { prefs } = usePrefsStore()
  const focusedCityId = useFocusStore((s) => s.focusedCityId)
  const setFocusedCityId = useFocusStore((s) => s.setFocusedCityId)

  const storedOrder = useMemo(() => [...cities].sort((a, b) => a.order - b.order), [cities])

  // The list's *visual* order, on the UI thread — every row positions
  // itself from it (see ReorderableCityRow). It follows the store whenever
  // no drag is in flight; a drag rewrites it directly, and on release the
  // result is committed to the store (and only then persisted, so a mid-drag
  // crash can't leave a half-reordered list). That commit re-renders nothing
  // visible — positions never came from render order.
  const storedIds = useMemo(() => storedOrder.map((c) => c.cityId), [storedOrder])
  const order = useSharedValue<string[]>(storedIds)
  const draggingId = useSharedValue<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, read on the UI thread
    if (!dragging) order.value = storedIds
  }, [storedIds, dragging, order])

  const handleDragStart = useCallback(() => setDragging(true), [])
  const handleDragEnd = useCallback(
    (orderedIds: string[]) => {
      reorderCities(orderedIds)
      setDragging(false)
    },
    [reorderCities],
  )

  // Reads the current order from the store rather than closing over it, so
  // its identity never changes and the memo'd rows don't re-render on every
  // reorder just because their callback did.
  const moveCity = useCallback(
    (cityId: string, delta: -1 | 1) => {
      const ids = [...useCitiesStore.getState().cities]
        .sort((a, b) => a.order - b.order)
        .map((c) => c.cityId)
      const from = ids.indexOf(cityId)
      const to = from + delta
      if (from === -1 || to < 0 || to >= ids.length) return
      const next = [...ids]
      ;[next[from], next[to]] = [next[to], next[from]]
      reorderCities(next)
    },
    [reorderCities],
  )

  // Task 3.6 acceptance: "undo restores position, not just the city" —
  // restoreCity reinserts the exact SavedCity record (its own `order`
  // included), so the 5s undo window survives a live drag-reorder too.
  const pendingDeleteRef = useRef<SavedCity | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  const handleDelete = useCallback(
    (city: SavedCity) => {
      pendingDeleteRef.current = city
      removeCity(city.cityId)
      setToastVisible(true)
    },
    [removeCity],
  )

  const handleUndo = useCallback(() => {
    if (pendingDeleteRef.current) restoreCity(pendingDeleteRef.current)
    pendingDeleteRef.current = null
    setToastVisible(false)
  }, [restoreCity])

  const handleToastDismiss = useCallback(() => {
    pendingDeleteRef.current = null
    setToastVisible(false)
  }, [])

  const [searchOpen, setSearchOpen] = useState(false)
  const [renaming, setRenaming] = useState<SavedCity | null>(null)

  const avatarItems: AvatarStripItem[] = useMemo(
    () =>
      storedOrder.map((c) => {
        const city = getCityById(c.cityId)
        return { id: c.cityId, label: c.label ?? city?.name ?? c.cityId }
      }),
    [storedOrder],
  )

  const step = theme.spacing.rowHeight + theme.spacing.rowGap

  const renderRow = (item: SavedCity, index: number) => {
    const city = getCityById(item.cityId)
    const time = getZonedTime(now, city?.zone ?? "UTC", prefs)
    return (
      <ReorderableCityRow
        key={item.cityId}
        city={item}
        time={time}
        selected={item.cityId === focusedCityId}
        index={index}
        itemCount={storedOrder.length}
        order={order}
        draggingId={draggingId}
        entrance={
          index < ENTRANCE_ROW_CAP
            ? {
                play: shouldPlayEntrance,
                delayMs: index * ENTRANCE_ROW_STAGGER_MS,
                durationMs: ENTRANCE_ROW_DURATION_MS,
              }
            : undefined
        }
        onFocus={setFocusedCityId}
        onDelete={handleDelete}
        onMove={moveCity}
        onRename={setRenaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
    )
  }

  return (
    // <Screen preset="fixed">'s inner content container hugs its children's
    // height rather than filling the screen (no `flex: 1` — see Screen.tsx's
    // $innerStyle), so a `position: absolute` Toast placed *inside* it
    // resolves `bottom` against that shrink-wrapped content, not the real
    // viewport — it visibly lands mid-list instead of floating near the
    // screen's bottom edge. Rendering it as a sibling of <Screen>, under
    // this screen's own flex:1 root, gives it a properly full-height anchor.
    <View style={$root}>
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
              onPress={() => setSearchOpen(true)}
            />
          </View>
          <EntranceView play={shouldPlayEntrance}>
            <Text preset="screenTitle" tx="list:title" style={themed($title)} />
          </EntranceView>
        </View>

        <View style={themed($notice)}>
          <SystemNotice />
        </View>

        {storedOrder.length === 0 ? (
          <EmptyState onAddFirst={() => setSearchOpen(true)} />
        ) : (
          <ScrollView scrollEnabled={!dragging} contentContainerStyle={themed($listContent)}>
            {/* Rows are absolutely placed at slot × step; this holds their room. */}
            <View style={{ height: storedOrder.length * step - theme.spacing.rowGap }}>
              {storedOrder.map(renderRow)}
            </View>
          </ScrollView>
        )}
      </Screen>

      <Toast
        visible={toastVisible}
        message={translate("list:cityRemoved")}
        actionLabel={translate("list:undo")}
        onAction={handleUndo}
        onDismiss={handleToastDismiss}
        bottomOffset={tabBarClearance + theme.spacing.md}
      />

      <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
      <RenameSheet city={renaming} onClose={() => setRenaming(null)} />
    </View>
  )
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

const $root: ViewStyle = { flex: 1 }

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

// Collapses to nothing when there's no notice (SystemNotice renders null).
const $notice: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingTop: theme.spacing.md,
})

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
  // No `gap` here — <ReorderableCityRow>'s Swipeable wrapper already carries
  // the rowGap as its own marginBottom (Swipeable needs a real style prop on
  // its own container to space siblings; a parent `gap` can't reach through it).
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
