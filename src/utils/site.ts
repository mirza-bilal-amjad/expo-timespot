/** The public site's origin, for canonical URLs, the sitemap and JSON-LD.
 * Set EXPO_PUBLIC_SITE_URL for a preview deploy; defaults to production. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://timespot.app").replace(
  /\/$/,
  "",
)

export const cityPagePath = (slug: string) => `/time/${slug}`
