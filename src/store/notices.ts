import { create } from "zustand"

import { storageAdapter } from "./storage"

/**
 * docs/10-implementation-plan.md task 5.7. Things the app recovered from on
 * its own but the user should hear about, each shown once as a dismissible
 * notice (`<SystemNotice>` on the list screen):
 *
 *  - `storageReset` — a saved store was unreadable and started fresh (a copy
 *    kept under `<key>.corrupt`);
 *  - `storageRepaired` — a saved store had bad entries that were dropped;
 *  - `timeEngineDegraded` — this device's `Intl` ignores time zones, so the
 *    app runs on its bundled offset tables (docs/adr/0004).
 *
 * Not persisted — a notice describes this launch. The one exception is
 * `timeEngineDegraded`, a property of the device rather than an event: its
 * dismissal is remembered so it doesn't reappear every launch.
 */

export type Notice =
  | { kind: "storageReset"; key: string }
  | { kind: "storageRepaired"; key: string }
  | { kind: "timeEngineDegraded" }

const DISMISSED_KEY = "ts.notices.dismissed.v1"

const noticeId = (notice: Notice) =>
  "key" in notice ? `${notice.kind}:${notice.key}` : notice.kind

function isPermanentlyDismissed(notice: Notice): boolean {
  if (notice.kind !== "timeEngineDegraded") return false
  return storageAdapter.getItem(DISMISSED_KEY)?.split(",").includes(notice.kind) ?? false
}

interface NoticesState {
  notices: Notice[]
  dismiss: (notice: Notice) => void
}

export const useNoticesStore = create<NoticesState>()((set) => ({
  notices: [],
  dismiss: (notice) => {
    if (notice.kind === "timeEngineDegraded") {
      const dismissed = storageAdapter.getItem(DISMISSED_KEY)?.split(",") ?? []
      storageAdapter.setItem(DISMISSED_KEY, [...new Set([...dismissed, notice.kind])].join(","))
    }
    set((state) => ({ notices: state.notices.filter((n) => noticeId(n) !== noticeId(notice)) }))
  },
}))

/** Queue a notice (once per id). Safe to call before anything renders. */
export function reportNotice(notice: Notice): void {
  if (isPermanentlyDismissed(notice)) return
  useNoticesStore.setState((state) =>
    state.notices.some((n) => noticeId(n) === noticeId(notice))
      ? state
      : { notices: [...state.notices, notice] },
  )
}
