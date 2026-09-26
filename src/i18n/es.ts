import { Translations } from "./en"

const es: Translations = {
  common: {
    appName: "TimeSpot",
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
    day: "Día",
    night: "Noche",
    moreOptions: "Más opciones para {{name}}",
    rename: "Cambiar nombre",
    moveUp: "Subir",
    moveDown: "Bajar",
    remove: "Eliminar",
    renameTitle: "Cambiar nombre de la ciudad",
    renameCancel: "Cancelar",
    save: "Guardar",
    useOriginalName: "Usar «{{name}}»",
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
    current: "Actual",
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
    timeData: "Datos de zona horaria",
    timeDataSystem: "Sistema",
    timeDataBuiltIn: "Tablas integradas (hasta 2030)",
  },
  notices: {
    citiesReset:
      "No se pudieron leer tus ciudades guardadas, así que TimeSpot empezó una lista nueva. Se guardó una copia de los datos anteriores.",
    prefsReset: "No se pudieron leer tus ajustes y se restablecieron los valores predeterminados.",
    storageReset:
      "No se pudieron leer algunos datos guardados, así que TimeSpot empezó de cero. Se guardó una copia.",
    storageRepaired:
      "No se pudieron leer algunas entradas guardadas y se eliminaron. Todo lo demás está intacto.",
    timeEngineDegraded:
      "La compatibilidad de zonas horarias de este dispositivo es limitada, así que TimeSpot usa sus propias tablas. Las horas son exactas hasta 2030.",
    dismiss: "Aceptar",
    dismissLabel: "Descartar este mensaje",
  },
  errors: {
    title: "Algo salió mal",
    body: "TimeSpot encontró un error del que no pudo recuperarse por sí solo. Volver a intentarlo suele solucionarlo.",
    dataset:
      "No se pudieron cargar los datos de ciudades. Inténtalo de nuevo; si sigue ocurriendo, reinstala TimeSpot.",
    retry: "Reintentar",
    reset: "Restablecer datos guardados",
    resetHint: "Borra tus ciudades y ajustes y vuelve a intentarlo",
  },
  sun: {
    midnightSun: "Sol de medianoche",
    polarNight: "Noche polar",
    sunRises: "El sol sale el {{date}}",
    dayLength: "Sol : {{duration}}",
  },
}

export default es
