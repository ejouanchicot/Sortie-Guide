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
portent aucune couleur. L'atelier et le guide en font un **autocollant** :

1. le **dessin** à la couleur du jeton, sur 86 % du jeton ;
2. un **contour blanc** qui l'entoure — les 7 % restants de chaque côté ;
3. une **ombre portée**, qui le décolle du fond.

Un seul jeu suffit : la couleur vient du jeton, pas du fichier.

Le contour est une **dilatation** de la silhouette, pas un cadre : il épouse le
dessin et traverse les ajours d'un emblème de job sans les fermer. Son épaisseur
se compte en **part du jeton** (`ICO_BORD`, dans `js/sortie-map-core.js`) et non
en pixels — sinon le même marqueur sortirait épais sur un téléphone et fin sur
un grand écran. Au-delà d'un septième environ, il cesse d'entourer les emblèmes
et se met à **boucher leurs ajours** : une hache de WAR devient une tache
blanche. C'est là qu'est le plafond, pas dans le goût.

Les deux moteurs l'obtiennent différemment, comme tout le reste du dessin : le
guide par un filtre SVG (`#icobord`, posé par `app.js`), l'atelier en reposant
la silhouette tout autour d'elle-même sur une toile — Konva n'a pas de filtre de
dilatation, et relire les pixels d'une image locale est interdit quand l'atelier
est ouvert depuis un fichier.

Dans le guide, la silhouette passe par un **masque CSS** et non par une image :
c'est la page qui la colore, donc la même image sert quelle que soit la teinte.

Dans un **export autonome**, les icônes qui servent partent avec le fichier : la
carte ne retient que le code du dessin (`PLD`), donc `export-html.js` les remet
au socle par `SORTIE.icoEmbarque()`. Sans ça, un marqueur arriverait chez le
groupe en carré de couleur — son masque chercherait une image restée sur le site.

## La couleur du dessin

Un marqueur de carte porte sa **couleur libre**, comme une forme — cinq
raccourcis de rôle plus un sélecteur, dans sa carte de réglages. Ce n'est pas
le vocabulaire `el` des boss et des packs : les douze éléments n'ont pas de
jaune, et un job buff en a besoin.

À la pose, le dessin prend un **défaut** :

- **un job** → la couleur de son rôle, lue dans `ROLE` de `js/data.js` ;
- **un marqueur** → sa couleur propre, dans `ICO_HEX` du socle.

Un marqueur ne joue **aucun rôle** : il dit une consigne. Un éclair de stun est
jaune, un coffre est doré, une tête de mort est blanche — c'est ce qu'on lit sur
une carte, pas une affaire de tank ou de DD. Les faire passer par les cinq
couleurs de rôle donnait des repères gris et un stun couleur « buff », que
personne ne reconnaissait.

`ROLE` est la seule source de vérité pour le rôle d'un job. Il appartient à
**cette** strat — un NIN peut tanker ici et DPS ailleurs — et se règle dans
l'atelier Stratégie (bouton « Rôles »). Aucun rôle n'est écrit ici.

### Les couleurs de rôle, telles que le guide les définit

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

| Fichier     | Nom         | Sens                                        | Couleur défaut       |
|-------------|-------------|---------------------------------------------|----------------------|
| GROUP.png   | Groupe      | Une équipe entière, sans détailler les jobs | `#ffffff` blanc      |
| STACK.png   | Regroupé    | Se regrouper (flèches convergentes)         | `#4c9df0` bleu       |
| SPREAD.png  | Écarté      | Se disperser (flèches divergentes)          | `#b07cff` violet     |
| DANGER.png  | Danger      | Zone à éviter / mécanique dangereuse        | `#f2564d` rouge      |
| STUN.png    | Stun        | Stun / interrupt à faire ici                | `#ffd93b` jaune      |
| HEAL.png    | Soigner     | Point de soin / burst heal                  | `#3fca6a` vert       |
| BUFF.png    | Buff        | Appliquer un buff / support                 | `#5fd0d0` cyan       |
| ATTACK.png  | Attaquer    | Cible à focus / burst DPS                   | `#f2564d` rouge      |
| KITE.png    | Kite        | Mener/kite l'ennemi en courant              | `#ffffff` blanc      |
| CHEST.png   | Coffre      | Loot / coffre / objectif                    | `#e9c23e` or         |
| START.png   | Départ      | Entrée / point de départ                    | `#7ed957` vert clair |
| SKULL.png   | Mort · wipe | Zone mortelle / point de wipe               | `#ffffff` blanc      |
| FOCUS.png   | Focus       | Priorité / élément important                | `#ff6b9d` rose       |

Quelques couleurs se répètent, et c'est voulu : le danger et l'attaque parlent
tous deux du combat ; le groupe, le kite et la tête de mort ne désignent aucun
rôle. Leurs dessins ne se ressemblent pas, c'est ce qui les sépare sur la carte.
Rien n'est figé — chaque icône garde sa couleur libre dans sa carte de réglages.
Ce ne sont que des départs.

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
- Les silhouettes sont **blanches et pleines** : seule leur transparence porte
  le dessin, donc la couleur et le contour se calculent sans toucher au fichier.
- Un emblème très **ajouré** supporte mal un gros contour. Si un dessin doit
  être vu de loin avec un cerne épais, c'est le dessin qu'il faut épaissir —
  pas le contour qu'il faut pousser.
- Il n'y a pas de repères numérotés (`WM1..4`). Les numéros d'ordre des boss
  existent déjà comme marqueurs à part.
