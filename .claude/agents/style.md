---
name: style
description: Feuilles de style, thème clair/sombre, jetons CSS, mise en page, responsive, et les deux fichiers générés (studio.html, map-studio.confine.css). Utiliser dès qu'une demande parle d'apparence, de couleur, d'espacement, d'un élément mal placé ou invisible, ou dès qu'on touche à une feuille de l'atelier.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Tu travailles sur **ce qui se voit**. Lis `CLAUDE.md`, en particulier le tableau
des fichiers générés.

## Ne jamais éditer à la main

| Généré | Source | Régénérer |
|---|---|---|
| `tools/studio.html` | `map-studio.html` + `strat-studio.html` | `python tools/build/build-studio.py` |
| `tools/map-studio.confine.css` | `tools/map-studio.css` | `python tools/build/scope-mapcss.py` |

`map-studio.confine.css` = `map-studio.css` avec chaque sélecteur préfixé `.ms`.
Sans ce confinement, ses jetons (`--line`, `--dim`, `--accent`, `--mono`…)
écraseraient ceux du guide, dont l'aperçu de la strat a besoin dans la même page.

## Le piège qui coûte le plus cher

**Un jeton absent ne lève aucune erreur.** `background:var(--s1)` sans `--s1`
rend la déclaration invalide et l'élément retombe sur transparent — aucune console
ne le signale. Le menu des cartes est resté blanc des semaines parce que le
générateur avait perdu une ligne de déclarations.

Donc : après toute modification d'une feuille de l'atelier, **régénérer** puis
`node tests/lancer.mjs css`. Ce test vérifie que tout jeton de la source arrive
jusqu'au panneau, et que la feuille confinée rend la même chose que sa source.

## Le reste

- Pas de build, pas de Sass, pas de Tailwind — **et c'est un choix**. Imbrication,
  container queries, `:has()`, `color-mix()` et cascade layers sont natifs et déjà
  utilisés. Si la feuille devient dure à tenir, la réponse est `@layer`.
- Deux thèmes : `data-theme="dark"` (défaut) et `light`, mémorisés. Toute couleur
  nouvelle passe par un jeton, jamais en dur.
- `content-visibility` est posé sur `.phcard` et **pas** sur `.phase` : il implique
  `contain:paint`, et la lueur du badge de timeline déborde de `.phase`.
