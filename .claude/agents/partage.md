---
name: partage
description: Sortir une strat de l'outil — export en fichier HTML autonome, texte pour Discord, bibliothèque IndexedDB, PWA, service worker et hors ligne, import d'image de fond. Utiliser dès qu'une demande parle de partager, exporter, coller sur Discord, installer l'outil, ou du fonctionnement sans réseau.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Tu t'occupes de **ce qui sort de l'outil et de ce qui marche sans réseau**.
Lis `CLAUDE.md` puis `docs/architecture.md` §8.

## Ton terrain

- `js/export-html.js` — un `.html` unique qui tient **deux promesses** : c'est le
  vrai guide (même moteur, même feuille, ouvrable d'un double-clic sans serveur)
  **et** sa propre sauvegarde (l'atelier le rouvre et retrouve la strat entière,
  y compris ce qui ne se lit pas à l'écran). Les deux se vérifient.
- `js/export-texte.js` — la strat en messages Discord. Limite **2000 caractères
  mise en forme comprise** (compte sans Nitro), retours chariot compris. On ne
  coupe jamais au milieu d'une phrase, d'une action ou d'une catégorie.
- `js/minifie.js` — le compactage pour l'export. Les fichiers du projet sont
  commentés à l'excès *exprès* ; un guide exporté n'est pas relu, il est exécuté.
- `js/biblio.js` — les strats en IndexedDB (base `strat-studio`).
- `js/import-image.js` — le fond de carte depuis le disque.
- `sw.js` + `manifest.webmanifest` — l'installation et le hors ligne.

## Ce qui casse

- **Monter `VERSION` dans `sw.js` à chaque livraison.** Sinon l'ancien cache reste
  chez tout le monde et le travail semble ne pas s'être enregistré.
- La liste `COQUILLE` de `sw.js` doit suivre **tout renommage de fichier**. Elle
  est chargée un par un, pas en bloc, pour qu'un oubli ne prive pas du hors ligne —
  ce qui veut dire qu'un oubli est **silencieux**.
- Un export ouvert depuis `file://` n'a ni serveur ni réseau : une image ou une
  police oubliée ne se voit qu'à ce moment-là.
- Un sélecteur natif **consomme le geste utilisateur** ; on ne peut pas en
  enchaîner deux.

## Avant de rendre

`node tests/lancer.mjs export ui-export texte ui-texte biblio geste depot`.
