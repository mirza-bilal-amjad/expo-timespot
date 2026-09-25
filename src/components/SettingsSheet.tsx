import Constants from "expo-constants"

import { translate } from "@/i18n/translate"
import { usePrefsStore } from "@/store/prefs"
import { useAppTheme } from "@/theme/context"

import { SettingsForm, SettingsSection } from "./SettingsForm"
import { Sheet } from "./Sheet"

/**
 * docs/04-screen-specs.md "S7 · Settings (sheet)", opened from the S2 app
 * mark. Only settings that do something ship:
 *
 * - Theme writes Ignite's own `ignite.themeScheme` override (the one the
 *   ThemeProvider actually reads) — `prefs.theme` was never wired to it.
 * - 24-hour time writes `prefs.timeFormat`, the same value the S2 pill does.
 *
 * "Show seconds on the list" and "day/night style" from the spec are left
 * out until the list can render them; a switch that does nothing is worse
 * than no switch.
 */
export interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ThemeChoice = "system" | "light" | "dark"

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { themeOverride, setThemeContextOverride } = useAppTheme()
  const { prefs, setPrefs } = usePrefsStore()

  const sections: SettingsSection[] = [
    {
      key: "appearance",
      title: translate("settings:appearance"),
      rows: [
        {
          kind: "picker",
          key: "theme",
          label: translate("settings:theme"),
          value: themeOverride ?? "system",
          options: [
            { value: "system", label: translate("settings:themeSystem") },
            { value: "light", label: translate("settings:themeLight") },
            { value: "dark", label: translate("settings:themeDark") },
          ],
          onChange: (v) => {
            const choice = v as ThemeChoice
            setThemeContextOverride(choice === "system" ? undefined : choice)
          },
        },
      ],
    },
    {
      key: "time",
      title: translate("settings:time"),
      rows: [
        {
          kind: "switch",
          key: "24h",
          label: translate("settings:use24Hour"),
          value: prefs.timeFormat === "24h",
          onChange: (on) => setPrefs({ timeFormat: on ? "24h" : "12h" }),
        },
      ],
    },
    {
      key: "about",
      title: translate("settings:about"),
      rows: [
        {
          kind: "info",
          key: "version",
          label: translate("settings:version"),
          value: Constants.expoConfig?.version ?? "—",
        },
        {
          kind: "info",
          key: "cities",
          label: translate("settings:cityData"),
          value: "GeoNames · CC BY 4.0",
        },
        {
          kind: "info",
          key: "map",
          label: translate("settings:mapData"),
          value: `Natural Earth · ${translate("settings:publicDomain")}`,
        },
        {
          kind: "info",
          key: "font",
          label: translate("settings:typeface"),
          value: "Space Grotesk · OFL",
        },
      ],
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={translate("settings:title")}>
      <SettingsForm sections={sections} />
    </Sheet>
  )
}
