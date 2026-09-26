import { render, screen } from "@testing-library/react-native"
import { useSharedValue } from "react-native-reanimated"

import { getCityByZone } from "@/domain/cities/search"
import { getZonedTime } from "@/domain/time/zone"
import type { Prefs } from "@/domain/types"
import { ThemeProvider } from "@/theme/context"

import { FloatingCityCard, FloatingCityCardProps } from "./FloatingCityCard"

const PREFS: Prefs = {
  timeFormat: "24h",
  theme: "system",
  showSecondsOnList: false,
  dayNightStyle: "icon",
}

const NOON_UTC = Date.UTC(2026, 5, 15, 12, 0, 0)
const ALGIERS = getCityByZone("Africa/Algiers")!

/**
 * The UI-thread positioning isn't meaningfully testable under jest (the
 * reanimated mock reduces useAnimatedStyle to a plain factory call; see
 * test/setup.ts). What's pinned down: the card renders the city it's given
 * with that city's real offset, and the zero-size guard holds.
 */
function Wrapper(props: Omit<FloatingCityCardProps, "anchorX" | "anchorY">) {
  const anchorX = useSharedValue(props.width / 2)
  const anchorY = useSharedValue(props.height / 3)
  return <FloatingCityCard {...props} anchorX={anchorX} anchorY={anchorY} />
}

describe("FloatingCityCard", () => {
  it("renders the given city's name and its real offset", () => {
    render(
      <ThemeProvider>
        <Wrapper width={360} height={400} city={ALGIERS} now={NOON_UTC} prefs={PREFS} />
      </ThemeProvider>,
    )
    // Decorative (accessibilityElementsHidden), so queries need the opt-in.
    // <Numeral> renders one digit per Text node, so the time isn't asserted.
    const options = { includeHiddenElements: true }
    expect(screen.getByText(ALGIERS.name, options)).toBeTruthy()
    expect(
      screen.getByText(getZonedTime(NOON_UTC, ALGIERS.zone, PREFS).offsetLabel, options),
    ).toBeTruthy()
  })

  it("renders nothing at zero width or height rather than a broken empty card", () => {
    const { toJSON: zeroWidth } = render(
      <ThemeProvider>
        <Wrapper width={0} height={200} city={ALGIERS} now={NOON_UTC} prefs={PREFS} />
      </ThemeProvider>,
    )
    expect(zeroWidth()).toBeNull()

    const { toJSON: zeroHeight } = render(
      <ThemeProvider>
        <Wrapper width={360} height={0} city={ALGIERS} now={NOON_UTC} prefs={PREFS} />
      </ThemeProvider>,
    )
    expect(zeroHeight()).toBeNull()
  })
})
