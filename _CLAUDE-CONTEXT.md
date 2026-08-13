# Contexte de reprise — Guide Sortie (Nightfallens)

> **À lire en premier par toute nouvelle session Claude.** Ce fichier remplace la mémoire d'une
> discussion précédente qui devenait trop lourde. La source de vérité, c'est **les fichiers de ce
> dossier sur la machine d'Eric**, pas ce document. Re-stage-les avant de juger de l'état réel.

## 1. Le projet
Site statique de stratégie FFXI « Sortie » pour la linkshell **Nightfallens**, publié sur GitHub Pages.
Emplacement sur la machine d'Eric (Windows) :
`G:\01_Development\Game_Project\Sortie-Guide\`

Structure (à jour au 12/08/2026) :
- `index.html` — page unique du guide
- `css/fonts.css` + `fonts/*.woff2` — **polices auto-hébergées** (Inter, Space Grotesk, JetBrains Mono,
  variables, sous-ensemble latin, 104 Ko). Aucune dépendance à fonts.googleapis.com.
- `css/style.css` — styles du guide (CSS moderne : color-mix, :has(), backdrop-filter, container queries)
- `js/data.js` — **contenu** (source de vérité éditée par Eric via Map Studio) : FLOORS, BOSSES, PACKS,
  MIDS, ROUTES, TEXTS, PHASES, ZONES, la map d'images MOB, MOBSCALE, LBLMARGIN, helper ln()
- `js/i18n.js` — **traductions FR→EN** (`TR`). Du contenu, pas du moteur. Chargé avant app.js.
- `js/sortie-map-core.js` — **socle partagé** (fonctions PURES, sans Konva ni DOM) : couleurs des
  éléments hex (`EL_HEX`) + variables CSS (`EL_VAR`) + accents (`EL_ZC2`) avec alias red→fire /
  blue→water / green→wind, `POI_SIZE`/`poiSize`/`labelGap` (géométrie des marqueurs), `r1`/`clamp`,
  parse/serialize des points `x,y` en %, géométrie (`segDist`/`projectOnSeg`/`midpoint`/`axisLock`),
  `esc`/`escAttr`, `pqHtml`, texte enrichi (`parseInline`/`parseRich`/`runsToHtml`), sérialisation
  `data.js` (`bossesConst`…`textsConst`). Expose `window.SORTIE`. **Source unique de vérité**,
  chargé AVANT tout le reste.
- `js/rich-editor.js` — **éditeur de texte enrichi** (contenteditable, barre d'outils, listes par ligne,
  casse). DOM pur, aucune dépendance à Konva. Expose `window.RICH`. Utilisé par Map Studio.
- `js/app.js` — **moteur de rendu du guide** (chargé APRÈS data.js, i18n.js et sortie-map-core.js)
- `img/` — images en .webp · `img/favicon.svg`
- `tools/map-studio.html` + `map-studio.css` + `map-studio.js` — **éditeur de carte principal**
  (Konva, plein écran). Le HTML ne porte que la structure ; le JS est sectionné (scène, marqueurs,
  textes, tracés, inspecteur, calques, sauvegarde). Format de sauvegarde de `data.js` inchangé au bit près.
- `tools/vendor/konva.min.js` — Konva 9.3.6 vendu localement (167 Ko)
- `.nojekyll` — indispensable : sans lui, GitHub Pages fait tourner Jekyll, qui ignore tout
  fichier ou dossier commençant par `_`.

**Deux moteurs de rendu, volontairement.** Map Studio dessine en Konva (canvas), le guide en
SVG/HTML. Ce n'est pas une duplication à résorber : ce sont deux backends incompatibles. Ce qui est
partagé est le **modèle** (`sortie-map-core.js`) — couleurs, tailles, géométrie, texte enrichi,
sérialisation. Ajouter une abstraction de dessin par-dessus dégraderait les deux côtés.

## 2. RÈGLES DE TRAVAIL — CRITIQUE, ne pas déroger
- Le travail se fait **en local** dans `G:\01_Development\Game_Project\Sortie-Guide\`, directement sur
  les fichiers. Les anciennes règles de livraison (`SendUserFile`, `device_commit_files`,
  `device_stage_files`, garde `expectedMtimeMs`) appartiennent à un pont MCP qui n'existe plus ici.
- **Le vrai garde-fou est git**, pas un contrôle de mtime : `git commit` avant d'ouvrir Map Studio.
  Tout est versionné depuis le 12/08/2026 (avant, `data.js`, `tools/` et le socle ne l'étaient pas —
  c'est ce qui rendait les resets de chemins irrécupérables).
- **Eric édite `data.js` pendant les sessions** (Map Studio écrit dedans). Avant d'y toucher :
  `git status` / `git diff js/data.js`. S'il y a des modifications, **les committer à part** avant
  d'entamer autre chose. Ne jamais écraser son travail.
- Tests : Node pour le socle, et Puppeteer headless (`--no-sandbox`) pour l'UI, disponible via
  `C:\Users\g0dli\AppData\Roaming\npm\node_modules\@modelcontextprotocol\server-puppeteer\node_modules`.
  Serveur local : `python -m http.server 8137` depuis la racine.
  Plus aucun CDN n'est requis : Konva et les polices sont servis en local.

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
