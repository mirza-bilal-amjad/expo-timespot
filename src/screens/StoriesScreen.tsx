import { useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { Image } from "expo-image"
import { useSharedValue } from "react-native-reanimated"

import { Avatar } from "@/components/Avatar"
import { AvatarStrip } from "@/components/AvatarStrip"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { CityRow } from "@/components/CityRow"
import { Icon, ICON_NAMES } from "@/components/Icon"
import { MeridianLine } from "@/components/MeridianLine"
import { Numeral } from "@/components/Numeral"
import { Screen } from "@/components/Screen"
import { SegmentedPill } from "@/components/SegmentedPill"
import { Sheet } from "@/components/Sheet"
import { SunBlock } from "@/components/SunBlock"
import { Terminator } from "@/components/Terminator"
import { Text } from "@/components/Text"
import { UtcRuler } from "@/components/UtcRuler"
import { WorldMap } from "@/components/WorldMap"
import { getZonedTime } from "@/domain/time/zone"
import { useClock } from "@/hooks/useClock"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/10-implementation-plan.md task 2.6. Not Storybook — this repo has none
 * installed, and `/visual-qa`'s Playwright/EAS-simulator pipeline it feeds
 * doesn't exist yet either (a separate, larger piece of work). This is the
 * actual "story" catalog for now: every Tier 1/2 component built in Phase 0-2,
 * across its documented states, with a live theme toggle so both themes are
 * checkable in one place rather than by switching the OS setting and
 * reloading. Route: src/app/stories.tsx.
 */

const CITIES = [
  { id: "1", label: "Tokyo" },
  { id: "2", label: "New York City" },
  { id: "3", label: "London" },
  { id: "4", label: "Sydney" },
  { id: "5", label: "Cairo" },
  { id: "6", label: "Paris" },
  { id: "7", label: "Mumbai" },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { themed } = useAppTheme()
  return (
    <View style={themed($section)}>
      <Text preset="screenTitle" text={title} />
      <View style={themed($sectionBody)}>{children}</View>
    </View>
  )
}

export function StoriesScreen() {
  const { theme, themed, themeContext, setThemeContextOverride } = useAppTheme()
  const [format, setFormat] = useState<"12" | "24">("24")
  const [selectedCard, setSelectedCard] = useState(false)
  const [focusedCity, setFocusedCity] = useState("1")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRow, setSelectedRow] = useState<string | null>("tokyo")
  const meridianOffsetDemo = useSharedValue(540)

  const now = useClock()
  const prefs = {
    timeFormat: "24h" as const,
    theme: "system" as const,
    showSecondsOnList: false,
    dayNightStyle: "icon" as const,
  }

  return (
    <Screen preset="scroll" contentContainerStyle={{ backgroundColor: theme.colors.background }}>
      <Section title="Theme">
        <SegmentedPill
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={themeContext}
          onChange={setThemeContextOverride}
          accessibilityLabel="Theme"
        />
      </Section>

      <Section title="Text">
        <Text preset="screenTitle" text="screenTitle" />
        <Text preset="cityName" text="cityName" />
        <Text preset="cityTitle" text="cityTitle" />
        <Text preset="offset" text="offset · UTC+9" />
        <Text preset="caption" text="caption" />
        <Text preset="default" text="default" />
        <Text preset="bold" text="bold" />
        <Text preset="heading" text="heading" />
        <Text preset="subheading" text="subheading" />
      </Section>

      <Section title="Numeral">
        <View style={themed($row)}>
          <Numeral value="08:40" size="hero" />
        </View>
        <View style={themed($row)}>
          <Numeral value="08:41" size="numeralLg" />
          <Numeral value="12:34" size="numeralMd" />
          <Numeral value="15" size="display" color="textAccent" />
        </View>
      </Section>

      <Section title="Card">
        <View style={themed($row)}>
          <Card
            onPress={() => setSelectedCard((s) => !s)}
            selected={selectedCard}
            style={themed($cardDemo)}
          >
            <Text preset="cityTitle" text="Tokyo" />
            <Text preset="offset" text="UTC +9" />
          </Card>
          <Card interactive={false} elevation="float" style={themed($cardDemo)}>
            <Text preset="cityTitle" text="Floating" />
            <Text preset="caption" text="elevation=float" />
          </Card>
        </View>
      </Section>

      <Section title="Button">
        <View style={themed($row)}>
          <Button preset="pill" size="sm" text="Small" />
          <Button preset="pill" size="md" text="Medium" />
          <Button preset="pill" size="lg" text="Large" />
        </View>
        <View style={themed($row)}>
          <Button preset="pill" text="Disabled" disabled />
          <Button
            preset="pill"
            text="Loading"
            loading={loading}
            onPress={() => setLoading((l) => !l)}
          />
          <Button preset="default" text="default" />
          <Button preset="filled" text="filled" />
          <Button preset="reversed" text="reversed" />
        </View>
      </Section>

      <Section title="SegmentedPill">
        <SegmentedPill
          options={[
            { value: "12", label: "12h" },
            { value: "24", label: "24h" },
          ]}
          value={format}
          onChange={setFormat}
          accessibilityLabel="Time format"
        />
      </Section>

      <Section title="Icon">
        <View style={themed($iconGrid)}>
          {ICON_NAMES.map((name) => (
            <View key={name} style={themed($iconCell)}>
              <Icon icon={name} size="lg" accessibilityLabel={name} />
            </View>
          ))}
        </View>
      </Section>

      <Section title="Avatar / AvatarStrip">
        <View style={themed($row)}>
          <Avatar label="Tokyo" size={64} focused />
          <Avatar label="New York City" size={64} />
        </View>
        <AvatarStrip items={CITIES} focusedId={focusedCity} onSelect={setFocusedCity} max={5} />
      </Section>

      <Section title="CityRow">
        <View style={themed($cityRowStack)}>
          <CityRow
            city={{ cityId: "gn-1850147", addedAt: 0, order: 0 }}
            time={getZonedTime(now, "Asia/Tokyo", prefs)}
            selected={selectedRow === "tokyo"}
            onPress={() => setSelectedRow("tokyo")}
          />
          <CityRow
            city={{ cityId: "gn-2643743", addedAt: 0, order: 1 }}
            time={getZonedTime(now, "Europe/London", prefs)}
            selected={selectedRow === "london"}
            onPress={() => setSelectedRow("london")}
          />
          <CityRow
            city={{ cityId: "gn-5128581", addedAt: 0, order: 2, label: "Home" }}
            time={getZonedTime(now, "America/New_York", prefs)}
            selected={selectedRow === "nyc"}
            onPress={() => setSelectedRow("nyc")}
          />
        </View>
      </Section>

      <Section title="SunBlock">
        <View style={themed($sunBlockGrid)}>
          <View>
            <Text preset="caption" text="Normal (equator)" />
            <SunBlock lat={0} lon={30} zone="Africa/Nairobi" now={now} />
          </View>
          <View>
            <Text preset="caption" text="Polar night (Tromsø, Dec)" />
            <SunBlock
              lat={69.6496}
              lon={18.956}
              zone="Europe/Oslo"
              now={Date.UTC(2026, 11, 15, 12, 0, 0)}
            />
          </View>
          <View>
            <Text preset="caption" text="Midnight sun (Tromsø, Jun)" />
            <SunBlock
              lat={69.6496}
              lon={18.956}
              zone="Europe/Oslo"
              now={Date.UTC(2026, 5, 15, 12, 0, 0)}
            />
          </View>
        </View>
      </Section>

      <Section title="WorldMap + Terminator + MeridianLine + UtcRuler (drag either one)">
        <View style={themed($sunBlockGrid)}>
          {WORLD_MAP_DEMO_INSTANTS.map(({ label, at }, index) => (
            <View key={label}>
              <Text preset="caption" text={label} />
              <View style={themed($worldMapDemo)}>
                <WorldMap
                  width={WORLD_MAP_DEMO_WIDTH}
                  height={WORLD_MAP_DEMO_HEIGHT}
                  activeCountryCode={index === 0 ? "JP" : undefined}
                />
                <View style={$worldMapOverlay}>
                  <Terminator
                    now={at}
                    width={WORLD_MAP_DEMO_WIDTH}
                    height={WORLD_MAP_DEMO_HEIGHT}
                  />
                </View>
                {index === 0 && (
                  <MeridianLine
                    width={WORLD_MAP_DEMO_WIDTH}
                    height={WORLD_MAP_DEMO_HEIGHT}
                    markerLat={35.6812}
                    offsetMinutes={meridianOffsetDemo}
                    now={now}
                    prefs={prefs}
                  />
                )}
              </View>
            </View>
          ))}
        </View>
        <View style={themed($rulerDemo)}>
          <UtcRuler offsetMinutes={meridianOffsetDemo} />
        </View>
      </Section>

      <Section title="Map raster fallback (task 4.9)">
        {/* useMapRenderTier never picks raster on web (docs/07-responsive-strategy.md's
         platform-exception table: "never — browsers cope"), so <WorldMap>
         itself can't demo this tier here — this renders the actual
         land-raster.png asset the way <WorldMap> would on a forced-raster
         native device, tinted with the live theme's own map.land, to check
         the asset and the tint (not the device-tier branching, which
         domain/map/renderTier.test.ts and useMapRenderTier.test.ts already
         cover) actually look right in both themes. */}
        <View style={themed($worldMapDemo)}>
          <Image
            source={landRasterDemo}
            tintColor={theme.colors.mapLand}
            contentFit="fill"
            style={{ width: WORLD_MAP_DEMO_WIDTH, height: WORLD_MAP_DEMO_HEIGHT }}
          />
        </View>
      </Section>

      <Section title="Sheet">
        <Button preset="pill" text="Open sheet" onPress={() => setSheetOpen(true)} />
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="A sheet story">
          <Text text="Sheet content" style={themed($sheetContent)} />
        </Sheet>
      </Section>
    </Screen>
  )
}

