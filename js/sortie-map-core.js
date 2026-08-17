/* ============================================================
   sortie-map-core.js — SOCLE PARTAGÉ (couleurs · points · géométrie)
   ------------------------------------------------------------
   Logique commune à map-studio.html, strat-studio.html et app.js.
   AUCUNE dépendance à un backend de rendu (ni Konva, ni DOM) :
   uniquement des données et des fonctions pures.
   Chargé AVANT le script qui l'utilise. Expose window.SORTIE.

   Pourquoi deux jeux de couleurs ?
   - EL_HEX  : valeurs hex directes → map-studio (Konva, pas de thème CSS).
   - EL_VAR  : variables CSS de thème (--e-*) → guide + éditeur DOM,
               qui suivent le mode clair/sombre via css/style.css.
   Alias identiques partout : red→fire, blue→water, green→wind.
   ============================================================ */
(function(global){
  "use strict";

  // ---- éléments : clés (ordre des palettes) ----
  var EL_KEYS = ['fire','water','ice','thunder','wind','earth','light','dark','red','blue','green','gray'];

  /* Couleurs hex directes : Konva peint sur une toile, il n'a pas de jeton CSS.
     Ce sont donc les MÊMES teintes que le thème sombre, recopiées à la main —
     et c'est là le piège. Retoucher les jetons du guide sans les recopier ici
     fait diverger les deux : le lead pose un boss de feu dans l'atelier, il le
     voit d'un rouge, le guide le rend d'un autre, et rien ne le dit. C'est
     arrivé : le feu, l'eau, la terre et le gris ont été éclaircis côté guide et
     sont restés sombres ici. Les tenir alignés est vérifié par verif-teintes. */
  var EL_HEX = {fire:'#ff827a',water:'#5cb0ea',ice:'#5fd0d0',thunder:'#c9a7ff',wind:'#43c463',earth:'#c08a55',light:'#ffffff',dark:'#e0479f',red:'#ff827a',blue:'#5cb0ea',green:'#43c463',gray:'#a6adb9'};
  // variables CSS de thème (guide + éditeur DOM — suivent clair/sombre)
  // gray était le SEUL à porter un hex en dur ici, donc le seul à ne pas suivre
  // le thème : en clair, l'étiquette d'une phase sans élément tombait à 2,41 de
  // contraste — le texte le moins lisible de la page, sur un repère qu'on suit
  // du regard pendant tout un run. Il a maintenant son jeton comme les autres.
  var EL_VAR = {fire:'var(--e-fire)',water:'var(--e-water)',ice:'var(--e-ice)',thunder:'var(--e-thunder)',wind:'var(--e-wind)',earth:'var(--e-earth)',light:'var(--e-light)',dark:'var(--e-dark)',red:'var(--e-fire)',blue:'var(--e-water)',green:'var(--e-wind)',gray:'var(--e-gray)'};
  // couleur secondaire d'accent (pulsation des pastilles boss)
  var EL_ZC2 = {red:'#ff9d3a',blue:'#7ce0ff',green:'#b6ff5a',gray:'#ffffff'};

  var GRAY = '#a6adb9';   // le même gris que --e-gray : c'est le repli d'elHex
  function elHex(el){ return EL_HEX[el] || GRAY; }

  // ---- géométrie des marqueurs (modèle, pas rendu) ----
  // Taille d'un marqueur en FRACTION de la carte. Ces trois nombres étaient recopiés à trois
  // endroits — pinSize() et renderFloor() dans map-studio, .poi.* dans le CSS du guide — et
  // rien ne garantissait qu'ils restent d'accord. Le CSS les reçoit via des variables posées
  // par app.js, en gardant les valeurs littérales en repli.
  /* Une icone se lit de loin : elle porte une consigne, pas une creature qu'on
     reconnait a sa silhouette. Et sa pastille est un cadre — le dessin dedans
     n'occupe que 66 % du disque. A la taille d'un mid-boss, il n'en restait
     presque rien.
     Cette taille vit ICI et pas dans chaque moteur : l'atelier dessinait a
     5,5 % et le guide a 7 %, donc la carte changeait de tete entre les deux. */
  var POI_SIZE = {boss:0.135, mid:0.07, pack:0.095, ico:0.14};
  /* Un marqueur est un AUTOCOLLANT : le dessin porte la couleur de son role,
     un contour blanc l'en detache, une ombre le pose sur la carte. La pastille
     sombre d'avant enfermait chaque consigne dans le meme jeton noir — on
     voyait dix disques, pas dix consignes.
     ICO_BORD est la part du jeton que prend le contour, de chaque cote ; le
     reste revient au dessin. Au-dela d'un septieme environ, le contour cesse
     d'entourer les emblemes de job et se met a boucher leurs ajours : une hache
     de WAR devient une tache blanche. */
  var ICO_BORD = 0.07;
  var ICO_PART = 1 - 2 * ICO_BORD;   // ce qui reste au dessin
  /* Noir ou blanc, au choix du lead et par icone. Le fond de Sortie est beige
     clair : le noir y detache mieux, c'est donc lui par defaut. Mais une salle
     sombre, une zone rouge, un fond de carte importe changent la donne — et
     c'est celui qui ecrit la strat qui voit sa carte, pas nous. */
  var ICO_CONTOURS = {noir:'#0b0f16', blanc:'#ffffff'};
  var ICO_CONTOUR_DEF = 'noir';
  function icoBord(o){ var b = o && o.b; return ICO_CONTOURS[b] ? b : ICO_CONTOUR_DEF; }
  function icoBordHex(o){ return ICO_CONTOURS[icoBord(o)]; }
  // l'ombre, en part du jeton elle aussi : elle doit grandir avec lui
  var ICO_OMBRE = {dy:0.025, flou:0.04, alpha:0.55};
  // Chaque icone porte SA taille, un facteur autour de 1 : un « danger » qui
  // couvre une salle et un repere de position n'ont pas a faire la meme taille.
  var ICO_T = {min:0.5, max:3, pas:0.05};
  function icoT(o){ var t=o&&o.t; return (typeof t==='number'&&t>0)?t:1; }
  function poiSize(kind){ return POI_SIZE[kind] != null ? POI_SIZE[kind] : POI_SIZE.pack; }
  // Écart entre l'icône et son label, en pixels d'une carte de 1024 (LBLMARGIN vient de data.js).
  function labelGap(m){ return (m == null ? 0 : m) * 1.6 + 4; }

  // ---- nombres ----
  function r1(v){ return Math.round(v*10)/10; }            // arrondi 1 décimale (coordonnées %)
  function clamp(v,lo,hi){ lo=(lo==null?0:lo); hi=(hi==null?100:hi); return Math.max(lo,Math.min(hi,v)); }

  // ---- points « x,y x,y » en % <-> tableau [[x,y],…] ----
  function parsePts(s){
    s = (s==null?'':String(s)).trim();
    if(!s) return [];
    return s.split(/\s+/).filter(Boolean).map(function(q){ var a=q.split(','); return [parseFloat(a[0]), parseFloat(a[1])]; });
  }
  function ptsStr(arr){ return (arr||[]).map(function(p){ return r1(p[0])+','+r1(p[1]); }).join(' '); }

  // ---- géométrie (toutes en unités %) ----
  // distance d'un point au segment [a,b]
  function segDist(px,py,a,b){
    var dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy||1;
    var t=((px-a[0])*dx+(py-a[1])*dy)/l2; t=Math.max(0,Math.min(1,t));
    return Math.hypot(px-(a[0]+t*dx), py-(a[1]+t*dy));
  }
  // projection orthogonale du point (px,py) sur la DROITE (a→b) — garde le point collinéaire
  function projectOnSeg(px,py,a,b){
    var dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy||1;
    var t=((px-a[0])*dx+(py-a[1])*dy)/l2;
    return [a[0]+t*dx, a[1]+t*dy];
  }
  function midpoint(a,b){ return [(a[0]+b[0])/2, (a[1]+b[1])/2]; }
  // verrou d'axe : garde x OU y de l'origine (ox,oy) selon l'axe de plus grand déplacement
  function axisLock(nx,ny,ox,oy){
    if(Math.abs(nx-ox) >= Math.abs(ny-oy)) return [nx, oy];
    return [ox, ny];
  }

  /* ---- échappement HTML ----
     esc() ne touche PAS au guillemet : dans un attribut il laisse donc sortir
     n'importe quelle valeur qui en contient un. Dans un attribut, c'est
     escAttr(), jamais esc(). */
  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  function escAttr(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* Une couleur qui vient d'une strat RECUE n'est pas une couleur : c'est du
     texte écrit par quelqu'un d'autre, et il finit dans un attribut `style`.
     Un simple guillemet y suffisait à sortir de l'attribut et à poser un
     gestionnaire d'événement. On n'accepte donc qu'un hex ou un rgb(), et rien
     d'autre passe — le repli vaut mieux qu'une carte qui exécute du code. */
  function couleurSure(v, repli){
    var s = String(v == null ? '' : v).trim();
    if(/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
    if(/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/.test(s)) return s;
    // les jetons du guide (« var(--e-fire) ») sont écrits par NOUS, pas reçus
    if(/^var\(--[a-z0-9-]+\)$/i.test(s)) return s;
    return repli == null ? '' : repli;
  }
  // Un nombre reçu qui part dans une géométrie ou un style. NaN et « 12;x » dehors.
  function nombreSur(v, repli){
    var n = parseFloat(v);
    return isFinite(n) ? n : (repli == null ? 0 : repli);
  }

  /* Une intro de chapitre est écrite EN HTML par l'auteur : des paragraphes, du
     gras, une classe d'astuce. On ne peut donc ni l'échapper — la mise en page
     tomberait — ni l'injecter telle quelle : une strat REÇUE y logeait un
     gestionnaire d'événement qui partait à l'ouverture du guide, sans un clic.
     On la relit donc balise par balise et on ne garde que ce qui met en forme.
     Une balise inconnue est déballée (son texte reste) ; une balise qui peut
     porter du code part avec son contenu ; tous les attributs tombent, sauf une
     classe, qui n'est que du nom. */
  var HTML_MISE_EN_FORME = {P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,S:1,SPAN:1,CODE:1,
                            UL:1,OL:1,LI:1,SMALL:1,H3:1,H4:1};
  var HTML_DANGEREUX = {SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,LINK:1,META:1,
                        SVG:1,MATH:1,FORM:1,INPUT:1,BUTTON:1,TEXTAREA:1,BASE:1};
  var CLASSE_SURE = /^[A-Za-z0-9 _-]*$/;
  function htmlSur(s){
    var src = String(s == null ? '' : s);
    // hors navigateur (ou analyseur absent), on préfère du texte à un risque
    if(typeof DOMParser === 'undefined') return esc(src);
    var doc = new DOMParser().parseFromString('<div>' + src + '</div>', 'text/html');
    var racine = doc.body.firstChild;
    if(!racine) return '';
    (function nettoie(n){
      var enfants = Array.prototype.slice.call(n.childNodes);
      for(var i = 0; i < enfants.length; i++){
        var e = enfants[i];
        if(e.nodeType === 3) continue;                       // du texte : on garde
        if(e.nodeType !== 1){ e.parentNode.removeChild(e); continue; }  // commentaire
        var nom = e.tagName;
        if(HTML_DANGEREUX[nom]){ e.parentNode.removeChild(e); continue; }
        if(!HTML_MISE_EN_FORME[nom]){                        // inconnue : on déballe
          nettoie(e);
          while(e.firstChild) e.parentNode.insertBefore(e.firstChild, e);
          e.parentNode.removeChild(e);
          continue;
        }
        var attrs = Array.prototype.slice.call(e.attributes);
        for(var k = 0; k < attrs.length; k++){
          var a = attrs[k];
          if(!(a.name === 'class' && CLASSE_SURE.test(a.value))) e.removeAttribute(a.name);
        }
        nettoie(e);
      }
    })(racine);
    return racine.innerHTML;
  }

  // ---- bande des tracés (3 couches : liseré sombre + couleur du boss + flux pointillé blanc) ----
  // Konva (map-studio, unités canvas px) — largeurs de base, à multiplier par fs
  var BAND_KONVA = {CASW:20, CORW:14, FLW:5.5, FDA:9.5, FDB:15, ALPHA:0.82, CASE:'rgba(9,13,18,.5)', INK:'#0d1218', CREAM:'#f6ead0', FALLBACK:'#e5342b'};
  // SVG (app.js / guide, unités viewBox 0..100) — multiplicateurs par fs
  var BAND_SVG = {cw:2.25, rw:1.5, fw:0.62, fdaA:1.0, fdaB:2.05, foff:-3.05, ALPHA:0.82, FALLBACK:'#e5342b'};

  // ---- sérialisation data.js (chaînes ; format STABLE, partagé par les outils ET relu par app.js) ----
  // champs optionnels d'une pastille, omis quand ils valent le défaut → data.js propre + rétro-compatible
  function pinMeta(o){
    var s=(o.lp&&o.lp!=='bottom')?", lp:'"+clefSure(o.lp,['top','left','right','bottom'],'bottom')+"'":"";
    if(o.label&&String(o.label).trim())s+=", label:'"+escJs(o.label)+"'";
    if(o.hl)s+=", hl:1";
    return s;
  }
  // name / q passent par escJs : une apostrophe dans un nom ou une quantité (« L'ombre ×3 »)
  // produisait un data.js invalide — le guide ne se chargeait plus du tout.
  /* La pastille numerotee est FACULTATIVE : elle n'existe que si le boss porte
     un nx/ny. Son numero, lui, reste toujours la — c'est ce qui relie le boss a
     son etape, a son onglet et a son trace. Sans ce test, un boss pose sans
     pastille s'ecrivait « nx:NaN » et le guide ne se chargeait plus du tout. */
  function bossesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(b){
    var pastille=(typeof b.nx==='number'&&typeof b.ny==='number')?", nx:"+r1(b.nx)+",ny:"+r1(b.ny):"";
    s+=" {name:'"+escJs(b.name)+"',n:"+nombreSur(b.n)+",el:'"+elSur(b.el)+"', x:"+r1(b.x)+",y:"+r1(b.y)+pastille+pinMeta(b)+"},\n";});return s+'];';}
  function packsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(p){s+=" {name:'"+escJs(p.name)+"', el:'"+elSur(p.el)+"', x:"+r1(p.x)+",y:"+r1(p.y)+", q:'"+escJs(p.q||'')+"', ph:"+nombreSur(p.ph)+pinMeta(p)+"},\n";});return s+'];';}
  function midsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(m){s+=" {name:'"+escJs(m.name)+"', el:'"+elSur(m.el)+"', x:"+r1(m.x)+",y:"+r1(m.y)+pinMeta(m)+"},\n";});return s+'];';}

  /* ---- les ICÔNES posées sur la carte ----
     Un job, ou un marqueur générique — « ici on se regroupe », « zone mortelle ».
     Elles se posent sur une pastille sombre cerclée de couleur, et l'image reste
     neutre : c'est l'anneau qui parle. Un seul jeu d'images suffit donc.

     La couleur est LIBRE, un hex, comme celle d'une forme — et pas le
     vocabulaire `el` des boss et des packs. Les douze éléments n'ont aucun
     jaune, et un job buff en a besoin. À la pose, elle prend pour défaut le
     rôle du job, lu dans ROLE : la carte et la strat parlent alors la même
     couleur pour le même job. */
  var ICO_JOBS = ['WAR','MNK','WHM','BLM','RDM','THF','PLD','DRK','BST','BRD','RNG','SMN',
                  'SAM','NIN','DRG','BLU','COR','PUP','DNC','SCH','GEO','RUN'];
  var ICO_MARQUEURS = ['GROUP','STACK','SPREAD','DANGER','STUN','HEAL','BUFF',
                       'ATTACK','KITE','CHEST','START','SKULL','FOCUS'];
  // le nom qu'un lead lit — le code du fichier ne dit rien à personne
  var ICO_NOM = {GROUP:'Groupe', STACK:'Regroupé', SPREAD:'Écarté',
                 DANGER:'Danger', STUN:'Stun', HEAL:'Soigner', BUFF:'Buff',
                 ATTACK:'Attaquer', KITE:'Kite', CHEST:'Coffre', START:'Départ',
                 SKULL:'Mort · wipe', FOCUS:'Focus'};
  var ICO_DOSSIER = 'xi-studio-icons/';
  /* Un fichier qu'on s'echange sur Discord n'a aucun dossier autour de lui :
     l'export y recopie les dessins dont la strat se sert et les depose ici.
     icoSrc les y trouve avant d'aller chercher un fichier qui n'existe plus.
     Sans ca, un job ou un repere arrivait chez le groupe en carre de couleur. */
  var ICO_EMBARQUE = {};
  function icoEmbarque(table){ ICO_EMBARQUE = table || {}; }
  function icoSrc(ico){
    if(ICO_EMBARQUE[ico]) return ICO_EMBARQUE[ico];
    if(ICO_JOBS.indexOf(ico) >= 0) return ICO_DOSSIER + 'jobs/' + ico + '.png';
    if(ICO_MARQUEURS.indexOf(ico) >= 0) return ICO_DOSSIER + 'markers/' + ico + '.png';
    return '';
  }
  function icoNom(ico){ return ICO_NOM[ico] || ico; }
  // Les couleurs de rôle du guide, en hex : Konva ne lit pas les variables CSS.
  var ROLE_HEX = {tank:'#4c9df0', heal:'#3fca6a', dd:'#f2564d', buff:'#e9c23e', all:'#8a94a6'};
  /* La couleur de depart d'un marqueur. Un job prend celle de son role — c'est
     ROLE qui decide, et la carte parle alors la meme couleur que la strat.
     Un marqueur, lui, ne joue aucun role : il dit une consigne, et il a sa
     couleur propre. Un eclair de stun est jaune, un coffre est dore, une tete
     de mort est blanche — c'est ce qu'on lit sur une carte, pas une affaire de
     tank ou de DD. Les faire passer par les cinq couleurs de role donnait des
     reperes gris et un stun couleur « buff », que personne ne reconnaissait.
     Rien n'est fige : chaque icone garde sa couleur libre dans sa carte de
     reglages. Ce ne sont que des departs. */
  var ICO_HEX = {
    GROUP:'#ffffff',   // tout le monde, sans distinguer les jobs
    STACK:'#4c9df0',   // se rassembler
    SPREAD:'#7a3fc4',  // s'ecarter — l'oppose du bleu qui rassemble
    DANGER:'#f2564d',  // ce qui tue
    STUN:'#ffd93b',    // l'eclair
    HEAL:'#3fca6a',    // le soin
    BUFF:'#5fd0d0',    // le soutien
    ATTACK:'#f2564d',  // frapper ici
    KITE:'#ffffff',    // emmener au loin
    CHEST:'#c98a2e',   // le tresor
    START:'#7ed957',   // l'entree
    SKULL:'#ffffff',   // la mort
    FOCUS:'#ff6b9d'    // la priorite
  };
  function icoCouleur(ico, ROLE){
    if(ICO_JOBS.indexOf(ico) >= 0) return ROLE_HEX[roleDuJob(ROLE || {}, ico)] || ROLE_HEX.all;
    return ICO_HEX[ico] || ROLE_HEX.all;
  }
  /* Le contour de l'autocollant, en XML de filtre SVG. C'est une DILATATION de
     la silhouette : le trait epouse le dessin au lieu de l'encadrer, et il
     traverse les ajours d'un emblème de job sans les fermer.
     Son rayon se compte en PART de l'element (primitiveUnits) et non en pixels :
     le jeton retrecit sur un telephone, et un rayon fixe donnerait un gros
     contour sur petit ecran et un cheveu sur grand.
     C'est le GUIDE qui s'en sert — la palette de l'atelier aussi, puisqu'elle
     est en HTML. La carte de l'atelier, elle, est une toile : Konva n'a pas de
     filtre, elle recompose son contour a la main (composeColle). Deux moteurs,
     deux dessins, un seul modele — ICO_BORD. */
  function icoFiltre(id, hex){
    return '<filter id="' + id + '" x="-40%" y="-40%" width="180%" height="180%"'
      + ' primitiveUnits="objectBoundingBox">'
      + '<feMorphology operator="dilate" in="SourceAlpha" result="gros" radius="'
      + ICO_BORD + '"/>'
      + '<feFlood flood-color="' + (hex || ICO_CONTOURS[ICO_CONTOUR_DEF]) + '"/>'
      + '<feComposite in2="gros" operator="in" result="bord"/>'
      + '<feMerge><feMergeNode in="bord"/><feMergeNode in="SourceGraphic"/></feMerge>'
      + '</filter>';
  }
  // l'identifiant du filtre d'un contour, le meme des deux cotes
  function icoFiltreId(bord){ return 'icobord-' + bord; }
  function iconesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(i){
    // taille et contour ne s'ecrivent que si on les a changes : une icone
    // ordinaire reste une ligne courte
    var t=(icoT(i)!==1)?", t:"+(Math.round(icoT(i)*100)/100):"";
    var b=(icoBord(i)!==ICO_CONTOUR_DEF)?", b:'"+icoBord(i)+"'":"";
    s+=" {ico:'"+escJs(i.ico)+"', c:'"+escJs(i.c||'')+"', x:"+r1(i.x)+",y:"+r1(i.y)+t+b+pinMeta(i)+"},\n";});return s+'];';}
  // routesConst lit rt.points (chaîne à jour) + les champs optionnels name/c1/a/fs
  function routesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(rt){var ex='';
    if(rt.name)ex+=", name:'"+escJs(rt.name)+"'";
    if(rt.c1)ex+=", c1:'"+escJs(rt.c1)+"'";
    if(rt.a!=null&&Math.abs(rt.a-BAND_KONVA.ALPHA)>0.001)ex+=", a:"+(Math.round(rt.a*100)/100);
    if(rt.fs!=null&&Math.abs(rt.fs-1)>0.001)ex+=", fs:"+(Math.round(rt.fs*100)/100);
    s+=" {n:"+nombreSur(rt.n)+", el:'"+elSur(rt.el)+"'"+ex+", points:'"+escJs(rt.points||'')+"'},\n";});return s+'];';}

  /* ---- FORMES libres : rectangle, ellipse ou image posée sur la carte ----
     Un seul type d'objet pour les trois : ils partagent centre + taille et ne diffèrent
     que par `k`. Évite trois blocs data.js, trois rendus Konva et trois rendus SVG.
       k       'rect' | 'ell' | 'img'
       x,y     centre en % (même repère que tout le reste)
       w,h     taille en % de carte
       c       couleur de remplissage (rect/ell)            défaut #5bd6ef
       a       opacité 0–1                                  défaut .35 (rect/ell), 1 (img)
       sw      épaisseur du contour en % de carte           défaut .25 · 0 = sans contour
       r       rayon des coins en % (rect seulement)        défaut 0
       rot     rotation en degrés autour du centre          défaut 0
       src     chemin de l'image depuis la racine (img)                                  */
  var SHAPE_DEF = {a:0.35, aImg:1, sw:0.25, c:'#5bd6ef'};
  function shapeAlpha(o){ return (o && o.a != null) ? o.a : (o && o.k === 'img' ? SHAPE_DEF.aImg : SHAPE_DEF.a); }
  function shapeStroke(o){ return (o && o.sw != null) ? o.sw : SHAPE_DEF.sw; }
  function shapesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(o){
    var ex='', def=(o.k==='img'?SHAPE_DEF.aImg:SHAPE_DEF.a);
    if(o.k==='img') ex+=", src:'"+escJs(o.src||'')+"'";
    else{
      ex+=", c:'"+escJs(o.c||SHAPE_DEF.c)+"'";
      if(o.sw!=null&&Math.abs(o.sw-SHAPE_DEF.sw)>0.001)ex+=", sw:"+(Math.round(o.sw*100)/100);
      if(o.k==='rect'&&o.r)ex+=", r:"+(Math.round(o.r*100)/100);
    }
    if(o.a!=null&&Math.abs(o.a-def)>0.001)ex+=", a:"+(Math.round(o.a*100)/100);
    if(o.rot)ex+=", rot:"+r1(o.rot);
    s+=" {k:'"+clefSure(o.k,['rect','ell','img'],'rect')+"', x:"+r1(o.x)+",y:"+r1(o.y)+", w:"+r1(o.w)+",h:"+r1(o.h)+ex+"},\n";});
    return s+'];';}

  // ---- annotations texte : {x,y,t,s,c, al?,bg?,b?,i?,u?,st?,f?,ol?} — s = taille en % de carte
  //   t  = texte multi-lignes AVEC marqueurs de liste PAR LIGNE (façon markdown) :
  //        « - texte » → puce · « 1. texte » (n'importe quel nombre) → numéroté (renuméroté auto)
  //        une ligne sans marqueur = ligne normale → on peut mélanger titre + liste dans un même bloc
  //   al = 'l' gauche | 'c' centré (défaut) | 'r' droite — s'applique aux lignes NON-liste
  //        (les lignes de liste sont toujours alignées à gauche, en groupe)
  //   bg = 1 (boîte sombre)  ·  b = 0 (retire le gras, gras par défaut)  ·  i = 1 (italique)
  //   u  = 1 (souligné)  ·  st = 1 (barré)
  //   f  = 'mono' (défaut) | 'sans' | 'serif'
  //   ol = 1 (contour forcé) | 0 (sans contour) ; défaut auto = contour quand pas de bg
  // familles de police (piles sûres, pas de chargement externe requis)
  var TEXT_FONT = {mono:"'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
                   sans:"'Inter', system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                   serif:"Georgia, 'Times New Roman', 'Noto Serif', serif"};
  function textFont(o){ return TEXT_FONT[(o&&o.f)||'mono'] || TEXT_FONT.mono; }
  // avance moyenne d'un glyphe (× taille) pour estimer largeur de boîte / ancrage
  function textAdv(o){ var f=(o&&o.f)||'mono'; return f==='mono'?0.62:(f==='serif'?0.5:0.54); }
  function textAlign(o){ var a=o&&o.al; return (a==='l'||a==='r')?a:'c'; }
  function textOutline(o){ return (o&&o.ol!=null) ? !!o.ol : !(o&&o.bg); } // auto : contour si pas de bg
  /* ---- TEXTE ENRICHI (inline) — partagé outil Texte + labels de pastilles ----
     Le texte est stocké avec un petit HTML restreint inline : <b> <i> <u> <s>
     et <span style="color:#hex">. Les lignes sont séparées par \n. Un marqueur
     de liste (« - » ou « 1. ») en tête de ligne (texte brut) reste géré par ligne.
     Parseur SANS DOM (donc testable côté Node ET utilisable studio/guide). */
  function decodeEnt(s){return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,function(m,e){
    if(e[0]==='#'){var code=(e[1]==='x'||e[1]==='X')?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return isNaN(code)?m:String.fromCharCode(code);}
    var map={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};var k=e.toLowerCase();return map[k]!=null?map[k]:m;});}
  function _colorFromTag(tag){var m=tag.match(/color\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))/);if(!m)return null;var c=m[1];
    if(c[0]==='#')return c;var nums=c.match(/[\d.]+/g);if(!nums||nums.length<3)return null;
    return '#'+nums.slice(0,3).map(function(v){v=Math.max(0,Math.min(255,Math.round(parseFloat(v))));var h=v.toString(16);return h.length<2?'0'+h:h;}).join('');}
  // texte inline restreint → suite de runs [{t,b,i,u,st,c}]
  function parseInline(html){html=String(html==null?'':html);
    var runs=[],b=0,i=0,u=0,s=0,colors=[],buf='';
    function flush(){if(buf){runs.push({t:decodeEnt(buf),b:b>0,i:i>0,u:u>0,st:s>0,c:colors.length?colors[colors.length-1]:null});buf='';}}
    var re=/<\/?[a-z][^>]*>|[^<]+/gi,m;
    while((m=re.exec(html))){var tok=m[0];
      if(tok[0]!=='<'){buf+=tok;continue;}
      flush();
      var closing=/^<\//.test(tok),name=(tok.match(/^<\/?\s*([a-z0-9]+)/i)||[])[1];if(!name)continue;name=name.toLowerCase();
      if(name==='b'||name==='strong')b+=closing?-1:1;
      else if(name==='i'||name==='em')i+=closing?-1:1;
      else if(name==='u')u+=closing?-1:1;
      else if(name==='s'||name==='strike'||name==='del')s+=closing?-1:1;
      else if(name==='span'||name==='font'){if(closing)colors.pop();else{var c=_colorFromTag(tok);colors.push(c!=null?c:(colors.length?colors[colors.length-1]:null));}}
      else if(name==='br')buf+='\n';
      if(b<0)b=0;if(i<0)i=0;if(u<0)u=0;if(s<0)s=0;}
    flush();
    if(!runs.length)runs.push({t:'',b:false,i:false,u:false,st:false,c:null});
    return runs;}
  // runs → HTML sûr (uniquement nos balises) — pour injecter dans le guide (.plabel) et l'éditeur
  function runsToHtml(runs){return (runs||[]).map(function(r){var t=esc(r.t);
    if(r.st)t='<s>'+t+'</s>';if(r.u)t='<u>'+t+'</u>';if(r.i)t='<i>'+t+'</i>';if(r.b)t='<b>'+t+'</b>';
    if(r.c)t='<span style="color:'+r.c+'">'+t+'</span>';return t;}).join('');}
  // retire les n premiers caractères d'une suite de runs (en préservant les styles du reste)
  function stripRuns(runs,n){var out=[],removed=0;
    for(var i=0;i<runs.length;i++){var r=runs[i];
      if(removed>=n){out.push(r);continue;}
      var need=n-removed;
      if(r.t.length<=need){removed+=r.t.length;continue;}
      out.push({t:r.t.slice(need),b:r.b,i:r.i,u:r.u,st:r.st,c:r.c});removed=n;}
    if(!out.length)out.push({t:'',b:false,i:false,u:false,st:false,c:null});
    return out;}
  // texte enrichi complet → lignes [{list, align, prefix, runs}]
  //   Alignement PAR LIGNE : marqueur de tête <c> (centré) / <r> (droite) / <l> (gauche) — sinon null.
  //   Le marqueur de liste est détecté sur le TEXTE RÉEL (hors balises) : même si la ligne
  //   entière est stylée (<i>- puce</i>), la puce est reconnue et le style conservé.
  function parseRich(o){var t=(typeof o==='string')?o:(o&&o.t);
    var lines=String(t==null?'':t).split('\n'),num=0,out=[];
    lines.forEach(function(line){
      var align=null,ma;
      if(ma=line.match(/^<([clr])>/)){align=ma[1];line=line.slice(ma[0].length);}
      var runs=parseInline(line), plain=runs.map(function(r){return r.t;}).join(''), list=null, mlen=0, m;
      if(m=plain.match(/^\s*[-*•][ \t]+/)){list='b';mlen=m[0].length;num=0;}
      else if(m=plain.match(/^\s*\d+\.[ \t]+/)){list='n';mlen=m[0].length;num++;}
      else num=0;
      var prefix=list==='b'?'•  ':(list==='n'?(num+'.  '):'');
      out.push({list:list,align:align,prefix:prefix,runs:mlen?stripRuns(runs,mlen):runs});});
    return out;}
  // compat : anciennes lignes en texte simple (préfixes • / 1.) sans style
  function escJs(v){return String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r/g,'').replace(/\n/g,'\\n');}
  /* ---- ce qui entre dans data.js sans guillemets autour ----
     data.js est chargé en <script> : ce qu'on y écrit s'EXÉCUTE. Les champs
     ci-dessous ne viennent pas tous de l'atelier — une strat reçue sur Discord
     traverse l'import sans qu'un seul de ses champs soit relu, puis ressort par
     ces écrivains au premier « Enregistrer ». Un « el » forgé refermait l'objet,
     fermait le tableau, exécutait ce qu'il voulait et rouvrait un tableau bidon
     pour que la fin du fichier reste valide. Le code partait ensuite chez tout
     le linkshell avec le prochain git push.
     · clefSure  — le champ ne peut valoir qu'un mot d'une liste fermée
     · identSur  — le champ s'écrit NU (pas entre guillemets) : il doit être un
                   nom de variable, rien d'autre. C'était le pire des cinq. */
  function clefSure(v, permis, repli){
    var s = String(v == null ? '' : v);
    return permis.indexOf(s) >= 0 ? s : repli;
  }
  function identSur(v, repli){
    var s = String(v == null ? '' : v);
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s) ? s : repli;
  }
  /* Le thème d'une rubrique (« buff », « rules proc », « tp »…) part dans un
     attribut class. Il y arrivait NU : une strat reçue posait
     « "><img src=x onerror=… > » et la balise naissait pour de bon, dans le
     guide comme dans l'atelier — à la simple ouverture, sans un clic. Pire,
     l'enregistrement la réécrivait telle quelle dans data.js : au push
     suivant, tout le linkshell l'exécutait.
     On n'échappe pas, on FILTRE : un thème n'est fait que de lettres, de
     chiffres, de tirets et d'espaces. Tout le reste retombe sur « rien », ce
     qui donne une rubrique neutre — lisible, et inoffensive. */
  function clsSur(v){
    var s = String(v == null ? '' : v);
    return /^[A-Za-z][A-Za-z0-9 _-]*$/.test(s) ? s : '';
  }
  // Un élément inconnu retombe sur « gray », exactement comme au rendu
  // (elHex fait déjà « EL_HEX[el] || GRAY ») : rien de nouveau à l'écran.
  function elSur(v){ return clefSure(v, EL_KEYS, 'gray'); }
  // gras/italique/souligné/barré/couleur sont désormais INLINE (dans t) → non sérialisés au niveau bloc
  function textsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(t){
    var ex='';
    if(textAlign(t)!=='c')ex+=", al:'"+textAlign(t)+"'";
    if(t.f&&t.f!=='mono')ex+=", f:'"+clefSure(t.f,['mono','sans','serif'],'mono')+"'";
    if(t.ol===0)ex+=", ol:0"; else if(t.ol===1)ex+=", ol:1";
    if(t.bg)ex+=", bg:1";
    if(t.sh==='pill')ex+=", sh:'pill'";   // pastille ronde (« puce ») — même objet, autre forme
    s+=" {x:"+r1(t.x)+",y:"+r1(t.y)+", t:'"+escJs(t.t)+"', s:"+(Math.round((t.s||1.5)*100)/100)+", c:'"+escJs(t.c||'#ffffff')+"'"+ex+"},\n";});return s+'];';}

  /* ---- rôle d'un job ----
     UN rôle par job, et il appartient à la strat : NIN peut tanker sur un
     contenu et DPS sur un autre, mais dans une strat donnée il est l'un ou
     l'autre. Le rôle donne la couleur du badge. */
  var ROLES_OK = {tank:1, heal:1, buff:1, dd:1, all:1};
  function roleDuJob(table, job){
    var v = (table||{})[job];
    return ROLES_OK[v] ? v : 'all';
  }
  // Écrit la table sous la forme exacte qu'a data.js : une ligne par rôle.
  function roleConst(nm, table){
    var t = table || {}, vus = {}, s = 'const '+nm+'={\n';
    ['tank','heal','buff','dd','all'].forEach(function(r){
      var jobs = Object.keys(t).filter(function(j){ return !vus[j] && roleDuJob(t,j) === r; });
      if(!jobs.length) return;
      s += ' ' + jobs.map(function(j){ vus[j] = 1;
        return JSON.stringify(j)+':'+JSON.stringify(roleDuJob(t, j)); }).join(',') + ',\n';
    });
    return s.replace(/,\n$/, '\n') + '};';
  }

  /* ---- composition du groupe ----
     Un groupe, ce sont des CRÉNEAUX — une place chacun. Un créneau tenu par
     plusieurs jobs, ce sont des remplaçants : la place est la même, la
     personne change. C'est ce qui manquait à une simple liste de jobs, qui
     ne disait pas QUI remplace QUI.

       creneaux:[ ["MNK"], ["BRD"], … , ["PLD","DNC"] ]
                                        └─ une place, deux façons de la tenir

     Tout le reste se déduit : la liste des jobs, les façons de jouer la
     strat (une par combinaison de remplaçants), et donc les boutons du guide.
     Un seul job par créneau = une seule façon de jouer, aucun sélecteur. */
  var TAILLES = [6, 12, 18];
  /* Une compo écrite AVANT le 13 août 2026 se décrivait autrement :
       {taille, jobs:[…], variantes:[{nom, jobs:[…]}, …]}
     compoCreneaux rendait [] sans un mot — et une compo vide ressemble à une
     strat qu'on n'a pas encore remplie. Rien ne signalait la perte : le lead
     rouvrait sa strat, trouvait le panneau Compo vide, travaillait, et le
     premier enregistrement retirait COMPO de data.js pour de bon. Les boutons
     de variante disparaissaient du guide, et plus personne ne savait qui
     remplaçait qui.

     On refait donc les places à partir des façons de jouer : chaque position
     d'une variante donne une place, et les jobs qui diffèrent d'une variante
     à l'autre à cette position sont les remplaçants.

       jobs      MNK BRD COR GEO RDM PLD DNC
       PLD       MNK BRD COR GEO RDM PLD
       DNC       MNK BRD COR GEO RDM DNC
        ⇒        [MNK] [BRD] [COR] [GEO] [RDM] [PLD, DNC]

     Sans variantes exploitables, une place par job : on perd qui remplace
     qui — l'ancienne forme ne le disait pas non plus — mais aucun job.
     La reprise ne s'écrit nulle part : c'est le prochain enregistrement qui
     range la compo au format d'aujourd'hui, comme pour les chemins d'images. */
  function creneauxDepuisVariantes(vs){
    var L = (vs[0].jobs || []).length;
    if(!L) return null;
    var alignees = vs.every(function(v){ return v.jobs && v.jobs.length === L; });
    if(!alignees) return null;
    var out = [];
    for(var i = 0; i < L; i++){
      var vus = {}, cr = [];
      vs.forEach(function(v){
        var j = v.jobs[i];
        if(j && !vus[j]){ vus[j] = 1; cr.push(j); }
      });
      if(cr.length) out.push(cr);
    }
    return out.length ? out : null;
  }
  function compoCreneaux(c){
    if(c && c.creneaux) return c.creneaux.map(function(x){ return x.slice(); });
    if(c && c.variantes && c.variantes.length){
      var repris = creneauxDepuisVariantes(c.variantes);
      if(repris) return repris;
    }
    if(c && c.jobs && c.jobs.length) return c.jobs.map(function(j){ return [j]; });
    return [];
  }
  function compoJobs(c){
    var vus = {}, out = [];
    compoCreneaux(c).forEach(function(cr){ cr.forEach(function(j){ if(!vus[j]){ vus[j]=1; out.push(j); } }); });
    return out;
  }
  // Les façons de jouer : le produit des choix sur les créneaux à plusieurs.
  // Le nom d'une variante, ce sont les remplaçants retenus — « PLD », ou
  // « PLD + SAM » s'il y a deux créneaux ouverts.
  function compoVariantes(c){
    var crs = compoCreneaux(c);
    var flex = crs.filter(function(cr){ return cr.length > 1; });
    if(!flex.length) return [];
    var combos = [[]];
    flex.forEach(function(cr){
      var suite = [];
      combos.forEach(function(base){ cr.forEach(function(j){ suite.push(base.concat([j])); }); });
      combos = suite;
    });
    return combos.map(function(choix){
      var pris = {};
      choix.forEach(function(j){ pris[j] = 1; });
      var jobs = [];
      crs.forEach(function(cr){
        if(cr.length === 1){ jobs.push(cr[0]); return; }
        cr.forEach(function(j){ if(pris[j] && jobs.indexOf(j) < 0) jobs.push(j); });
      });
      return {nom: choix.join(' + '), jobs: jobs};
    });
  }
  function variante(c, nom){
    return compoVariantes(c).filter(function(x){ return x.nom === nom; })[0] || null;
  }
  // Jobs présents dans une variante ; à défaut, toute la compo.
  function jobsDeLaVariante(c, nom){
    var v = variante(c, nom);
    return v ? v.jobs.slice() : compoJobs(c);
  }
  // Discriminant = il partage son créneau avec un remplaçant. Un job seul sur
  // sa place est là quelle que soit la façon de jouer.
  function jobDiscrimine(c, job){
    return compoCreneaux(c).some(function(cr){ return cr.length > 1 && cr.indexOf(job) >= 0; });
  }
  // Un job est-il masqué par la variante active ? Non s'il n'est pas dans la
  // compo (cité à titre indicatif, « avec un WAR… ») ni s'il est seul sur sa
  // place.
  function jobExclu(c, nom, job){
    if(!nom || !variante(c, nom)) return false;
    if(!jobDiscrimine(c, job)) return false;
    return jobsDeLaVariante(c, nom).indexOf(job) < 0;
  }
  function compoConst(nm, c){
    // taille s'écrit NU, comme n et niv dans strat-core : même parade
    return 'const '+nm+'={taille:'+nombreSur((c&&c.taille), 6)+',creneaux:[\n'
      + compoCreneaux(c).map(function(cr){ return ' '+JSON.stringify(cr); }).join(',\n')
      + '\n]};';
  }

  /* ---- une carte est un module ----
     Un chapitre de la strat ne CONTIENT plus sa carte : il la DÉSIGNE par son
     nom. C'est ce qui permet d'en réutiliser une — deux chapitres, ou deux
     strats, peuvent pointer la même.

     On projette ensuite les champs de la carte sur le chapitre, PAR RÉFÉRENCE
     et jamais par copie : éditer f.bosses édite bien le tableau de la carte,
     donc l'enregistrement écrit au bon endroit. Tout ce qui lisait f.bosses,
     f.map ou f.routes continue de marcher sans une ligne de changement. */
  var CHAMPS_CARTE = [['map','fond'], ['points','trace'], ['start','depart'],
    ['startNode','departNom'], ['bosses','bosses'], ['packs','packs'], ['mids','mids'],
    ['routes','routes'], ['texts','texts'], ['shapes','shapes'], ['icones','icones'],
    ['zones','zones'], ['roster','roster']];
  /* Ce que vaut un champ quand la carte ne le porte pas — ou quand la carte
     elle-même n'existe pas. Les TABLEAUX valent [], jamais null : le guide les
     parcourt sans les tester (f.bosses.forEach, f.bosses.length), et un
     chapitre qui désignait une carte disparue emportait TOUTE la strat —
     vue d'ensemble affichée, barre de navigation aux ancres mortes, et rien
     en dessous. setFloor ayant jeté, ni le filtre ni la restauration du rôle
     ne tournaient non plus. Il suffisait de renommer une carte pendant qu'un
     chapitre la désigne encore, ou d'ouvrir une strat reçue au registre
     incomplet. Le guide s'affiche maintenant amputé, mais VIVANT.

     Les tests existants sont tous de la forme « f.zones && f.zones.length » :
     [] y est aussi faux que null, rien ne change à l'écran.

     roster garde null : absent veut dire « propose tout le catalogue », alors
     que [] voudrait dire « ne propose rien ». */
  var VIDE_CARTE = {points:'', startNode:'', map:null, start:null, roster:null,
                    bosses:[], packs:[], mids:[], routes:[], texts:[],
                    shapes:[], icones:[], zones:[]};
  // un tableau NEUF par chapitre : partager la même référence ferait apparaître
  // sur un chapitre le marqueur qu'on vient de poser sur un autre
  function videPour(nom){
    var v = VIDE_CARTE[nom];
    return Array.isArray(v) ? [] : (v === undefined ? null : v);
  }
  /* Une carte NEUVE, aux noms du registre. L'atelier en tenait sa propre liste,
     et les deux ont divergé : « icones » manquait de son côté. resoudreCartes
     donnait alors au chapitre un tableau neuf DÉTACHÉ du registre — les icônes
     posées sur une carte créée dans l'atelier s'affichaient, s'enregistraient
     en apparence, et n'étaient nulle part au rechargement.
     La forme d'une carte se dit ici, une seule fois : ajouter un champ à
     CHAMPS_CARTE suffit désormais, des deux côtés. */
  function carteVide(){
    var c = {};
    CHAMPS_CARTE.forEach(function(p){ c[p[1]] = videPour(p[0]); });
    return c;
  }
  function resoudreCartes(floors, cartes){
    (floors || []).forEach(function(f){
      var c = (cartes || {})[f.carte];
      CHAMPS_CARTE.forEach(function(p){
        // Sans carte, on part de ce que le chapitre porte déjà : les strats
        // écrites avant que la carte devienne un module désigné gardaient
        // leurs marqueurs sur le chapitre lui-même. Les écraser les perdrait.
        var v = c ? c[p[1]] : f[p[0]];
        f[p[0]] = (v === undefined || v === null) ? videPour(p[0]) : v;
      });
    });
    return floors;
  }

  // L'inverse : ce que l'atelier a pu REMPLACER sur le chapitre redescend dans
  // la carte. « Annuler » réaffecte f.bosses avec un tableau neuf, et le
  // premier marqueur d'une carte vide en crée un : dans les deux cas la
  // référence se détache, et sans ce retour la carte garderait l'ancienne.
  function deposeCartes(floors, cartes){
    (floors || []).forEach(function(f){
      var c = (cartes || {})[f.carte];
      if(!c) return;
      CHAMPS_CARTE.forEach(function(p){ if(f[p[0]] !== undefined) c[p[1]] = f[p[0]]; });
    });
    return cartes;
  }

  /* ---- écrire le registre des cartes ----
     Chaque carte porte SES tableaux, au lieu de pointer douze constantes
     nommées par étage. C'est ce qui permet d'en ajouter une sans inventer
     BOSSES_C, PACKS_C, ROUTES_C…

     On ne réécrit pas les sérialiseurs pour autant : on leur demande leur
     « const X=[…]; » habituel et on n'en garde que le tableau, ré-indenté.
     Ils restent la seule source de vérité du format, et testés comme tels. */
  function corpsTableau(txt, ind){
    var c = txt.slice(txt.indexOf('=') + 1, -1);          // « [ … ] »
    return c.split('\n').map(function(l, i){ return i ? ind + l : l; }).join('\n');
  }
  var TABLEAUX_CARTE = [['bosses', bossesConst], ['packs', packsConst], ['mids', midsConst],
                        ['routes', routesConst], ['texts', textsConst], ['shapes', shapesConst],
                        ['icones', iconesConst]];
  function carteConst(nom, c, ind){
    var s = ind + JSON.stringify(nom) + ':{\n';
    var d = ind + ' ';
    s += d + 'fond:' + JSON.stringify(c.fond || '') + ',\n';
    s += d + 'trace:' + JSON.stringify(c.trace || '') + ',\n';
    s += d + 'depart:' + (c.depart ? JSON.stringify(c.depart) : 'null')
       + ', departNom:' + JSON.stringify(c.departNom || '') + ',\n';
    s += TABLEAUX_CARTE.map(function(p){
      return d + p[0] + ':' + corpsTableau(p[1]('X', c[p[0]] || []), d);
    }).join(',\n');
    if(c.zones) s += ',\n' + d + 'zones:' + JSON.stringify(c.zones);
    /* Les creatures qu'on peut poser SUR cette carte. C'est du contenu : les
       noms des mobs de Sortie vivaient en dur dans l'atelier, qui est pourtant
       cense ignorer ce qu'on y ecrit. Absent, la palette propose tout ce que
       MOB connait — un roster manquant n'empeche donc jamais de travailler. */
    if(c.roster) s += ',\n' + d + 'roster:' + JSON.stringify(c.roster);
    return s + '\n' + ind + '}';
  }
  function cartesConst(nm, registre){
    var cles = Object.keys(registre || {});
    if(!cles.length) return 'const ' + nm + '={\n};';
    return 'const ' + nm + '={\n'
      + cles.map(function(k){ return carteConst(k, registre[k], ' '); }).join(',\n')
      + '\n};';
  }
  // Un chapitre : ce qui lui appartient, plus le NOM de sa carte.
  function chapitresConst(nm, floors){
    return 'const ' + nm + '=[\n'
      + (floors || []).map(function(f){
          var s = ' {id:' + JSON.stringify(f.id) + ', fr:' + JSON.stringify(f.fr || '')
            + ', en:' + JSON.stringify(f.en || '');
          if(f.sub) s += ', sub:' + JSON.stringify(f.sub);
          s += ',\n  carte:' + JSON.stringify(f.carte || '');
          if(f.introFr != null) s += ',\n  introFr:' + JSON.stringify(f.introFr);
          if(f.introEn != null) s += ', introEn:' + JSON.stringify(f.introEn);
          // le chapitre dit lui-meme ou vivent ses etapes : sinon il fallait
          // le deviner sur son id, ce qui ne valait que pour Sortie
          // phases s'écrit NU — c'est un nom de variable, pas une chaîne. Sans
          // ce filtre, « 0;code() » passait tel quel et s'exécutait au chargement.
          var pn = identSur(f.phasesNom || f.__phases, 'PHASES');
          return s + ',\n  phases:' + pn + ', phasesNom:' + JSON.stringify(pn) + '}';
        }).join(',\n')
      + '\n];';
  }

  /* ---------------- un bloc de préparation, comme tous les autres blocs ----
     La préparation s'écrit avec la même grammaire que le reste de la strat :
     des BOÎTES qu'une ligne vide referme, et un badge par job. Elle a donc
     la même forme — une liste de rubriques.

     Elle n'a pas toujours été comme ça : elle n'était qu'une suite de lignes,
     sans rubrique ni boîte. Les strats déjà écrites, celles rangées dans la
     bibliothèque et celles exportées en fichier, ont encore cette forme-là.
     On les lit sans rien leur demander : une suite de lignes devient une
     rubrique unique, sans titre ni couleur. C'est exactement ce qu'elles
     affichaient déjà. */
  function groupesBuffs(jeu){
    if(!jeu || !jeu.length) return [];
    // une rubrique porte `lines`, une ligne porte `r` : c'est ce qui les sépare
    if(jeu[0] && jeu[0].lines !== undefined) return jeu;
    return [{label:'', cls:'', lines:jeu}];
  }

  global.SORTIE = {
    groupesBuffs:groupesBuffs,
    resoudreCartes:resoudreCartes, deposeCartes:deposeCartes, carteVide:carteVide,
    // publié pour que les tests puissent demander la forme d une carte au socle
    // plutôt que de la recopier — une liste recopiée est une liste qui diverge
    CHAMPS_CARTE:CHAMPS_CARTE,
    cartesConst:cartesConst,
    chapitresConst:chapitresConst, ROLES_OK:ROLES_OK, roleDuJob:roleDuJob, roleConst:roleConst,
    TAILLES:TAILLES, compoCreneaux:compoCreneaux, compoJobs:compoJobs, compoConst:compoConst,
    compoVariantes:compoVariantes, variante:variante,
    jobExclu:jobExclu,
    EL_KEYS:EL_KEYS, EL_HEX:EL_HEX, EL_VAR:EL_VAR, EL_ZC2:EL_ZC2,
    elHex:elHex,
    POI_SIZE:POI_SIZE, poiSize:poiSize, labelGap:labelGap,
    r1:r1, clamp:clamp,
    parsePts:parsePts, ptsStr:ptsStr,
    segDist:segDist, projectOnSeg:projectOnSeg, midpoint:midpoint, axisLock:axisLock,
    esc:esc, escAttr:escAttr, couleurSure:couleurSure, nombreSur:nombreSur, htmlSur:htmlSur,
    clsSur:clsSur,
    BAND_KONVA:BAND_KONVA, BAND_SVG:BAND_SVG,
    /* bossesConst et iconesConst servent en interne, via TABLEAUX_CARTE : ce
       sont les tests qui les appellent nommement, pour verifier ce qu'une
       carte ecrit dans data.js sans passer par un enregistrement complet.
       Publiees pour eux, pas mortes. */
    bossesConst:bossesConst, ICO_JOBS:ICO_JOBS, ICO_MARQUEURS:ICO_MARQUEURS, icoSrc:icoSrc, icoNom:icoNom, icoCouleur:icoCouleur,
    icoEmbarque:icoEmbarque,
    ICO_PART:ICO_PART, ICO_BORD:ICO_BORD, ICO_OMBRE:ICO_OMBRE,
    ICO_CONTOURS:ICO_CONTOURS, ICO_CONTOUR_DEF:ICO_CONTOUR_DEF,
    icoBord:icoBord, icoBordHex:icoBordHex,
    icoFiltre:icoFiltre, icoFiltreId:icoFiltreId, ICO_T:ICO_T, icoT:icoT,
    ROLE_HEX:ROLE_HEX, iconesConst:iconesConst,
    SHAPE_DEF:SHAPE_DEF, shapeAlpha:shapeAlpha, shapeStroke:shapeStroke, textFont:textFont, textAdv:textAdv, textAlign:textAlign, textOutline:textOutline, parseInline:parseInline, parseRich:parseRich, runsToHtml:runsToHtml, stripRuns:stripRuns
  };

  // data.js est chargé AVANT ce fichier partout : on branche les chapitres sur
  // leur carte ici, une fois, plutôt que dans chaque page.
  // `typeof` et pas `global.X` : un const de premier niveau n'atterrit pas sur
  // window, il vit dans la portée de script.
  if(typeof FLOORS !== 'undefined' && typeof CARTES !== 'undefined') resoudreCartes(FLOORS, CARTES);
})(typeof window!=='undefined'?window:this);
