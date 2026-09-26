import { create } from "zustand"
import { persist } from "zustand/middleware"

import { getCityById } from "@/domain/cities/search"
import type { SavedCity } from "@/domain/types"

import { guardedStorage, isRecord, type Sanitized } from "./persistence"

interface CitiesState {
  cities: SavedCity[]
  /** Set once, permanently, the first time first-launch seeding (task 3.9)
   * runs — distinct from `cities.length === 0`, which also describes a user
   * who deleted every city on purpose and should see the real empty state,
   * not get reseeded. */
  hasSeeded: boolean
  markSeeded: () => void
  addCity: (cityId: string, label?: string) => void
  removeCity: (cityId: string) => void
  /** Reinserts an exact `SavedCity` record (its own `order` included) rather
   * than appending — task 3.6's undo restores *position*, not just the city,
   * which `addCity` (always appends at the end) can't do. */
  restoreCity: (city: SavedCity) => void
  reorderCities: (orderedCityIds: string[]) => void
  renameCity: (cityId: string, label: string | undefined) => void
}

export const useCitiesStore = create<CitiesState>()(
  persist(
    (set) => ({
      cities: [],
      hasSeeded: false,
      markSeeded: () => set({ hasSeeded: true }),
      addCity: (cityId, label) =>
        set((state) => {
          if (state.cities.some((c) => c.cityId === cityId)) return state
          const order = state.cities.length
          return { cities: [...state.cities, { cityId, addedAt: Date.now(), order, label }] }
        }),
      removeCity: (cityId) =>
        set((state) => ({ cities: state.cities.filter((c) => c.cityId !== cityId) })),
      restoreCity: (city) =>
        set((state) => {
          if (state.cities.some((c) => c.cityId === city.cityId)) return state
          return { cities: [...state.cities, city] }
        }),
      reorderCities: (orderedCityIds) =>
        set((state) => {
          const byId = new Map(state.cities.map((c) => [c.cityId, c]))
          const cities = orderedCityIds
            .map((cityId, order) => {
              const city = byId.get(cityId)
              return city ? { ...city, order } : null
            })
            .filter((c): c is SavedCity => c !== null)
          return { cities }
        }),
      renameCity: (cityId, label) =>
        set((state) => ({
          cities: state.cities.map((c) => (c.cityId === cityId ? { ...c, label } : c)),
        })),
    }),
    {
      name: "ts.cities.v1",
      version: 2,
      storage: guardedStorage(2, sanitizeCities),
      // v1 had no seeding concept. Existing non-empty state predates it and
      // must not be reseeded on top; existing empty state (a fresh v1
      // install that hadn't added anything yet) should still get seeded.
      migrate: (persisted) => {
        const state = persisted as CitiesState
        return { ...state, hasSeeded: state.cities.length > 0 }
      },
    },
  ),
)

type PersistedCities = Pick<CitiesState, "cities" | "hasSeeded">

/**
 * Keeps every well-formed row and drops the rest (not a dataset city, a
 * duplicate, no id) — one bad row never costs the whole list. `null`, and
 * so a reset, only when there is no list at all.
 */
export function sanitizeCities(state: unknown): Sanitized<PersistedCities> {
  if (!isRecord(state) || !Array.isArray(state.cities)) return null
  let repaired = false
  const seen = new Set<string>()
  const cities: SavedCity[] = []
  for (const item of state.cities) {
    if (
      !isRecord(item) ||
      typeof item.cityId !== "string" ||
      seen.has(item.cityId) ||
      !getCityById(item.cityId)
    ) {
      repaired = true
      continue
    }
    seen.add(item.cityId)
    const orderOk = typeof item.order === "number" && Number.isFinite(item.order)
    const addedAtOk = typeof item.addedAt === "number" && Number.isFinite(item.addedAt)
    const labelOk = item.label === undefined || typeof item.label === "string"
    if (!orderOk || !addedAtOk || !labelOk) repaired = true
    cities.push({
      cityId: item.cityId,
      order: orderOk ? (item.order as number) : cities.length,
      addedAt: addedAtOk ? (item.addedAt as number) : 0,
      label: labelOk ? (item.label as string | undefined) : undefined,
    })
  }
  const hasSeeded = typeof state.hasSeeded === "boolean" ? state.hasSeeded : cities.length > 0
  return { state: { cities, hasSeeded }, repaired }
}
