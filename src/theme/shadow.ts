/**
 * A `boxShadow` value from TimeSpot's shadow tokens (colour, opacity, y
 * offset, blur). React Native 0.76+ renders `boxShadow` identically on
 * iOS, Android (new architecture) and web — it replaces the deprecated
 * `shadowColor` / `shadowOpacity` / `shadowRadius` / `shadowOffset` props
 * and Android's separate `elevation`, which never matched iOS anyway.
 */
export function boxShadow(color: string, opacity: number, offsetY: number, blur: number): string {
  return `0px ${offsetY}px ${blur}px ${withAlpha(color, opacity)}`
}

function withAlpha(hex: string, alpha: number): string {
  return `rgba(${rgbChannels(hex)}, ${alpha})`
}

/** "r, g, b" for a hex colour — lets a worklet build a `boxShadow` whose
 * alpha animates, without parsing hex on the UI thread every frame. */
export function rgbChannels(hex: string): string {
  const digits = hex.replace("#", "")
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((c) => c + c)
          .join("")
      : digits.slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
