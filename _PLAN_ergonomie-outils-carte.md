# Plan — Ergonomie unifiée des outils sur la carte (Map Studio)

Objectif de ce doc : décrire **le modèle global** de l'éditeur (`tools/map-studio.html`) pour
que tout se fasse *sur la carte*, de façon cohérente pour **tous les outils** — pas outil par
outil au coup par coup. Rédigé pour être implémenté directement dans VSCode.

Projet : `G:\01_Development\Game_Project\Sortie-Guide\`.

---

## 0. La logique globale (le cœur)

> On a **une carte**. À gauche, **des outils**. Chaque outil sert à **poser un type d'objet**
> sur la carte. Et **tout se choisit et se règle sur la carte**, jamais dans l'inspecteur de droite.

Deux temps, **identiques pour chaque outil** (= ta réponse « les deux combinés ») :

1. **Armement** — tu prends un outil → une **barre d'armement flottante** apparaît au-dessus de
   la carte pour choisir *quoi* poser (type de mob + créature ; contenu de la puce ; couleur du
   tracé…).
2. **Pose + réglage** — tu cliques sur la carte → l'objet se pose, sa **carte flottante**
   contextuelle s'ouvre à côté pour l'ajuster, et **l'outil reste armé** pour en poser d'autres.

Corollaire : **l'inspecteur de droite ne configure plus rien**. Il devient de l'aide + les
réglages globaux (taille des mobs, etc.). À terme on peut même le réduire fortement.

Deux briques réutilisables portent toute la cohérence :
- **`#armbar`** : la barre d'armement flottante (choisir quoi poser).
- **La carte flottante** (`#mapedit` pour le texte, `#mappanel` pour les propriétés) : régler
  l'objet posé, ancrée à lui, qui suit le zoom/pan.

---

## 1. Décisions validées (à ne pas re-discuter)

- **Création** = *les deux combinés* : barre d'armement flottante **+** clic pour tamponner
  **+** carte flottante pour ajuster. L'outil reste armé pour du placement multiple.
- **Objets & noms** :
  - **Marqueur** = icône de mob, sous-type **Boss / Midboss / Pack**.
  - **Numéro** = pastille numérotée d'ordre de kill, **liée au boss** (reste attachée au boss,
    réglée depuis sa carte).
  - **Puce** (NOUVEAU) = pastille dont **le contenu est libre** (un numéro, une lettre, un petit
    texte). Généralisation du Numéro : le Numéro du boss est un cas particulier, mais on peut
    **déposer des puces libres** n'importe où avec le contenu qu'on veut.
  - **Texte / note** et **Tracé** = outils à part entière.

---

## 2. Spécification par outil

Chaque outil suit le **même patron** : armement flottant (si besoin) → clic pose → carte
flottante d'ajustement → reste armé.

### 2.1 Sélection (V)
- Pointeur. Clic sur n'importe quel objet → **sa** carte flottante. Glisser → déplace.
- Déjà en place pour **marqueurs** (`openPinPanel`) et **texte** (`editTextOnMap`).
- Rien à armer.

### 2.2 Marqueur — mob (outil « pin »)
- **Armement** (`#armbar`) : segment **Boss / Midboss / Pack** + **recherche** de créature +
  grille d'images. Choisir une créature = armer.
- **Pose** : clic sur la carte → `placePin` crée l'objet, ouvre sa **carte flottante**
  (`openPinPanel`), **reste armé**.
- **Carte flottante** (déjà faite, `openPinPanel`) : élément/couleur, position du label
  (↑←↓→), quantité (packs), masquer le label, **Éditer le label**, corbeille.
  - À ajouter plus tard : un sélecteur **Type** + « changer de créature » directement dans la
    carte (pour convertir sans supprimer).

### 2.3 Puce — contenu libre (NOUVEAU)
- **Armement** (`#armbar`, variante « puce ») : petit choix de **contenu par défaut** (ex.
  « numéro auto », « lettre », « texte libre ») + couleur. (Peut être minimal au début : juste
  « poser une puce ».)
- **Pose** : clic sur la carte → crée une puce, ouvre sa carte flottante.
- **Carte flottante puce** : champ **contenu** (texte/numéro/lettre), **couleur** (swatches
  éléments), **taille**, corbeille.
- **Modèle de données** : voir §4.
- **Le Numéro du boss** reste géré comme aujourd'hui (`o.n`, `o.nx`, `o.ny`, `addMarker`) — c'est
  la puce liée au boss. Les puces libres sont un **objet séparé** (nouvelle liste), pour ne pas
  casser l'existant.

