import type { ComponentType } from "react"
import { Redirect } from "expo-router"

/**
 * The component showcase (`/visual-qa`) — development builds only. Required
 * inside a `__DEV__` branch so production drops it from the dependency graph
 * entirely: it imports every component, and as a route shared with the real
 * tabs it pulled the map, the sheets and the data into the web build's
 * common chunk (task 6.1). A production visit redirects home.
 */
const StoriesScreen: ComponentType | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@/screens/StoriesScreen").StoriesScreen
  : null

export default function Stories() {
  return StoriesScreen ? <StoriesScreen /> : <Redirect href="/" />
}
