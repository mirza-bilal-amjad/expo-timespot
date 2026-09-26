import { render } from "@testing-library/react-native"

import { dispatchShortcut, useShortcut } from "./useShortcut"

function Registers({ onFire, enabled = true }: { onFire: () => void; enabled?: boolean }) {
  useShortcut("theme", onFire, enabled)
  return null
}

describe("useShortcut registry (task 6.8)", () => {
  it("nothing registered: the key isn't handled, so it keeps its default", () => {
    expect(dispatchShortcut("help")).toBe(false)
  })

  it("the newest registration wins, and unmounting hands the key back", () => {
    const outer = jest.fn()
    const inner = jest.fn()
    const first = render(<Registers onFire={outer} />)
    const second = render(<Registers onFire={inner} />)
    expect(dispatchShortcut("theme")).toBe(true)
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()

    second.unmount()
    dispatchShortcut("theme")
    expect(outer).toHaveBeenCalledTimes(1)
    first.unmount()
    expect(dispatchShortcut("theme")).toBe(false)
  })

  it("a disabled registration (an unfocused screen) doesn't take the key", () => {
    const hidden = jest.fn()
    const view = render(<Registers onFire={hidden} enabled={false} />)
    expect(dispatchShortcut("theme")).toBe(false)
    view.unmount()
  })

  it("calls the latest handler without re-registering", () => {
    const a = jest.fn()
    const b = jest.fn()
    const view = render(<Registers onFire={a} />)
    view.rerender(<Registers onFire={b} />)
    dispatchShortcut("theme")
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).not.toHaveBeenCalled()
    view.unmount()
  })
})
