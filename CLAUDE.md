# XI STUDIO

Atelier de stratégie FFXI. Un **lead** y écrit une strat cartographiée, la publie
dans le guide, l'exporte en fichier unique ou la colle sur Discord.
Sortie (linkshell *Nightfallens*) est le premier contenu, pas le sujet.

Site **statique**, zéro build, zéro CDN, zéro dépendance réseau. On ouvre un
fichier, on le modifie, GitHub Pages le sert. **Ne pas introduire de compilateur.**

## Les deux faces

```
js/sortie-map-core.js   SOCLE PUR — couleurs, géométrie, texte enrichi, sérialisation
   ├── index.html + js/app.js         LE GUIDE   — rend une strat (SVG/HTML)
   └── tools/studio.html              L'ATELIER  — l'écrit (Konva, canvas)
```

Deux moteurs de rendu **volontairement** distincts : backends incompatibles.
Ce qui est partagé est le **modèle**, pas le dessin. Ne pas chercher à les fusionner.

## Règles qui ne se discutent pas

1. **`git status` avant de toucher `js/data.js`.** Eric l'édite via l'atelier. S'il y a
   des modifs, les committer **à part** d'abord. Ne jamais écraser son travail.
2. **Jamais `git push`.** Commits locaux oui ; publier est sa décision.
3. **Aucune signature d'assistant dans les commits.** Pas de `Co-Authored-By:`, pas de
   « generated with », rien. Le dépôt est signé Eric, un point. Les 108 commits qui en
   portaient une ont été nettoyés le 14 août 2026 — ne pas en réintroduire.
4. **Ne pas éditer les fichiers générés** (voir plus bas) — la modif serait écrasée.
5. **Tester le rendu, pas l’intention.** Trois pannes ont survécu à un test vert.
   Un test qui n'ouvre pas la page ne prouve rien.
6. **Écrire pour le lead.** Commentaires, libellés, messages et commits en français,
   du point de vue de quelqu'un qui mène un run — jamais le vocabulaire du dev.
   Les en-têtes de fichier expliquent **pourquoi**, pas *quoi*.

## Fichiers générés — ne jamais éditer à la main

| Généré | Depuis | Commande |
|---|---|---|
| `tools/studio.html` | `map-studio.html` + `strat-studio.html` | `python tools/build/build-studio.py` |
| `tools/map-studio.confine.css` | `tools/map-studio.css` | `python tools/build/scope-mapcss.py` |

`map-studio.confine.css` est `map-studio.css` avec chaque sélecteur préfixé `.ms`,
pour que ses jetons de couleur n'écrasent pas ceux du guide dans la même page.

## Tests

```bash
node tests/lancer.mjs            # tous — 4 à la fois, ~1 min 50
node tests/lancer.mjs fond css   # ceux dont le nom contient — 8 s pièce
node tests/lancer.mjs --serie    # un par un, si un test devient capricieux
```

Chaque test ouvre son propre Chrome. **Pendant le travail, lancer les tests
ciblés** ; la suite entière une fois, à la fin. Le lanceur monte
`tests/serveur.mjs` s'il ne trouve rien sur le port — `python -m http.server`
plafonnait le parallélisme à trois en refusant les connexions.

Puppeteer est **headless, `--no-sandbox`**, son chemin vit uniquement dans
`tests/navigateur.mjs`. Serveur pour travailler à la main :
`python -m http.server 8137` à la racine, le lanceur s'en sert s'il le trouve.
Après une modif de `sw.js`, monter `VERSION` — sinon l'ancien cache reste.

## Contrôles du contenu — `tools/audit/`

Instantanés, sans navigateur. Les tests regardent l'écran ; ceux-ci regardent
le **texte** de la strat, ce qu'aucun rendu ne peut attraper — la page s'affiche
très bien avec « Minuet V » ici et « Valor Minuet V » trois lignes plus bas.

```bash
node tools/audit/coherence.mjs     # instantané — marques croisées, un mot deux
                                   # couleurs, couleurs vs base GearSwap, moves
                                   # écrits deux fois, raccourcis de noms
node tools/audit/traductions.mjs   # instantané — le français resté sans anglais
node tools/audit/mort.mjs          # instantané — ce que plus personne n'appelle
node tools/audit/rendu.mjs         # 14 s — marques visibles, débordement,
                                   # console, deux étages, deux thèmes
```

