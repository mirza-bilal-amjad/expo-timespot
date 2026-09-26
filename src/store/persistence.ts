import type { PersistStorage, StorageValue } from "zustand/middleware"

import { reportNotice } from "./notices"
import { storageAdapter, type StorageAdapter } from "./storage"

/**
 * docs/06-data-model.md §2 "Migration" + docs/10-implementation-plan.md task
 * 5.7 "corrupt storage". Every store reads through this instead of zustand's
 * bare `createJSONStorage`, which would (a) throw on unreadable JSON and
 * leave the blob to be silently overwritten on the next write, and (b) hand
 * a wrong-shaped but parseable blob straight to the screens, which crash on
 * it.
 *
 * On read:
 *  - unreadable JSON, a missing envelope, a version newer than this build
 *    knows, or a state its sanitizer can't make sense of → the raw blob is
 *    kept under `<key>.corrupt`, the key is cleared, the store starts from
 *    its defaults, and a `storageReset` notice tells the user;
 *  - a state that is mostly right (one bad entry, one unknown value) → the
 *    sanitizer repairs it field by field, and a `storageRepaired` notice
 *    says so. One bad row never costs the whole list.
 */

export type Sanitized<S> = { state: S; repaired: boolean } | null

export type Sanitizer<S> = (state: unknown) => Sanitized<S>

export const CORRUPT_SUFFIX = ".corrupt"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function guardedStorage<S>(
  currentVersion: number,
  sanitize: Sanitizer<S>,
  adapter: StorageAdapter = storageAdapter,
): PersistStorage<S> {
  const quarantine = (name: string, raw: string): null => {
    adapter.setItem(name + CORRUPT_SUFFIX, raw)
    adapter.removeItem(name)
    reportNotice({ kind: "storageReset", key: name })
    return null
  }

  return {
    getItem(name) {
      const raw = adapter.getItem(name)
      if (raw === null) return null
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        return quarantine(name, raw)
      }
      if (!isRecord(parsed) || typeof parsed.version !== "number") return quarantine(name, raw)
      if (parsed.version > currentVersion) return quarantine(name, raw)
      const result = sanitize(parsed.state)
      if (!result) return quarantine(name, raw)
      if (result.repaired) reportNotice({ kind: "storageRepaired", key: name })
      return { state: result.state, version: parsed.version } as StorageValue<S>
    },
    setItem(name, value) {
      adapter.setItem(name, JSON.stringify(value))
    },
    removeItem(name) {
      adapter.removeItem(name)
    },
  }
}
