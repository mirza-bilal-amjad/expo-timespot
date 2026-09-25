import { render, screen } from "@testing-library/react-native"
import { useSharedValue } from "react-native-reanimated"

import { getNearestRepresentativeCity } from "@/domain/cities/search"
import { meridianValueText } from "@/domain/time/speech"
import { getZonedTime } from "@/domain/time/zone"
import type { Prefs } from "@/domain/types"
import { ThemeProvider } from "@/theme/context"

import { MeridianLine, MeridianLineProps } from "./MeridianLine"

const PREFS: Prefs = {
  timeFormat: "24h",
  theme: "system",
  showSecondsOnList: false,
  dayNightStyle: "icon",
}

const NOON_UTC = Date.UTC(2026, 5, 15, 12, 0, 0)

/**
 * Gesture behaviour itself (drag) isn't meaningfully testable under jest —
 * react-native-gesture-handler's own jestSetup mocks the native recognizer
 * entirely, same as ReorderableCityRow.test.tsx. The actual position math is
 * covered by domain/map/meridian.test.ts; this only pins down that the
 * component mounts and behaves sanely at its size boundaries. `offsetMinutes`
 * is a shared value now (task 4.4), so it has to come from a real
 * `useSharedValue` call, not a plain object literal — this wrapper is that.
 * `now`/`prefs` (task 4.8) are required props now the accessibility value
 * resolves a real city/time, same reasoning as FloatingCityCard.test.tsx.
 */
function Wrapper(
  props: Omit<MeridianLineProps, "offsetMinutes" | "now" | "prefs"> & {
    initialOffsetMinutes?: number
    now?: number
    prefs?: Prefs
  },
) {
  const { initialOffsetMinutes = 0, now = NOON_UTC, prefs = PREFS, ...rest } = props
  const offsetMinutes = useSharedValue(initialOffsetMinutes)
  return <MeridianLine {...rest} offsetMinutes={offsetMinutes} now={now} prefs={prefs} />
}

describe("MeridianLine", () => {
  it("renders without crashing at a real size", () => {
    expect(() =>
      render(
        <ThemeProvider>
          <Wrapper width={360} height={180} />
        </ThemeProvider>,
      ),
    ).not.toThrow()
  })

  it("renders nothing at zero width or height rather than a broken 0-size SVG", () => {
    const { toJSON: zeroWidth } = render(
      <ThemeProvider>
        <Wrapper width={0} height={180} />
      </ThemeProvider>,
    )
    expect(zeroWidth()).toBeNull()

    const { toJSON: zeroHeight } = render(
      <ThemeProvider>
        <Wrapper width={360} height={0} />
      </ThemeProvider>,
    )
    expect(zeroHeight()).toBeNull()
  })

  it("accepts an initial offset and a marker latitude without crashing", () => {
    expect(() =>
      render(
        <ThemeProvider>
          <Wrapper width={360} height={180} initialOffsetMinutes={540} markerLat={35.68} />
        </ThemeProvider>,
      ),
    ).not.toThrow()
  })

  it("is the accessible adjustable slider, with a value.text matching the resolved city/time", () => {
    const offsetMinutes = 60 // UTC+1
    render(
      <ThemeProvider>
        <Wrapper width={360} height={180} initialOffsetMinutes={offsetMinutes} />
      </ThemeProvider>,
    )
    const slider = screen.getByLabelText("Time zone selector")
    expect(slider.props.accessibilityRole).toBe("adjustable")
    expect(slider.props.accessibilityValue.min).toBe(-12)
    expect(slider.props.accessibilityValue.max).toBe(14)

    const expectedCity = getNearestRepresentativeCity(offsetMinutes, NOON_UTC)
    const expectedTime = getZonedTime(NOON_UTC, expectedCity.zone, PREFS)
    expect(slider.props.accessibilityValue.text).toBe(meridianValueText(expectedCity, expectedTime))
  })
})
