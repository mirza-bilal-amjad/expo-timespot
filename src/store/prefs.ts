import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Prefs } from "@/domain/types"

import { guardedStorage, isRecord, type Sanitized } from "./persistence"

interface PrefsState {
  prefs: Prefs
  setPrefs: (prefs: Partial<Prefs>) => void
}

const defaultPrefs: Prefs = {
  timeFormat: "24h",
  theme: "system",
  showSecondsOnList: false,
  dayNightStyle: "icon",
  keyboardShortcuts: true,
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
      storage: guardedStorage(1, sanitizePrefs),
      migrate: (persisted) => persisted as PrefsState,
    },
  ),
)

const ALLOWED: { [K in keyof Prefs]: readonly Prefs[K][] } = {
  timeFormat: ["12h", "24h"],
  theme: ["system", "light", "dark"],
  showSecondsOnList: [true, false],
  dayNightStyle: ["icon", "tint"],
  keyboardShortcuts: [true, false],
}

/** Field by field: an unknown value falls back to its default (and counts as
 * a repair); a field this build added since is simply defaulted. */
export function sanitizePrefs(state: unknown): Sanitized<Pick<PrefsState, "prefs">> {
  if (!isRecord(state) || !isRecord(state.prefs)) return null
  const stored = state.prefs
  let repaired = false
  const prefs = { ...defaultPrefs }
  for (const key of Object.keys(ALLOWED) as (keyof Prefs)[]) {
    if (!(key in stored)) continue
    const value = stored[key]
    if ((ALLOWED[key] as readonly unknown[]).includes(value)) {
      ;(prefs as Record<keyof Prefs, unknown>)[key] = value
    } else {
      repaired = true
    }
  }
  return { state: { prefs }, repaired }
}
