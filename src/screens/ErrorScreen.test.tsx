import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"

import { DatasetError } from "@/domain/cities/search"
import { translate } from "@/i18n/translate"
import { useCitiesStore } from "@/store/cities"
import { ThemeProvider } from "@/theme/context"
import { storage } from "@/utils/storage"

import { ErrorScreen } from "./ErrorScreen"

/** docs/10-implementation-plan.md task 5.7 — a real message and a recovery path. */
function renderWith(error: Error) {
  const retry = jest.fn(() => Promise.resolve())
  render(
    <ThemeProvider>
      <ErrorScreen error={error} retry={retry} />
    </ThemeProvider>,
  )
  return retry
}

describe("ErrorScreen", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
  afterAll(() => consoleError.mockRestore())

  it("names an unusable city dataset specifically", () => {
    renderWith(new DatasetError("0 of 0 rows"))
    expect(screen.getByText(translate("errors:dataset"))).toBeTruthy()
  })

  it("gives any other error the general message, and retries", async () => {
    const retry = renderWith(new Error("boom"))
    expect(screen.getByText(translate("errors:body"))).toBeTruthy()
    fireEvent.press(screen.getByText(translate("errors:retry")))
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1))
  })

  it("reset clears saved data and in-memory stores before retrying", async () => {
    storage.set("ts.cities.v1", "{bad")
    useCitiesStore.setState({ cities: [{ cityId: "x", order: 0, addedAt: 0 }] })
    const retry = renderWith(new Error("boom"))
    fireEvent.press(screen.getByText(translate("errors:reset")))
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1))
    // The bad blob is gone; the store has written its clean defaults back.
    expect(JSON.parse(storage.getString("ts.cities.v1")!).state.cities).toEqual([])
    expect(useCitiesStore.getState().cities).toEqual([])
  })
})
