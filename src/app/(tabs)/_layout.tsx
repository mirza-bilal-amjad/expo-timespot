import { Platform, View, ViewStyle } from "react-native"
import { Href, Slot, usePathname, useRouter } from "expo-router"

import { EntranceView } from "@/components/EntranceView"
import { TabBar, TabBarItem } from "@/components/TabBar"
import { useShouldPlayEntrance } from "@/hooks/useShouldPlayEntrance"
import { translate } from "@/i18n/translate"
import { $styles } from "@/theme/styles"

/**
 * docs/04-screen-specs.md route map. A hand-rolled floating tab bar over
 * `<Slot>` rather than expo-router's `Tabs` — the shape language is
 * brand-critical (docs/03-component-library.md's @expo/ui boundary table)
 * and a bespoke pill bar is simpler to get pixel-exact than fighting the
 * built-in tab bar's renderer. docs/07-responsive-strategy.md's swap to a
 * header nav at the `lg` breakpoint isn't implemented yet — out of scope
 * for task 3.4, which only requires the native/mobile-width floating bar.
 */

// docs/08-motion-spec.md §7: "Tab bar | 160ms | opacity + translateY 16→0, 320ms."
const TAB_BAR_ENTRANCE_DELAY_MS = 160
const TAB_BAR_ENTRANCE_DISTANCE = 16

export default function TabsLayout() {
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
    <View style={$container}>
      <Slot />
      <EntranceView
        play={shouldPlayEntrance}
        delayMs={TAB_BAR_ENTRANCE_DELAY_MS}
        distance={TAB_BAR_ENTRANCE_DISTANCE}
        style={$tabBarLayer}
      >
        <TabBar
          items={tabs}
          activeKey={pathname}
          onSelect={(key) => router.navigate(key as Href)}
        />
      </EntranceView>
    </View>
  )
}

const $container: ViewStyle = { flex: 1 }

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
