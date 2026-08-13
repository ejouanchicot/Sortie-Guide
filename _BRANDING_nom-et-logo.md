# Branding — Nom + prompt de logo/icône

Analyse du projet `Sortie-Guide` et proposition d'identité pour l'application complète.

---

## 1. Ce qu'est réellement l'app (analyse)

> **Cadrage (validé) :** ce n'est PAS un outil « Sortie ». C'est un **éditeur de stratégie FFXI
> général** : Sortie n'est que le **premier contenu** construit avec. À terme il couvre **Odyssey,
> Sortie, et n'importe quel event/contenu FFXI**. Le nom et le logo doivent donc être
> **content-agnostic** (aucune référence à « Sortie »).

L'app = un **moteur de guides stratégiques cartographiés**, en deux volets qui partagent le même
socle et la même identité visuelle :

- **L'éditeur** (`tools/map-studio.html`, aujourd'hui « Map Studio ») : éditeur de cartes
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

Objectif : cool, parle à tout le monde, dit « stratégie + carte », brandable, **content-agnostic**
(couvre Odyssey, Sortie & tout event FFXI — aucune référence à un contenu précis). Tagline FFXI.

### Recommandation : **Stratlas**  ·  *(Strategy × Atlas)*
- Porte-manteau **Stratégie + Atlas** → dit *exactement* ce que fait l'app (stratégie cartographiée),
  sans se lier à un contenu. Parfait pour un outil qui couvre tout FFXI.
- Court, original (peu de collisions), facile à dire (« strat-las »), international.
- Tagline : **« FFXI strategy maps »** / **« Atlas de stratégie · tout FFXI »**.

### Alternatives fortes (toutes générales)
| Nom | Pourquoi | Nuance |
|---|---|---|
| **Vana'Map** | *Vana'diel* (le monde de FFXI) + Map → couvre TOUT FFXI par définition. Clin d'œil qui fait mouche. | Un peu « insider », apostrophe. |
| **Vana'Atlas** | Même idée, registre « atlas » plus premium et stratégique. | Proche de Vana'Map. |
| **Waymark** | Terme MMO de « marquage » tactique sur la carte. Cool, universel, colle au motif tracé+nœuds. | Connu surtout des joueurs MMO. |
| **Waypoint** | Universel, colle au motif du logo. | Générique / déjà utilisé ailleurs. |

> ❌ Écartés car trop liés à un seul contenu : *Sortie Atlas*, *Nightfall Atlas*.
> Mon choix : **Stratlas** (marque) + tagline **« FFXI strategy maps »**. Le doc utilise ce nom ;
> remplace juste le mot-symbole si tu pars sur un autre.

---

## 3. Prompt de logo — ICÔNE seule (app icon carré)

À coller dans un générateur d'images (Midjourney / DALL·E / SDXL). Sortie carrée, fond compris.

```
App icon for a gaming strategy tool called "Stratlas", square 1:1, rounded-square tile.

SUBJECT: a minimal emblem that reads at once as a folded map AND a tactical route — a stylized
folded/segmented map shape that peaks in the center like a subtle mountain or letter "A/M",
crossed by a glowing waypoint path: a thin luminous line linking two small circular nodes and
ending on a faceted crystal diamond node (a nod to Final Fantasy crystals).

STYLE: modern SaaS / gaming-tool logomark, clean geometric vector, flat design with subtle depth,
soft inner glow and a faint glassy sheen, crisp thin strokes, high legibility at small sizes
(works at 64px). Slight neon glow on the route line and the crystal node.

COLORS: deep near-black navy background (#070b12), the map/emblem in a cyan-to-blue gradient
(cyan #5bd6ef → teal #54d1c4 → blue #4a9eff), waypoint line and crystal glowing cyan #5bd6ef,
one tiny violet #8b7cff accent highlight. Cohesive, premium, dark UI aesthetic.

BACKGROUND: dark navy rounded-square with an extremely faint topographic/contour grid texture,
barely visible, plus a soft radial glow behind the emblem.

COMPOSITION: centered, generous padding, balanced negative space, symmetrical, iconic and simple.

DO NOT: no text, no letters, no words, no photorealism, no 3D bevel clutter, no drop-shadow mess,
no busy background, no gradients banding, no mock UI, not skeuomorphic.

--ar 1:1 --style raw
```

### Variante « monogramme » (si tu veux la lettre)
Remplacer la phrase SUBJECT par : *« a folded map whose silhouette also forms the letter “S”,
crossed by a glowing waypoint route ending on a crystal diamond node »*.

---

## 4. Prompt de logo — LOCKUP horizontal (symbole + mot)

Pour l'en-tête du site (comme l'actuel « MAP STUDIO »).

```
Horizontal logo lockup for "STRATLAS", a FFXI strategy-map tool. Transparent or dark navy
background (#070b12).

LEFT: the icon mark — a folded map peaking in the center, crossed by a glowing cyan waypoint
route with two round nodes ending on a faceted crystal diamond; cyan-to-blue gradient
(#5bd6ef → #4a9eff), soft neon glow.

RIGHT: the wordmark "STRATLAS" in a clean modern geometric sans-serif, uppercase, wide tracking,
white-to-light-cyan gradient; below it a small tagline in spaced letters "FFXI STRATEGY MAPS"
in muted slate-blue (#a4b5cf), tiny.

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
- Idéalement finaliser en **SVG** (le mark est géométrique) pour la netteté partout ; l'actuel
  `img/map-studio-logo.webp` (512²) et `map-studio-icon.webp` (256²) pourront être remplacés.
- Palette à respecter : voir §1. Le dégradé cyan→bleu sur navy est la signature — ne pas en changer.
