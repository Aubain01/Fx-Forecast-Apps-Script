/**
 * ============================================================
 *  2_Api.gs — LE LIVREUR DE DONNÉES
 * ============================================================
 *  Rôle : aller chercher l'historique des taux sur l'API
 *  Frankfurter et le ranger proprement.
 *  Analogie : un coursier qui va à la banque centrale, récupère
 *  le registre des taux et le trie par devise avant de te le donner.
 */

/** Transforme une date JavaScript en texte "AAAA-MM-JJ" (format attendu par l'API). */
function formaterDate(d) {
  return Utilities.formatDate(d, "Europe/Paris", "yyyy-MM-dd");
}

/**
 * Récupère l'historique d'une devise de base vers plusieurs devises cibles.
 * Exemple : recupererHistorique("EUR", ["USD", "GBP"])
 * Renvoie : { USD: [{date:"2026-10-01", taux:1.12}, ...], GBP: [...] }
 */
function recupererHistorique(base, cibles) {
  const debut = new Date();
  debut.setDate(debut.getDate() - PARAM.JOURS_CALENDAIRES);

  const url = PARAM.API +
    "?from=" + formaterDate(debut) +
    "&base=" + base +
    "&quotes=" + cibles.join(",");

  const reponse = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = reponse.getResponseCode();
  const texte = reponse.getContentText();

  if (code !== 200) {
    let detail = texte;
    try { detail = JSON.parse(texte).message || texte; } catch (e) {}
    throw new Error("API Frankfurter (code " + code + ") pour " + base + " : " + detail);
  }

  const lignes = JSON.parse(texte);   // tableau de {date, base, quote, rate}

  // On prépare un "tiroir" vide par devise cible...
  const series = {};
  cibles.forEach(function (c) { series[c] = []; });

  // ...puis on range chaque ligne dans le bon tiroir
  lignes.forEach(function (l) {
    // On ignore le samedi (6) et le dimanche (0) : marchés fermés, taux recopiés
    const jour = new Date(l.date + "T12:00:00Z").getUTCDay();
    if (jour === 0 || jour === 6) return;
    if (series[l.quote]) series[l.quote].push({ date: l.date, taux: l.rate });
  });

  // Tri chronologique (du plus ancien au plus récent)
  Object.keys(series).forEach(function (c) {
    series[c].sort(function (a, b) { return a.date.localeCompare(b.date); });
  });

  return series;
}

/** Fonction de TEST : à lancer seule depuis l'éditeur pour vérifier que l'API répond. */
function testApi() {
  const s = recupererHistorique("EUR", ["USD"]);
  Logger.log(s.USD.length + " jours de cotation reçus pour EUR/USD");
  Logger.log("3 derniers points : " + JSON.stringify(s.USD.slice(-3)));
}