### 2.4 Texte (T)
- Déjà conforme : clic sur la carte → écrire, carte flottante d'édition riche (`editTextOnMap`
  / `openMapEdit`). Barre d'outils riche (gras/ital/couleur/alignement/listes/taille/police/fond).
- Pas de barre d'armement nécessaire (rien à choisir avant).

### 2.5 Tracé (P)
- **Armement** possible (léger) : couleur + épaisseur par défaut dans `#armbar`.
- **Pose** : clic les points comme aujourd'hui.
- **À faire** : remplacer les réglages inspecteur par une **carte flottante au milieu du tracé**
  (couleur, épaisseur, nom, flux animé on/off, corbeille), ancrée au point médian, qui suit
  zoom/pan (réutiliser `positionFloat`).

### 2.6 Navigation (H / Espace)
- Pan. Rien à armer, rien à régler.

### 2.7 Inspecteur (droite)
- Ne configure plus les objets. Contenu cible : **aide contextuelle** selon l'outil + **réglages
  globaux** (taille des mobs `MOBSCALE`, éventuellement marge des labels `LBLMARGIN` — voir
  §6 « marge »).

---

## 3. Ce qui existe déjà (fait & commité sur ton disque)

- **Carte flottante des marqueurs** — `openPinPanel(o,kind)` + le cadre générique
  `openMapPanel(o,anchorFn,html,wire)` / `closeMapPanel()` / `positionMapPanel()`.
- **Positionnement flottant partagé** — `positionFloat(wrap, anchorFn)` (ancre + bascule
  dessus/dessous + clamp horizontal). Utilisé par `positionMapEdit` **et** `positionMapPanel`.
  → **C'est LA fonction à réutiliser** pour toute nouvelle carte flottante (puce, tracé).
- **Édition texte/label sur la carte** — `openMapEdit(cfg)`, `editTextOnMap`, `editLabelOnMap`.
- **Inspecteur des marqueurs** déjà vidé → simple `hintbox` + ouverture de la carte flottante.
- Renommage **pastille → marqueur** / **marqueur → Numéro** déjà fait.

CSS déjà en place : `#mapedit .mecard` (texte), `#mappanel .mecard` (+ `.mptitle`, `.mprow`,
`.mplbl`, `.mpsw .sw`, `.mpseg`, `.mpchk`, `.mpacts`, `.mpbtn`).

---

## 4. Nouveau type « Puce » — données & sérialisation

But : une liste de puces libres par étage, rendue par l'éditeur ET le guide.

### 4.1 Modèle
```
Puce = { x, y, txt, el?, s? }
  x, y : position en % (0–100)   — même repère que tout le reste
  txt  : contenu (string court ; nombre/lettre/mot)
  el   : clé d'élément pour la couleur (défaut 'gray')  — réutilise S.EL_KEYS / elc()
  s    : taille en % de carte (défaut ~2)  — optionnel
```
Stockage par étage : `f.badges = [ ... ]` (comme `f.texts`, `f.bosses`…).

### 4.2 Sérialisation `data.js`
- Nouveau bloc `const BADGES=[...]` (étage top) et `const BADGES_B=[...]` (sous-sol), au même
  format STABLE que les autres blocs.
- Dans **`js/sortie-map-core.js`** : ajouter `S.badgesConst(name, arr)` (miroir de `textsConst`
  mais sans HTML enrichi — `txt` est du texte simple échappé via `escJs`).
- Dans **`map-studio.html` → `blocksToSave()`** : `out.push({name:top?'BADGES':'BADGES_B',
  text:S.badgesConst(...)});` (toujours émis, même vide, pour persister une suppression).
- Dans **`FLOORS`/data.js** : rattacher `badges:` à chaque étage, ou charger via le même
  mécanisme que `texts`. (Vérifier comment `f.texts` est associé à l'étage aujourd'hui et copier.)

### 4.3 Rendu
- **Éditeur** (`map-studio.html`) : un `addBadge(o)` → `Konva.Group` (cercle coloré + `Konva.Text`
  centré), draggable en Sélection, clic = carte flottante. Calque dédié ou dans `gPins`/`gTexts`
  (créer `gBadges` propre est plus clair). Ajouter au `buildLayers()` (`['badges','Puces',gBadges]`).
