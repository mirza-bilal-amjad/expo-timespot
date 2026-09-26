import { Translations } from "./en"

const fr: Translations = {
  common: {
    appTitle: "TimeSpot — horloge mondiale",
    appDescription:
      "L’heure dans toutes les villes qui comptent pour vous : horloges en direct, jour et nuit, décalages horaires et carte du monde.",
    appName: "TimeSpot",
    ok: "OK !",
    cancel: "Annuler",
    back: "Retour",
  },
  welcomeScreen: {
    postscript:
      "psst  — Ce n'est probablement pas à quoi ressemble votre application. (À moins que votre designer ne vous ait donné ces écrans, dans ce cas, mettez la en prod !)",
    readyForLaunch: "Votre application, presque prête pour le lancement !",
    exciting: "(ohh, c'est excitant !)",
  },
  errorScreen: {
    title: "Quelque chose s'est mal passé !",
    friendlySubtitle:
      "C'est l'écran que vos utilisateurs verront en production lorsqu'une erreur sera lancée. Vous voudrez personnaliser ce message (situé dans `app/i18n/fr.ts`) et probablement aussi la mise en page (`app/screens/ErrorScreen`). Si vous voulez le supprimer complètement, vérifiez `app/app.tsx` pour le composant <ErrorBoundary>.",
    reset: "RÉINITIALISER L'APPLICATION",
  },
  emptyStateComponent: {
    generic: {
      heading: "Si vide... si triste",
      content:
        "Aucune donnée trouvée pour le moment. Essayez de cliquer sur le bouton pour rafraîchir ou recharger l'application.",
      button: "Essayons à nouveau",
    },
  },
  list: {
    day: "Jour",
    night: "Nuit",
    moreOptions: "Plus d’options pour {{name}}",
    rename: "Renommer",
    moveUp: "Monter",
    moveDown: "Descendre",
    remove: "Supprimer",
    renameTitle: "Renommer la ville",
    renameCancel: "Annuler",
    save: "Enregistrer",
    useOriginalName: "Utiliser « {{name}} »",
    title: "Heure mondiale",
    emptyTitle: "Aucune ville pour l'instant",
    emptyBody: "Ajoutez une ville pour voir son heure à côté de la vôtre.",
    emptyCta: "Ajoutez votre première ville",
    cityRemoved: "Ville supprimée",
    undo: "Annuler",
  },
  tabBar: {
    list: "Heure mondiale",
    clock: "Horloge",
    map: "Carte",
  },
  search: {
    title: "Ajouter une ville",
    placeholder: "Rechercher des villes",
    close: "Fermer la recherche",
    popular: "Populaire",
    noResults: "Aucune ville nommée « {{query}} ».",
    offsetHint: "Essayez un fuseau horaire, ex. +5:30",
    useOffsetMatch: "Utiliser {{name}} (correspond à ce fuseau)",
    focusHint: "Appuyez deux fois pour activer",
    addHint: "Appuyez deux fois pour ajouter",
    alreadyAdded: ", déjà ajoutée",
  },
  clock: {
    current: "Actuelle",
    noCity: "Aucune ville sélectionnée pour l'instant.",
    openSettings: "Ouvrir les réglages",
    formatToggle: "Format de l'heure",
  },
  settings: {
    title: "Réglages",
    close: "Fermer les réglages",
    appearance: "Apparence",
    theme: "Thème",
    themeSystem: "Système",
    themeLight: "Clair",
    themeDark: "Sombre",
    time: "Heure",
    use24Hour: "Format 24 heures",
    about: "À propos",
    version: "Version",
    cityData: "Données des villes",
    mapData: "Données cartographiques",
    typeface: "Police",
    publicDomain: "domaine public",
    timeData: "Données de fuseau horaire",
    timeDataSystem: "Système",
    timeDataBuiltIn: "Tables intégrées (jusqu’en 2030)",
  },
  notices: {
    citiesReset:
      "Vos villes enregistrées n’ont pas pu être lues, TimeSpot a donc créé une nouvelle liste. Une copie des anciennes données a été conservée.",
    prefsReset: "Vos réglages n’ont pas pu être lus et ont été rétablis par défaut.",
    storageReset:
      "Certaines données enregistrées n’ont pas pu être lues, TimeSpot est donc reparti de zéro. Une copie a été conservée.",
    storageRepaired:
      "Quelques entrées enregistrées n’ont pas pu être lues et ont été supprimées. Tout le reste est intact.",
    timeEngineDegraded:
      "La prise en charge des fuseaux horaires de cet appareil est limitée : TimeSpot utilise donc ses propres tables. Les heures sont exactes jusqu’en 2030.",
    dismiss: "OK",
    dismissLabel: "Fermer ce message",
  },
  errors: {
    title: "Un problème est survenu",
    body: "TimeSpot a rencontré une erreur dont il n’a pas pu se remettre seul. Réessayer suffit généralement.",
    dataset:
      "Les données des villes n’ont pas pu être chargées. Réessayez ; si le problème persiste, réinstallez TimeSpot.",
    retry: "Réessayer",
    reset: "Réinitialiser les données",
    resetHint: "Efface vos villes et réglages, puis réessaie",
  },
  cityPage: {
    pageTitle: "Heure à {{place}} — heure locale actuelle",
    description:
      "Heure locale actuelle à {{place}} ({{offset}}) : date, lever et coucher du soleil, heure d’été et décalage horaire avec les grandes villes.",
    heroLabel: "Il est {{time}} à {{city}}",
    timeZone: "Fuseau horaire",
    dst: "Heure d’été",
    dstNone: "Non appliquée",
    dstDaylight: "En vigueur",
    dstStandard: "Pas en vigueur",
    nextChange: "Prochain changement d’heure",
    clocksForward: "{{date}} — on avance de {{amount}}",
    clocksBack: "{{date}} — on recule de {{amount}}",
    noChange: "Aucun prévu",
    sun: "Lever – coucher du soleil",
    polarNight: "Nuit polaire",
    midnightSun: "Soleil de minuit",
    differences: "Décalage horaire",
    ahead: "{{amount}} d’avance",
    behind: "{{amount}} de retard",
    same: "Même heure",
    nearby: "Villes des fuseaux voisins",
    openApp: "Ouvrir TimeSpot",
    openAppHint: "Votre horloge mondiale, avec toutes vos villes",
    notFoundTitle: "Page introuvable",
    notFoundBody: "Il n’y a pas de page ici. Cette ville n’en a peut-être pas encore.",
    home: "Aller sur TimeSpot",
  },
  sun: {
    midnightSun: "Soleil de minuit",
    polarNight: "Nuit polaire",
    sunRises: "Le soleil se lève le {{date}}",
    dayLength: "Soleil : {{duration}}",
  },
}

export default fr
