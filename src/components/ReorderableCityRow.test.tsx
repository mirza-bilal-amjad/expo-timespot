import { render, screen } from "@testing-library/react-native"
import { useSharedValue } from "react-native-reanimated"

import type { SavedCity, ZonedTime } from "@/domain/types"
import { ThemeProvider } from "@/theme/context"

import { ReorderableCityRow, ReorderableCityRowProps } from "./ReorderableCityRow"

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
          onPress={jest.fn()}
          onDelete={jest.fn()}
          onMoveUp={jest.fn()}
          onMoveDown={jest.fn()}
          onRename={jest.fn()}
          onDragStart={jest.fn()}
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
        <Harness
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
          onDragStart={jest.fn()}
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

  it("mounts absolutely placed at its slot — slot × (rowHeight + rowGap)", () => {
    const { toJSON } = render(
      <ThemeProvider>
        <Harness
          city={savedCity}
          time={time}
          selected={false}
          index={2}
          itemCount={3}
          onPress={jest.fn()}
          onDelete={jest.fn()}
          onMoveUp={jest.fn()}
          onMoveDown={jest.fn()}
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
