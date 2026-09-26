import { getDstStatus } from "./dst"

describe("getDstStatus", () => {
  it("knows zones without DST", () => {
    expect(getDstStatus(Date.UTC(2026, 6, 1), "Asia/Tokyo")).toBe("none")
    expect(getDstStatus(Date.UTC(2026, 6, 1), "Asia/Kolkata")).toBe("none")
  })

  it("northern hemisphere: daylight in July, standard in January", () => {
    expect(getDstStatus(Date.UTC(2026, 6, 1), "America/New_York")).toBe("daylight")
    expect(getDstStatus(Date.UTC(2026, 0, 15), "America/New_York")).toBe("standard")
  })

  it("southern hemisphere: the other way round", () => {
    expect(getDstStatus(Date.UTC(2026, 0, 15), "Australia/Sydney")).toBe("daylight")
    expect(getDstStatus(Date.UTC(2026, 6, 1), "Australia/Sydney")).toBe("standard")
  })

  it("Lord Howe's half-hour DST counts", () => {
    expect(getDstStatus(Date.UTC(2026, 0, 15), "Australia/Lord_Howe")).toBe("daylight")
  })
})
