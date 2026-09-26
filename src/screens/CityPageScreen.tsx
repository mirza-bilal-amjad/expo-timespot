import { useState } from "react"
import { StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { Link } from "expo-router"
import Head from "expo-router/head"

import { Button } from "@/components/Button"
import { Numeral } from "@/components/Numeral"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { getNeighbours, getReferenceCities } from "@/domain/cities/seoPages"
import { formatDayLength, getSunTimes } from "@/domain/sun/sun"
import { getDifference } from "@/domain/time/diff"
import { getDstStatus, getYearOffsets } from "@/domain/time/dst"
import { spokenClock } from "@/domain/time/speech"
import { formatOffset, getNextTransition, getZonedTime } from "@/domain/time/zone"
import type { City, Prefs } from "@/domain/types"
import { useBreakpoint } from "@/hooks/useBreakpoint"
import { useClock } from "@/hooks/useClock"
import { useIsHydrated } from "@/hooks/useIsHydrated"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { cityPagePath, OG_IMAGE_SIZE, ogImagePath, SITE_URL } from "@/utils/site"

/**
 * docs/04-screen-specs.md S6 · the public city page (web only), statically
 * generated for the top 1,000 cities (task 6.3), with its SEO head (6.4).
 *
 * The page is rendered at build time — crawlers and no-JS visitors get a
 * complete answer — and hydrated without a mismatch: the first client
 * render must reproduce the static HTML exactly, so it uses the *build*
 * time, read back from the `data-t` stamp the static render leaves in the
 * page (`BuildTimeStamp`). The root layout then remounts the tree after
 * hydration, in the layout effect before paint, and from then on the page
 * runs on the live clock — a stale time is never on screen.
 */

const BUILD_TIME_ID = "ts-build-time"
const PREFS_24H: Prefs = {
  timeFormat: "24h",
  theme: "system",
  showSecondsOnList: false,
  dayNightStyle: "icon",
}

function readBuildTime(): number | null {
  if (typeof document === "undefined") return null
  const stamp = document.getElementById(BUILD_TIME_ID)?.dataset.t
  return stamp ? Number(stamp) : null
}

/** "UTC+9", or "UTC−5 · UTC−4 with DST" — what the share image says (6.6). */
function yearOffsetsLabel(now: number, zone: string): string {
  const { standard, daylight } = getYearOffsets(now, zone)
  if (daylight === null) return formatOffset(standard)
  return translate("cityPage:ogOffsets", {
    standard: formatOffset(standard),
    daylight: formatOffset(daylight),
  })
}

function formatDuration(minutes: number): string {
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `${h}h` : h === 0 ? `${m}m` : `${h}h ${m}m`
}

export function CityPageScreen({ city }: { city: City }) {
  const { themed } = useAppTheme()
  const { gutter, atLeast } = useBreakpoint()
  const hydrated = useIsHydrated()
  const [buildNow] = useState(() => readBuildTime() ?? Date.now())
  const liveNow = useClock({ active: hydrated })
  const now = hydrated ? liveNow : buildNow
  // Until hydration the times are the *build* time: in the HTML for
  // crawlers and the hydration render, but invisible, so a visitor waiting
  // on JavaScript never reads a stale clock (S6 "never ship a stale time").
  const stale = !hydrated

  const time = getZonedTime(now, city.zone, PREFS_24H)
  const place = `${city.name}, ${city.country}`
  const title = translate("cityPage:pageTitle", { place })
  const description = translate("cityPage:description", { place, offset: time.offsetLabel })
  const url = `${SITE_URL}${cityPagePath(city.slug)}`
  const image = `${SITE_URL}${ogImagePath(city.slug)}`
  const imageAlt = translate("cityPage:ogAlt", {
    place,
    offsets: yearOffsetsLabel(buildNow, city.zone),
  })

  const dst = getDstStatus(now, city.zone)
  const transition = dst === "none" ? null : getNextTransition(city.zone, now)
  const sun = getSunTimes(city.lat, city.lon, new Date(now), city.zone)
  const at = (ms: number) => getZonedTime(ms, city.zone, PREFS_24H)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        "name": title,
        description,
        "inLanguage": "en",
        "dateModified": new Date(buildNow).toISOString(),
        "primaryImageOfPage": image,
        "about": { "@id": `${url}#place` },
      },
      {
        "@type": "Place",
        "@id": `${url}#place`,
        "name": city.name,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": city.name,
          ...(city.admin1 ? { addressRegion: city.admin1 } : null),
          "addressCountry": city.countryCode,
        },
        "geo": { "@type": "GeoCoordinates", "latitude": city.lat, "longitude": city.lon },
      },
    ],
  }

  const heroSize = atLeast("lg") ? "hero" : atLeast("md") ? "displayXl" : "display"

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screen)} safeAreaEdges={["top"]}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content={String(OG_IMAGE_SIZE.width)} />
        <meta property="og:image:height" content={String(OG_IMAGE_SIZE.height)} />
        <meta property="og:image:alt" content={imageAlt} />
        <meta name="twitter:card" content="summary_large_image" />
        {/* Helmet takes a script's body as a string child (it ignores
         dangerouslySetInnerHTML). `<` is escaped so no string in the data
         can close the tag. */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd).replace(/</g, "\\u003c")}
        </script>
      </Head>
      <BuildTimeStamp at={buildNow} />

      <View style={[themed($column), { paddingHorizontal: gutter }]}>
        <Text preset="formLabel" text={place} style={themed($eyebrow)} />
        {/* The H1 is the clock itself (S6). */}
        <View
          role="heading"
          aria-level={1}
          style={stale && $pending}
          accessibilityLabel={translate("cityPage:heroLabel", {
            city: city.name,
            time: spokenClock(getZonedTime(now, city.zone, { ...PREFS_24H, timeFormat: "12h" })),
          })}
        >
          <Numeral value={`${time.hours}:${time.minutes}:${time.seconds}`} size={heroSize} />
        </View>
        <Text preset="heading" text={time.dateLabel} style={stale && $pending} />

        <View style={themed($facts)}>
          <Fact
            label={translate("cityPage:timeZone")}
            value={`${time.offsetLabel} · ${city.zone}`}
          />
          <Fact
            label={translate("cityPage:dst")}
            value={translate(
              dst === "none"
                ? "cityPage:dstNone"
                : dst === "daylight"
                  ? "cityPage:dstDaylight"
                  : "cityPage:dstStandard",
            )}
          />
          {dst !== "none" && (
            <Fact
              label={translate("cityPage:nextChange")}
              value={
                transition
                  ? translate(
                      transition.deltaMinutes > 0
                        ? "cityPage:clocksForward"
                        : "cityPage:clocksBack",
                      {
                        date: at(transition.at).dateLabel,
                        amount: formatDuration(transition.deltaMinutes),
                      },
                    )
                  : translate("cityPage:noChange")
              }
            />
          )}
          <Fact
            label={translate("cityPage:sun")}
            value={
              sun.kind === "polar-night"
                ? translate("cityPage:polarNight")
                : sun.kind === "midnight-sun"
                  ? translate("cityPage:midnightSun")
                  : `${at(sun.sunrise!.getTime()).display} – ${at(sun.sunset!.getTime()).display} (${formatDayLength(sun.dayLengthMinutes)})`
            }
          />
        </View>

        <Section title={translate("cityPage:differences")}>
          {getReferenceCities(city).map((ref) => {
            const diff = getDifference(ref.zone, city.zone, now).minutes
            return (
              <View key={ref.id} style={themed($row)}>
                <Text preset="default" text={ref.name} style={$grow} />
                <Text
                  preset="formHelper"
                  text={
                    diff === 0
                      ? translate("cityPage:same")
                      : translate(diff > 0 ? "cityPage:ahead" : "cityPage:behind", {
                          amount: formatDuration(diff),
                        })
                  }
                  style={themed($dim)}
                />
                <Numeral
                  value={getZonedTime(now, ref.zone, PREFS_24H).display}
                  size="numeralMd"
                  style={stale && $pending}
                />
              </View>
            )
          })}
        </Section>

        <Section title={translate("cityPage:nearby")}>
          <View style={themed($links)}>
            {getNeighbours(city, now).map((n) => (
              <Link
                key={n.id}
                href={{ pathname: "/time/[slug]", params: { slug: n.slug } }}
                style={themed($link)}
              >
                {n.name}
              </Link>
            ))}
          </View>
        </Section>

        {/* The CTA, below the fold (S6). Store links join it with task 7.4. */}
        <View style={themed($cta)}>
          <Text preset="default" tx="cityPage:openAppHint" style={themed($dim)} />
          <Link href="/" asChild>
            <Button preset="pill" size="lg" tx="cityPage:openApp" />
          </Link>
        </View>
      </View>
    </Screen>
  )
}

