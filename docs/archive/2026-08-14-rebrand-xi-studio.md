# Tâche pour Claude Code — Rebrand « FFXI Strat Studio » → « XI STUDIO »

## Contexte
Le projet (dépôt `Sortie-Guide`) change de nom commercial.

- **Ancien nom** : `FFXI Strat Studio`
- **Nouveau nom** : `XI STUDIO`
- **Sous-titre / forme longue** (à utiliser quand il faut préciser ce que c'est) : `FFXI Strategy Editor`
- **Tagline** : `Plan your endgame.`

La miniature sociale (og) et le générateur `tools/build/build-studio.py` ont **déjà** été mis à jour (og.jpg + titre/OG + wordmark de l'en-tête). Cette tâche concerne **le reste des mentions textuelles** du nom dans le dépôt, pour être cohérent partout.

## Objectif
Remplacer toutes les occurrences **visibles par l'utilisateur** de l'ancien nom par le nouveau, **sans** casser le code, les identifiants ou la compatibilité.

## Ce qu'il faut FAIRE
1. Repérer toutes les occurrences du **nom affiché** :
   ```
   grep -rInE "FFXI Strat Studio|Strat Studio|STRAT ?STUDIO" \
     --include='*.html' --include='*.js' --include='*.py' \
     --include='*.md' --include='*.webmanifest' --include='*.json' \
     --exclude-dir=.git .
   ```
2. Pour chacune, remplacer le **texte lisible** par :
   - `XI STUDIO` en règle générale (titres, wordmark, og:title, nom du PWA…) ;
   - `XI STUDIO — FFXI Strategy Editor` quand la ligne sert à **expliquer** ce qu'est l'app (ex. `<title>` d'onglet, description longue) ;
   - dans une phrase du type « Écrit avec FFXI Strat Studio » → « Écrit avec XI STUDIO ».
3. Fichiers connus à vérifier en priorité :
   - `index.html` : `<title>`, `<meta name="description">`, `<meta property="og:site_name">`, et les attributs `title=` / `aria-label=` du lien logo (`a.bmark`, ex. « Ouvrir l'atelier — FFXI Strat Studio »).
   - `manifest.webmanifest` : champs `name` et `short_name`.
   - `README.md`, `CLAUDE.md`, et tout `docs/*.md` : mentions en prose.
   - `tools/build/build-studio.py` : **déjà fait** — vérifier seulement qu'il ne reste rien.
4. **Régénérer** la page atelier après coup (ne pas éditer `tools/studio.html` à la main, il est généré) :
   ```
   python tools/build/build-studio.py
   ```
5. Lancer la suite de tests pour vérifier que rien n'est cassé :
   ```
   node tests/lancer.mjs
   ```
   (et corriger si un test compare un libellé de marque : mettre à jour l'attendu vers `XI STUDIO`.)

## Ce qu'il NE FAUT PAS toucher (important)
- **L'identifiant du bloc de sauvegarde** dans `js/export-html.js` :
  `var MARQUE = 'ffxi-strat-studio';` et le `format` `'ffxi-strat-studio/1'`.
  C'est la **clé de compatibilité** qui permet au Studio de relire les fichiers de strat déjà exportés. La changer casserait la réouverture des exports existants. **Laisser tel quel.**
- Les **noms de fichiers, classes CSS et identifiants de code** contenant `strat` (ex. `strat-studio.css`, `strat-studio.js`, `strat-core.js`, `strat-render.js`, `#stPaneStrat`, `.st-wm`, etc.). Ici `strat` = **stratégie** (le module d'édition de strat), **pas** la marque « Strat Studio ». Ne pas renommer.
- Les URLs / chemins déjà en place (`og.jpg`, `img/logo.webp`, l'URL GitHub Pages `ejouanchicot.github.io/Sortie-Guide`).
- L'historique Git, les hooks, la config.

## Règle de tri simple
> Si c'est **du texte qu'un humain lit** (titre, description, wordmark, nom du PWA, prose de doc) → renommer en `XI STUDIO`.
> Si c'est **du code** (identifiant, nom de fichier, classe, clé de format, id d'élément) → **ne pas toucher**, même si ça contient « strat » ou « studio ».

## Livrable
- Toutes les mentions **affichées** de l'ancien nom passées à `XI STUDIO`.
- `tools/studio.html` régénéré.
- `node tests/lancer.mjs` au vert.
- Un court récap des fichiers modifiés.
