/**
 * TimeSpot does not vary spacing by theme, so the dark scale re-exports the light one.
 * The file must still exist — Ignite's theme.ts and types.ts both import it.
 */
export { spacing } from "./spacing"
