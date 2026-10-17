/**
 * ============================================================
 *  4_Feuilles.gs — LE CHEF D'ORCHESTRE
 * ============================================================
 *  Lit la configuration, appelle le livreur (API), le cerveau
 *  (Modèle), puis écrit les résultats dans le Sheet.
 */

/** Lit l'onglet Config et renvoie la liste des paires actives. */
function lireConfig() {
  const feuille = SpreadsheetApp.getActive().getSheetByName(PARAM.ONGLET_CONFIG);
  if (!feuille) throw new Error("Onglet '" + PARAM.ONGLET_CONFIG + "' introuvable.");
  const derniere = feuille.getLastRow();
  if (derniere < 2) return [];

  return feuille.getRange(2, 1, derniere - 1, 5).getValues()
    .filter(function (l) {
      const actif = l[4] === true || String(l[4]).toUpperCase() === "OUI";
      return l[0] && l[1] && actif;
    })
    .map(function (l) {
      return {
        base: String(l[0]).trim().toUpperCase(),
        cible: String(l[1]).trim().toUpperCase(),
        montant: Number(l[2]) || 0,
        objectif: Number(l[3]) || null
      };
    });
}

/** Regroupe les paires par devise de base : 1 seul appel API par devise de base. */
function grouperParBase(paires) {
  const groupes = {};
  paires.forEach(function (p) {
    if (!groupes[p.base]) groupes[p.base] = [];
    groupes[p.base].push(p);
  });
  return groupes;
}

/**
 * Fonction PRINCIPALE : calcule toutes les prévisions et remplit les onglets
 * Previsions et Historique. Renvoie la liste des résultats (utilisée par Telegram).
 * Pas d'interface (alert/toast) ici : elle doit aussi tourner la nuit, sans toi.
 */
function calculerPrevisions() {
  const paires = lireConfig();
  if (paires.length === 0) throw new Error("Aucune paire active dans l'onglet Config.");

  const groupes = grouperParBase(paires);
  const resultats = [];
  const historique = {};   // { "EUR/USD": {"2026-10-01": 1.12, ...}, ... }

  Object.keys(groupes).forEach(function (base) {
    const lot = groupes[base];
    try {
      const series = recupererHistorique(base, lot.map(function (p) { return p.cible; }));

      lot.forEach(function (p) {
        const nom = p.base + "/" + p.cible;
        const serie = series[p.cible];
        if (!serie || serie.length < PARAM.MM_LONGUE) {
          resultats.push({ paire: nom, erreur: "Pas assez de données (" + (serie ? serie.length : 0) + " jours)" });
          return;
        }
        const pred = predire(serie.map(function (s) { return s.taux; }));
        resultats.push({
          paire: nom,
          date: serie[serie.length - 1].date,
          montant: p.montant,
          objectif: p.objectif,
          pred: pred,
          conseil: recommander(pred, p.objectif)
        });
        historique[nom] = {};
        serie.forEach(function (s) { historique[nom][s.date] = s.taux; });
      });
    } catch (e) {
      lot.forEach(function (p) {
        resultats.push({ paire: p.base + "/" + p.cible, erreur: e.message });
      });
    }
  });

  ecrirePrevisions(resultats);
  ecrireHistorique(historique);
  return resultats;
}

/** Écrit le tableau des prévisions. */
function ecrirePrevisions(resultats) {
  const feuille = obtenirOnglet(PARAM.ONGLET_PREV);
  const entetes = ["Paire", "Date du taux", "Taux actuel", "MM7", "MM30", "Tendance",
    "Pente / jour", "R²", "Taux prévu J+" + PARAM.HORIZON, "Variation prévue",
    "Fourchette basse", "Fourchette haute", "Conseil",
    "Montant converti aujourd'hui", "Montant estimé J+" + PARAM.HORIZON, "Mis à jour le"];

  const maintenant = new Date();
  const lignes = resultats.map(function (r) {
    if (r.erreur) {
      return [r.paire, "", "", "", "", "", "", "", "", "", "", "", "" + r.erreur, "", "", maintenant];
    }
    const p = r.pred;
    return [r.paire, r.date, p.actuel, p.mm7, p.mm30, p.tendance, p.pente, p.r2,
      p.prevu, p.variationPct / 100, p.bas, p.haut, r.conseil,
      r.montant ? r.montant * p.actuel : "", r.montant ? r.montant * p.prevu : "", maintenant];
  });

  feuille.clear();
  feuille.getRange(1, 1, 1, entetes.length).setValues([entetes])
    .setFontWeight("bold").setBackground("#1a73e8").setFontColor("#ffffff");
  if (lignes.length > 0) {
    feuille.getRange(2, 1, lignes.length, entetes.length).setValues(lignes);
    const n = lignes.length;
    feuille.getRange(2, 3, n, 3).setNumberFormat("0.0000");      // taux, MM7, MM30
    feuille.getRange(2, 7, n, 1).setNumberFormat("0.000000");    // pente
    feuille.getRange(2, 8, n, 1).setNumberFormat("0.00");        // R²
    feuille.getRange(2, 9, n, 1).setNumberFormat("0.0000");      // taux prévu
    feuille.getRange(2, 10, n, 1).setNumberFormat("+0.00%;-0.00%");
    feuille.getRange(2, 11, n, 2).setNumberFormat("0.0000");     // fourchette
    feuille.getRange(2, 14, n, 2).setNumberFormat("#,##0.00");   // montants
    feuille.getRange(2, 16, n, 1).setNumberFormat("dd/MM/yyyy HH:mm");
  }
  feuille.setFrozenRows(1);
  feuille.autoResizeColumns(1, entetes.length);
}

/** Écrit l'historique en format "large" : Date | EUR/USD | EUR/GBP | ... (pratique pour un graphique). */
function ecrireHistorique(historique) {
  const feuille = obtenirOnglet(PARAM.ONGLET_HISTO);
  const paires = Object.keys(historique);
  feuille.clear();
  if (paires.length === 0) return;

  const toutesDates = {};
  paires.forEach(function (p) {
    Object.keys(historique[p]).forEach(function (d) { toutesDates[d] = true; });
  });
  const dates = Object.keys(toutesDates).sort();

  const lignes = dates.map(function (d) {
    return [d].concat(paires.map(function (p) {
      return historique[p][d] !== undefined ? historique[p][d] : "";
    }));
  });

  feuille.getRange(1, 1, 1, paires.length + 1).setValues([["Date"].concat(paires)]).setFontWeight("bold");
  feuille.getRange(2, 1, lignes.length, paires.length + 1).setValues(lignes);
  feuille.setFrozenRows(1);
}

/** Renvoie l'onglet demandé, et le crée s'il n'existe pas encore. */
function obtenirOnglet(nom) {
  const classeur = SpreadsheetApp.getActive();
  return classeur.getSheetByName(nom) || classeur.insertSheet(nom);
}
