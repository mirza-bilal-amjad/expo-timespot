import { useCallback, useMemo, useRef, useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AvatarStrip, AvatarStripItem } from "@/components/AvatarStrip"
import { Button } from "@/components/Button"
import { Icon, PressableIcon } from "@/components/Icon"
import { ReorderableCityRow } from "@/components/ReorderableCityRow"
import { Screen } from "@/components/Screen"
import { useTabBarClearance } from "@/components/TabBar"
import { Text } from "@/components/Text"
import { Toast } from "@/components/Toast"
import { getCityById } from "@/domain/cities/search"
import { getZonedTime } from "@/domain/time/zone"
import type { SavedCity } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
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

export function ListScreen() {
  const { theme, themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  const tabBarClearance = useTabBarClearance()
  const now = useClock()

  const cities = useCitiesStore((s) => s.cities)
  const addCity = useCitiesStore((s) => s.addCity)
  const removeCity = useCitiesStore((s) => s.removeCity)
  const restoreCity = useCitiesStore((s) => s.restoreCity)
  const reorderCities = useCitiesStore((s) => s.reorderCities)
  const { prefs } = usePrefsStore()
  const focusedCityId = useFocusStore((s) => s.focusedCityId)
  const setFocusedCityId = useFocusStore((s) => s.setFocusedCityId)

  const storedOrder = useMemo(() => [...cities].sort((a, b) => a.order - b.order), [cities])

  // Task 3.6: while a row is being dragged, the displayed order is a local
  // override — committed to the store (and only then persisted) on release,
  // so a mid-drag crash or reload can't leave a half-reordered list.
  const [liveOrderIds, setLiveOrderIds] = useState<string[] | null>(null)
  const orderedCities = useMemo(() => {
    if (!liveOrderIds) return storedOrder
    const byId = new Map(storedOrder.map((c) => [c.cityId, c]))
    return liveOrderIds.map((id) => byId.get(id)).filter((c): c is SavedCity => !!c)
  }, [storedOrder, liveOrderIds])

  const handleDragMove = useCallback(
    (cityId: string, toIndex: number) => {
      setLiveOrderIds((prev) => {
        const base = prev ?? storedOrder.map((c) => c.cityId)
        const fromIndex = base.indexOf(cityId)
        if (fromIndex === -1 || fromIndex === toIndex) return prev
        const next = [...base]
        next.splice(fromIndex, 1)
        next.splice(toIndex, 0, cityId)
        return next
      })
    },
    // storedOrder is intentionally not a dep — it should only seed `base`
    // the first time a drag starts, not resync mid-drag on every store tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const handleDragEnd = useCallback(() => {
    setLiveOrderIds((ids) => {
      if (ids) reorderCities(ids)
      return null
    })
  }, [reorderCities])

  const moveCity = useCallback(
    (cityId: string, delta: -1 | 1) => {
      const ids = storedOrder.map((c) => c.cityId)
      const from = ids.indexOf(cityId)
      const to = from + delta
      if (from === -1 || to < 0 || to >= ids.length) return
      const next = [...ids]
      ;[next[from], next[to]] = [next[to], next[from]]
      reorderCities(next)
    },
    [storedOrder, reorderCities],
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

  const avatarItems: AvatarStripItem[] = useMemo(
    () =>
      orderedCities.map((c) => {
        const city = getCityById(c.cityId)
        return { id: c.cityId, label: c.label ?? city?.name ?? c.cityId }
      }),
    [orderedCities],
  )

  const renderItem = ({ item, index }: { item: SavedCity; index: number }) => {
    const city = getCityById(item.cityId)
    const time = getZonedTime(now, city?.zone ?? "UTC", prefs)
    return (
      <ReorderableCityRow
        city={item}
        time={time}
        selected={item.cityId === focusedCityId}
        index={index}
        itemCount={orderedCities.length}
        onPress={() => setFocusedCityId(item.cityId)}
        onDelete={handleDelete}
        onMoveUp={() => moveCity(item.cityId, -1)}
        onMoveDown={() => moveCity(item.cityId, 1)}
        onDragMove={handleDragMove}
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

      <Toast
        visible={toastVisible}
        message={translate("list:cityRemoved")}
        actionLabel={translate("list:undo")}
        onAction={handleUndo}
        onDismiss={handleToastDismiss}
        bottomOffset={tabBarClearance + theme.spacing.md}
      />
    </View>
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
