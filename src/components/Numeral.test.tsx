import { render, screen } from "@testing-library/react-native"
import * as Reanimated from "react-native-reanimated"

import { ThemeProvider } from "@/theme/context"

import { Numeral } from "./Numeral"

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

  it("animate='roll' renders the live digit plus its odometer neighbours", () => {
    render(
      <ThemeProvider>
        <Numeral value="5" animate="roll" />
      </ThemeProvider>,
    )
    // "the next value rises from below, like an odometer" — neighbours are
    // digit-1 and digit+1, not arbitrary ghosts.
    expect(screen.getByText("5", hidden)).toBeTruthy()
    expect(screen.getByText("4", hidden)).toBeTruthy()
    expect(screen.getByText("6", hidden)).toBeTruthy()
  })

  it("wraps the neighbours mod 10 at the digit boundary", () => {
    render(
      <ThemeProvider>
        <Numeral value="9" animate="roll" />
      </ThemeProvider>,
    )
    expect(screen.getByText("9", hidden)).toBeTruthy()
    expect(screen.getByText("8", hidden)).toBeTruthy()
    expect(digitCount("0")).toBeGreaterThan(0) // 9 + 1, wrapped
  })

  it("updates to the new digit on a normal one-step change (e.g. a clock tick)", () => {
    const { rerender } = render(
      <ThemeProvider>
        <Numeral value="5" animate="roll" />
      </ThemeProvider>,
    )
    rerender(
      <ThemeProvider>
        <Numeral value="6" animate="roll" />
      </ThemeProvider>,
    )
    expect(screen.getByText("6", hidden)).toBeTruthy()
  })

  it("still updates to the new digit on a jump beyond the guard threshold (a device clock correction)", () => {
    // docs/08-motion-spec.md §3: "if the value changes by more than 2, cut
    // instead of rolling" — the digit must still end up correct, just
    // without the roll (which this test can't distinguish from a jest
    // component test alone — that's the domain-level circularDigitDistance
    // reasoning documented inline in Numeral.tsx, not re-derived here).
    const { rerender } = render(
      <ThemeProvider>
        <Numeral value="1" animate="roll" />
      </ThemeProvider>,
    )
    rerender(
      <ThemeProvider>
        <Numeral value="8" animate="roll" />
      </ThemeProvider>,
    )
    expect(screen.getByText("8", hidden)).toBeTruthy()
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
