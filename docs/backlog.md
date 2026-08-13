# Backlog · Guide Sortie (Nightfallens)

> Feuille de route du projet. On coche au fur et à mesure.
> Le **contenu** de la strat se modifie dans `js/data.js`, le **moteur** (rendu) dans `js/app.js`.

## ✅ Fait

- Étage du **haut** complet : Degei → Skomora → Leshonn → Ghatjot (farm + boss).
- Bascule **FR / EN** (mémorisée).
- Thème **clair / sombre** (mémorisé).
- Sélecteur de **comp flex PLD / DNC** (la strat s'adapte, lignes filtrées).
- Filtre **Mon rôle** + mode **Solo**.
- Carte d'ensemble avec **trajet animé** et pastilles 1→2→3→4.
- **Refactor fondations** : contenu (`data.js`) séparé du moteur (`app.js`) → ajouter du contenu = ajouter des données.
- Dépôt **git** propre relié à GitHub, `.gitignore` / `.gitattributes`.
- **Images HD** des mobs/boss (Top Floor + 5 boss du Sous-sol).
- **Éditeur de carte visuel** (`tools/map-studio.html`) — glisser les pastilles → coordonnées auto.
- **Sélecteur d'étage** Top Floor / Sous-sol (bilingue FR/EN).
- **Squelette du Sous-sol** (E-H) : secteurs Dhartok, Triboulex, Aïta, Gartell + Aminon (à venir), familles de mobs / NM mineurs / Reives depuis le wiki.

## 🔧 En cours — Sous-sol (contenu à remplir en run)

- [ ] **Carte du sous-sol** (`img/map-basement.jpg`) + placement des points avec l'éditeur.
- [ ] **Éléments** des 4 boss (Dhartok, Triboulex, Aïta, Gartell) — placeholders pour l'instant.
- [ ] **Strat par boss** : buffs, SC, procs, rôles, règles.
- [ ] **Ordre de run** à figer (actuel : Dhartok → Triboulex → Aïta → Gartell, modifiable).
- [ ] **Aminon** (boss final) — quand vous le ferez.

## 📋 À faire

- [ ] **Refaire les images des mobs** au propre (mêmes noms de fichier `img/mob-*.png` → remplacement direct, aucun code à changer). *(Eric s'en occupe.)*
- [ ] **Compléter la variante DNC** là où il manque encore des lignes.
- [ ] **Actions WHM / GEO** manquantes sur certains boss.
- [ ] **Valider tous les chiffres / rôles** en conditions réelles de run.
- [ ] Relecture **FR/EN** du nouveau contenu (traductions du `TR`).

## 💡 Idées (plus tard)

- [ ] Carte de l'étage du bas dédiée (comme l'overview du haut).
- [ ] Sélecteur d'étage (haut / bas) en haut de page.
- [ ] Impression / export PDF propre.
- [ ] Petite checklist « pré-run » (buffs, positions de départ).

---

## Comment on bosse (workflow)

1. **Éric** ouvre le projet dans VS Code + **Live Server** (aperçu hot-live).
2. **Claude** édite les fichiers directement dans le dépôt → l'aperçu se recharge tout seul.
3. Quand un lot est validé, **Éric** fait **Source Control → Stage → Commit → Push** dans VS Code.
4. GitHub Pages se met à jour tout seul (URL inchangée).

> Règle d'or : on commit à chaque **point stable** (message clair) pour toujours pouvoir revenir en arrière.
