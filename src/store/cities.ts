import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { SavedCity } from "@/domain/types"

import { storageAdapter } from "./storage"

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
      storage: createJSONStorage(() => storageAdapter),
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