`rendu.mjs` répond en un seul navigateur aux quatre questions qu'on se pose
après chaque retouche. Il ne remplace pas la suite de tests : il évite d'y
aller pour rien.

**Les lancer après toute retouche de `js/data.js`.** Chaque contrôle est né
d'une vraie erreur ; `traductions` en trouve une à chaque reformulation, parce
que la clé d'une traduction EST la phrase française.

## Où vit quoi

| Chemin | Rôle |
|---|---|
| `js/data.js` | **le contenu** — `CARTES`, `FLOORS`, `PHASES*`, `COMPO`, `MOB`, `BUFFS`. Source de vérité, éditée par l'atelier |
| `js/i18n.js` | traductions FR→EN (`TR`). Clé = la chaîne française exacte |
| `js/sortie-map-core.js` | le socle pur (`SORTIE`) — chargé **avant** tout le reste |
| `js/app.js` | le moteur du guide |
| `js/strat-render.js` | rendu d'une carte de strat (`STRATR`) — **partagé** guide/atelier, même balisage |
| `js/strat-core.js` | syntaxe des lignes + sérialisation (`STRATCORE`) |
| `js/data-file.js` | écriture de `data.js`/`i18n.js` bloc par bloc (`DATAFILE`). **Ne jamais réimplémenter** |
| `js/biblio.js` | bibliothèque de strats en IndexedDB (`BIBLIO`) |
| `js/export-html.js` | strat en fichier HTML autonome (`EXPORTHTML`) |
| `js/export-texte.js` | strat en messages Discord (`EXPORTTEXTE`) |
| `js/import-image.js` | fond de carte depuis le disque (`IMPORTIMAGE`) |
| `js/minifie.js` | compactage pour l'export (`MINIFIE`) |
| `js/rich-editor.js` | éditeur de texte enrichi (`RICH`) |
| `tools/studio.js` | la coque à onglets de l'atelier |
| `tools/map-studio.*` | atelier Carte (Konva) |
| `tools/strat-studio.*` | atelier Stratégie |
| `tools/vendor/konva.min.js` | Konva — la seule dépendance, **copiée** dans le dépôt, jamais un CDN |
| `img/mobs/` · `img/cartes/` | les vignettes de mobs et les fonds de carte. Le reste de `img/` appartient à l'application (icônes, marque). Une strat gardée **avant** ce rangement retrouve ses images à l'ouverture : `BIBLIO.versGlobaux` → `repriseImages` → `repriseChemin`. Le guide n'y touche pas — il lit `data.js`, déjà rangé ; c'est l'atelier qui rouvre les vieilles strats |
| `tools/cleanup-img.ps1` | retire de `img/` les PNG dont le `.webp` existe (vers la corbeille) |
| `tools/audit/` | les contrôles du **contenu** — voir plus haut. Rien à voir avec le site |
| `tests/serveur.mjs` | sert le site pendant les tests, sans le plafond de `python -m http.server` |
| `docs/fiches-nm/` | la recherche sur les 8 NM (FFXIAH, BG-Wiki, forums SE). **Le tableau « Abilities » fait foi ; les sections « notes » sont du témoignage** |
| `docs/` | architecture, backlog, marque · `docs/archive/` = notes datées, on n'y revient pas |

Modules exposés en global (`window.X`), chargés dans l'ordre déclaré par le HTML.
Pas de modules ES côté navigateur : le site s'ouvre aussi depuis un `file://`.

## URL publiques — ne pas renommer

`index.html` · `tools/studio.html` (aussi le `start_url` de la PWA installée) ·
`og.jpg` · `manifest.webmanifest` · `sw.js`. Les bouger casse les liens Discord
déjà partagés et l'app installée chez les leads.

Le `start_url` vise l'ATELIER, pas le guide, et c'est voulu : on installe
XI STUDIO pour écrire une strat, on lit le guide par un lien. L'atelier met
11 s à s'ouvrir à froid sur un téléphone contre 3 pour le guide — c'est le prix
de Konva, et il ne se paie pas sur un poste de travail (300 ms). Question
posée et tranchée le 18 août 2026.

## Agents

`.claude/agents/` — un par métier du projet : `carte`, `strat`, `donnees`,
`style`, `partage`, `verif`, `relecture`. Les déléguer plutôt que tout traiter ici.
