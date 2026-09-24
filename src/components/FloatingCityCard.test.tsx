import { render, screen } from "@testing-library/react-native"
import { useSharedValue } from "react-native-reanimated"

import { getNearestRepresentativeCity } from "@/domain/cities/search"
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

/**
 * Two things aren't meaningfully testable under jest, both for the same
 * reason MeridianLine.test.tsx and UtcRuler.test.tsx already document: the
 * reanimated mock stubs `useAnimatedStyle` down to a plain factory call and
 * `useAnimatedReaction` to a no-op (test/setup.ts). That rules out (1) the
 * horizontal-tracking half (offsetMinutes -> translateX), and (2) the
 * throttled offsetMinutes -> resolved-city bridge ever firing at all — this
 * component's initial `useState(offsetMinutes.value)` is therefore the only
 * offset it will ever resolve against in a test. Both are fine to leave to
 * `domain/map/meridian.test.ts` (the position math) and
 * `domain/cities/search.test.ts` (getNearestRepresentativeCity itself) —
 * this only pins down that the right content renders from a given starting
 * offset, and that the zero-size guard holds.
 */
function Wrapper(
  props: Omit<FloatingCityCardProps, "offsetMinutes"> & { initialOffsetMinutes: number },
) {
  const { initialOffsetMinutes, ...rest } = props
  const offsetMinutes = useSharedValue(initialOffsetMinutes)
  return <FloatingCityCard {...rest} offsetMinutes={offsetMinutes} />
}

describe("FloatingCityCard", () => {
  it("renders the nearest real city's name and offset for the starting offset", () => {
    const offsetMinutes = 60 // UTC+1
    const expectedCity = getNearestRepresentativeCity(offsetMinutes, NOON_UTC)
    const expectedTime = getZonedTime(NOON_UTC, expectedCity.zone, PREFS)

    render(
      <ThemeProvider>
        <Wrapper
          width={360}
          height={200}
          now={NOON_UTC}
          prefs={PREFS}
          initialOffsetMinutes={offsetMinutes}
        />
      </ThemeProvider>,
    )
    // The whole card is accessibilityElementsHidden pending task 4.8's real
    // slider contract (see the component's own doc comment) — RNTL excludes
    // hidden-subtree content from queries by default, so these need the
    // opt-in, same as querying inside any other decorative-for-now subtree.
    // The time itself isn't asserted here: <Numeral> renders one digit per
    // Text node (CLAUDE.md rule 4), so there's no single "13:00" node to
    // query for — same reason CityRow.test.tsx doesn't check it either.
    const options = { includeHiddenElements: true }
    expect(screen.getByText(expectedCity.name, options)).toBeTruthy()
    expect(screen.getByText(expectedTime.offsetLabel, options)).toBeTruthy()
  })

  it("renders nothing at zero width or height rather than a broken empty card", () => {
    const { toJSON: zeroWidth } = render(
      <ThemeProvider>
        <Wrapper width={0} height={200} now={NOON_UTC} prefs={PREFS} initialOffsetMinutes={0} />
      </ThemeProvider>,
    )
    expect(zeroWidth()).toBeNull()

    const { toJSON: zeroHeight } = render(
      <ThemeProvider>
        <Wrapper width={360} height={0} now={NOON_UTC} prefs={PREFS} initialOffsetMinutes={0} />
      </ThemeProvider>,
    )
    expect(zeroHeight()).toBeNull()
  })
})