- **Guide** (`js/app.js` + `css/style.css`) : rendre `f.badges` en HTML/SVG cohérent avec le style
  du Numéro. Réutiliser la couleur `elc(el)`.

---

## 5. Le cadre technique partagé (à généraliser)

### 5.1 Carte flottante générique
`openMapPanel(o, anchorFn, html, wire)` existe déjà et est **générique** : n'importe quel objet
peut l'utiliser. Pour la **puce** et le **tracé**, écrire un `openBadgePanel(o)` /
`openRoutePanel(rt)` sur le même modèle que `openPinPanel` :
- construire le HTML des contrôles,
- `openMapPanel(o, anchor, html, wire)`,
- dans `wire`, brancher les inputs → mutation de `o` → `relayout/redraw` → `commitSoon()`,
- `mapPanel.node = <le node Konva>` (pour que `select()` referme la bonne carte).

Hooks de repositionnement déjà branchés (à imiter si nouveau state) : `updateZoom`,
`stage.on('dragmove')`, `liveUpdate` appellent `positionMapPanel()`.

### 5.2 Barre d'armement générique `#armbar`
Aujourd'hui pensée pour les marqueurs. La rendre paramétrable par outil : un `openArmBar(kind)`
qui, selon l'outil courant, affiche le bon contenu (mob → type+recherche+grille ; puce → contenu
défaut+couleur ; tracé → couleur+épaisseur). Fermer avec `closeArmBar()` dès qu'on quitte l'outil.

Branchement dans `setToolMode()` :
```
// au début : closeArmBar();  (puis)
if(tool==='pin'){ select(null); showPalette(); }   // showPalette ouvre l'armbar mob
else if(tool==='badge'){ select(null); openArmBar('badge'); }
else if(tool==='text'){ select(null); showTextHint(); }
else if(tool==='path'){ /* armbar tracé optionnel */ }
else if(tool!=='path') select(selNode);
```
Escape (handler clavier) : si un outil est armé → désarmer + `renderArmBar()`.

---

## 6. Code de départ déjà écrit pour l'armbar MOB (à reprendre tel quel)

J'avais commencé l'armbar des marqueurs (non livré). Voici les morceaux, prêts à coller.

### 6.1 CSS (à mettre près des blocs `#mappanel`)
```css
#armbar{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:45;display:none;width:min(560px,92%)}
#armbar.on{display:block}
#armbar .arcard{background:linear-gradient(180deg,rgba(24,35,54,.985),rgba(15,23,36,.985));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  border:1px solid var(--line2);border-radius:14px;box-shadow:0 22px 50px -14px rgba(0,0,0,.72),var(--hi);padding:11px 12px}
#armbar .arhead{display:flex;align-items:center;gap:9px;margin-bottom:9px;flex-wrap:wrap}
#armbar .artitle{font-family:var(--sans);font-weight:700;font-size:13px;color:#fff;white-space:nowrap;display:flex;align-items:center;gap:7px}
#armbar .artitle svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
#armbar .arseg{display:flex;gap:3px}
#armbar .arseg button{font-family:var(--sans);font-size:12px;font-weight:600;padding:4px 12px;color:var(--tx2);background:var(--s1);border:1px solid var(--line);border-radius:8px;cursor:pointer;transition:.14s var(--ease)}
#armbar .arseg button:hover{color:#fff;border-color:color-mix(in srgb,var(--cyan) 45%,transparent)}
#armbar .arseg button.on{background:linear-gradient(145deg,var(--blue),var(--violet));color:#fff;border-color:transparent}
#armbar .arsearch{flex:1;min-width:120px;font-family:var(--mono);font-size:12px;color:#fff;background:rgba(0,0,0,.32);border:1px solid var(--line);border-radius:8px;padding:6px 10px;outline:none}
#armbar .arsearch:focus{border-color:color-mix(in srgb,var(--cyan) 55%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cyan) 16%,transparent)}
#armbar .arclose{margin-left:auto;color:var(--dim);background:none;border:0;cursor:pointer;display:inline-flex;padding:2px}
#armbar .arclose:hover{color:#fff}
#armbar .arclose svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
#armbar .argrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:7px;max-height:232px;overflow:auto;padding:2px}
#armbar .arhint{font-family:var(--mono);font-size:10.5px;color:var(--dim);margin-top:8px}
#armbar .arhint b{color:#7fe7d8}
```

