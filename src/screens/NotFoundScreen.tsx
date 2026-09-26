import { TextStyle, ViewStyle } from "react-native"
import { Link } from "expo-router"
import Head from "expo-router/head"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * docs/07-responsive-strategy.md §4: no soft-404s. The static export writes
 * this as `+not-found.html`, which the host serves with a real 404 status
 * for any unknown path — `/time/not-a-city` included — and `noindex` keeps
 * it out of the index either way.
 */
export function NotFoundScreen() {
  const { themed } = useAppTheme()
  return (
    <Screen
      preset="fixed"
      contentContainerStyle={themed($screen)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Head>
        <title>{translate("cityPage:notFoundTitle")}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Text preset="heading" tx="cityPage:notFoundTitle" role="heading" aria-level={1} />
      <Text preset="default" tx="cityPage:notFoundBody" style={themed($body)} />
      <Link href="/" asChild>
        <Button preset="pill" size="lg" tx="cityPage:home" />
      </Link>
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: theme.spacing.md,
  padding: theme.spacing.gutter,
  backgroundColor: theme.colors.background,
})

const $body: ThemedStyle<TextStyle> = (theme) => ({
  color: theme.colors.textDim,
  textAlign: "center",
})
