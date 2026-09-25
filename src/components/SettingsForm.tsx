import { ViewStyle } from "react-native"
import { FieldGroup, Host, Picker, Row, Spacer, Switch, Text } from "@expo/ui"

import { useAppTheme } from "@/theme/context"

/**
 * docs/04-screen-specs.md "S7 · Settings": "`@expo/ui` `FieldGroup` — this
 * is exactly the case where native-feeling system controls beat custom
 * ones." The only file that imports @expo/ui's FieldGroup / Picker /
 * Switch (docs/14-ignite-integration.md §6). Feature code (SettingsSheet)
 * describes rows as plain data and never touches @expo/ui.
 *
 * One `<Host>`, mounted here, and it is the theme bridge (§6 rule 3):
 * `colorScheme` follows TimeSpot's resolved theme, not the OS, so a manual
 * Light/Dark override reaches the native controls too. Label colours are
 * passed explicitly as well — on web, @expo/ui's universal `Text` reads the
 * *OS* scheme, not the Host's, so an in-app Dark override left its labels
 * black on black. Fonts and the switch accent stay the platform's own —
 * native feel is the point of using @expo/ui here.
 */

export type SettingsRow =
  | { kind: "switch"; key: string; label: string; value: boolean; onChange: (v: boolean) => void }
  | {
      kind: "picker"
      key: string
      label: string
      value: string
      options: { value: string; label: string }[]
      onChange: (v: string) => void
    }
  | { kind: "info"; key: string; label: string; value: string }

export interface SettingsSection {
  key: string
  title: string
  rows: SettingsRow[]
}

export interface SettingsFormProps {
  sections: SettingsSection[]
}

export function SettingsForm({ sections }: SettingsFormProps) {
  const { theme, themeContext } = useAppTheme()
  const labelText = { color: theme.colors.text }
  const dimText = { color: theme.colors.textDim }

  return (
    <Host style={$host} colorScheme={themeContext}>
      <FieldGroup style={{ backgroundColor: theme.colors.transparent }}>
        {sections.map((section) => (
          <FieldGroup.Section key={section.key} title={section.title}>
            {section.rows.map((row) => {
              switch (row.kind) {
                case "switch":
                  return (
                    <Row key={row.key} alignment="center">
                      <Text textStyle={labelText}>{row.label}</Text>
                      <Spacer flexible />
                      <Switch value={row.value} onValueChange={row.onChange} />
                    </Row>
                  )
                case "picker":
                  return (
                    <Row key={row.key} alignment="center">
                      <Text textStyle={labelText}>{row.label}</Text>
                      <Spacer flexible />
                      <Picker selectedValue={row.value} onValueChange={row.onChange}>
                        {row.options.map((o) => (
                          <Picker.Item key={o.value} label={o.label} value={o.value} />
                        ))}
                      </Picker>
                    </Row>
                  )
                case "info":
                  return (
                    <Row key={row.key} alignment="center">
                      <Text textStyle={labelText}>{row.label}</Text>
                      <Spacer flexible />
                      <Text textStyle={dimText}>{row.value}</Text>
                    </Row>
                  )
              }
            })}
          </FieldGroup.Section>
        ))}
      </FieldGroup>
    </Host>
  )
}

const $host: ViewStyle = { flex: 1 }