### 6.2 JS (remplace l'ancien `showPalette` inspecteur)
```js
// outil Marqueur : l'inspecteur ne sert plus qu'à guider — le choix se fait dans la barre flottante
function showPalette(){if(tool!=='pin')return;setInspTitle('Nouveau marqueur','var(--cyan)');
  document.getElementById('inspBody').innerHTML='<div class="hintbox">La barre en haut de la carte sert à choisir le type et la créature. <b>Clique sur la carte</b> pour la poser : sa carte de réglages s\u2019ouvre à côté, et l\u2019outil reste armé pour en poser d\u2019autres. <b>Échap</b> désarme.</div>';
  openArmBar();}
let armSearch='';
function ensureArmEl(){let w=document.getElementById('armbar');if(!w){w=document.createElement('div');w.id='armbar';stageWrap.appendChild(w);}return w;}
function closeArmBar(){const w=document.getElementById('armbar');if(w){w.classList.remove('on');w.innerHTML='';}}
function openArmBar(){ensureArmEl().classList.add('on');renderArmBar(true);}
const MOBOF=()=>(typeof MOB!=='undefined')?MOB:{};
function armRoster(){const MOBimg=MOBOF();let names=rosterFor(FL[curIdx].id,palCat,MOBimg);
  const q=armSearch.trim().toLowerCase();if(q)names=names.filter(n=>n.toLowerCase().includes(q));return names;}
const MOBPIN_SVG='<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="3"/><path d="M12 21c5-5.5 7-8.5 7-11a7 7 0 10-14 0c0 2.5 2 5.5 7 11z"/></svg>';
function renderArmBar(focusSearch){const w=ensureArmEl();if(!w.classList.contains('on'))return;const MOBimg=MOBOF();
  const cats=[['boss','Boss'],['mid','Midboss'],['pack','Pack']];const names=armRoster();
  let h='<div class="arcard"><div class="arhead"><span class="artitle">'+MOBPIN_SVG+'Poser un marqueur</span>'+
    '<div class="arseg" id="ar_cat">'+cats.map(c=>'<button data-pc="'+c[0]+'"'+(palCat===c[0]?' class="on"':'')+'>'+c[1]+'</button>').join('')+'</div>'+
    '<input class="arsearch" id="ar_q" placeholder="chercher une créature…" value="'+esc(armSearch)+'">'+
    '<button class="arclose" id="ar_x" title="Fermer (revenir en Sélection)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    (names.length?'<div class="argrid" id="ar_grid">'+names.map(n=>'<button class="palbtn'+(armedPin&&armedPin.name===n?' on':'')+'" data-name="'+esc(n)+'"><img src="'+BASE+MOBimg[n]+'" alt="'+esc(n)+'"><span>'+esc(n)+'</span></button>').join('')+'</div>'
      :'<div class="arhint">Aucune créature'+(armSearch.trim()?' pour « '+esc(armSearch)+' »':'')+' dans cette catégorie.</div>')+
    '<div class="arhint">'+(armedPin?('<b>'+esc(armedPin.name)+'</b> armé — clique sur la carte pour le poser.'):'Choisis une créature, puis clique sur la carte.')+'</div></div>';
  w.innerHTML=h;
  w.querySelectorAll('#ar_cat button[data-pc]').forEach(b=>b.addEventListener('click',()=>{palCat=b.dataset.pc;armedPin=null;renderArmBar(false);}));
  const qi=document.getElementById('ar_q');if(qi){qi.addEventListener('input',()=>{armSearch=qi.value;renderArmBar(true);});
    if(focusSearch){qi.focus();const v=qi.value;qi.value='';qi.value=v;}}
  document.getElementById('ar_x').addEventListener('click',()=>pick('select'));
  w.querySelectorAll('.palbtn').forEach(b=>b.addEventListener('click',()=>{armedPin={kind:palCat,name:b.dataset.name};renderArmBar(false);stage.container().style.cursor='crosshair';toast('Clique sur la carte pour poser '+b.dataset.name+'.','ok');}));}
```

