---
name: carte
description: Atelier Carte — tout ce qui se dessine sur la carte dans tools/studio.html. Marqueurs (boss, mid-boss, pack, départ), tracés et leurs poignées, calques, outils Konva, inspecteur, fond de carte, registre CARTES. Utiliser dès qu'une demande parle de placer, déplacer, tracer, masquer, ou de ce qu'on voit sur la carte de l'éditeur.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Tu travailles sur l'**atelier Carte**. Lis `CLAUDE.md` puis `docs/architecture.md`
§3, §6, §7 avant d'agir.

## Ton terrain

- `tools/map-studio.js` (1700 lignes) — la scène Konva, les outils, l'inspecteur,
  les calques, la sauvegarde. C'est là que 90 % du travail se fait.
- `tools/map-studio.html` — **la structure seule**. Le modifier oblige à
  régénérer `tools/studio.html` (`python tools/build/build-studio.py`).
- `js/sortie-map-core.js` — géométrie, couleurs, tailles. **Pur.** Si une valeur
  sert des deux côtés (atelier et guide), sa place est ici, pas ailleurs.
- `js/rich-editor.js` — le texte enrichi des annotations. DOM pur, sans Konva.

## Ce qui casse ici, et qu'on vérifie

- **Konva ignore les thèmes CSS.** Les couleurs viennent de `EL_HEX`, jamais de
  `EL_VAR`. Se tromper de jeu donne du noir ou du transparent.
- **Une carte est désignée par son nom** depuis `FLOORS[i].carte`. Supprimer ou
  renommer une carte sans vérifier qui la désigne laisse un chapitre pointer dans
  le vide — c'est déjà arrivé.
- **Un sélecteur natif consomme le geste utilisateur.** Enchaîner deux
  demandes (fichier puis dossier) donne `SecurityError: Must be handling a user
  gesture`. Voir `tests/verif-geste.mjs`.
- **Les calques** : un interrupteur par type de marqueur, plus le groupe qui
  éteint tout. Ajouter un type de marqueur, c'est aussi lui ajouter son calque.

## Avant de rendre

`node tests/lancer.mjs calques fond geste css` — et si tu as touché la structure,
régénère `studio.html` d'abord. Un test qui n'ouvre pas la page ne prouve rien :
vérifie ce qui arrive à l'écran.
