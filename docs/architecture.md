# Architecture — XI STUDIO

> Le détail. Pour l'essentiel, lire `CLAUDE.md` à la racine.
> **La source de vérité, ce sont les fichiers**, pas ce document. Au moindre doute, les relire.
> État au 13 août 2026.

## 1. Ce que c'est

Un **atelier de stratégie FFXI**, content-agnostic. Sortie (linkshell *Nightfallens*)
est le premier contenu construit avec, pas la finalité : Odyssey ou n'importe quel
event se décrivent avec le même modèle.

Deux faces, un socle :

- **Le guide** (`index.html` + `js/app.js`) — rend une strat en SVG/HTML : carte
  d'ensemble, trajet animé, timeline par phase, filtre « Mon rôle », mode Solo,
  bascule FR/EN, thème clair/sombre, sélecteur de comp.
- **L'atelier** (`tools/studio.html`) — l'écrit. Deux panneaux à onglets dans une
  coque unique : *Carte* (Konva) et *Stratégie* (DOM). Installable en PWA,
  fonctionne hors ligne.

**Deux backends de rendu, volontairement.** Konva dessine sur un canvas, le guide
produit du SVG/HTML. Ce n'est pas une duplication à résorber : poser une abstraction
de dessin par-dessus dégraderait les deux. Ce qui est partagé est le **modèle** —
`js/sortie-map-core.js`.

Site statique : pas de build, pas de `package.json`, pas de CDN. Konva et les
polices sont vendus en local. Un fichier modifié est servi tel quel par GitHub Pages.
C'est la propriété la plus précieuse du projet ; un compilateur la détruirait.

## 2. Chaîne de chargement

L'ordre est significatif — pas de modules ES côté navigateur, tout passe par des
globales, pour que le site s'ouvre aussi depuis un `file://`.

**Guide** — `data.js` → `i18n.js` → `sortie-map-core.js` → `strat-render.js` → `app.js`

**Atelier** — `data.js` → `i18n.js` → `sortie-map-core.js` → `data-file.js` →
`import-image.js` → `biblio.js` → `minifie.js` → `export-html.js` →
`export-texte.js` → `strat-render.js` → `strat-core.js` → `rich-editor.js` →
`konva.min.js` → `map-studio.js` → `strat-studio.js` → **`studio.js` en dernier**
(il range les commandes des deux ateliers une fois qu'ils se sont câblés).

Globales exposées : `SORTIE`, `STRATR`, `STRATCORE`, `DATAFILE`, `BIBLIO`,
`EXPORTHTML`, `EXPORTTEXTE`, `IMPORTIMAGE`, `MINIFIE`, `RICH`, `COMPO`.

## 3. Le socle — `js/sortie-map-core.js`

Fonctions **pures**, aucune dépendance à un backend de rendu. Chargé avant tout.

- **Couleurs d'élément** en trois jeux : `EL_HEX` (hex direct → Konva, qui ignore
  les thèmes CSS), `EL_VAR` (variables CSS `--e-*` → guide et éditeur DOM, qui
  suivent clair/sombre), `EL_ZC2` (accents). Alias : `red→fire`, `blue→water`,
  `green→wind`.
- **Géométrie** — `POI_SIZE`/`poiSize`/`labelGap`, `r1`, `clamp`, parse/serialize
  des points « x,y » en %, `segDist`, `projectOnSeg`, `midpoint`, `axisLock`.
- **Texte** — `esc`, `escAttr`, `pqHtml`, texte enrichi (`parseInline`, `parseRich`,
  `runsToHtml`).
- **Sérialisation** de `data.js` (`bossesConst`…`textsConst`).

## 4. Modèle de données — `js/data.js`

Le contenu, et rien d'autre. Édité par l'atelier ; le moteur n'a pas à changer
pour ajouter une strat.

| Constante | Ce qu'elle porte |
|---|---|
| `NOM` | le nom de la strat |
| `COMPO` | la composition : `taille`, `creneaux` (les **places**, qui disent qui remplace qui), variantes |
| `ROLE` | job → rôle (un seul par job) |
| `MOB` | nom de mob → image |
| `MOBSCALE`, `LBLMARGIN` | échelle globale des icônes, marge des labels |
| `BUFFS` | blocs de préparation nommés |
| `PHASES`, `PHASES_B` | les étapes, par étage |
| `CARTES` | **le registre des cartes** — chaque carte porte `fond`, `trace`, `depart`, `bosses`, ses marqueurs et ses tracés |
| `FLOORS` | les étages ; chacun pointe une carte par son nom et un bloc de phases |
| `OVINTRO_*` | l'intro affichée sur chaque étage, FR et EN |

