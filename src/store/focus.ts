import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { storageAdapter } from "./storage"

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
      storage: createJSONStorage(() => storageAdapter),
      migrate: (persisted) => persisted as FocusState,
    },
  ),
)
