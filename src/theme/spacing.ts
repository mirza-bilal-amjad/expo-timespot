/**
 * TimeSpot — spacing.
 * Drop-in replacement for Ignite's `src/theme/spacing.ts`.
 *
 * ⚠️ Ignite's nine t-shirt steps keep their ORIGINAL values. Ignite's own
 *    components (Screen, Card, ListItem, TextField…) reference them by name and
 *    changing a value silently restyles the whole boilerplate.
 *    TimeSpot's layout constants are added alongside, as semantic names.
 *
 * Measurement provenance — docs/01-design-audit.md §4 and §5.
 */
export const spacing = {
  // ── Ignite's scale — DO NOT CHANGE THESE VALUES ───────────────────────────
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // ── TimeSpot layout constants ─────────────────────────────────────────────
  /** mobile screen gutter — measured 29.5pt, normalised to the 4pt grid */
  gutter: 28,
  /** web content gutter at >=1280px — measured 67px */
  gutterWide: 64,
  /** between city rows (mobile) and city cards (web) — measured 12.75pt / 9px */
  rowGap: 12,
  sectionGap: 32,

  /** city row height — measured 93pt */
  rowHeight: 92,
  /** web city card height */
  cardHeight: 180,
  /** web city card width */
  cardWidth: 320,
  /** web content max-width. 1312 + 2 * 64 = 1440 exactly. */
  container: 1312,
  /** web orange page bezel */
  frame: 26,

  /** avatar diameter and the overlap between adjacent avatars in the strip */
  avatar: 44,
  /** minimum touch target (docs/09-accessibility.md: 44 × 44 iOS) — for a
   * control whose hit area can't come from `hitSlop` */
  hitTarget: 44,
  avatarOverlap: -8,
} as const
