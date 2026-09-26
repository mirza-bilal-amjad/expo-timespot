import { render, screen } from "@testing-library/react-native"

import type { SavedCity, ZonedTime } from "@/domain/types"
import { ThemeProvider } from "@/theme/context"

import { ReorderableCityRow } from "./ReorderableCityRow"

/**
 * Gesture behaviour itself (drag, swipe) isn't meaningfully testable under
 * jest — react-native-gesture-handler's own jestSetup mocks the native
 * recognizer entirely (see jest.config.js). What's worth pinning down here
 * is that the wrapper renders its CityRow correctly and wires the
 * non-gesture a11y path (delete/moveUp/moveDown) through — the actual
 * WCAG 2.5.7 requirement docs/09-accessibility.md §4 calls out.
 */

const savedCity: SavedCity = { cityId: "gn-1850147", addedAt: 0, order: 0 }

const time: ZonedTime = {
  iso: "2026-09-23T17:16:04+09:00",
  hours: "01",
  minutes: "40",
  seconds: "04",
  display: "01:40",
  offsetMinutes: 540,
  offsetLabel: "UTC+9",
  dateLabel: "Wed, 23 Sep",
  weekday: 3,
  isDay: false,
  dayOffset: 0,
}

describe("ReorderableCityRow", () => {
  it("renders the wrapped CityRow", () => {
    render(
      <ThemeProvider>
        <ReorderableCityRow
          city={savedCity}
          time={time}
          selected={false}
          index={0}
          itemCount={3}
          onPress={jest.fn()}
          onDelete={jest.fn()}
          onMoveUp={jest.fn()}
          onMoveDown={jest.fn()}
          onRename={jest.fn()}
          onDragMove={jest.fn()}
          onDragEnd={jest.fn()}
        />
      </ThemeProvider>,
    )
    expect(screen.getByText("Tokyo")).toBeTruthy()
  })

  it("wires accessibility delete/moveUp/moveDown to the row's own actions", () => {
    const onDelete = jest.fn()
    const onMoveUp = jest.fn()
    const onMoveDown = jest.fn()
    render(
      <ThemeProvider>
        <ReorderableCityRow
          city={savedCity}
          time={time}
          selected={false}
          index={1}
          itemCount={3}
          onPress={jest.fn()}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRename={jest.fn()}
          onDragMove={jest.fn()}
          onDragEnd={jest.fn()}
        />
      </ThemeProvider>,
    )
    const node = screen.getByLabelText("Tokyo, 1:40, night-time, 9 hours ahead of UTC")
    node.props.onAccessibilityAction({ nativeEvent: { actionName: "moveUp" } })
    node.props.onAccessibilityAction({ nativeEvent: { actionName: "moveDown" } })
    node.props.onAccessibilityAction({ nativeEvent: { actionName: "delete" } })
    expect(onMoveUp).toHaveBeenCalledTimes(1)
    expect(onMoveDown).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
