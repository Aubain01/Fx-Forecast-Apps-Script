/**
 * ============================================================
 *  5_Evaluation.gs — LE CONTRÔLE QUALITÉ (BACKTEST)
 * ============================================================
 *  Question : "Mon modèle prévoit-il mieux que rien ?"
 *  Méthode : on se replace dans le passé, jour après jour. Avec
 *  les seules données connues ce jour-là, on fait la prévision à
 *  J+5, puis on la compare au vrai taux observé 5 jours plus tard.
 *  Analogie : un élève qui refait les sujets des années précédentes
 *  en cachant le corrigé, puis compare ses réponses.
 *
 *  On compare au "modèle naïf" : taux dans 5 jours = taux d'aujourd'hui.
 */
function evaluerModele() {
  const paires = lireConfig();
  const groupes = grouperParBase(paires);
  const lignes = [];

  Object.keys(groupes).forEach(function (base) {
    const lot = groupes[base];
    const series = recupererHistorique(base, lot.map(function (p) { return p.cible; }));

    lot.forEach(function (p) {
      const taux = (series[p.cible] || []).map(function (s) { return s.taux; });
      const H = PARAM.HORIZON;
      const minimum = PARAM.MM_LONGUE + PARAM.NB_TESTS + H;
      if (taux.length < minimum) {
        lignes.push([p.base + "/" + p.cible, "Pas assez d'historique", "", "", "", "", ""]);
        return;
      }

      let erreurModele = 0, erreurNaif = 0, bonnesDirections = 0, nbDirections = 0;
      const debut = taux.length - H - PARAM.NB_TESTS;

      for (let t = debut; t < taux.length - H; t++) {
        const connu = taux.slice(0, t + 1);        // seulement le passé (pas de triche !)
        const prevu = predire(connu).prevu;
        const aujourdhui = taux[t];
        const reel = taux[t + H];

        erreurModele += Math.abs(prevu - reel) / reel;
        erreurNaif += Math.abs(aujourdhui - reel) / reel;

        if (reel !== aujourdhui) {
          nbDirections++;
          if (Math.sign(prevu - aujourdhui) === Math.sign(reel - aujourdhui)) bonnesDirections++;
        }
      }

      const maeModele = erreurModele / PARAM.NB_TESTS;
      const maeNaif = erreurNaif / PARAM.NB_TESTS;
      let verdict;
      if (Math.abs(maeModele - maeNaif) < 1e-9) {
        verdict = "Égalité (taux fixe ou quasi fixe)";
      } else if (maeModele < maeNaif) {
        verdict = "Le modèle bat le naïf";
      } else {
        verdict = "Le naïf fait mieux (marché ≈ marche aléatoire)";
      }

      lignes.push([p.base + "/" + p.cible, PARAM.NB_TESTS, maeModele, maeNaif,
        nbDirections ? bonnesDirections / nbDirections : "", verdict, new Date()]);
    });
  });

  const feuille = obtenirOnglet(PARAM.ONGLET_EVAL);
  feuille.clear();
  const entetes = ["Paire", "Nb de tests", "Erreur moyenne modèle", "Erreur moyenne naïf",
    "Bonne direction", "Verdict", "Évalué le"];
  feuille.getRange(1, 1, 1, entetes.length).setValues([entetes])
    .setFontWeight("bold").setBackground("#188038").setFontColor("#ffffff");
  if (lignes.length > 0) {
    feuille.getRange(2, 1, lignes.length, entetes.length).setValues(lignes);
    feuille.getRange(2, 3, lignes.length, 3).setNumberFormat("0.00%");
    feuille.getRange(2, 7, lignes.length, 1).setNumberFormat("dd/MM/yyyy HH:mm");
  }
  feuille.setFrozenRows(1);
  feuille.autoResizeColumns(1, entetes.length);
}
