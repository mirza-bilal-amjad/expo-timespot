import { render, screen } from "@testing-library/react-native"

import type { ZonedTime, SavedCity } from "@/domain/types"
import { ThemeProvider } from "@/theme/context"

import { CityRow } from "./CityRow"

// Visible text inside a labelled row is aria-hidden (the row's label says
// it all — WCAG 2.5.3), so text queries opt in to hidden elements: these
// tests are about what's drawn; the label tests cover what's announced.
const VISIBLE = { includeHiddenElements: true }

/**
 * docs/10-implementation-plan.md task 3.3 acceptance: "React DevTools profiler
 * shows 1 render per tick, not N." That needs a profiler harness this repo
 * doesn't have yet; what's testable in jest is the contract that makes it
 * true — React.memo bails out unless `time.display`, `selected` or the city
 * identity actually changed — plus the a11y contract from the component doc.
 */

const savedCity: SavedCity = { cityId: "gn-1850147", addedAt: 0, order: 0 }

function makeTime(overrides: Partial<ZonedTime> = {}): ZonedTime {
  return {
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
    ...overrides,
  }
}

function renderRow(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

describe("CityRow", () => {
  it("renders the city name, time and offset", () => {
    renderRow(<CityRow city={savedCity} time={makeTime()} selected={false} onPress={jest.fn()} />)
    expect(screen.getByText("Tokyo", VISIBLE)).toBeTruthy()
    expect(screen.getByText("UTC+9", VISIBLE)).toBeTruthy()
  })

  it("falls back to a manual label over the dataset name", () => {
    renderRow(
      <CityRow
        city={{ ...savedCity, label: "Home" }}
        time={makeTime()}
        selected={false}
        onPress={jest.fn()}
      />,
    )
    expect(screen.getByText("Home", VISIBLE)).toBeTruthy()
  })

  it("carries a single-node accessibility label matching docs/09-accessibility.md's worked example", () => {
    renderRow(<CityRow city={savedCity} time={makeTime()} selected={false} onPress={jest.fn()} />)
    const node = screen.getByLabelText("Tokyo, 1:40, night-time, 9 hours ahead of UTC")
    expect(node).toBeTruthy()
    expect(node.props.accessibilityHint).toBe("Double tap to focus")
    expect(node.props.accessibilityState).toEqual({ selected: false })
  })

  it("spells out a sub-hour offset and 'behind' for a negative one", () => {
    renderRow(
      <CityRow
        city={savedCity}
        time={makeTime({ offsetMinutes: -210, isDay: true })}
        selected={false}
        onPress={jest.fn()}
      />,
    )
    expect(
      screen.getByLabelText("Tokyo, 1:40, day-time, 3 hours 30 minutes behind UTC"),
    ).toBeTruthy()
  })

  it("exposes moveUp/moveDown/delete/rename accessibility actions wired to the matching props", () => {
    const onMoveUp = jest.fn()
    const onMoveDown = jest.fn()
    const onDelete = jest.fn()
    const onRename = jest.fn()
    renderRow(
      <CityRow
        city={savedCity}
        time={makeTime()}
        selected={false}
        onPress={jest.fn()}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
        onRename={onRename}
      />,
    )
    const node = screen.getByLabelText("Tokyo, 1:40, night-time, 9 hours ahead of UTC")
    const actionNames = node.props.accessibilityActions.map((a: { name: string }) => a.name)
    // The same four operations the "⋯" menu offers — screen readers reach
    // them here, since the row is one accessible node.
    expect(actionNames).toEqual(["activate", "magicTap", "delete", "moveUp", "moveDown", "rename"])

    node.props.onAccessibilityAction({ nativeEvent: { actionName: "moveUp" } })
    expect(onMoveUp).toHaveBeenCalledTimes(1)

    node.props.onAccessibilityAction({ nativeEvent: { actionName: "moveDown" } })
    expect(onMoveDown).toHaveBeenCalledTimes(1)

    node.props.onAccessibilityAction({ nativeEvent: { actionName: "delete" } })
    expect(onDelete).toHaveBeenCalledTimes(1)

    node.props.onAccessibilityAction({ nativeEvent: { actionName: "rename" } })
    expect(onRename).toHaveBeenCalledTimes(1)
  })

  it("is memoized: an unrelated prop identity change with the same memo-key values does not remount", () => {
    const onPress = jest.fn()
    const time = makeTime()
    const { rerender } = renderRow(
      <CityRow city={savedCity} time={time} selected={false} onPress={onPress} />,
    )
    const before = screen.getByText("Tokyo", VISIBLE)

    // A new `time` object with identical `display` must compare equal under
    // the row's memo comparator (docs/03-component-library.md: "React.memo
    // with a comparator on time.display, selected and city.id").
    rerender(
      <ThemeProvider>
        <CityRow
          city={savedCity}
          time={{ ...time, iso: "2026-09-23T17:16:05+09:00", seconds: "05" }}
          selected={false}
          onPress={onPress}
        />
      </ThemeProvider>,
    )
    expect(screen.getByText("Tokyo", VISIBLE)).toBe(before)
  })
})