/** The build time, left in the static HTML for the hydration render to
 * read back (see the component comment). Renders nothing visible. */
function BuildTimeStamp({ at }: { at: number }) {
  return (
    <View
      nativeID={BUILD_TIME_ID}
      aria-hidden
      style={$stamp}
      {...({ dataSet: { t: String(at) } } as object)}
    />
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  const { themed } = useAppTheme()
  return (
    <View style={themed($fact)}>
      <Text preset="formHelper" text={label} style={themed($dim)} />
      <Text preset="default" text={value} />
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { themed } = useAppTheme()
  return (
    <View style={themed($section)}>
      <Text preset="subheading" text={title} role="heading" aria-level={2} />
      {children}
    </View>
  )
}

const $screen: ThemedStyle<ViewStyle> = (theme) => ({
  backgroundColor: theme.colors.background,
  paddingBottom: theme.spacing.xxxl,
})

const $column: ThemedStyle<ViewStyle> = (theme) => ({
  width: "100%",
  maxWidth: theme.spacing.container,
  alignSelf: "center",
  paddingTop: theme.spacing.xl,
  gap: theme.spacing.md,
})

const $eyebrow: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textDim })

const $facts: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: theme.spacing.lg,
  paddingVertical: theme.spacing.lg,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.separator,
})

// Two facts share a 320 card's width before they wrap.
const $fact: ThemedStyle<ViewStyle> = (theme) => ({
  gap: theme.spacing.xxs,
  minWidth: theme.spacing.cardWidth / 2,
})

const $section: ThemedStyle<ViewStyle> = (theme) => ({
  gap: theme.spacing.sm,
  paddingTop: theme.spacing.lg,
})

const $row: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.md,
  paddingVertical: theme.spacing.xs,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.separator,
})

const $grow: TextStyle = { flex: 1 }

const $dim: ThemedStyle<TextStyle> = (theme) => ({ color: theme.colors.textDim })

const $links: ThemedStyle<ViewStyle> = (theme) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: theme.spacing.sm,
})

const $link: ThemedStyle<TextStyle> = (theme) => ({
  fontFamily: theme.typography.primary.normal,
  color: theme.colors.text,
  textDecorationLine: "underline",
  paddingVertical: theme.spacing.xs,
  paddingHorizontal: theme.spacing.xxs,
})

const $cta: ThemedStyle<ViewStyle> = (theme) => ({
  marginTop: theme.spacing.xxl,
  alignItems: "flex-start",
  gap: theme.spacing.sm,
})

const $stamp: ViewStyle = { display: "none" }

// Unannotated: it applies to the heading View and the date Text alike.
const $pending = { opacity: 0 }
