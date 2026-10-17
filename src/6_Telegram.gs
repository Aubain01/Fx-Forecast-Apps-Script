/**
 * ============================================================
 *  6_Telegram.gs — LE FACTEUR
 * ============================================================
 *  Rédige le rapport et l'envoie sur ton téléphone via ton bot.
 *  Les secrets (token, chat_id) sont rangés dans les Propriétés
 *  du script, jamais écrits dans le code.
 */

function envoyerTelegram(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("TELEGRAM_TOKEN");
  const chatIds = props.getProperty("TELEGRAM_CHAT_ID");
  if (!token || !chatIds) throw new Error("TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID manquant dans les Propriétés du script.");

  // Plusieurs destinataires possibles (chat privé, canal, groupe), séparés par des virgules
  chatIds.split(",").forEach(function (id) {
    const reponse = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "post",
      payload: { chat_id: id.trim(), text: message },
      muteHttpExceptions: true
    });
    if (reponse.getResponseCode() !== 200) {
      throw new Error("Telegram a refusé l'envoi vers " + id + " : " + reponse.getContentText());
    }
  });
}

/** Transforme la liste des résultats en un message lisible. */
function composerRapport(resultats) {
  const lignes = ["Prévisions de change - " +
    Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy"), ""];

  resultats.forEach(function (r) {
    if (r.erreur) {
      lignes.push("" + r.paire + " : " + r.erreur, "");
      return;
    }
    const p = r.pred;
    const signe = p.variationPct >= 0 ? "+" : "";
    lignes.push(
      "• " + r.paire + " : " + p.actuel.toFixed(4) + " " + p.tendance,
      "  Prévu J+" + PARAM.HORIZON + " : " + p.prevu.toFixed(4) +
        " (" + signe + p.variationPct.toFixed(2) + " %)",
      "  Fourchette 95 % : " + p.bas.toFixed(4) + " - " + p.haut.toFixed(4),
      "  Fiabilité tendance (R²) : " + p.r2.toFixed(2),
      "  " + r.conseil
    );
    if (r.montant) {
      lignes.push("  " + r.montant + " " + r.paire.split("/")[0] + " = " +
        (r.montant * p.actuel).toFixed(2) + " " + r.paire.split("/")[1] + " aujourd'hui");
    }
    lignes.push("");
  });

  lignes.push("Projet pédagogique : ceci n'est pas un conseil financier.");
  return lignes.join("\n");
}

/** Test : envoie un message simple pour vérifier la connexion au bot. */
function testTelegram() {
  envoyerTelegram("Connexion réussie ! Ton bot de prévisions de change est prêt.");
}
