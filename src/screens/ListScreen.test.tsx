import { render, screen } from "@testing-library/react-native"

import type { SavedCity } from "@/domain/types"
import { ListScreen } from "@/screens/ListScreen"
import { useCitiesStore } from "@/store/cities"
import { useFocusStore } from "@/store/focus"
import { ThemeProvider } from "@/theme/context"

// Visible text inside a labelled row is aria-hidden (the row's label says
// it all — WCAG 2.5.3), so text queries opt in to hidden elements: these
// tests are about what's drawn; the label tests cover what's announced.
const VISIBLE = { includeHiddenElements: true }

// Rendered on its own, outside a navigator: it's the focused screen.
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useIsFocused: () => true,
}))

/**
 * docs/10-implementation-plan.md task 3.10's four states — "all four
 * screenshot-tested." This repo has no real screenshot/visual-regression
 * pipeline yet (`src/screens/StoriesScreen.tsx`'s own header comment notes
 * `/visual-qa`'s pipeline doesn't exist), so what's actually checkable in
 * jest is the structural contract behind each state from
 * docs/04-screen-specs.md "Overflow states": which state renders, and the
 * specific per-state behaviour the spec calls out (avatar strip hidden at
 * 1 city, present with an overflow tile past 6, a truncated single-line
 * name).
 */

function renderList() {
  return render(
    <ThemeProvider>
      <ListScreen />
    </ThemeProvider>,
  )
}

function makeCities(count: number): SavedCity[] {
  // Real GeoNames ids aren't needed — CityRow/ListScreen fall back to
  // `city.zone ?? "UTC"` and `city.label ?? cityData?.name ?? city.cityId`
  // when the id doesn't resolve, so a `label` on every entry is enough to
  // pin down what's on screen without depending on the live dataset.
  return Array.from({ length: count }, (_, i) => ({
    cityId: `test-city-${i}`,
    addedAt: i,
    order: i,
    label: `City ${i}`,
  }))
}

beforeEach(() => {
  useCitiesStore.setState({ cities: [], hasSeeded: true })
  useFocusStore.setState({ focusedCityId: null })
})

describe("ListScreen states (task 3.10)", () => {
  it("empty state: zero cities shows the empty block, not the list", () => {
    renderList()
    expect(screen.getByText("list:emptyTitle", VISIBLE)).toBeTruthy()
    expect(screen.getByText("list:emptyBody", VISIBLE)).toBeTruthy()
    expect(screen.getByText("list:emptyCta", VISIBLE)).toBeTruthy()
    expect(screen.queryByLabelText("Cities")).toBeNull()
  })

  it("1 city: list renders normally and the avatar strip hides (a strip of one is noise)", () => {
    useCitiesStore.setState({ cities: makeCities(1), hasSeeded: true })
    renderList()
    expect(screen.getByText("City 0", VISIBLE)).toBeTruthy()
    expect(screen.queryByLabelText("Cities")).toBeNull()
    expect(screen.queryByText("list:emptyTitle", VISIBLE)).toBeNull()
  })

  it("2 cities: the avatar strip appears once there's more than one", () => {
    useCitiesStore.setState({ cities: makeCities(2), hasSeeded: true })
    renderList()
    expect(screen.getByLabelText("Cities")).toBeTruthy()
  })

  it("40 cities: the strip caps at 6 with a +34 overflow tile, and every row is in the list", () => {
    useCitiesStore.setState({ cities: makeCities(40), hasSeeded: true })
    renderList()

    expect(screen.getByText("+34", VISIBLE)).toBeTruthy()
    // Six visible avatar tabs, not forty — docs/03-component-library.md's
    // AvatarStrip caps at 6 and folds the rest into the overflow tile.
    // (Each tab carries the same accessibilityLabel on both the pressable
    // tab and its inner <Avatar>, so 6 tabs is 12 matching nodes.)
    expect(screen.getAllByLabelText(/^City \d+$/)).toHaveLength(12)

    // Every row is still in the underlying FlashList data, overflow tile
    // or not — only the strip caps, the list itself doesn't.
    expect(screen.getByText("City 0", VISIBLE)).toBeTruthy()
    expect(screen.getByText("City 39", VISIBLE)).toBeTruthy()
  })

  it("long name: truncates to a single line instead of wrapping or overflowing the row", () => {
    const longName = "This City Has A Genuinely Enormous Name For Testing"
    useCitiesStore.setState({
      cities: [{ cityId: "test-long", addedAt: 0, order: 0, label: longName }],
      hasSeeded: true,
    })
    renderList()

    const nameNode = screen.getByText(longName, VISIBLE)
    expect(nameNode.props.numberOfLines).toBe(1)
    expect(nameNode.props.ellipsizeMode).toBe("tail")
  })
})
