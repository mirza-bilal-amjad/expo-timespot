# ADR-0003 — Where `@expo/ui` is used, and where it is not

**Status:** accepted · 2026-09-23

## Context

The brief asks to build with Expo UI. `@expo/ui` universal components render as **SwiftUI on iOS, Jetpack Compose on Android, and JS on web** from one component tree. Stable since SDK 56.

That is a genuine superpower — and a direct conflict with this design. The whole point of `@expo/ui` is that controls look like the platform. The whole point of these mockups is that the product looks like *itself*: one grey, hairline cards, 144-pt numerals, circular tab buttons. A SwiftUI `List` will never look like the city list in the board, and forcing it to would mean fighting the library on every property.

Using it everywhere produces an app that looks like neither the mockup nor a native app. Using it nowhere throws away real quality on sheets, keyboards and pickers — the components that are genuinely hard to build well and that users notice immediately when they are wrong.

## Decision

Draw an explicit line: **`@expo/ui` owns system affordances and inputs. Custom primitives own branded surfaces.**

| `@expo/ui` | Custom |
|---|---|
| `BottomSheet` — detents, rubber-banding, dismiss gestures | `Card`, `CityRow`, `CityCard` |
| `TextInput` — keyboard, autofill, dictation, IME, undo | `Numeral`, `HeroClock` |
| `Picker` — Settings selectors | `SegmentedPill` (12h/24h is brand-critical) |
| `Switch` — Settings toggles | `TabBar` (the circular shape language *is* the brand) |
| `List` / `FieldGroup` — Settings groups | `MeridianMap`, `AvatarStrip` |
| `ContextMenu` — long-press menus | `Button` |

Rule of thumb: **if the user would be annoyed by it not matching their OS, use `@expo/ui`. If the user would be annoyed by it not matching the brand, build it.**

## Implementation

1. Every `@expo/ui` component is wrapped in an adapter in `src/components/`. Feature code imports the adapter, never `@expo/ui` directly — a future swap touches one file.
2. `<Host>` is mounted **inside the adapter**, once, never at call sites.
3. The adapter normalises the API so `<Sheet>` has one signature across native and web.
4. Adding an `@expo/ui` component outside this table requires updating this ADR.

## Consequences

**Good:** native-quality sheets, keyboards and pickers for free, including future OS behaviour changes. Brand surfaces stay exactly on-spec. The boundary is legible to a reviewer and to an agent.

**Costs:** two styling models in the codebase — `@expo/ui` components are styled by their own props, not by Ignite's `ThemedStyle`. Accepted, and contained to the adapter layer, which reads `useAppTheme()` and passes explicit values down. Settings will look subtly different per platform; that is correct, not a bug.
