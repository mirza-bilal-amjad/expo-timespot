import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { SavedCity } from "@/domain/types"

import { storageAdapter } from "./storage"

interface CitiesState {
  cities: SavedCity[]
  addCity: (cityId: string, label?: string) => void
  removeCity: (cityId: string) => void
  reorderCities: (orderedCityIds: string[]) => void
  renameCity: (cityId: string, label: string | undefined) => void
}

export const useCitiesStore = create<CitiesState>()(
  persist(
    (set) => ({
      cities: [],
      addCity: (cityId, label) =>
        set((state) => {
          if (state.cities.some((c) => c.cityId === cityId)) return state
          const order = state.cities.length
          return { cities: [...state.cities, { cityId, addedAt: Date.now(), order, label }] }
        }),
      removeCity: (cityId) =>
        set((state) => ({ cities: state.cities.filter((c) => c.cityId !== cityId) })),
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
      version: 1,
      storage: createJSONStorage(() => storageAdapter),
      migrate: (persisted) => persisted as CitiesState,
    },
  ),
)
