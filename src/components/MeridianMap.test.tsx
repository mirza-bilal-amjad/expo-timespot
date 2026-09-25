import { fireEvent, render, screen } from "@testing-library/react-native"

import { getCityByZone } from "@/domain/cities/search"
import { getOffsetMinutes } from "@/domain/time/zone"
import type { City, Prefs } from "@/domain/types"
import { ThemeProvider } from "@/theme/context"

import { MeridianMap } from "./MeridianMap"

/**
 * The pointer gesture itself isn't drivable under jest (gesture-handler's
 * jestSetup mocks the recognizers; the pick is covered by
 * domain/map/pick.test.ts). What is testable here, and what matters for
 * docs/09-accessibility.md §2: the surface is one adjustable slider that
 * announces the selected city, and increment/decrement step to the
 * adjacent real zone's city.
 */

const PREFS: Prefs = {
  timeFormat: "24h",
  theme: "system",
  showSecondsOnList: false,
  dayNightStyle: "icon",
}
const NOON_UTC = Date.UTC(2026, 5, 15, 12, 0, 0)
const ALGIERS = getCityByZone("Africa/Algiers")!

function renderMap(onSelectCity = jest.fn()) {
  render(
    <ThemeProvider>
      <MeridianMap
        width={393}
        height={560}
        city={ALGIERS}
        onSelectCity={onSelectCity}
        now={NOON_UTC}
        prefs={PREFS}
      />
    </ThemeProvider>,
  )
  return screen.getByLabelText("Time zone selector")
}

describe("MeridianMap", () => {
  it("is one adjustable control announcing the selected city and its zone", () => {
    const slider = renderMap()
    expect(slider.props.accessibilityRole).toBe("adjustable")
    expect(slider.props.accessibilityValue.text).toContain("Algiers")
    expect(slider.props.accessibilityValue.now).toBe(1)
  })

  it("increment selects the next real zone east's best-known city", () => {
    const onSelectCity = jest.fn()
    const slider = renderMap(onSelectCity)
    fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } })
    const next = onSelectCity.mock.calls[0][0] as City
    expect(getOffsetMinutes(NOON_UTC, next.zone)).toBeGreaterThan(60)
  })

  it("decrement selects the next real zone west's best-known city", () => {
    const onSelectCity = jest.fn()
    const slider = renderMap(onSelectCity)
    fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } })
    const next = onSelectCity.mock.calls[0][0] as City
    expect(getOffsetMinutes(NOON_UTC, next.zone)).toBeLessThan(60)
  })
})
