import { create } from "zustand"
import { persist } from "zustand/middleware"

import { getCityById } from "@/domain/cities/search"

import { guardedStorage, isRecord, type Sanitized } from "./persistence"

interface FocusState {
  focusedCityId: string | null
  setFocusedCityId: (cityId: string | null) => void
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set) => ({
      focusedCityId: null,
      setFocusedCityId: (cityId) => set({ focusedCityId: cityId }),
    }),
    {
      name: "ts.focus.v1",
      version: 1,
      storage: guardedStorage(1, sanitizeFocus),
      migrate: (persisted) => persisted as FocusState,
    },
  ),
)

/** A focus on a city the dataset doesn't have is cleared (the screens fall
 * back to the device's own city). */
export function sanitizeFocus(state: unknown): Sanitized<Pick<FocusState, "focusedCityId">> {
  if (!isRecord(state)) return null
  const id = state.focusedCityId
  if (id === null || id === undefined) return { state: { focusedCityId: null }, repaired: false }
  if (typeof id === "string" && getCityById(id))
    return { state: { focusedCityId: id }, repaired: false }
  return { state: { focusedCityId: null }, repaired: true }
}
