import { forwardRef } from "react"
import { View, ViewProps, ViewStyle } from "react-native"
// eslint-disable-next-line no-restricted-imports
import { Circle, Line, Path, Polygon, Polyline, Svg } from "react-native-svg"

import { useAppTheme } from "@/theme/context"

import { Pressable, PressableProps } from "./Pressable"

/**
 * docs/03-component-library.md, docs/02-design-system.md §7. Re-sourced from
 * Ignite's raster PNG set to react-native-svg — the 20 icons TimeSpot needs,
 * 24x24 grid, 1.75px stroke, no fills. Path data is Feather Icons' (MIT),
 * extracted from the real source SVGs rather than hand-drawn, since there's
 * no svgr pipeline or design-supplied source SVGs in this repo — the pattern
 * the doc describes (real SVG source -> generated RN component) is the same,
 * just done once by hand instead of by a build step over files that don't
 * exist here.
 *
 * Ignite's own API is kept (the `icon` prop name, the `IconTypes` export,
 * `PressableIcon`) — see CLAUDE.md's Ignite-components table, "Icon: keep,
 * re-source". The icon SET is new; the shape of the component isn't.
 */

export const ICON_NAMES = [
  "search",
  "clock",
  "globe",
  "plus",
  "close",
  "chevron-left",
  "chevron-right",
  "sun",
  "moon",
  "sunrise",
  "sunset",
  "drag-handle",
  "check",
  "pin",
  "share",
  "settings",
  "ellipsis",
  "trash",
  "star",
  "arrow-up-right",
] as const

export type IconTypes = (typeof ICON_NAMES)[number]

const ICON_SIZES = { sm: 16, md: 20, lg: 24, xl: 28 } as const
export type IconSize = keyof typeof ICON_SIZES

const STROKE_WIDTH = 1.75

type Shape =
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "path"; d: string }
  | { type: "polyline"; points: string }
  | { type: "polygon"; points: string }

