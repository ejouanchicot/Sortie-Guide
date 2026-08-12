# Contexte de reprise — Guide Sortie (Nightfallens)

> **À lire en premier par toute nouvelle session Claude.** Ce fichier remplace la mémoire d'une
> discussion précédente qui devenait trop lourde. La source de vérité, c'est **les fichiers de ce
> dossier sur la machine d'Eric**, pas ce document. Re-stage-les avant de juger de l'état réel.

## 1. Le projet
Site statique de stratégie FFXI « Sortie » pour la linkshell **Nightfallens**, publié sur GitHub Pages.
Emplacement sur la machine d'Eric (Windows) :
`G:\01_Development\Game_Project\Sortie-Guide\`

Structure :
- `index.html` — page unique
- `css/style.css` — styles (CSS moderne : color-mix, :has(), backdrop-filter, custom props, calc())
- `js/data.js` — **contenu** (source de vérité éditée par Eric via les éditeurs) : FLOORS, BOSSES, PACKS,
  MIDS, ROUTES, PHASES, ZONES, la map d'images MOB, MOBSCALE, LBLMARGIN, helper ln(), i18n
- `js/sortie-map-core.js` — **socle partagé** (fonctions PURES, sans Konva ni DOM) : couleurs des
  éléments hex (`EL_HEX`) + variables CSS (`EL_VAR`) + accents (`EL_ZC2`) avec alias red→fire /
  blue→water / green→wind, `r1`/`clamp`, parse/serialize des points `x,y` en %, géométrie
  (`segDist`/`projectOnSeg`/`midpoint`/`axisLock`), `esc`/`escAttr`, `pqHtml`, constantes de bande
  (Konva + SVG). Expose `window.SORTIE`. **Source unique de vérité** pour ces helpers, utilisée par
  app.js, tools/map-studio.html et tools/map-editor.html. Doit être chargé AVANT chacun d'eux.
- `js/app.js` — **moteur de rendu** (chargé APRÈS data.js ET sortie-map-core.js)
- `img/` — images (optimisées en .webp)
- `tools/map-studio.html` — **éditeur de carte principal** (Konva, plein écran). Script réorganisé en
  sections (scène, pastilles, tracés, inspecteur, calques, sauvegarde) et posé sur `sortie-map-core.js`.
  Format de sauvegarde de `data.js` inchangé au bit près.
- `tools/map-editor.html` — ancien éditeur (existe encore, corrigé anti-reset). Câblé sur `sortie-map-core.js`.
- `tools/vendor/konva.min.js` — Konva 9.3.6 vendu localement (171KB)
- `tools/RAPPORT-editeur.html` — rapport de conception de l'éditeur (plan en phases)

## 2. RÈGLES DE TRAVAIL — CRITIQUE, ne pas déroger
- Toutes les écritures vont dans `G:\01_Development\Game_Project\Sortie-Guide\`. **Garder les mêmes noms de fichiers.**
- Livraison : `SendUserFile` → puis `mcp__remote-devices__device_commit_files` (chemins Windows en `\\`).
- `device_bash` (VM Linux) est **indisponible** dans ce contexte.
- **AVANT de toucher `data.js`** : toujours le **re-stage** depuis la machine d'Eric
  (`device_stage_files`), éditer par-dessus SA version, et committer avec garde `expectedMtimeMs`.
  Raison : Eric édite activement `data.js` via les éditeurs (Map Studio sauvegarde dedans). Ne JAMAIS
  écraser son travail. Ça a déjà causé 3 resets de ses chemins — c'est sa frustration n°1.
- Tester avant de livrer : Playwright à `/home/claude/.npm-global/lib/node_modules/playwright`
  (lancer avec `args:['--no-sandbox']`). Le sandbox bloque les CDN (Konva, Google Fonts) → ERR_TUNNEL
  cosmétique, d'où Konva vendu en local.

## 3. Modèle de données (data.js)
- `FLOORS` = [étage du haut, sous-sol]. `ZONES_TOP` (A/B/C/D, pas de map par zone : filtre sur la map
  entière). `ZONES_B` (E/F/G/H, une map par secteur). `effectiveFloor(f)` filtre selon `curZone`.
- Étage haut : onglets = numéros de boss triés (« Tous 1 2 3 4 »). Sous-sol : onglets = lettres de secteur.
- `ROUTES_TOP` (haut, par étape n:1-4, segments) / `ROUTES_B` (sous-sol, par boss n:1-4).
  Points = chaîne « x,y x,y » en %.
- Constantes scalaires sauvegardées : `MOBSCALE` (échelle globale des mobs, valeur d'Eric ~0.6),
  `LBLMARGIN` (marge des labels ~6).
- Couleurs éléments `ELC` : fire #f2564d, water #4aa3e0, ice #5fd0d0, thunder #b07cff, wind #43c463,
  earth #c9975c, light #ffffff, dark #c85fe0, gray #a6b2c2 (red→fire, blue→water, green→wind).

## 4. Rendu des tracés (routes) — état actuel
Style « toujours lisible » en 3 couches, couleur = celle de l'élément du boss :
1. **liseré** sombre `rgba(9,13,18,.5)` (bordure)
2. **couleur** = `rt.c1` ou `ELC[rt.el]` (cœur coloré)
3. **flux** = pointillés blancs animés qui défilent par-dessus

Propriétés par tracé, éditables dans Map Studio et sauvegardées dans data.js :
- `name` — nom du tracé
- `c1` — couleur (sinon couleur de l'élément du boss)
- `a` — **opacité de la COULEUR uniquement** (0–1, défaut 0.82). Le liseré et le flux restent opaques.
  À 0 : plus de teinte, il reste le contour sombre + flux blanc.
- `fs` — **largeur de toute la bande** (liseré + couleur + flux ensemble, défaut 1 = 100%).

Côté guide (app.js) : chaque route rend 3 `<polyline>` (ovcase/ovrail/ovflow) ; l'opacité va sur ovrail,
les largeurs passent par des CSS vars `--cw/--rw/--fw/--fda/--foff` (voir css `.ovroute .ov*`).
Côté Map Studio : 3 `Konva.Line` par route (`rt._case/_rail/_flow`) ; anim = offset par ligne selon sa
période de tirets ; `applyRouteColors(rt)`, `applyBandSize(rt)`.

## 5. Éditeur de points (Map Studio, outil « path »)
Raccourcis pendant le glisser d'un point de tracé :
- **Maj** + glisser = verrou d'axe (horizontal OU vertical, axe dominant)
- **Ctrl** + glisser = recentre le point au milieu entre voisins (points intermédiaires)
- **Ctrl+Maj** + glisser = projette le point sur la droite précédent→suivant (alignement)
- **Mode fantôme** : pendant le glisser d'un point, icônes de mobs + tracés deviennent translucides
  pour voir derrière ; retour à la normale au relâcher (`ghost(on)`).
Autres : clic = ajouter un point, dbl-clic = insérer, Suppr = retirer, Ctrl+Z = retirer le dernier,
➕ = nouveau tracé indépendant, 🗑 = supprimer le tracé.

## 6. Ce qui reste à faire (backlog)
Phases éditeur :
- **Phase 3 — FAIT.** Outil « Pastille » (raccourci N) dans Map Studio : palette d'images par catégorie
  (Boss / Midboss / Pack), placement au clic, bascule auto en Sélection pour éditer/déplacer,
  bouton « Supprimer cette pastille » dans l'inspecteur. Labels riches : champ `label` (texte affiché,
  vide = nom) + case `hl` (masquer le label). Rendus dans le studio ET dans le guide (`placePOIs`/`poiLabel`
  de app.js). Sérialisés via `metaStr()` (champs optionnels omis par défaut → rétro-compatible).
  Reste ouvert pour plus tard : sous-titre / 2ᵉ ligne de label.
- **Phase 4** — formes géométriques, import d'images libres, auras, pipette, copier/coller + raccourcis.
- **Export** — sortir une carte créée en HTML autonome qui reste animé.

Option offerte en attente de réponse d'Eric :
- Rendu « contour » des tracés : contour fin opaque + intérieur transparent laissant voir la carte au
  travers (alternative au liseré sombre qui reste derrière la couleur à faible opacité).

Backlog long terme :
- Remplir la vraie strat de combat des boss (buffs/SC/procs/rôles par boss — beaucoup encore « à définir »).
- Strat trajets sous-sol déjà faite : Sneak + Invisible / Cor Bolter ; E = si DNC kill Botulus (dégâts
  dos + stun ses TP moves au Flat Blade) ; G = si DNC kill Naraka (idem) ; F/H = rush au boss ; si PLD
  aucun midboss (ne rien afficher).

## 7. Comment reprendre dans une nouvelle session
1. Lire ce fichier.
2. Re-stage les fichiers réels depuis `G:\01_Development\Game_Project\Sortie-Guide\` (surtout `data.js`).
3. Continuer en respectant la section 2.
