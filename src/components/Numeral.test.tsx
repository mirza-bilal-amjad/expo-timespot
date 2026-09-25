import { render, screen } from "@testing-library/react-native"
import * as Reanimated from "react-native-reanimated"

import { ThemeProvider } from "@/theme/context"
import { restIndex } from "@/utils/odometer"

import { Numeral } from "./Numeral"

// numeralLg's line height — one odometer cell.
const NUMERAL_LG_CELL = 48

/** translateY of every odometer strip in the rendered tree, in order. */
function stripOffsets(): number[] {
  const offsets: number[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) return node.forEach(walk)
    const { props, children } = node as { props?: { style?: unknown }; children?: unknown }
    const styles = [props?.style].flat(Infinity) as { transform?: { translateY?: number }[] }[]
    for (const style of styles) {
      const translateY = style?.transform?.find((t) => "translateY" in t)?.translateY
      if (translateY !== undefined) offsets.push(translateY)
    }
    walk(children)
  }
  walk(screen.toJSON())
  return offsets
}

const hidden = { includeHiddenElements: true }

// Numeral's own cell-width calibration renders one extra, hidden "0" glyph
// on every render under jest — a real mechanism (docs its own module
// comment: "measured once... and cached"), but `onLayout` never fires in
// this test environment, so the cache never actually warms and the
// calibration glyph never goes away. Assertions that would otherwise land
// on a bare "0" use `getAllByText` and check for at least one match instead
// of `getByText`'s single-match requirement, to stay robust to that extra
// node rather than fighting it.
function digitCount(text: string): number {
  return screen.getAllByText(text, hidden).length
}

describe("Numeral", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders a plain digit when animate is 'none' (the default)", () => {
    render(
      <ThemeProvider>
        <Numeral value="18" />
      </ThemeProvider>,
    )
    expect(screen.getByText("1", hidden)).toBeTruthy()
    expect(screen.getByText("8", hidden)).toBeTruthy()
  })

  it("renders separators as plain text regardless of animate", () => {
    render(
      <ThemeProvider>
        <Numeral value="08:40" animate="roll" />
      </ThemeProvider>,
    )
    expect(screen.getByText(":", hidden)).toBeTruthy()
  })

  // The roll itself (which cell, when to cut, the 9 → 0 wrap, interrupted
  // ticks) is pure maths, covered in utils/odometer.test.ts — the reanimated
  // mock can't run a UI-thread reaction. What's checked here is that the
  // strip mounts positioned on the live digit.
  it("animate='roll' mounts a static strip positioned on the live digit", () => {
    render(
      <ThemeProvider>
        <Numeral value="7" size="numeralLg" animate="roll" />
      </ThemeProvider>,
    )
    // Every digit is in the strip, twice — the text never changes.
    expect(digitCount("3")).toBe(2)
    expect(stripOffsets()).toEqual([-restIndex(7) * NUMERAL_LG_CELL])
  })

  it("positions each rolling digit independently", () => {
    render(
      <ThemeProvider>
        <Numeral value="09" size="numeralLg" animate="roll" />
      </ThemeProvider>,
    )
    expect(stripOffsets()).toEqual([
      -restIndex(0) * NUMERAL_LG_CELL,
      -restIndex(9) * NUMERAL_LG_CELL,
    ])
  })

  it("renders a plain digit with no ghost neighbours under reduced motion", () => {
    jest.spyOn(Reanimated, "useReducedMotion").mockReturnValue(true)
    render(
      <ThemeProvider>
        <Numeral value="5" animate="roll" />
      </ThemeProvider>,
    )
    expect(screen.getByText("5", hidden)).toBeTruthy()
    expect(screen.queryByText("4", hidden)).toBeNull()
    expect(screen.queryByText("6", hidden)).toBeNull()
    expect(stripOffsets()).toEqual([])
  })

  it("carries the given accessibilityLabel on the composed value, not per digit", () => {
    render(
      <ThemeProvider>
        <Numeral value="08:40" accessibilityLabel="8:40 AM" />
      </ThemeProvider>,
    )
    expect(screen.getByLabelText("8:40 AM")).toBeTruthy()
  })
})
