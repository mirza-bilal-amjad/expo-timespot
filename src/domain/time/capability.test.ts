import { probeTimeCapability } from "./capability"

describe("probeTimeCapability", () => {
  it("returns 'full' when Intl correctly resolves per-zone hours", () => {
    const realIntl = (zone: string, atMs: number) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hourCycle: "h23",
        hour: "2-digit",
      }).format(atMs)
    expect(probeTimeCapability(realIntl)).toBe("full")
  })

  it("returns 'degraded' when timeZone is silently ignored (same hour for every zone)", () => {
    const brokenIntl = () => "12"
    expect(probeTimeCapability(brokenIntl)).toBe("degraded")
  })

  it("returns 'degraded' rather than crashing the boot sequence when the formatter throws", () => {
    const throwingIntl = () => {
      throw new Error("reduced ICU")
    }
    expect(probeTimeCapability(throwingIntl)).toBe("degraded")
  })
})
