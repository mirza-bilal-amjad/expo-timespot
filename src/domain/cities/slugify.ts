/** URL-safe slug: diacritics stripped, lowercased, runs of anything else to
 * one hyphen. Shared by scripts/build-cities.ts (which slugifies the ASCII
 * name, then de-duplicates) and the packed dataset (which stores only the
 * slugs that differ from `slugify(name)`). */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
