import { create } from "zustand"

/**
 * Task 6.8: `/` opens search from any tab. The search sheet belongs to the
 * list screen, which may not be mounted yet, so the request waits here
 * until the list is focused and takes it.
 */
interface ShortcutRequests {
  searchRequested: boolean
  requestSearch: () => void
  takeSearchRequest: () => boolean
}

export const useShortcutRequests = create<ShortcutRequests>()((set, get) => ({
  searchRequested: false,
  requestSearch: () => set({ searchRequested: true }),
  takeSearchRequest: () => {
    if (!get().searchRequested) return false
    set({ searchRequested: false })
    return true
  },
}))
