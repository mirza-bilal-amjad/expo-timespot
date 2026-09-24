import { render, screen } from "@testing-library/react-native"
import { useSharedValue } from "react-native-reanimated"

import { ThemeProvider } from "@/theme/context"

import { UtcRuler } from "./UtcRuler"

/**
 * The scroll<->shared-value sync itself isn't meaningfully testable under
 * jest — react-native-reanimated's mock stubs `scrollTo`/`useAnimatedScrollHandler`
 * to no-ops (see test/setup.ts), the same reasoning as MeridianLine.test.tsx
 * and domain/map/ruler.test.ts covering the actual position math. This pins
 * down that every real-world tick renders with the right label, including
 * the ones that matter: -12, 0 and +14 (Kiritimati).
 */
function Wrapper({ initialOffsetMinutes = 0 }: { initialOffsetMinutes?: number }) {
  const offsetMinutes = useSharedValue(initialOffsetMinutes)
  return <UtcRuler offsetMinutes={offsetMinutes} />
}

describe("UtcRuler", () => {
  it("renders without crashing", () => {
    expect(() =>
      render(
        <ThemeProvider>
          <Wrapper />
        </ThemeProvider>,
      ),
    ).not.toThrow()
  })

  it("renders a tick for every whole hour from UTC-12 to UTC+14, including Kiritimati", () => {
    render(
      <ThemeProvider>
        <Wrapper />
      </ThemeProvider>,
    )
    expect(screen.getByText("UTC−12")).toBeTruthy()
    expect(screen.getByText("UTC+0")).toBeTruthy()
    expect(screen.getByText("UTC+14")).toBeTruthy()
    expect(screen.getAllByRole("button")).toHaveLength(27)
  })
})
