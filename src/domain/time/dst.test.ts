import { getDstStatus, getYearOffsets } from "./dst"

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

describe("getYearOffsets", () => {
  const now = Date.UTC(2026, 3, 1)
  it("one offset for a zone without DST, including 45-minute zones", () => {
    expect(getYearOffsets(now, "Asia/Tokyo")).toEqual({ standard: 540, daylight: null })
    expect(getYearOffsets(now, "Asia/Kathmandu")).toEqual({ standard: 345, daylight: null })
  })

  it("standard is the lower offset in either hemisphere", () => {
    expect(getYearOffsets(now, "America/New_York")).toEqual({ standard: -300, daylight: -240 })
    expect(getYearOffsets(now, "Australia/Sydney")).toEqual({ standard: 600, daylight: 660 })
    expect(getYearOffsets(now, "Australia/Lord_Howe")).toEqual({ standard: 630, daylight: 660 })
  })
})
