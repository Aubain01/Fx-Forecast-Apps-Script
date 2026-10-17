# Données du projet

| Fichier | Contenu | Comment l'obtenir |
|---|---|---|
| `config_exemple.csv` | Les paires de devises suivies (onglet Config) | Fourni |
| `raw/taux_bruts_eur_2026-04-20_2026-10-17.csv` | Taux bruts EUR → USD, GBP, CHF, XOF, tels que renvoyés par l'API (week-ends inclus) | Ouvrir l'URL ci-dessous dans un navigateur |
| `raw/taux_bruts_usd_2026-04-20_2026-10-17.csv` | Taux bruts USD → JPY | Ouvrir l'URL ci-dessous dans un navigateur |
| `processed/historique_2026-04-20_2026-10-17.csv` | Données nettoyées par le script (jours ouvrés uniquement), une colonne par paire | Google Sheets : onglet Historique → Fichier → Télécharger → CSV |

URL des fichiers bruts (adapter la date de début) :

```
https://api.frankfurter.dev/v2/rates.csv?from=2026-04-20&base=EUR&quotes=USD,GBP,CHF,XOF
https://api.frankfurter.dev/v2/rates.csv?from=2026-04-20&base=USD&quotes=JPY
```

> ⏳ **Ces fichiers sont un instantané historique** (du 20/04/2026 au 17/10/2026), conservé pour reproduire l'analyse et le backtest présentés dans le README.
> Ils ne sont **pas mis à jour**. Pour des données à jour, il suffit de lancer le script (ou d'ouvrir les URL ci-dessus) : il interroge l'API en direct à chaque exécution.

Convention de nommage : `nom_DATEDEBUT_DATEFIN.csv`, pour savoir d'un coup d'œil quelle période couvre chaque fichier.
