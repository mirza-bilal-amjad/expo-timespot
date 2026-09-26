import { Fragment } from "react"
import { StyleSheet, TextStyle, View, ViewStyle } from "react-native"

import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Sheet } from "./Sheet"
import { Text } from "./Text"

/**
 * docs/07-responsive-strategy.md §4 — the `?` overlay (task 6.8). The same
 * table the listener implements (utils/shortcuts.ts), as key caps beside
 * what they do. A sheet like every other overlay, so it closes on Esc and
 * holds focus the same way.
 *
 * Key caps are legends, not values: "1" here never changes or ticks, which
 * is what <Numeral> exists for (CLAUDE.md rule 4), so they are plain Text.
 */
export interface ShortcutsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Row {
  key: string
  /** Alternatives, each a chord: [["↑"], ["↓"]]. */
  keys: string[][]
  /** The same, for a screen reader. */
  spoken: string[][]
  action: string
}

function rows(): Row[] {
  const k = (name: string) => translate(`shortcuts:${name}` as never)
  const single = (cap: string, spoken = cap) => ({ keys: [[cap]], spoken: [[spoken]] })
  return [
    { key: "search", ...single("/", k("keySlash")), action: k("search") },
    {
      key: "tabs",
      keys: [["1"], ["2"], ["3"]],
      spoken: [["1"], ["2"], ["3"]],
      action: k("tabs"),
    },
    {
      key: "select",
      keys: [["↑"], ["↓"]],
      spoken: [[k("keyUp")], [k("keyDown")]],
      action: k("select"),
    },
    { key: "open", ...single(k("keyEnter")), action: k("open") },
    {
      key: "hour",
      keys: [["←"], ["→"]],
      spoken: [[k("keyLeft")], [k("keyRight")]],
      action: k("hour"),
    },
    {
      key: "zone",
      // Drawn as one chord, "Shift ← →"; spoken as the two it is.
      keys: [[k("keyShift"), "←", "→"]],
      spoken: [
        [k("keyShift"), k("keyLeft")],
        [k("keyShift"), k("keyRight")],
      ],
      action: k("zone"),
    },
    { key: "theme", ...single("T"), action: k("theme") },
    { key: "timeFormat", ...single("H"), action: k("timeFormat") },
    { key: "close", ...single(k("keyEsc")), action: k("close") },
    { key: "help", ...single("?", k("keyQuestion")), action: k("help") },
  ]
}

export function ShortcutsSheet({ open, onOpenChange }: ShortcutsSheetProps) {
  const { themed } = useAppTheme()
  const or = ` ${translate("shortcuts:orKeys")} `

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={translate("shortcuts:title")}>
      <View style={themed($list)}>
        {rows().map((row) => (
          <View
            key={row.key}
            style={themed($row)}
            accessible
            accessibilityLabel={`${row.spoken.map((chord) => chord.join(" + ")).join(or)}: ${row.action}`}
          >
            <View style={themed($keys)}>
              {row.keys.map((chord, i) => (
                <Fragment key={i}>
                  {chord.map((cap) => (
                    <View key={cap} style={themed($cap)}>
                      <Text preset="formLabel" text={cap} style={themed($capText)} />
                    </View>
                  ))}
                  {i < row.keys.length - 1 && <View style={themed($gap)} />}
                </Fragment>
              ))}
            </View>
            <Text preset="default" text={row.action} style={$action} />
          </View>
        ))}
      </View>
    </Sheet>
  )
}

const $list: ThemedStyle<ViewStyle> = (theme) => ({
  paddingHorizontal: theme.spacing.gutter,
  paddingBottom: theme.spacing.lg,
})

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.md,
  paddingVertical: theme.spacing.xs,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: theme.colors.separator,
})

// Wide enough for the longest chord ("Shift ← →"), so the actions line up
// in one column.
const $keys: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing.xxs,
  width: theme.spacing.cardWidth / 2,
})

const $cap: ThemedStyle<ViewStyle> = (theme) => ({
  minWidth: theme.spacing.xl,
  paddingHorizontal: theme.spacing.xs,
  paddingVertical: theme.spacing.xxxs,
  alignItems: "center",
  borderRadius: theme.radius.xs,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.border,
  backgroundColor: theme.colors.controlBackground,
})

const $capText: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.text })

const $gap: ThemedStyle<ViewStyle> = (theme) => ({ width: theme.spacing.xs })

const $action: TextStyle = { flex: 1 }
