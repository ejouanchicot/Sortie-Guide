# Branding — Nom + prompt de logo/icône

Analyse du projet `Sortie-Guide` et proposition d'identité pour l'application complète.

> **Où ça en est — c'est fait.** Le nom du §2 est verrouillé *et posé partout* : l'atelier
> et le guide s'annoncent tous deux « FFXI Strat Studio », dans leur en-tête comme dans
> l'aperçu qui s'affiche quand on colle le lien sur Discord.
>
> Ce document reste la **référence de la marque** — la palette, les prompts si le logo est
> refait un jour, les tailles d'export. Mais le §1 décrit le projet **tel qu'il était avant
> la décision** : il dit pourquoi ce nom, pas où en est le code. Pour ça, `docs/backlog.md`.

---

## 1. Ce qu'est réellement l'app (analyse)

> **Cadrage (validé) :** ce n'est PAS un outil « Sortie ». C'est un **éditeur de stratégie FFXI
> général** : Sortie n'est que le **premier contenu** construit avec. À terme il couvre **Odyssey,
> Sortie, et n'importe quel event/contenu FFXI**. Le nom et le logo doivent donc être
> **content-agnostic** (aucune référence à « Sortie »).

L'app = un **moteur de guides stratégiques cartographiés**, en deux volets qui partagent le même
socle et la même identité visuelle :

- **L'éditeur** (`tools/studio.html` ; il s'appelait « Map Studio » quand ces lignes ont
  été écrites) : éditeur de cartes
  stratégiques (Konva) — marqueurs de mobs (boss/midboss/pack), tracés/routes animés, texte
  enrichi, puces — sérialisé dans `data.js`. **C'est le cœur généralisable** : on l'utilise pour
  n'importe quel contenu.
- **Le guide** (`index.html`) : le rendu interactif d'un contenu donné (aujourd'hui une run Sortie
  du linkshell *Nightfallens* : 4 phases, boss Degei → Skomora → Leshonn → Ghatjot, compo fixe
  MNK · BRD · COR · GEO · RDM + flex, **filtre par rôle**, **mode Solo**). Demain : un guide
  Odyssey, un guide d'event, etc.

**Essence à faire porter par le nom + le logo** : *cartographie + stratégie + planification* pour
**tout FFXI** — un « atlas de stratégie » universel, pas un guide d'un seul donjon.

### Identité visuelle déjà posée (à réutiliser)
- **Fond** navy quasi noir : `#070b12` / `#07090d`.
- **Accent principal** dégradé **cyan → bleu** : cyan `#5bd6ef`, teal `#54d1c4`, bleu `#4a9eff`.
- **Accents secondaires** : violet `#8b7cff`, or `#f6c86a`, vert `#4bd18a`, rouge `#ff6b74`.
- **Style** : moderne, « outil de gaming/SaaS », propre, verre dépoli + légères lueurs (glow),
  contours fins, coins arrondis.
