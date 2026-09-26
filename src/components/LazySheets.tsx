import { lazy, Suspense, useState } from "react"

import type { RenameSheetProps } from "./RenameSheet"
import type { SettingsSheetProps } from "./SettingsSheet"

/**
 * docs/10-implementation-plan.md task 6.1. Sheets are never part of a
 * screen's first paint, so their code (and on web @expo/ui's drawer, vaul,
 * the scroll lock) loads the first time one opens, as its own chunk. Once
 * opened a sheet stays mounted, so it can animate closed.
 */

const SettingsSheetImpl = lazy(() =>
  import("./SettingsSheet").then((m) => ({ default: m.SettingsSheet })),
)
const RenameSheetImpl = lazy(() =>
  import("./RenameSheet").then((m) => ({ default: m.RenameSheet })),
)

function useMountedOnce(open: boolean): boolean {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  return mounted || open
}

export function LazySettingsSheet(props: SettingsSheetProps) {
  if (!useMountedOnce(props.open)) return null
  return (
    <Suspense fallback={null}>
      <SettingsSheetImpl {...props} />
    </Suspense>
  )
}

export function LazyRenameSheet(props: RenameSheetProps) {
  if (!useMountedOnce(props.city !== null)) return null
  return (
    <Suspense fallback={null}>
      <RenameSheetImpl {...props} />
    </Suspense>
  )
}
