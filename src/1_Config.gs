/**
 * ============================================================
 *  1_Config.gs — LE TABLEAU DE BORD DES RÉGLAGES
 * ============================================================
 *  Tous les paramètres du projet sont ici, au même endroit.
 *  Analogie : c'est le panneau de réglages d'une machine.
 *  Tu veux une prévision à 10 jours au lieu de 5 ? Tu changes
 *  HORIZON ici, et tout le reste du programme suit.
 */
const PARAM = {
  // Noms des onglets du Google Sheet (sans accents)
  ONGLET_CONFIG: "Config",
  ONGLET_PREV: "Previsions",
  ONGLET_HISTO: "Historique",
  ONGLET_EVAL: "Evaluation",

  // Données
  API: "https://api.frankfurter.dev/v2/rates",
  JOURS_CALENDAIRES: 180,   // période téléchargée (≈ 129 jours ouvrés après filtre)

  // Modèle
  FENETRE_REGRESSION: 30,   // nb de jours ouvrés utilisés pour tracer la droite de tendance
  MM_COURTE: 7,             // moyenne mobile courte
  MM_LONGUE: 30,            // moyenne mobile longue
  HORIZON: 5,               // on prévoit le taux dans 5 jours ouvrés (≈ 1 semaine)
  SEUIL_SIGNAL: 0.3,        // en % : variation prévue minimale pour donner un conseil
  R2_MIN: 0.3,              // en dessous, la tendance est jugée peu fiable
  POIDS_TENDANCE: 0.5,      // part de la tendance appliquée à la prévision (prévision prudente)

  // Évaluation (backtest)
  NB_TESTS: 60              // nb de prévisions passées rejouées pour mesurer la précision
};
