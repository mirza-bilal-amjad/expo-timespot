import { Fragment } from "react"
import { StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { Host, Picker, Switch } from "@expo/ui"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Card } from "./Card"
import { Text } from "./Text"

/**
 * docs/04-screen-specs.md "S7 · Settings". The only file that imports
 * @expo/ui's Picker / Switch (docs/14-ignite-integration.md §6); feature
 * code (SettingsSheet) describes rows as plain data.
 *
 * ~~One Host around @expo/ui's FieldGroup~~ — corrected 2026-09-26. On
 * Android FieldGroup is a Compose `LazyColumn`, and inside the Compose
 * bottom sheet (Sheet → React Native frame → nested Host) a lazy, scrollable
 * list can be measured before it has a bounded height — which Compose
 * treats as a fatal error. Opening Settings crashed the app on Android.
 * Now React Native lays out the groups (hairline Cards, dividers, labels)
 * and @expo/ui supplies only the leaf controls, each in its own small
 * content-sized Host — the same pattern as the search field, which has
 * always worked inside a sheet. No lazy list, no nested scroll container.
 *
 * Each control's Host takes `colorScheme` from TimeSpot's resolved theme,
 * so an in-app Light/Dark override reaches the native control too.
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

// Android's dropdown picker is a Material text field with a ~280 dp minimum
// width; a fixed-width Host constrains it to fit beside its label.
const PICKER_WIDTH = 168

export function SettingsForm({ sections }: SettingsFormProps) {
  const { themed, themeContext } = useAppTheme()

  const renderControl = (row: SettingsRow) => {
    switch (row.kind) {
      case "switch":
        return (
          <Host matchContents colorScheme={themeContext}>
            <Switch value={row.value} onValueChange={row.onChange} />
          </Host>
        )
      case "picker":
        return (
          <Host matchContents={{ vertical: true }} colorScheme={themeContext} style={$pickerHost}>
            <Picker selectedValue={row.value} onValueChange={row.onChange}>
              {row.options.map((o) => (
                <Picker.Item key={o.value} label={o.label} value={o.value} />
              ))}
            </Picker>
          </Host>
        )
      case "info":
        return <Text preset="default" text={row.value} style={themed($infoValue)} />
    }
  }

  return (
    <View style={themed($form)}>
      {sections.map((section) => (
        <View key={section.key} style={themed($section)}>
          <Text preset="caption" text={section.title} style={themed($sectionTitle)} />
          <Card interactive={false} style={themed($group)}>
            {section.rows.map((row, index) => (
              <Fragment key={row.key}>
                {index > 0 && <View style={themed($divider)} />}
                <View style={themed($row)}>
                  <Text preset="default" text={row.label} style={$label} numberOfLines={1} />
                  {renderControl(row)}
                </View>
              </Fragment>
            ))}
          </Card>
        </View>
      ))}
    </View>
  )
}

const $form: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingTop: theme.spacing.sm,
  gap: theme.spacing.lg,
})

const $section: ThemedStyle<ViewStyle> = (theme) => ({ gap: theme.spacing.xs })

const $sectionTitle: ThemedStyle<TextStyle> = (theme) => ({ paddingHorizontal: theme.spacing.md })

const $group: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.md,
  backgroundColor: theme.colors.background,
})

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  minHeight: theme.spacing.xxl,
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.sm,
  paddingVertical: theme.spacing.xs,
})

const $label: TextStyle = { flex: 1 }

const $divider: ThemedStyle<ViewStyle> = (theme) => ({
  height: StyleSheet.hairlineWidth,
  backgroundColor: theme.colors.separator,
})

const $infoValue: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textDim })

const $pickerHost: ViewStyle = { width: PICKER_WIDTH }
