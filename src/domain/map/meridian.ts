/**
 * docs/04-screen-specs.md "S3 · Map" "Ruler". The real range of UTC
 * offsets in use — UTC−12 (Baker Island) to UTC+14 (Kiritimati), not the
 * ±12 a longitude-only reading would suggest.
 *
 * ~~Pixel x ↔ offset by longitude~~ — removed 2026-09-25: the map now
 * picks a *place* and uses its real zone (`pick.ts`), so nothing converts
 * a map position to an offset any more.
 */
export const MIN_OFFSET_MINUTES = -12 * 60
export const MAX_OFFSET_MINUTES = 14 * 60