### 6.3 `placePin` — reste armé + ouvre la carte du marqueur posé
```js
async function placePin(kind,name,x,y){const f=FL[curIdx];x=r1(S.clamp(x));y=r1(S.clamp(y));let o;
  if(kind==='boss'){const maxN=(f.bosses||[]).reduce((m,b)=>Math.max(m,b.n||0),0);o={name,n:maxN+1,el:'gray',x,y,nx:x,ny:r1(S.clamp(y+6))};(f.bosses=f.bosses||[]).push(o);}
  else if(kind==='mid'){o={name,el:'gray',x,y};(f.mids=f.mids||[]).push(o);}
  else{o={name,el:'gray',x,y,q:'×1',ph:1};(f.packs=f.packs||[]).push(o);}
  const MOBimg=MOBOF();
  await addPin(kind,o,pinSize(kind),MOBimg);
  buildLayers();const g=pinNode(o);                 // reste armé + ouvre la carte de réglages
  if(g){selNode=g;drawRing(g);renderInspector(g._meta);openInsp();draw();}
  if(tool==='pin')renderArmBar(false);              // l'armement reste actif pour le suivant
  commit();toast(name+' posé — clique encore pour en poser un autre.','ok');}
```
Aussi : dans `setToolMode()`, ajouter `closeArmBar();` en tête, et garder
`if(tool==='pin'){select(null);showPalette();}`. Dans le handler Échap :
`else if(tool==='pin'&&armedPin){armedPin=null;renderArmBar(false);...}`.

> ⚠️ Ce bloc §6 n'a **pas** été testé (Playwright non lancé). À vérifier : focus du champ de
> recherche pendant la frappe (le `renderArmBar(true)` refait tout le HTML — si le curseur saute,
> passer à une mise à jour de la **grille seule** au lieu d'un re-render complet).

---

## 7. Ordre d'implémentation conseillé

1. **Armbar marqueur** (§6) : sortir la palette de l'inspecteur → barre flottante + reste armé.
   Tester : prendre l'outil, chercher, poser plusieurs mobs à la suite, la carte s'ouvre à chaque
   pose.
2. **Puce libre** (§4) : nouvel objet + calque + armbar variante + carte flottante + sérialisation
   core/data.js + rendu guide.
3. **Tracé** : carte flottante au point médian (couleur/épaisseur/nom/flux/suppr) via
   `positionFloat`, remplace les réglages inspecteur.
4. **Nettoyage inspecteur** : ne garder que l'aide + réglages globaux.
5. (Reporté) Propager l'identité visuelle au guide `index.html` et à l'ancien
   `tools/map-editor.html`.

---

## 8. Pièges & rappels (à garder en tête)

- **Repère de coordonnées** : `x,y` en % (0–100). `MAP=1024`. `C(v)=v/100*MAP` (→px),
  `U(v)=v/MAP*100` (→%). `S.clamp()` borne 0–100. `r1()` arrondit à 1 décimale.
- **Positionnement flottant** : **toujours** réutiliser `positionFloat(wrap, anchorFn)` — ne pas
  refaire le calcul d'ancre/bascule/clamp.
- **Fermeture des cartes** : `select()` referme `mapEd`/`mapPanel` selon l'objet ;
  `openMapEdit` fait `closeMapPanel()` ; garder ce fil pour tout nouvel objet (stocker
  `mapPanel.node`).
- **Historique undo/redo** : muter `o` puis `commitSoon()` (throttle) ; `commit()` pour un pas
  net (création, suppression, fin de drag). Ne pas oublier après une mutation via carte flottante.
- **Écoute par outil** (`setToolMode`) : les objets ne sont cliquables/draggables qu'en Sélection
  (ou Navigation). Penser à rendre les **puces** listening/draggable comme les pins.
- **Sauvegarde `data.js`** : remplacement **bloc par bloc** par regex (`const NOM=[...]`). Tout
  nouveau bloc (BADGES) doit exister dans `data.js` **et** être émis par `blocksToSave()` (même
  vide) sinon la suppression ne persiste pas. Format sérialisé STRICTEMENT stable.
- **`data.js` édité à la main par Eric** : **toujours `device_stage_files` avant de committer**
  (garde-fou mtime).
- **Livraison** : `SendUserFile` puis `device_commit_files` vers `G:\...\Sortie-Guide\...` quand
  le pont PC est connecté.
- **Tests** : Node pour le socle (`sortie-map-core.js`), Playwright headless `--no-sandbox` +
  captures pour l'UI. Serveur local `python3 -m http.server 8137` depuis la racine du site.
- **Marge des labels** (`LBLMARGIN`) : l'ancien champ « marge globale » a été retiré de la carte
  des marqueurs (c'était un réglage global mal placé). À remettre dans les **réglages globaux**
  de l'inspecteur si tu en as besoin, pas par-marqueur.

---

## 9. Cible navigateur
Chrome / Edge (File System Access pour l'enregistrement direct + contenteditable/execCommand).