- **Le symbole actuel** : une **carte pliée** (qui dessine un pic/un M) traversée par un **tracé
  lumineux à waypoints** finissant sur un **losange cristallin** (clin d'œil « cristal » FF).
  → C'est un bon motif : il encode *carte* **et** *itinéraire/stratégie*. À garder et affiner.

---

## 2. Nom de l'app

## ✅ NOM VERROUILLÉ : **FFXI Strat Studio**

- Format **« FFXI + mot-clé »**, content-agnostic (couvre Odyssey, Sortie & tout event FFXI).
- Garde la **filiation** avec l'actuel « Map Studio » → « Strat Studio » = l'atelier de stratégie.
- **Wordmark** : `FFXI` (petit, en préfixe/tag) + **STRAT** (fin) **STUDIO** (gras) — même logique
  que l'actuel `MAP` fin + `STUDIO` gras.
- **Tagline** (sans répéter « FFXI ») : **« Strategy map builder »** ou **« Plan every run —
  Odyssey · Sortie & more »**.

*Historique des pistes explorées (Stratlas, Vana'Map, Waymark…) conservé plus bas pour mémoire.*

---

## 3. Prompt de logo — ICÔNE seule (app icon carré)

À coller dans un générateur d'images (Midjourney / DALL·E / SDXL). Sortie carrée, fond compris.

```
Standalone app logomark for "FFXI Strat Studio", square 1:1, on a FULLY TRANSPARENT background
(no frame, no tile, no border, no rounded-square container — just the emblem).

SUBJECT: a minimal emblem that reads at once as a folded map AND an EDITABLE tactical route —
a stylized folded map that peaks into two points with a subtle mountain in the center, crossed by
a glowing route whose nodes are small square anchor handles (like a vector-editor path), ending
on a faceted crystal diamond node (a nod to Final Fantasy crystals). The editable anchor handles
signal that this is a map EDITOR / studio, not just a map.

STYLE: modern SaaS / gaming-tool logomark, clean geometric vector, flat design with subtle depth,
soft inner glow and a faint glassy sheen, crisp thin strokes, high legibility at small sizes
(works at 64px). Slight neon glow on the route line and the crystal node.

COLORS: deep near-black navy background (#070b12), the map/emblem in a cyan-to-blue gradient
(cyan #5bd6ef → teal #54d1c4 → blue #4a9eff), waypoint line and crystal glowing cyan #5bd6ef,
one tiny violet #8b7cff accent highlight. Cohesive, premium, dark UI aesthetic.

BACKGROUND: transparent (alpha). A soft neon glow may radiate from the route line and crystal,
but NO background shape, NO tile, NO frame.

COMPOSITION: centered, generous padding, balanced negative space, iconic and simple, bold enough
to stay legible at 24px.

DO NOT: no frame, no rounded-square tile, no border, no background panel, no text, no letters,
no photorealism, no 3D bevel clutter, no drop-shadow mess, no busy background, not skeuomorphic.

--ar 1:1 --style raw
```

> **Export « icône d'app » (à part)** : pour le favicon / l'icône de bureau, on POSE ce même mark
> détouré sur une **tuile navy arrondie** (dégradé `#101a2c → #070b12`) — mais c'est un habillage
> d'export, pas le logo. Le logo de référence reste **transparent**.

### Variante « monogramme » (si tu veux la lettre)
Remplacer la phrase SUBJECT par : *« a folded map whose silhouette also forms the letter “S”,
crossed by a glowing waypoint route ending on a crystal diamond node »*.

---

## 4. Prompt de logo — LOCKUP horizontal (symbole + mot)

Pour l'en-tête du site (comme l'actuel « MAP STUDIO »).

```
Horizontal logo lockup for "FFXI STRAT STUDIO", a strategy-map tool. Transparent or dark navy
background (#070b12).

LEFT: the icon mark — a folded map peaking in the center, crossed by a glowing cyan waypoint
route with two round nodes ending on a faceted crystal diamond; cyan-to-blue gradient
(#5bd6ef → #4a9eff), soft neon glow.

RIGHT: the wordmark on two visual weights — a small "FFXI" tag/prefix in cyan (#5bd6ef) above or
before, then "STRAT" in a thin light weight and "STUDIO" in a bold weight, clean modern geometric
sans-serif, uppercase, wide tracking, white-to-light-cyan gradient; below it a tiny tagline in
spaced letters "STRATEGY MAP BUILDER" in muted slate-blue (#a4b5cf).

STYLE: premium dark-UI gaming brand, sharp, minimal, thin accent line details, subtle glow.
Vector, flat, crisp at small sizes.

DO NOT: no clutter, no photoreal, no 3D, no busy background, keep it clean and legible.

--ar 16:6 --style raw
```

---

## 5. Rappels d'export (pour t'en servir dans l'app)

- Icône d'app / favicon : carré, prévoir **512, 256, 180 (apple-touch), 32, 16** px.
- Garder une version **sur fond transparent** (PNG/SVG) pour l'en-tête, + une version **tuile
  navy** pour l'icône d'app et l'`og:image`.
- Idéalement finaliser en **SVG** (le mark est géométrique) pour la netteté partout. Ce qui
  sert aujourd'hui : `img/favicon.svg` et `img/favicon-64.png` pour l'onglet, `img/logo.webp`
  pour les deux en-têtes, `img/icon-180.webp` et `img/icon-*.png` pour l'app installée,
  `og.png` (le guide) et `img/og-studio.webp` (l'atelier) pour les aperçus de partage.
- Palette à respecter : voir §1. Le dégradé cyan→bleu sur navy est la signature — ne pas en changer.
