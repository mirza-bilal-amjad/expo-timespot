import { boxShadow } from "./shadow"

describe("boxShadow", () => {
  it("builds a CSS box-shadow from the shadow tokens", () => {
    expect(boxShadow("#0A0A0A", 0.08, 2, 8)).toBe("0px 2px 8px rgba(10, 10, 10, 0.08)")
  })
  it("expands 3-digit hex", () => {
    expect(boxShadow("#fff", 0.5, 0, 4)).toBe("0px 0px 4px rgba(255, 255, 255, 0.5)")
  })
})
