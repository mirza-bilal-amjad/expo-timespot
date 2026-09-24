import { useEffect } from "react"

import { getSeedCities } from "@/domain/cities/seed"
import { getDeviceZone } from "@/domain/time/zone"
import { useCitiesStore } from "@/store/cities"
import { useFocusStore } from "@/store/focus"

/**
 * docs/06-data-model.md §2 "First launch" / docs/10-implementation-plan.md
 * task 3.9. Runs once per install: MMKV-backed persist hydrates synchronously
 * (docs/06-data-model.md §2 "Migration"), so `hasSeeded` already reflects the
 * real persisted state by the time this effect's cleanup-free body runs.
 */
export function useSeedFirstLaunch() {
  useEffect(() => {
    const { hasSeeded, markSeeded, addCity } = useCitiesStore.getState()
    if (hasSeeded) return

    const seed = getSeedCities(getDeviceZone())
    for (const city of seed.cities) addCity(city.id)
    if (seed.focusCityId) useFocusStore.getState().setFocusedCityId(seed.focusCityId)
    markSeeded()
  }, [])
}
