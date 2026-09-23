import { storage } from "@/utils/storage"

/**
 * docs/06-data-model.md §2. react-native-mmkv ships a real web implementation
 * (backed by localStorage) that Metro resolves automatically, so the same
 * MMKV instance backs every platform — no separate web adapter needed.
 * Wrapped in try/catch for Safari private mode, where localStorage throws.
 */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const storageAdapter: StorageAdapter = {
  getItem(key) {
    try {
      return storage.getString(key) ?? null
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      storage.set(key, value)
    } catch {}
  },
  removeItem(key) {
    try {
      storage.delete(key)
    } catch {}
  },
}
