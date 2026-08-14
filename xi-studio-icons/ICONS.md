# XI STUDIO — Icônes de l'atelier Carte

Les icônes à poser sur la carte : les **22 jobs** et **13 marqueurs** génériques.
Elles s'utilisent depuis l'atelier Carte, outil **Nouveau marqueur** (`N`),
catégories **Jobs** et **Marqueurs**.

## Structure

```
xi-studio-icons/
├── jobs/       22 icônes de job      (PNG 256×256, blanc sur transparent)
├── markers/    13 marqueurs          (PNG 256×256, blanc sur transparent)
└── ICONS.md    ce fichier
```

## Principe de rendu

Les icônes sont des **silhouettes blanches** sur fond transparent. Elles ne
portent aucune couleur. L'atelier et le guide dessinent, pour chaque jeton :

1. une **pastille sombre** (dégradé `#16233c` → `#0b1220`) ;
2. un **anneau de couleur** autour de la pastille ;
3. la **silhouette** par-dessus (63 % du diamètre).

Un seul jeu suffit : la couleur vient du jeton, pas du fichier. L'icône dit
*quoi*, l'anneau dit *de quelle couleur on parle*.

Dans le guide, la silhouette passe par un **masque CSS** et non par une image :
c'est la page qui la colore, donc la même image sert quelle que soit la teinte.

## La couleur de l'anneau

Un marqueur de carte porte sa **couleur libre**, comme une forme — cinq
raccourcis de rôle plus un sélecteur, dans sa carte de réglages. Ce n'est pas
le vocabulaire `el` des boss et des packs : les douze éléments n'ont pas de
jaune, et un job buff en a besoin.

À la pose, l'anneau prend un **défaut** :

- **un job** → la couleur de son rôle, lue dans `ROLE` de `js/data.js` ;
- **un marqueur** → le défaut du tableau plus bas.

`ROLE` est la seule source de vérité pour le rôle d'un job. Il appartient à
**cette** strat — un NIN peut tanker ici et DPS ailleurs — et se règle dans
l'atelier Stratégie (bouton « Rôles »). Aucun rôle n'est écrit ici.

### Les couleurs, telles que le guide les définit

Ce sont les jetons de `css/style.css`, pas une seconde palette :

| Rôle   | Jeton        | Hex       |
|--------|--------------|-----------|
| Tank   | `--r-tank`   | `#4c9df0` |
| Heal   | `--r-heal`   | `#3fca6a` |
| DD     | `--r-dd`     | `#f2564d` |
| Buff   | `--r-buff`   | `#e9c23e` |
| Neutre | `--r-all`    | `#8a94a6` |

## Jobs (`jobs/*.png`)

Les 22 jobs, un fichier par code : `WAR` `MNK` `WHM` `BLM` `RDM` `THF` `PLD`
`DRK` `BST` `BRD` `RNG` `SMN` `SAM` `NIN` `DRG` `BLU` `COR` `PUP` `DNC` `SCH`
`GEO` `RUN`.

## Marqueurs (`markers/*.png`)

| Fichier     | Nom         | Sens                                        | Anneau défaut |
|-------------|-------------|---------------------------------------------|---------------|
| GROUP.png   | Groupe      | Une équipe entière, sans détailler les jobs | Neutre        |
| STACK.png   | Regroupé    | Se regrouper (flèches convergentes)         | Neutre        |
| SPREAD.png  | Écarté      | Se disperser (flèches divergentes)          | Neutre        |
| DANGER.png  | Danger      | Zone à éviter / mécanique dangereuse        | DD            |
| STUN.png    | Stun        | Stun / interrupt à faire ici                | Neutre        |
| HEAL.png    | Soigner     | Point de soin / burst heal                  | Heal          |
| BUFF.png    | Buff        | Appliquer un buff / support                 | Buff          |
| ATTACK.png  | Attaquer    | Cible à focus / burst DPS                   | DD            |
| KITE.png    | Kite        | Mener/kite l'ennemi en courant              | Neutre        |
| CHEST.png   | Coffre      | Loot / coffre / objectif                    | Buff          |
| START.png   | Départ      | Entrée / point de départ                    | Heal          |
| SKULL.png   | Mort · wipe | Zone mortelle / point de wipe               | Neutre        |
| FOCUS.png   | Focus       | Priorité / élément important                | Buff          |

## Ce qui n'est PAS une icône

Certaines aides se dessinent comme des **formes éditables**, pas des jetons :
flèche/trajet, rotation, zone AoE, cône, ligne/cleave, donut, tower, tether,
knockback. Elles vont dans les outils de tracé, pas dans ce dossier.

## Boss

Les boss ne sont pas dans le kit : chacun a son image (render du mob), déjà
posée par la palette Boss de l'atelier.

## Ajouter une icône

1. Poser le PNG dans `jobs/` ou `markers/`, nommé par son **code** en
   majuscules (`WAYPOINT.png`) — silhouette blanche sur transparent, 256×256.
2. Ajouter le code à `ICO_JOBS` ou `ICO_MARQUEURS` dans `js/sortie-map-core.js`,
   son nom lisible dans `ICO_NOM`, et son rôle par défaut dans `ICO_ROLE` si ce
   n'est pas Neutre.

C'est tout : palette, calque, enregistrement et guide suivent.

## Notes techniques

- **256×256** : les images d'origine faisaient 1254×1254 pour un jeton affiché
  à 40 px — 5,8 Mo pour treize dessins, sur un outil qui doit s'ouvrir hors
  ligne. Le kit entier tient maintenant en ~900 Ko, et `verif-icones` refuse
  toute icône au-dessus de 80 Ko.
- Les silhouettes sont **blanches et pleines** : elles ressortent sur la
  pastille sombre quel que soit le fond de carte.
- Il n'y a pas de repères numérotés (`WM1..4`). Les numéros d'ordre des boss
  existent déjà comme marqueurs à part.
