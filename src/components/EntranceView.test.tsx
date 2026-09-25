import { render, screen } from "@testing-library/react-native"
import * as Reanimated from "react-native-reanimated"

import { ThemeProvider } from "@/theme/context"

import { EntranceView } from "./EntranceView"
import { Text } from "./Text"

describe("EntranceView", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders its children when playing", () => {
    render(
      <ThemeProvider>
        <EntranceView play>
          <Text>hello</Text>
        </EntranceView>
      </ThemeProvider>,
    )
    expect(screen.getByText("hello")).toBeTruthy()
  })

  it("renders its children when not playing (a warm start) — still visible, just no animation", () => {
    render(
      <ThemeProvider>
        <EntranceView play={false}>
          <Text>hello</Text>
        </EntranceView>
      </ThemeProvider>,
    )
    expect(screen.getByText("hello")).toBeTruthy()
  })

  it("renders its children under reduced motion even when play is true", () => {
    jest.spyOn(Reanimated, "useReducedMotion").mockReturnValue(true)
    render(
      <ThemeProvider>
        <EntranceView play>
          <Text>hello</Text>
        </EntranceView>
      </ThemeProvider>,
    )
    expect(screen.getByText("hello")).toBeTruthy()
  })
})
