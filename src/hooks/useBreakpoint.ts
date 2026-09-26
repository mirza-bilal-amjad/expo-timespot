import { useWindowDimensions } from "react-native"

import {
  type Breakpoint,
  breakpointFor,
  contentWidthFor,
  gutterFor,
  isAtLeast,
} from "@/theme/breakpoints"

export interface BreakpointInfo {
  breakpoint: Breakpoint
  width: number
  gutter: number
  /** Width inside the gutters, capped at the 1312 container. */
  contentWidth: number
  atLeast: (target: Breakpoint) => boolean
}

/**
 * docs/07-responsive-strategy.md §1. `useWindowDimensions`, not
 * `Dimensions.get()` — it follows rotation, split view and browser resize.
 */
export function useBreakpoint(): BreakpointInfo {
  const { width } = useWindowDimensions()
  const breakpoint = breakpointFor(width)
  return {
    breakpoint,
    width,
    gutter: gutterFor(breakpoint),
    contentWidth: contentWidthFor(width),
    atLeast: (target) => isAtLeast(breakpoint, target),
  }
}
