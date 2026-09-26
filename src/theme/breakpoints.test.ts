import { breakpointFor, cardColumnsFor, contentWidthFor, gutterFor, isAtLeast } from "./breakpoints"

describe("breakpoints (docs/07 §1)", () => {
  it.each([
    [320, "xs"],
    [389, "xs"],
    [390, "sm"],
    [767, "sm"],
    [768, "md"],
    [1023, "md"],
    [1024, "lg"],
    [1280, "xl"],
    [1440, "xl"],
    [1600, "2xl"],
  ] as const)("%i px is %s", (width, bp) => {
    expect(breakpointFor(width)).toBe(bp)
  })

  it("orders breakpoints", () => {
    expect(isAtLeast("xl", "lg")).toBe(true)
    expect(isAtLeast("md", "lg")).toBe(false)
  })

  it("keeps the phone gutter, grows it on wider screens", () => {
    expect(gutterFor("xs")).toBe(28)
    expect(gutterFor("md")).toBe(32)
    expect(gutterFor("lg")).toBe(48)
    expect(gutterFor("xl")).toBe(64)
  })

  it("closes the web board's grid exactly at 1440: 1312 + 2 × 64", () => {
    expect(contentWidthFor(1440)).toBe(1312)
    expect(contentWidthFor(1920)).toBe(1312) // capped
    expect(contentWidthFor(768)).toBe(768 - 64)
  })

  it("fits four 320 cards on the reference container", () => {
    expect(cardColumnsFor(1312)).toBe(4)
    expect(cardColumnsFor(768 - 64)).toBe(2)
    expect(cardColumnsFor(500)).toBe(1)
  })
})
