# FFXI Strat Studio

> 🚧 **En cours d'écriture** — l'outil et les strats évoluent au fil des runs.
> Remontez-moi toute erreur.

Un atelier pour **écrire, publier et partager une stratégie FFXI cartographiée**.
Odyssey, Sortie, n'importe quel event : on place les mobs sur la carte, on trace
le trajet, on écrit ce que chaque job fait — et ça sort en guide interactif, en
fichier unique, ou collé dans un salon Discord.

🔗 **Le guide :** https://ejouanchicot.github.io/Sortie-Guide/
🔗 **L'atelier :** https://ejouanchicot.github.io/Sortie-Guide/tools/studio.html

Site **statique** : aucune installation, aucun compte, aucun serveur. Tout tourne
dans le navigateur, et il marche hors ligne une fois installé.

## Les deux faces

**L'atelier** (`tools/studio.html`) — deux panneaux dans une même fenêtre :

- **Carte** — poser les marqueurs (boss, mid-boss, packs), tracer les trajets
  animés, écrire des annotations en texte enrichi, poser un fond depuis son disque.
  Un calque par type de marqueur, pour n'en regarder qu'un pendant qu'on travaille.
- **Stratégie** — écrire, étape par étape, ce que chaque job fait. La composition
  se décrit en *places*, ce qui dit qui remplace qui.

Il s'**installe** (bouton *Installer*), garde plusieurs strats en bibliothèque, et
sait *Partager* : un fichier `.html` unique qui est à la fois le guide lisible d'un
double-clic **et** sa propre sauvegarde — l'atelier sait le rouvrir.

**Le guide** (`index.html`) — le rendu d'une strat : carte d'ensemble avec le
trajet animé, timeline par phase, **filtre « Mon rôle »** et mode **Solo**,
bascule **FR/EN**, thème **clair/sombre**, sélecteur de **comp**, cartes zoomables.
Mobile-first, du téléphone à l'ultra-wide.

## Arborescence

```
index.html                le guide
tools/studio.html         l'atelier
css/  fonts/  img/        style, polices auto-hébergées, images
js/                       le socle, le moteur du guide, les modules partagés
tools/                    les deux ateliers + tools/build/ (générateurs)
tests/                    les tests de rendu · node tests/lancer.mjs
docs/                     architecture, backlog, marque
```

Les chemins sont **relatifs** : l'arborescence conservée, ça marche à la racine
d'un dépôt comme en local.

## Développer

Aucune dépendance à installer, aucun build. Un serveur local suffit :

```bash
python -m http.server 8137     # puis http://localhost:8137/
node tests/lancer.mjs          # les tests de rendu (Puppeteer)
```

Deux fichiers sont **générés** — les modifier à la main ne sert à rien :

```bash
python tools/build/build-studio.py    # → tools/studio.html
python tools/build/scope-mapcss.py    # → tools/map-studio.confine.css
```

Voir `CLAUDE.md` pour les règles de travail et `docs/architecture.md` pour le détail.

## Publier

GitHub Pages, branche `main`, dossier `/(root)`. Remplacer un fichier suffit ;
l'URL ne change pas. Après une modification de `sw.js`, **monter `VERSION`** —
c'est ce qui purge l'ancien cache chez tout le monde.

## Hors ligne

Installer l'atelier depuis le bouton *Installer*, ou télécharger le dossier et
ouvrir `index.html` dans n'importe quel navigateur.

---

*Outil fan-made non officiel. FINAL FANTASY XI © SQUARE ENIX. Sans affiliation avec Square Enix.*
