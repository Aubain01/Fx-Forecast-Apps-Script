/**
 * ============================================================
 *  3_Modele.gs — LE CERVEAU : LES CALCULS DE PRÉVISION
 * ============================================================
 *  Ce fichier ne touche ni au Sheet ni à Internet : il reçoit une
 *  liste de taux et renvoie des chiffres. Analogie : c'est
 *  l'analyste financier enfermé dans son bureau avec sa calculette.
 */

/** Moyenne simple d'un tableau de nombres. */
function moyenne(t) {
  return t.reduce(function (a, b) { return a + b; }, 0) / t.length;
}

/** Écart-type (dispersion autour de la moyenne). */
function ecartType(t) {
  const m = moyenne(t);
  return Math.sqrt(moyenne(t.map(function (x) { return (x - m) * (x - m); })));
}

/** Moyenne mobile : moyenne des n derniers taux. */
function moyenneMobile(taux, n) {
  return moyenne(taux.slice(-n));
}

/**
 * Régression linéaire (méthode des moindres carrés).
 * On cherche la droite  taux = ordonnee + pente × jour
 * qui passe "au plus près" de tous les points.
 */
function regressionLineaire(valeurs) {
  const n = valeurs.length;
  const xMoy = (n - 1) / 2;            // les jours sont numérotés 0, 1, 2, ..., n-1
  const yMoy = moyenne(valeurs);

  let numerateur = 0, denominateur = 0;
  valeurs.forEach(function (y, x) {
    numerateur += (x - xMoy) * (y - yMoy);
    denominateur += (x - xMoy) * (x - xMoy);
  });

  const pente = numerateur / denominateur;
  const ordonnee = yMoy - pente * xMoy;

  // R² : part des mouvements du taux que la droite explique (0 = rien, 1 = tout)
  let sce = 0, sct = 0;
  valeurs.forEach(function (y, x) {
    const yChapeau = ordonnee + pente * x;
    sce += (y - yChapeau) * (y - yChapeau);
    sct += (y - yMoy) * (y - yMoy);
  });
  const r2 = sct === 0 ? 0 : 1 - sce / sct;

  return {
    pente: pente,
    ordonnee: ordonnee,
    r2: r2,
    predire: function (x) { return ordonnee + pente * x; }
  };
}

/**
 * Le cœur du projet : à partir de l'historique, produit la prévision.
 * taux = tableau de nombres, du plus ancien au plus récent.
 */
function predire(taux) {
  const actuel = taux[taux.length - 1];

  // 1) Tendance : droite de régression sur les 30 derniers jours
  const fenetre = taux.slice(-PARAM.FENETRE_REGRESSION);
  const reg = regressionLineaire(fenetre);
  // Prévision prudente : on part du taux actuel et on n'applique que 50 % de la tendance.
  // (La version « 100 % tendance » faisait moins bien que le modèle naïf au backtest.)
  const prevu = actuel + PARAM.POIDS_TENDANCE * reg.pente * PARAM.HORIZON;

  // 2) Volatilité : écart-type des variations journalières (en %)
  const rendements = [];
  for (let i = 1; i < fenetre.length; i++) {
    rendements.push(Math.log(fenetre[i] / fenetre[i - 1]));
  }
  const volatilite = ecartType(rendements);

  // 3) Fourchette à 95 % : l'incertitude grandit avec la racine du temps
  const marge = 1.96 * volatilite * Math.sqrt(PARAM.HORIZON) * actuel;

  // 4) Moyennes mobiles et tendance
  const mm7 = moyenneMobile(taux, PARAM.MM_COURTE);
  const mm30 = moyenneMobile(taux, PARAM.MM_LONGUE);
  const ecartMM = (mm7 - mm30) / mm30 * 100;
  let tendance = "Stable";
  if (ecartMM > 0.05) tendance = "Haussière";
  if (ecartMM < -0.05) tendance = "Baissière";

  return {
    actuel: actuel,
    mm7: mm7,
    mm30: mm30,
    tendance: tendance,
    pente: reg.pente,
    r2: reg.r2,
    prevu: prevu,
    variationPct: (prevu - actuel) / actuel * 100,
    bas: prevu - marge,
    haut: prevu + marge,
    volatilite: volatilite
  };
}

/**
 * Traduit les chiffres en conseil.
 * Point de vue : tu CONVERTIS ta devise source vers la devise cible
 * (ex. EUR → USD). Tu veux donc un taux le plus HAUT possible.
 */
function recommander(p, objectif) {
  if (objectif && p.actuel >= objectif) return "OBJECTIF ATTEINT : convertir";
  if (p.volatilite < 0.00002) return "Taux quasi fixe (parité) : prévision inutile";
  if (p.r2 < PARAM.R2_MIN) return "Tendance peu fiable : neutre";
  if (p.variationPct > PARAM.SEUIL_SIGNAL) return "ATTENDRE (hausse prévue)";
  if (p.variationPct < -PARAM.SEUIL_SIGNAL) return "CONVERTIR MAINTENANT (baisse prévue)";
  return "NEUTRE";
}
