import { render, screen } from "@testing-library/react-native"
import { useSharedValue } from "react-native-reanimated"

import type { SavedCity, ZonedTime } from "@/domain/types"
import { ThemeProvider } from "@/theme/context"

import { ReorderableCityRow, ReorderableCityRowProps } from "./ReorderableCityRow"

// Visible text inside a labelled row is aria-hidden (the row's label says
// it all — WCAG 2.5.3), so text queries opt in to hidden elements: these
// tests are about what's drawn; the label tests cover what's announced.
const VISIBLE = { includeHiddenElements: true }

type HarnessProps = Omit<ReorderableCityRowProps, "order" | "draggingId">

/** Supplies the list-level shared values ListScreen normally owns. */
function Harness(props: HarnessProps) {
  const order = useSharedValue(["a", props.city.cityId, "b"].slice(0, props.itemCount))
  const draggingId = useSharedValue<string | null>(null)
  return <ReorderableCityRow {...props} order={order} draggingId={draggingId} />
}

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
        <Harness
          city={savedCity}
          time={time}
          selected={false}
          index={0}
          itemCount={3}
          onFocus={jest.fn()}
          onDelete={jest.fn()}
          onMove={jest.fn()}
          onRename={jest.fn()}
          onDragStart={jest.fn()}
          onDragEnd={jest.fn()}
        />
      </ThemeProvider>,
    )
    expect(screen.getByText("Tokyo", VISIBLE)).toBeTruthy()
  })

  it("wires accessibility delete/moveUp/moveDown to the row's own actions, with its identity", () => {
    const onDelete = jest.fn()
    const onMove = jest.fn()
    render(
      <ThemeProvider>
        <Harness
          city={savedCity}
          time={time}
          selected={false}
          index={1}
          itemCount={3}
          onFocus={jest.fn()}
          onDelete={onDelete}
          onMove={onMove}
          onRename={jest.fn()}
          onDragStart={jest.fn()}
          onDragEnd={jest.fn()}
        />
      </ThemeProvider>,
    )
    const node = screen.getByLabelText("Tokyo, 1:40, night-time, 9 hours ahead of UTC")
    node.props.onAccessibilityAction({ nativeEvent: { actionName: "moveUp" } })
    node.props.onAccessibilityAction({ nativeEvent: { actionName: "moveDown" } })
    node.props.onAccessibilityAction({ nativeEvent: { actionName: "delete" } })
    expect(onMove.mock.calls).toEqual([
      [savedCity.cityId, -1],
      [savedCity.cityId, 1],
    ])
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("doesn't re-render on a tick that doesn't change what it shows", () => {
    const onFocus = jest.fn()
    const props = {
      city: savedCity,
      selected: false,
      index: 0,
      itemCount: 3,
      onFocus,
      onDelete: jest.fn(),
      onMove: jest.fn(),
      onRename: jest.fn(),
      onDragStart: jest.fn(),
      onDragEnd: jest.fn(),
    }
    const order = { value: [savedCity.cityId] } as unknown as ReorderableCityRowProps["order"]
    const draggingId = { value: null } as unknown as ReorderableCityRowProps["draggingId"]
    const same = { ...props, order, draggingId }
    const compare = (
      ReorderableCityRow as unknown as { compare: (a: object, b: object) => boolean }
    ).compare
    // Same HH:MM, new object, new seconds — skip.
    expect(compare({ ...same, time }, { ...same, time: { ...time, seconds: "05" } })).toBe(true)
    // The minute moves — render.
    expect(compare({ ...same, time }, { ...same, time: { ...time, display: "01:41" } })).toBe(false)
  })

  it("mounts absolutely placed at its slot — slot × (rowHeight + rowGap)", () => {
    const { toJSON } = render(
      <ThemeProvider>
        <Harness
          city={savedCity}
          time={time}
          selected={false}
          index={2}
          itemCount={3}
          onFocus={jest.fn()}
          onDelete={jest.fn()}
          onMove={jest.fn()}
          onRename={jest.fn()}
          onDragStart={jest.fn()}
          onDragEnd={jest.fn()}
        />
      </ThemeProvider>,
    )
    const root = toJSON() as unknown as { props: { style: unknown } }
    const style = Object.assign({}, ...[root.props.style].flat(Infinity)) as {
      position: string
      transform: { translateY?: number }[]
    }
    expect(style.position).toBe("absolute")
    expect(style.transform.find((t) => "translateY" in t)?.translateY).toBe(2 * (92 + 12))
  })
})
