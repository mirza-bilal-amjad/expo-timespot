import { Platform, ViewStyle } from "react-native"
import { Href, Tabs, usePathname, useRouter } from "expo-router"

import { EntranceView } from "@/components/EntranceView"
import { TabBar, TabBarItem } from "@/components/TabBar"
import { assertDatasetLoaded } from "@/domain/cities/search"
import { useShouldPlayEntrance } from "@/hooks/useShouldPlayEntrance"
import { translate } from "@/i18n/translate"
import { ErrorScreen } from "@/screens/ErrorScreen"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"

// docs/10-implementation-plan.md task 5.7: any error in the tab layout or a
// tab screen lands on a real message with a retry (Expo Router wraps each
// route, this layout included, in its exported ErrorBoundary).
export { ErrorScreen as ErrorBoundary }

/**
 * docs/04-screen-specs.md route map. Expo Router's `Tabs` navigator, with
 * TimeSpot's own floating pill bar as its `tabBar` — the shape language is
 * brand-critical (docs/03-component-library.md's @expo/ui boundary table),
 * so the navigator's built-in bar is never drawn.
 *
 * ~~A bare `<Slot>`~~ — replaced 2026-09-26. A Slot keeps only the current
 * route mounted, so every tab switch rebuilt the whole screen: returning to
 * the list re-mounted every row, gesture handler and native menu (~90 ms of
 * render on desktop web, several times that in a debug build on a phone —
 * reported as the list feeling "heavy"). `Tabs` keeps a visited screen
 * mounted, and `freezeOnBlur` stops a hidden one rendering at all — the
 * clock ticks every second, and a hidden screen must not pay for it.
 *
 * docs/07-responsive-strategy.md's swap to a header nav at the `lg`
 * breakpoint isn't implemented yet (Phase 6).
 */

// docs/08-motion-spec.md §7: "Tab bar | 160ms | opacity + translateY 16→0, 320ms."
const TAB_BAR_ENTRANCE_DELAY_MS = 160
const TAB_BAR_ENTRANCE_DISTANCE = 16

export default function TabsLayout() {
  // Every tab reads the city dataset; unusable data fails here, into the
  // boundary above, instead of as a crash deep in a screen.
  assertDatasetLoaded()
  const { theme } = useAppTheme()

  return (
    <Tabs
      tabBar={() => <FloatingTabBar />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        animation: "none",
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="clock" />
      <Tabs.Screen name="map" />
    </Tabs>
  )
}

function FloatingTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const shouldPlayEntrance = useShouldPlayEntrance("tabBar")

  // Built inside the component, not at module scope: this module is
  // imported (and evaluated) well before i18next.init() resolves in the
  // root layout, so a module-level `translate()` call permanently freezes
  // in whatever i18next returns pre-init (the raw key, unhelpfully) — this
  // component only ever renders after that gate passes.
  const tabs: TabBarItem[] = [
    {
      key: "/",
      icon: "search",
      label: translate("tabBar:list"),
      accessibilityLabel: translate("tabBar:list"),
    },
    {
      key: "/clock",
      icon: "clock",
      label: translate("tabBar:clock"),
      accessibilityLabel: translate("tabBar:clock"),
    },
    {
      key: "/map",
      icon: "globe",
      label: translate("tabBar:map"),
      accessibilityLabel: translate("tabBar:map"),
    },
  ]

  return (
    <EntranceView
      play={shouldPlayEntrance}
      delayMs={TAB_BAR_ENTRANCE_DELAY_MS}
      distance={TAB_BAR_ENTRANCE_DISTANCE}
      style={$tabBarLayer}
    >
      <TabBar items={tabs} activeKey={pathname} onSelect={(key) => router.navigate(key as Href)} />
    </EntranceView>
  )
}

// The layer <TabBar> positions itself against.
// Native: the whole screen (RN resolves `position: absolute` against the
// immediate parent, so a collapsed wrapper would misplace the bar), made
// touch-transparent with `box-none`, which native honours.
// Web: TabBar is `position: fixed` to the viewport, so the layer needs no
// size at all — and must have none. Reanimated's web Animated.View flattens
// its styles to inline CSS, which drops react-native-web's `box-none`
// emulation; a full-screen layer then swallowed every click above the bar.
const $tabBarLayer: ViewStyle =
  Platform.OS === "web"
    ? { position: "absolute", left: 0, right: 0, bottom: 0, height: 0 }
    : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, ...$styles.passThrough }
