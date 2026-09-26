import { useLocalSearchParams } from "expo-router"

import { getSeoCities, getSeoCityBySlug } from "@/domain/cities/seoPages"
import { CityPageScreen } from "@/screens/CityPageScreen"
import { NotFoundScreen } from "@/screens/NotFoundScreen"

/** docs/04 S6 — one static page per city, top 1,000 by population. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getSeoCities().map((c) => ({ slug: c.slug }))
}

export default function CityPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const city = getSeoCityBySlug(slug ?? "")
  return city ? <CityPageScreen city={city} /> : <NotFoundScreen />
}
