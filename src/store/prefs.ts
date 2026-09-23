import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { Prefs } from "@/domain/types"

import { storageAdapter } from "./storage"

interface PrefsState {
  prefs: Prefs
  setPrefs: (prefs: Partial<Prefs>) => void
}

const defaultPrefs: Prefs = {
  timeFormat: "24h",
  theme: "system",
  showSecondsOnList: false,
  dayNightStyle: "icon",
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      prefs: defaultPrefs,
      setPrefs: (partial) => set((state) => ({ prefs: { ...state.prefs, ...partial } })),
    }),
    {
      name: "ts.prefs.v1",
      version: 1,
      storage: createJSONStorage(() => storageAdapter),
      migrate: (persisted) => persisted as PrefsState,
    },
  ),
)
