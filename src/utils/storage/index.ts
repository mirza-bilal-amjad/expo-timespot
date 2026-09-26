import { Platform } from "react-native"
import { MMKV } from "react-native-mmkv"

/**
 * The web static render (Node, no `window`) has no localStorage, and
 * react-native-mmkv's web build throws on any access there — which made
 * every statically rendered page (the ThemeProvider reads the stored theme)
 * silently fall back to client rendering (docs/10 tasks 6.3, 6.5). On the
 * server, storage is an empty, inert stand-in: nothing is persisted at
 * build time, and nothing should be.
 */
function createServerStorage(): MMKV {
  const noop = () => {}
  return {
    getString: () => undefined,
    getNumber: () => undefined,
    getBoolean: () => undefined,
    getBuffer: () => undefined,
    contains: () => false,
    getAllKeys: () => [],
    set: noop,
    delete: noop,
    clearAll: noop,
    recrypt: noop,
    trim: noop,
    addOnValueChangedListener: () => ({ remove: noop }),
  } as unknown as MMKV
}

const isServer = Platform.OS === "web" && typeof window === "undefined"

export const storage = isServer ? createServerStorage() : new MMKV()

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null
  } catch {
    // not sure why this would fail... even reading the RN docs I'm unclear
    return null
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  let almostThere: string | null = null
  try {
    almostThere = loadString(key)
    return JSON.parse(almostThere ?? "") as T
  } catch {
    return (almostThere as T) ?? null
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    storage.delete(key)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    storage.clearAll()
  } catch {}
}
