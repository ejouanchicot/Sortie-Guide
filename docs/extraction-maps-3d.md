# Guide — Recréer des cartes 2D « accurate » à partir de la géométrie 3D de FFXI

But : reproduire la méthode **Remapster** — au lieu de tracer la carte (fausse) du jeu, on
**extrait la vraie géométrie 3D de la zone**, on **isole la surface où le personnage peut marcher**,
on en fait un **rendu vu de dessus**, puis on **trace** une carte propre par‑dessus.

Le principe en une phrase : **ripper la géométrie → effacer tout ce qui n'est pas le sol →
rendu top‑down → tracer.**

---

## 1. Outils

| Outil | Rôle | Lien |
|---|---|---|
| **Noesis** (Rich Whitehouse) | Ouvre les `.DAT` de FFXI et **exporte les zones 3D** en `.fbx`/`.obj` | https://richwhitehouse.com/index.php?content=inc_projects.php |
| **Blender** | Nettoyer le mesh (isoler le sol) + rendu vue de dessus | https://www.blender.org |
| **Photoshop / GIMP / Krita** | Tracer la carte finale par‑dessus la référence | — |
| **POLUtils** *(déjà dans tes outils)* | Repérer/vérifier quel DAT = quelle zone, extraire des données | — |

Références :
- Guide FFXI → import de zones : http://ffximodding.blogspot.com/2018/10/quick-start-guide-importing-ffxi-zones.html
- Noesis pour FFXI (usage, flags) : https://www.bluegartr.com/threads/127278-Noesis-3D-model-viewer-and-extraction-tool
- Table zone → ID (Codecomp) : https://gist.github.com/Codecomp/00a75f8a65f045bc24057a7726c4251f
- Maps **2D** (à ne pas confondre) : https://github.com/xurion/ffxi-map-dats/blob/master/ZONES.md
- Pathing / collision (bonus) : https://github.com/xathei/Pathfinder
- Projet Remapster : https://www.reddit.com/r/ffxi/comments/gmxv3a/introducing_the_ffxi_remapster_project/

---

## 2. Où sont les fichiers de zones (sur CETTE machine)

Installation FFXI (Steam / FFXIPAL) :
```
D:\steam\steamapps\common\ffxipal\SquareEnix\FINAL FANTASY XI\ROM   (+ ROM2 … ROM9)
```
Les zones 3D sont des `.DAT` **numérotés, sans nom** : `ROM\<dossier>\<fichier>.DAT`.

> ⚠️ **Piège 2D vs 3D**
> - **Maps 2D** = l'écran de carte 512px (ce que Remapster *remplace* en jeu). Liste : dépôt
>   `xurion/ffxi-map-dats`. **Ce n'est PAS** la géométrie.
> - **Géométrie 3D** = ce qu'on ouvre dans Noesis pour voir le vrai terrain. Autres DAT,
>   référencés par les tables internes du jeu → pas de liste unique ultra‑propre.

**Exemples de zones 3D confirmés (à tester direct dans Noesis)** :
| Zone | Chemin |
|---|---|
| Escha – Zi'Tah | `ROM/332/99` |
| Reisenjima | `ROM/342/73` |
| Ciel (sky) | `ROM2/12/107` |

Pour trouver une autre zone : croiser le **gist Codecomp**, ou parcourir les DAT dans Noesis (les
gros fichiers qui affichent un terrain = les zones), ou passer par **POLUtils** (recherche par nom).

---

## 3. Étape 1 — Extraire la zone avec Noesis

