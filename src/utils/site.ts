/** The public site's origin, for canonical URLs, the sitemap and JSON-LD.
 * Set EXPO_PUBLIC_SITE_URL for a preview deploy; defaults to production. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://timespot.app").replace(
  /\/$/,
  "",
)

export const cityPagePath = (slug: string) => `/time/${slug}`

/** The city page's share image, generated at build (scripts/build-og-images.ts). */
export const ogImagePath = (slug: string) => `/og/${slug}.png`

/** Open Graph's recommended card size. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const
