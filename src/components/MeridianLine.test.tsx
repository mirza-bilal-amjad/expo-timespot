import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { MeridianLine } from "./MeridianLine"

/**
 * Gesture behaviour itself (drag, throttled notify) isn't meaningfully
 * testable under jest — react-native-gesture-handler's own jestSetup mocks
 * the native recognizer entirely, same as ReorderableCityRow.test.tsx. The
 * actual position math is covered by domain/map/meridian.test.ts; this only
 * pins down that the component mounts and behaves sanely at its size
 * boundaries.
 */
describe("MeridianLine", () => {
  it("renders without crashing at a real size", () => {
    expect(() =>
      render(
        <ThemeProvider>
          <MeridianLine width={360} height={180} />
        </ThemeProvider>,
      ),
    ).not.toThrow()
  })

  it("renders nothing at zero width or height rather than a broken 0-size SVG", () => {
    const { toJSON: zeroWidth } = render(
      <ThemeProvider>
        <MeridianLine width={0} height={180} />
      </ThemeProvider>,
    )
    expect(zeroWidth()).toBeNull()

    const { toJSON: zeroHeight } = render(
      <ThemeProvider>
        <MeridianLine width={360} height={0} />
      </ThemeProvider>,
    )
    expect(zeroHeight()).toBeNull()
  })

  it("accepts an initial offset and a marker latitude without crashing", () => {
    expect(() =>
      render(
        <ThemeProvider>
          <MeridianLine width={360} height={180} initialOffsetMinutes={540} markerLat={35.68} />
        </ThemeProvider>,
      ),
    ).not.toThrow()
  })
})
