/**
 * ============================================================
 *  7_Menu.gs — LES BOUTONS ET L'AUTOMATISATION
 * ============================================================
 */

/** S'exécute automatiquement à l'ouverture du Sheet : crée le menu. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Prévisions")
    .addItem("1. Calculer les prévisions", "menuCalculer")
    .addItem("2. Calculer + envoyer sur Telegram", "menuCalculerEtEnvoyer")
    .addItem("3. Évaluer la précision du modèle", "menuEvaluer")
    .addSeparator()
    .addItem("Activer l'envoi automatique (jours ouvrés, 17h)", "installerDeclencheur")
    .addItem("Désactiver l'envoi automatique", "supprimerDeclencheur")
    .addToUi();
}

function menuCalculer() {
  const res = calculerPrevisions();
  SpreadsheetApp.getActive().toast(res.length + " paire(s) traitée(s) ", "Prévisions");
}

function menuCalculerEtEnvoyer() {
  const res = calculerPrevisions();
  envoyerTelegram(composerRapport(res));
  SpreadsheetApp.getActive().toast("Rapport envoyé sur Telegram ", "Prévisions");
}

function menuEvaluer() {
  SpreadsheetApp.getActive().toast("Backtest en cours, patiente quelques secondes…", "Évaluation");
  evaluerModele();
  SpreadsheetApp.getActive().toast("Résultats dans l'onglet " + PARAM.ONGLET_EVAL + " ", "Évaluation");
}

/** Fonction lancée par le déclencheur horaire (sans toi, sans écran). */
function tacheQuotidienne() {
  const jour = new Date().getDay();       // 0 = dimanche, 6 = samedi
  if (jour === 0 || jour === 6) return;   // pas de nouveaux taux le week-end
  const res = calculerPrevisions();
  envoyerTelegram(composerRapport(res));
}

function installerDeclencheur() {
  supprimerDeclencheur(true);
  ScriptApp.newTrigger("tacheQuotidienne")
    .timeBased().everyDays(1).atHour(17).inTimezone("Europe/Paris").create();
  SpreadsheetApp.getActive().toast("Envoi automatique activé : chaque jour ouvré vers 17h ", "Automatisation");
}

function supprimerDeclencheur(silencieux) {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "tacheQuotidienne"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  if (silencieux !== true) SpreadsheetApp.getActive().toast("Envoi automatique désactivé ", "Automatisation");
}