const ICONS: Record<IconTypes, Shape[]> = {
  "search": [
    { type: "circle", cx: 11, cy: 11, r: 8 },
    { type: "line", x1: 21, y1: 21, x2: 16.65, y2: 16.65 },
  ],
  "clock": [
    { type: "circle", cx: 12, cy: 12, r: 10 },
    { type: "polyline", points: "12 6 12 12 16 14" },
  ],
  "globe": [
    { type: "circle", cx: 12, cy: 12, r: 10 },
    { type: "line", x1: 2, y1: 12, x2: 22, y2: 12 },
    {
      type: "path",
      d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    },
  ],
  "plus": [
    { type: "line", x1: 12, y1: 5, x2: 12, y2: 19 },
    { type: "line", x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
  "close": [
    { type: "line", x1: 18, y1: 6, x2: 6, y2: 18 },
    { type: "line", x1: 6, y1: 6, x2: 18, y2: 18 },
  ],
  "chevron-left": [{ type: "polyline", points: "15 18 9 12 15 6" }],
  "chevron-right": [{ type: "polyline", points: "9 18 15 12 9 6" }],
  "sun": [
    { type: "circle", cx: 12, cy: 12, r: 5 },
    { type: "line", x1: 12, y1: 1, x2: 12, y2: 3 },
    { type: "line", x1: 12, y1: 21, x2: 12, y2: 23 },
    { type: "line", x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 },
    { type: "line", x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 },
    { type: "line", x1: 1, y1: 12, x2: 3, y2: 12 },
    { type: "line", x1: 21, y1: 12, x2: 23, y2: 12 },
    { type: "line", x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 },
    { type: "line", x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 },
  ],
  "moon": [{ type: "path", d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }],
  "sunrise": [
    { type: "path", d: "M17 18a5 5 0 0 0-10 0" },
    { type: "line", x1: 12, y1: 2, x2: 12, y2: 9 },
    { type: "line", x1: 4.22, y1: 10.22, x2: 5.64, y2: 11.64 },
    { type: "line", x1: 1, y1: 18, x2: 3, y2: 18 },
    { type: "line", x1: 21, y1: 18, x2: 23, y2: 18 },
    { type: "line", x1: 18.36, y1: 11.64, x2: 19.78, y2: 10.22 },
    { type: "line", x1: 23, y1: 22, x2: 1, y2: 22 },
    { type: "polyline", points: "8 6 12 2 16 6" },
  ],
  "sunset": [
    { type: "path", d: "M17 18a5 5 0 0 0-10 0" },
    { type: "line", x1: 12, y1: 9, x2: 12, y2: 2 },
    { type: "line", x1: 4.22, y1: 10.22, x2: 5.64, y2: 11.64 },
    { type: "line", x1: 1, y1: 18, x2: 3, y2: 18 },
    { type: "line", x1: 21, y1: 18, x2: 23, y2: 18 },
    { type: "line", x1: 18.36, y1: 11.64, x2: 19.78, y2: 10.22 },
    { type: "line", x1: 23, y1: 22, x2: 1, y2: 22 },
    { type: "polyline", points: "16 5 12 9 8 5" },
  ],
  "drag-handle": [
    { type: "polyline", points: "5 9 2 12 5 15" },
    { type: "polyline", points: "9 5 12 2 15 5" },
    { type: "polyline", points: "15 19 12 22 9 19" },
    { type: "polyline", points: "19 9 22 12 19 15" },
    { type: "line", x1: 2, y1: 12, x2: 22, y2: 12 },
    { type: "line", x1: 12, y1: 2, x2: 12, y2: 22 },
  ],
  "check": [{ type: "polyline", points: "20 6 9 17 4 12" }],
  "pin": [
    { type: "path", d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" },
    { type: "circle", cx: 12, cy: 10, r: 3 },
  ],
  "share": [
    { type: "path", d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" },
    { type: "polyline", points: "16 6 12 2 8 6" },
    { type: "line", x1: 12, y1: 2, x2: 12, y2: 15 },
  ],
  "settings": [
    { type: "circle", cx: 12, cy: 12, r: 3 },
    {
      type: "path",
      d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
    },
  ],
  "ellipsis": [
    { type: "circle", cx: 12, cy: 12, r: 1 },
    { type: "circle", cx: 19, cy: 12, r: 1 },
    { type: "circle", cx: 5, cy: 12, r: 1 },
  ],
  "trash": [
    { type: "polyline", points: "3 6 5 6 21 6" },
    {
      type: "path",
      d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    },
  ],
  "star": [
    {
      type: "polygon",
      points:
        "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",
    },
  ],
  "arrow-up-right": [
    { type: "line", x1: 7, y1: 17, x2: 17, y2: 7 },
    { type: "polyline", points: "7 7 17 7 17 17" },
  ],
}

function renderShape(shape: Shape, key: number, color: string) {
  const common = {
    stroke: color,
    strokeWidth: STROKE_WIDTH,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (shape.type) {
    case "circle":
      return <Circle key={key} {...common} cx={shape.cx} cy={shape.cy} r={shape.r} />
    case "line":
      return <Line key={key} {...common} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
    case "path":
      return <Path key={key} {...common} d={shape.d} />
    case "polyline":
      return <Polyline key={key} {...common} points={shape.points} />
    case "polygon":
      return <Polygon key={key} {...common} points={shape.points} />
  }
}

function resolveSize(size?: IconSize | number): number {
  if (typeof size === "number") return size
  return ICON_SIZES[size ?? "lg"]
}

interface BaseIconProps {
  icon: IconTypes
  color?: string
  size?: IconSize | number
  containerStyle?: ViewStyle
  /** Set this for a meaningful icon; omit for a decorative one next to its own label. */
  accessibilityLabel?: string
}

type PressableIconProps = Omit<PressableProps, "style"> & BaseIconProps
type IconProps = Omit<ViewProps, "style"> & BaseIconProps

export const PressableIcon = forwardRef<View, PressableIconProps>(
  function PressableIcon(props, ref) {
    const { icon, color, size, containerStyle, accessibilityLabel, ...pressableProps } = props
    const { theme } = useAppTheme()
    const resolvedSize = resolveSize(size)
    const resolvedColor = color ?? theme.colors.text

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={containerStyle}
        {...pressableProps}
      >
        <Svg width={resolvedSize} height={resolvedSize} viewBox="0 0 24 24">
          {ICONS[icon].map((shape, i) => renderShape(shape, i, resolvedColor))}
        </Svg>
      </Pressable>
    )
  },
)

export function Icon(props: IconProps) {
  const { icon, color, size, containerStyle, accessibilityLabel, ...viewProps } = props
  const { theme } = useAppTheme()
  const resolvedSize = resolveSize(size)
  const resolvedColor = color ?? theme.colors.text

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
      style={containerStyle}
      {...viewProps}
    >
      <Svg width={resolvedSize} height={resolvedSize} viewBox="0 0 24 24">
        {ICONS[icon].map((shape, i) => renderShape(shape, i, resolvedColor))}
      </Svg>
    </View>
  )
}
