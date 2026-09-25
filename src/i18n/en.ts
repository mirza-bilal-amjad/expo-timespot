const en = {
  common: {
    ok: "OK!",
    cancel: "Cancel",
    back: "Back",
  },
  welcomeScreen: {
    postscript:
      "psst  — This probably isn't what your app looks like. (Unless your designer handed you these screens, and in that case, ship it!)",
    readyForLaunch: "Your app, almost ready for launch!",
    exciting: "(ohh, this is exciting!)",
  },
  errorScreen: {
    title: "Something went wrong!",
    friendlySubtitle:
      "This is the screen that your users will see in production when an error is thrown. You'll want to customize this message (located in `app/i18n/en.ts`) and probably the layout as well (`app/screens/ErrorScreen`). If you want to remove this entirely, check `app/app.tsx` for the <ErrorBoundary> component.",
    reset: "RESET APP",
  },
  emptyStateComponent: {
    generic: {
      heading: "So empty... so sad",
      content: "No data found yet. Try clicking the button to refresh or reload the app.",
      button: "Let's try this again",
    },
  },
  list: {
    title: "World Time",
    emptyTitle: "No cities yet",
    emptyBody: "Add a city to see its time next to yours.",
    emptyCta: "Add your first city",
    cityRemoved: "City removed",
    undo: "Undo",
  },
  tabBar: {
    list: "World time",
    clock: "Clock",
    map: "Map",
  },
  search: {
    title: "Add a city",
    placeholder: "Search cities",
    close: "Close search",
    popular: "Popular",
    noResults: "No city called '{{query}}'.",
    offsetHint: "Try a UTC offset, e.g. +5:30",
    useOffsetMatch: "Use {{name}} (matches that offset)",
    focusHint: "Double tap to focus",
    addHint: "Double tap to add",
    alreadyAdded: ", already added",
  },
  clock: {
    noCity: "No city selected yet.",
    openSettings: "Open settings",
    formatToggle: "Time format",
  },
  settings: {
    title: "Settings",
    close: "Close settings",
    appearance: "Appearance",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    time: "Time",
    use24Hour: "24-hour time",
    about: "About",
    version: "Version",
    cityData: "City data",
    mapData: "Map data",
    typeface: "Typeface",
    publicDomain: "public domain",
  },
  sun: {
    midnightSun: "Midnight sun",
    polarNight: "Polar night",
    sunRises: "Sun rises {{date}}",
    dayLength: "Sun : {{duration}}",
  },
}

export default en
export type Translations = typeof en
