import { useEffect, useMemo, useRef, useState } from "react"
import { Keyboard, TextStyle, View, ViewStyle } from "react-native"
import { FlashList } from "@shopify/flash-list"

import {
  getCityByZone,
  getPopularCities,
  getRepresentativeCity,
  hasSearchNames,
  loadSearchNames,
  searchCities,
} from "@/domain/cities/search"
import { getDeviceZone, getZonedTime, parseOffsetQuery } from "@/domain/time/zone"
import type { City } from "@/domain/types"
import { translate } from "@/i18n/translate"
import { useCitiesStore } from "@/store/cities"
import { useFocusStore } from "@/store/focus"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "./Icon"
import { InlineField } from "./InlineField"
import { Numeral } from "./Numeral"
import { Pressable } from "./Pressable"
import { Sheet } from "./Sheet"
import { Text } from "./Text"

/**
 * docs/04-screen-specs.md "S4 · Search — add a city". `<Sheet>` already
 * picks the right presentation per platform (native BottomSheet / web
 * modal); this composes the field, results list and the three named states
 * (empty query, no results, already-added row).
 *
 * The right-hand time column is a snapshot at open, not a live tick —
 * deliberately: subscribing this sheet to `useClock()` would be a second
 * interval running alongside the list screen's (CLAUDE.md rule 3, "one
 * clock"), for a value that's only ever informational context while
 * picking a city, never the thing being read precisely.
 */
export interface SearchSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const POPULAR_LIMIT = 12

export function SearchSheet(props: SearchSheetProps) {
  const { open, onOpenChange } = props
  const { theme, themed } = useAppTheme()
  const { prefs } = usePrefsStore()
  const savedCities = useCitiesStore((s) => s.cities)
  const addCity = useCitiesStore((s) => s.addCity)
  const setFocusedCityId = useFocusStore((s) => s.setFocusedCityId)

  const [query, setQuery] = useState("")
  const [now] = useState(() => Date.now())

  // Reset the query when the sheet transitions closed -> open. Adjusted
  // during render (React's documented pattern for "reset state when a prop
  // changes", https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // rather than in a useEffect, which would commit an extra, visible
  // re-render one frame after the sheet opens — same intentional pattern as
  // Screen.tsx's useAutoPreset; react-hooks/refs can't distinguish it from
  // an unsafe ref read.
  const prevOpenRef = useRef(open)
  // eslint-disable-next-line react-hooks/refs
  if (open && !prevOpenRef.current && query !== "") setQuery("")
  // eslint-disable-next-line react-hooks/refs
  prevOpenRef.current = open

  const savedIds = useMemo(() => new Set(savedCities.map((c) => c.cityId)), [savedCities])

  // The search names (alternate spellings, ASCII forms) aren't boot data
  // (docs/10 task 6.1): fetch them when the sheet opens, and re-rank once
  // they're in. Until then search matches display names.
  const [namesReady, setNamesReady] = useState(hasSearchNames)
  useEffect(() => {
    if (!open || namesReady) return
    let live = true
    loadSearchNames().then(() => {
      if (live) setNamesReady(hasSearchNames())
    })
    return () => {
      live = false
    }
  }, [open, namesReady])

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) {
      const deviceCity = getCityByZone(getDeviceZone())
      const popular = getPopularCities(POPULAR_LIMIT)
      if (!deviceCity) return popular
      return [deviceCity, ...popular.filter((c) => c.id !== deviceCity.id)]
    }
    return searchCities(q)
    // namesReady: the same query ranks differently once the names are in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, namesReady])

  const offsetFallback = useMemo(() => {
    if (results.length > 0 || !query.trim()) return null
    const offsetMinutes = parseOffsetQuery(query)
    if (offsetMinutes === null) return null
    return getRepresentativeCity(offsetMinutes, now)
  }, [results, query, now])

  // The keyboard is dismissed first, so the hosted text field is blurred
  // before the sheet closes around it.
  const selectCity = (city: City) => {
    Keyboard.dismiss()
    if (!savedIds.has(city.id)) addCity(city.id)
    setFocusedCityId(city.id)
    onOpenChange(false)
  }

  const renderRow = (city: City) => {
    const already = savedIds.has(city.id)
    const time = getZonedTime(now, city.zone, prefs)
    const subtitle = city.admin1 ? `${city.admin1}, ${city.country}` : city.country
    return (
      <Pressable
        key={city.id}
        onPress={() => selectCity(city)}
        accessibilityRole="button"
        accessibilityLabel={`${city.name}, ${subtitle}${already ? translate("search:alreadyAdded") : ""}`}
        accessibilityHint={translate(already ? "search:focusHint" : "search:addHint")}
        style={themed($row)}
      >
        <View style={themed($rowText)}>
          <Text
            preset="cityTitle"
            text={city.name}
            numberOfLines={1}
            style={already && themed($dimmedTitle)}
          />
          <Text preset="offset" text={subtitle} numberOfLines={1} />
        </View>
        {already ? (
          <Icon icon="check" size="md" color={theme.colors.textDim} accessibilityLabel="" />
        ) : (
          <Numeral value={time.display} size="numeralMd" />
        )}
      </Pressable>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={translate("search:title")} fill>
      <InlineField
        value={query}
        onChangeText={setQuery}
        onClose={() => onOpenChange(false)}
        placeholder={translate("search:placeholder")}
        closeAccessibilityLabel={translate("search:close")}
      />

      {!query.trim() && <Text preset="caption" tx="search:popular" style={themed($sectionLabel)} />}

      {results.length === 0 ? (
        <View style={themed($empty)}>
          <Text preset="default" tx="search:noResults" txOptions={{ query }} style={$centerText} />
          {offsetFallback ? (
            <Pressable onPress={() => selectCity(offsetFallback)} accessibilityRole="button">
              <Text
                preset="default"
                tx="search:useOffsetMatch"
                txOptions={{ name: offsetFallback.name }}
                style={themed($offsetLink)}
              />
            </Pressable>
          ) : (
            <Text preset="caption" tx="search:offsetHint" style={themed($emptyHint)} />
          )}
        </View>
      ) : (
        <FlashList
          data={results}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => renderRow(item)}
          contentContainerStyle={themed($listContent)}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </Sheet>
  )
}

// docs/04-screen-specs.md S4: "64pt rows" — no exact match on the 4pt
// spacing scale used elsewhere (avatar is 44, rowHeight is 92).
const ROW_HEIGHT = 64

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  height: ROW_HEIGHT,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: theme.spacing.gutter,
  gap: theme.spacing.sm,
})

