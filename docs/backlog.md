# Backlog · FFXI Strat Studio

> Feuille de route. On coche au fur et à mesure.
> Une strat s'écrit dans l'atelier (`tools/studio.html`), qui l'enregistre dans `js/data.js`.
> Le guide (`index.html`) ne fait que la rendre.

---

## ✅ L'atelier

- **Deux onglets** : *Carte* (poser les marqueurs, tracer les chemins) et *Stratégie*
  (écrire les lignes job par job).
- **Tout se règle sur la carte** : barre d'armement en haut pour choisir quoi poser,
  carte de réglages qui s'ouvre à côté de l'objet posé et le suit au zoom. L'inspecteur
  de droite ne configure plus rien — il explique.
- **Outils** : marqueur (boss / midboss / pack), texte enrichi, tracé, forme, image, pipette.
- **La Puce** : n'importe quelle annotation peut prendre la forme d'une pastille ronde —
  un numéro d'ordre, une lettre, un mot posé où on veut. C'est une case à cocher dans la
  carte d'édition du texte, pas un outil de plus : rien de nouveau dans `data.js`.
- **Un calque par type de marqueur**, qu'on masque indépendamment.
- **Enregistrement direct dans `data.js`**, bloc par bloc, le même mécanisme pour les deux
  onglets — on choisit le fichier une fois pour tout l'atelier.
- **Bibliothèque de strats** : on garde, on rouvre, on repart d'une ancienne.
- **Import d'une image de fond** depuis le disque.
- **Sortir une strat** : fichier HTML autonome (qui s'ouvre partout, sans réseau) ou
  messages prêts à coller sur Discord.

## ✅ Le guide

- **Étage du haut complet** : Degei → Skomora → Leshonn → Ghatjot (farm + boss).
- **FR / EN** et **thème clair / sombre**, tous deux mémorisés.
- **Comp flex PLD / DNC** : la strat s'adapte, les lignes se filtrent.
- **Mon rôle** + mode **Solo**.
- **Carte d'ensemble** avec trajet animé et pastilles 1→2→3→4.
- **Sélecteur d'étage** haut / sous-sol.
- **Images des mobs** en WebP 256 px — le guide est passé de 732 à 544 Ko.
- **Squelette du sous-sol** (E–H) avec sa carte d'ensemble *et* une carte par secteur.
- **Le guide porte la marque de l'outil** : son onglet et son aperçu Discord annoncent
  la strat *et* « FFXI Strat Studio », et le logo de l'en-tête ramène à l'atelier. Dans un
  fichier exporté, le logo reste mais cesse d'être un lien — il n'y aurait rien au bout.

## ✅ Les fondations

- **Contenu séparé du moteur** : ajouter de la strat = ajouter des données, pas du code.
- **Installable** (PWA) et **utilisable hors ligne** — utile en donjon, sans alt-tab.
- **Des contrôles qui ouvrent vraiment les pages** dans un navigateur, montés d'une commande.
- **Le projet se présente lui-même** : `CLAUDE.md`, `docs/architecture.md`, sept agents.
- Dépôt git propre relié à GitHub Pages.

---

## 🔧 En cours — le sous-sol

Ce qui manque ici n'est pas du code : c'est ce qui se sait en run. L'outil est prêt.

- [ ] **Dhartok** (secteur E) — le boss est déclaré, sa strat est vide.
- [ ] **Triboulex** (G) — idem. Seul Naraka, qu'on tue sur le trajet, a sa ligne.
- [ ] **Aïta** (H) — vide.
- [ ] **Gartell** (F) — vide.
- [ ] **Aminon** — boss final, pas commencé.
- [ ] **Ordre de run à figer** — pour l'instant Dhartok → Triboulex → Aïta → Gartell.

> Où on en est vraiment : le sous-sol tient en **32 lignes** de `PHASES_B` contre 175 pour
> l'étage du haut, et ne contient en tout que **deux lignes de strat** — Botulus et Naraka,
> tuables sur le trajet au DNC. Les quatre boss portent encore la mention « à définir ».

## 📋 Ce qui reste de mon côté

Rien pour l'instant. Le sous-sol attend un run, pas du code — et tout le reste de
cette page est du contenu à écrire.

## 📋 Contenu à compléter

- [ ] **Refaire les images des mobs** au propre — mêmes noms (`img/mob-*.webp`), remplacement
      direct, aucun code à toucher. *(Eric s'en occupe.)*
- [ ] **Variante DNC** là où il manque encore des lignes.
- [ ] **Actions WHM / GEO** manquantes sur certains boss.
- [ ] **Valider les chiffres et les rôles** en conditions réelles.
- [ ] **Relecture FR / EN** du nouveau contenu (les traductions de `TR`).

## 💡 Plus tard

- [ ] Impression / export PDF propre.
- [ ] Checklist « pré-run » : buffs, positions de départ.

---

## Comment on bosse

1. **Eric** écrit la strat dans l'atelier et l'enregistre — ça écrit directement `js/data.js`.
2. **Claude** touche au moteur et aux outils, jamais au contenu sans prévenir : `git status`
   avant `data.js`, et on committe le travail d'Eric **à part** s'il y en a en attente.
3. Les commits restent **locaux**. C'est Eric qui publie — GitHub Pages suit tout seul.

> Règle d'or : on committe à chaque point stable, avec un message qui dit ce qu'on peut
> refaire ou défaire. C'est ce qui permet de revenir en arrière sans y penser.
