import { View, ViewStyle } from "react-native"
import { Href, Slot, usePathname, useRouter } from "expo-router"

import { TabBar, TabBarItem } from "@/components/TabBar"
import { translate } from "@/i18n/translate"

/**
 * docs/04-screen-specs.md route map. A hand-rolled floating tab bar over
 * `<Slot>` rather than expo-router's `Tabs` — the shape language is
 * brand-critical (docs/03-component-library.md's @expo/ui boundary table)
 * and a bespoke pill bar is simpler to get pixel-exact than fighting the
 * built-in tab bar's renderer. docs/07-responsive-strategy.md's swap to a
 * header nav at the `lg` breakpoint isn't implemented yet — out of scope
 * for task 3.4, which only requires the native/mobile-width floating bar.
 */

const TABS: TabBarItem[] = [
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

export default function TabsLayout() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <View style={$container}>
      <Slot />
      <TabBar items={TABS} activeKey={pathname} onSelect={(key) => router.navigate(key as Href)} />
    </View>
  )
}

const $container: ViewStyle = { flex: 1 }
