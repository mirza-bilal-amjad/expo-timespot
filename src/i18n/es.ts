import { Translations } from "./en"

const es: Translations = {
  common: {
    ok: "OK",
    cancel: "Cancelar",
    back: "Volver",
  },
  welcomeScreen: {
    postscript:
      "psst — Esto probablemente no es cómo se va a ver tu app. (A menos que tu diseñador te haya enviado estas pantallas, y en ese caso, ¡lánzalas en producción!)",
    readyForLaunch: "Tu app, casi lista para su lanzamiento",
    exciting: "(¡ohh, esto es emocionante!)",
  },
  errorScreen: {
    title: "¡Algo salió mal!",
    friendlySubtitle:
      "Esta es la pantalla que verán tus usuarios en producción cuando haya un error. Vas a querer personalizar este mensaje (que está ubicado en `app/i18n/es.ts`) y probablemente también su diseño (`app/screens/ErrorScreen`). Si quieres eliminarlo completamente, revisa `app/app.tsx` y el componente <ErrorBoundary>.",
    reset: "REINICIA LA APP",
  },
  emptyStateComponent: {
    generic: {
      heading: "Muy vacío... muy triste",
      content:
        "No se han encontrado datos por el momento. Intenta darle clic en el botón para refrescar o recargar la app.",
      button: "Intentemos de nuevo",
    },
  },
  list: {
    title: "Hora mundial",
    emptyTitle: "Aún no hay ciudades",
    emptyBody: "Añade una ciudad para ver su hora junto a la tuya.",
    emptyCta: "Añade tu primera ciudad",
    cityRemoved: "Ciudad eliminada",
    undo: "Deshacer",
  },
  tabBar: {
    list: "Hora mundial",
    clock: "Reloj",
    map: "Mapa",
  },
  search: {
    title: "Añadir una ciudad",
    placeholder: "Buscar ciudades",
    close: "Cerrar búsqueda",
    popular: "Popular",
    noResults: "No hay ninguna ciudad llamada '{{query}}'.",
    offsetHint: "Prueba con un huso horario, p. ej. +5:30",
    useOffsetMatch: "Usar {{name}} (coincide con ese huso)",
    focusHint: "Doble toque para enfocar",
    addHint: "Doble toque para añadir",
    alreadyAdded: ", ya añadida",
  },
  clock: {
    noCity: "Ninguna ciudad seleccionada todavía.",
    openSettings: "Abrir ajustes",
    formatToggle: "Formato de hora",
  },
  settings: {
    title: "Ajustes",
    close: "Cerrar ajustes",
    appearance: "Apariencia",
    theme: "Tema",
    themeSystem: "Sistema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    time: "Hora",
    use24Hour: "Formato de 24 horas",
    about: "Acerca de",
    version: "Versión",
    cityData: "Datos de ciudades",
    mapData: "Datos del mapa",
    typeface: "Tipografía",
    publicDomain: "dominio público",
  },
  sun: {
    midnightSun: "Sol de medianoche",
    polarNight: "Noche polar",
    sunRises: "El sol sale el {{date}}",
    dayLength: "Sol : {{duration}}",
  },
}

export default es
