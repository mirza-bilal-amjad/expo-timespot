import { act, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { Sheet } from "./Sheet"

// Like every platform's BottomSheet: content mounted while presented,
// unmounted once dismissed.
jest.mock("@expo/ui", () => ({
  BottomSheet: ({ isPresented, children }: { isPresented: boolean; children: unknown }) =>
    isPresented ? children : null,
}))

function renderSheet(open: boolean, onClosed: () => void) {
  return (
    <ThemeProvider>
      <Sheet open={open} onOpenChange={() => {}} onClosed={onClosed}>
        {null}
      </Sheet>
    </ThemeProvider>
  )
}

describe("Sheet onClosed", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("fires once when an open sheet's content is torn down", () => {
    const onClosed = jest.fn()
    const view = render(renderSheet(true, onClosed))
    expect(onClosed).not.toHaveBeenCalled()

    view.rerender(renderSheet(false, onClosed))
    expect(onClosed).toHaveBeenCalledTimes(1)

    // The backstop timer doesn't fire it a second time.
    act(() => jest.runAllTimers())
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it("does not fire while the sheet stays open", () => {
    const onClosed = jest.fn()
    render(renderSheet(true, onClosed))
    act(() => jest.runAllTimers())
    expect(onClosed).not.toHaveBeenCalled()
  })

  it("fires after a reopen-and-close too", () => {
    const onClosed = jest.fn()
    const view = render(renderSheet(true, onClosed))
    view.rerender(renderSheet(false, onClosed))
    view.rerender(renderSheet(true, onClosed))
    view.rerender(renderSheet(false, onClosed))
    expect(onClosed).toHaveBeenCalledTimes(2)
  })
})