const $section: ThemedStyle<ViewStyle> = (theme) => ({
  padding: theme.spacing.gutter,
  gap: theme.spacing.md,
})

const $sectionBody: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.sm })

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: theme.spacing.md,
})

// Arbitrary demo-card width — no design-system meaning, just "wide enough
// to show two lines of sample text" for this catalog screen.
const CARD_DEMO_WIDTH = 220

const $cardDemo: ThemedStyle<ViewStyle> = (theme) => ({
  padding: theme.spacing.lg,
  width: CARD_DEMO_WIDTH,
})

const $iconGrid: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: theme.spacing.md,
})

const ICON_CELL_SIZE = 44

const $iconCell: ThemedStyle<ViewStyle> = (theme) => ({
  width: ICON_CELL_SIZE,
  height: ICON_CELL_SIZE,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: theme.radius.sm,
  backgroundColor: theme.colors.cardBackground,
})

const $sheetContent: ThemedStyle<TextStyle> = (theme) => ({ padding: theme.spacing.lg })

const $cityRowStack: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.rowGap })

const $sunBlockGrid: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: theme.spacing.lg,
})

// docs/04-screen-specs.md's equirectangular source is naturally ~2:1 — an
// arbitrary demo size, same status as CARD_DEMO_WIDTH above.
const WORLD_MAP_DEMO_WIDTH = 360
const WORLD_MAP_DEMO_HEIGHT = 180

// docs/10-implementation-plan.md task 4.9 — same asset <WorldMap> requires
// in its own raster branch (src/components/WorldMap.tsx).
const landRasterDemo = require("@/assets/map/land-raster.png")

// docs/10-implementation-plan.md task 4.2's acceptance: "visually correct at
// equinox and both solstices" — the same three instants terminator.test.ts
// snapshots, so a code-level correctness check and a by-eye one cover the
// same ground.
const WORLD_MAP_DEMO_INSTANTS = [
  { label: "March equinox, noon UTC", at: Date.UTC(2026, 2, 20, 12) },
  { label: "June solstice, noon UTC", at: Date.UTC(2026, 5, 21, 12) },
  { label: "December solstice, noon UTC", at: Date.UTC(2026, 11, 21, 12) },
]

const $worldMapDemo: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.background,
  borderRadius: theme.radius.md,
  overflow: "hidden",
  position: "relative",
})

const $worldMapOverlay: ViewStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }

const $rulerDemo: ThemedStyle<ViewStyle> = (theme) => ({ marginTop: theme.spacing.sm })