// "Already added" was previously a flat `opacity: 0.5` on the whole row —
// found during task 5.6's contrast audit to drop the offset/subtitle text
// (already the dimmer `textDim` token before any opacity) well under AA in
// both themes (as low as 2.1:1 light / 2.8:1 dark — see docs/02-design-system.md
// §1.4's contrast ledger for the token ratios that opacity was eating into).
// `textDim` on cityTitle reads as "de-emphasized" exactly like the spec's
// "row is dimmed" (docs/04-screen-specs.md S4) while staying at textDim's
// own documented AA ratio (5.46:1 light / 8.28:1 dark) — the subtitle and
// check icon already render in `textDim`, so this just brings the title in
// line rather than introducing a new token.
const $dimmedTitle: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textDim })

const $rowText: ThemedStyle<ViewStyle> = (theme) => ({ flex: 1, gap: theme.spacing.xxxs })

const $sectionLabel: ThemedStyle<TextStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingBottom: theme.spacing.xs,
})

const $listContent: ThemedStyle<ViewStyle> = (theme) => ({ paddingBottom: theme.spacing.lg })

const $empty: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingVertical: theme.spacing.xl,
  gap: theme.spacing.sm,
  alignItems: "center",
})

const $centerText: TextStyle = { textAlign: "center" }

const $emptyHint: ThemedStyle<TextStyle> = (theme) => ({
  textAlign: "center",
  color: theme.colors.textDim,
})

const $offsetLink: ThemedStyle<TextStyle> = (theme) => ({
  color: theme.colors.textAccent,
  textAlign: "center",
})
