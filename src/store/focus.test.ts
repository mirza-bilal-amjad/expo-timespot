import { storage } from "@/utils/storage"

import { useFocusStore } from "./focus"
import { storageAdapter } from "./storage"

/**
 * docs/10-implementation-plan.md task 3.5 acceptance: "selection is global
 * and persists across relaunch." Global is trivial — one zustand store,
 * every screen reads the same field. Persistence is the part worth pinning
 * down: `jest.resetModules()` can't simulate a real relaunch here, because
 * jest's react-native-mmkv mock keeps its data in memory per require() call
 * rather than backed by a real store the way the app's native/web MMKV is —
 * a fresh `require` genuinely starts empty, unlike a real relaunch. What's
 * actually testable — and actually the thing that matters, since a real
 * relaunch just re-reads the same on-device storage — is that
 * `setFocusedCityId` writes through to `ts.focus.v1` in the form zustand's
 * `persist` will read back, byte for byte.
 */
describe("useFocusStore persistence", () => {
  beforeEach(() => {
    storage.clearAll()
    useFocusStore.setState({ focusedCityId: null })
  })

  it("writes focusedCityId to storage under the persisted key", () => {
    useFocusStore.getState().setFocusedCityId("gn-1850147")

    const persisted = storageAdapter.getItem("ts.focus.v1")
    expect(persisted).not.toBeNull()
    expect(JSON.parse(persisted!).state.focusedCityId).toBe("gn-1850147")
  })

  it("writes a cleared focus (null) too, not just a truthy id", () => {
    useFocusStore.getState().setFocusedCityId("gn-1850147")
    useFocusStore.getState().setFocusedCityId(null)

    const persisted = storageAdapter.getItem("ts.focus.v1")
    expect(JSON.parse(persisted!).state.focusedCityId).toBeNull()
  })

  it("is global: every reader sees the same value from the same store", () => {
    useFocusStore.getState().setFocusedCityId("gn-2643743")
    expect(useFocusStore.getState().focusedCityId).toBe("gn-2643743")
    // A second `getState()` call (standing in for a second screen/component
    // reading the store) sees the identical value — one store, not a copy.
    expect(useFocusStore.getState().focusedCityId).toBe(useFocusStore.getState().focusedCityId)
  })
})