1. Décompresser Noesis (pas d'installation), lancer `Noesis.exe`.
2. Naviguer jusqu'au dossier `…\FINAL FANTASY XI\ROM…` et ouvrir le `.DAT` de la zone.
   → la zone s'affiche en 3D dans la fenêtre de preview.
3. **Export** : `File > Export` → format **`.fbx`** (recommandé pour les zones : il regroupe les
   matériaux par texture, contrairement à l'`.obj`).
   - Flags utiles si besoin : `-ff11optimizegeo` (nettoyage géométrie).
4. Garder le FBX exporté dans un dossier de travail.

---

## 4. Étape 2 — Importer dans Blender

1. `File > Import > FBX`, choisir le fichier.
2. À l'import via Noesis, l'objet arrive souvent en **Rotation X = 90°** et **Scale = 0.01** :
   c'est normal, on peut laisser tel quel (ou `Ctrl+A > Rotation & Scale` pour figer).
3. La zone est un **mesh visuel complet** : terrain **+ arbres, props, plafonds, canopée**.
   Vu de dessus c'est un « blob » illisible → c'est exactement le point de départ à nettoyer.

---

## 5. Étape 3 — Isoler la surface marchable (le cœur de la méthode)

Objectif : ne garder que la **dalle où le perso marche**, supprimer tout ce qui est au‑dessus.

### Préparation
1. Vue de dessus : **`Numpad 7`** (Top Orthographic).
2. Tout sélectionner **`A`**, puis **joindre** en un seul objet **`Ctrl+J`** (plus simple à éditer).
3. **`Tab`** → Edit Mode. Tout désélectionner **`Alt+A`**.

### Méthode A — Box‑select en X‑ray (simple)
4. Vue de **face/côté** : **`Numpad 1`** (ou `Numpad 3`) → on voit le **profil en hauteur**
   (sol en bas, arbres/murs/plafonds au‑dessus).
5. **`Alt+Z`** → active le **X‑ray** (la sélection traverse toute l'épaisseur).
6. **`B`** → encadrer **tout ce qui est AU‑DESSUS du niveau du sol**.
7. **`X` → Faces** (ou Vertices) pour supprimer.
8. Répéter sous différents angles jusqu'à ne garder que le sol.
   - Astuce : beaucoup d'arbres sont des **objets/îlots séparés** ; en vue de côté ils se
     sélectionnent en masse (ils flottent au‑dessus du sol).

### Méthode B — Coupe nette au « Bisect » (plus rapide si canopée dense, ex. Zi'Tah)
4. Repérer la **hauteur du sol** (Z du plancher) en vue de face.
5. `A` pour tout sélectionner, puis **`Mesh > Bisect`** (ou chercher « Bisect » avec `F3`).
6. Tracer le **plan de coupe horizontal** à hauteur du sol (une ligne horizontale en vue de face).
7. Dans le panneau en bas à gauche de l'opérateur Bisect : cocher **« Clear Outer »** (ou
   « Clear Inner » selon le côté) et **« Fill »** si tu veux boucher — pour ne garder que le bas.
   → tout ce qui est au‑dessus du plan disparaît d'un coup.
8. Ajuster : refaire une passe si des overhangs/rochers bas subsistent.

> Le résultat = un mesh « au ras du sol » qui révèle les **vrais couloirs/tunnels** (invisibles sur
> la map d'origine). C'est LA valeur ajoutée façon Remapster.

---

## 6. Étape 4 — Rendu vue de dessus (orthographique)

1. Revenir vue de dessus **`Numpad 7`** + **orthographique** (pas de perspective, sinon distances
   faussées).
2. Deux options :
   - **Rapide** : viewport en **Solid**, cadrer, puis capture (`Menu Viewport > … > Save Screenshot`
     ou un simple screenshot). Suffisant comme calque de référence.
   - **Propre** : ajouter une **caméra**, la passer en **Orthographic** (propriétés caméra), la
     braquer droit vers le bas (Rotation 0,0,0 au‑dessus de la zone), régler l'*Ortho Scale* pour
     cadrer toute la zone, puis **`F12`** pour un rendu net. Fond transparent si besoin (Film >
     Transparent).
3. Exporter en **PNG haute résolution** (viser large, ex. 4096², on réduira ensuite).

---

## 7. Étape 5 — Tracer la carte finale

1. Ouvrir le PNG de rendu dans Photoshop/GIMP/Krita comme **calque de référence** (verrouillé,
   opacité réduite).
2. **Tracer** la carte par‑dessus sur des calques séparés, en respectant le **style « legacy » FFXI**
   (fond beige/parchemin, contours, arrows de terrain…).
3. Bonnes pratiques Remapster :
   - garder un **fond « base » vierge** (sans icônes) → les POI/marqueurs viendront sur des calques
     séparés, activables/désactivables ;
   - recouper avec d'anciennes **maps communautaires** pour valider tunnels cachés, cliffs à sens
     unique, trous, sorties non étiquetées ;
   - viser la **résolution native 2048×2048** (celle de Remapster).

---

## 8. Bonus — Réutiliser pour XI STUDIO

- Le **PNG 2048 final** = un **fond de carte HD** directement utilisable comme background dans
  l'éditeur (à la place des maps actuelles).
- Le **mesh « marchable »** isolé peut aussi servir à extraire du **pathing** (zones praticables)
  → données de tracé/navigation pour l'éditeur.
- Les données de coordonnées (bornes monde↔image, style JSON Remapster) permettraient de convertir
  une **coordonnée in‑game (x,y) → pixel** sur la carte (placement auto des marqueurs).

---

## 9. Licence / crédit

Les assets **Remapster** sont gratuits mais spalose demande de **créditer Remapster (spalose) +
lien** (site / reddit). Si tu réutilises leurs maps (ou t'en inspires fortement), ajoute une mention
« Cartes HD : Remapster — spalose » quelque part sur le site. Si tu **crées tes propres** cartes
avec cette méthode, elles sont à toi (le workflow, lui, n'est pas protégé).

---

## 10. Récap express

1. **Noesis** : ouvrir le DAT de zone (`…\FINAL FANTASY XI\ROM…`) → export **FBX**.
2. **Blender** : importer, `Ctrl+J`, isoler le sol (**box‑select X‑ray** ou **Bisect**).
3. **Rendu top‑down ortho** → PNG.
4. **Photoshop** : tracer la carte legacy 2048² par‑dessus.
5. (l’atelier) l'utiliser comme **fond HD** + éventuel **pathing**.
