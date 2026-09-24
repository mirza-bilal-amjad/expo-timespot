import { Translations } from "./en"

const fr: Translations = {
  common: {
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
    noCity: "Aucune ville sélectionnée pour l'instant.",
    openSettings: "Ouvrir les réglages",
    formatToggle: "Format de l'heure",
  },
  sun: {
    midnightSun: "Soleil de minuit",
    polarNight: "Nuit polaire",
    sunRises: "Le soleil se lève le {{date}}",
    dayLength: "Soleil : {{duration}}",
  },
}

export default fr