Une carte est un **module que la strat désigne** : `FLOORS[i].carte` nomme une
entrée de `CARTES`, et `sortie-map-core.js` projette ses champs sur le chapitre
par référence. Supprimer une carte doit donc vérifier qu'aucun chapitre ne la
désigne encore — et peut emporter son image.

## 5. Écriture de `data.js` — `js/data-file.js`

Les deux ateliers écrivent dans les mêmes fichiers. Tant que chacun avait sa
copie du mécanisme, l'un pouvait corrompre ce que l'autre écrivait.

- Poignées mémorisées en **IndexedDB** (base `sortie-outils`, clés `data`, `i18n`,
  `projet`, `img`), partagées par les deux ateliers.
- `fichiersProjet()` — on demande **le dossier du projet**, une fois, et les deux
  fichiers s'y trouvent tout seuls. Avant, la première sauvegarde faisait désigner
  `js/data.js` **puis** `js/i18n.js` : deux questions, et sur des noms qu'un lead
  n'a pas à connaître. Le navigateur n'accorde pas l'écriture sans un geste — la
  question ne peut pas disparaître, seulement se poser une fois et porter sur
  quelque chose qui se reconnaît. Les poignées déjà accordées restent valables.
- `sousDossier(clé, nom)` — un dossier **dans** le projet en découle sans rien
  redemander : le navigateur étend l'autorisation aux descendants d'une poignée
  accordée. C'est ainsi que poser une image de fond ne réclame plus sa propre
  permission une fois qu'on a enregistré. L'inverse est impossible : depuis `img/`
  on ne remonte pas au projet.
- `remplace(texte, blocs)` substitue **bloc par bloc** (`const NOM=[…\n];`) sans
  toucher au reste : commentaires, contenu écrit à la main et ordre des
  déclarations restent intacts.
- Un bloc introuvable est **signalé et jamais ajouté** — c'est le signe qu'on écrit
  dans le mauvais fichier.

**Ne jamais réimplémenter ça ailleurs.** La forme de la regex exige le crochet
fermant en début de ligne : la variante non-gourmande s'arrêtait au premier `];`
imbriqué et tronquait le fichier.

## 6. Rendu des tracés

Style « toujours lisible », trois couches, couleur = celle de l'élément du boss :

1. **liseré** sombre `rgba(9,13,18,.5)` — la bordure
2. **couleur** — `rt.c1` ou `ELC[rt.el]`
3. **flux** — pointillés blancs animés par-dessus

Propriétés par tracé, éditables et sauvegardées : `name`, `c1` (couleur),
`a` (opacité de **la couleur seule**, défaut 0.82 — liseré et flux restent
opaques), `fs` (largeur de toute la bande, défaut 1).

- Guide : 3 `<polyline>` (`ovcase`/`ovrail`/`ovflow`), largeurs via les vars CSS
  `--cw/--rw/--fw/--fda/--foff`.
- Atelier : 3 `Konva.Line` (`rt._case/_rail/_flow`), animation par offset selon la
  période de tirets ; `applyRouteColors(rt)`, `applyBandSize(rt)`.

## 7. Éditeur de points (outil « path »)

Pendant le glisser d'un point :

- **Maj** — verrou d'axe (horizontal ou vertical, axe dominant)
- **Ctrl** — recentre le point entre ses voisins
- **Ctrl+Maj** — projette le point sur la droite précédent→suivant
- **mode fantôme** — icônes et tracés deviennent translucides pour voir derrière

Clic = ajouter · double-clic = insérer · Suppr = retirer · Ctrl+Z = retirer le
dernier · ➕ = nouveau tracé · 🗑 = supprimer le tracé.

## 8. Bibliothèque, partage, hors ligne

- **`biblio.js`** — les strats vivent dans le navigateur (IndexedDB, base
  `strat-studio`). Le dépôt devient une **destination** : « Enregistrer » publie la
  strat courante dans `js/data.js`.
- **`export-html.js`** — un fichier `.html` autonome qui est **à la fois** le vrai
  guide (même moteur, même feuille, hors ligne, au double-clic) **et** sa propre
  sauvegarde : l'atelier le rouvre et retrouve la strat entière.
- **`export-texte.js`** — la strat en messages Discord, découpés sous 2000
  caractères *mise en forme comprise*, jamais au milieu d'une action.
- **`sw.js`** — réseau d'abord pour le code (il doit rester frais), cache d'abord
  pour polices et images (elles ne changent pas sous le même nom).
  ⚠ **Monter `VERSION` à chaque livraison**, sinon l'ancien cache reste.

## 9. Ce qui reste

Voir `docs/backlog.md`. L'essentiel : remplir la vraie strat du **sous-sol**
(`PHASES_B`) — l'outil est prêt, c'est la connaissance de run qui manque.
