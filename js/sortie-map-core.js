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

  // couleurs hex directes (fond canvas / Konva)
  var EL_HEX = {fire:'#f2564d',water:'#4aa3e0',ice:'#5fd0d0',thunder:'#b07cff',wind:'#43c463',earth:'#c9975c',light:'#ffffff',dark:'#c85fe0',red:'#f2564d',blue:'#4aa3e0',green:'#43c463',gray:'#a6b2c2'};
  // variables CSS de thème (guide + éditeur DOM — suivent clair/sombre)
  var EL_VAR = {fire:'var(--e-fire)',water:'var(--e-water)',ice:'var(--e-ice)',thunder:'var(--e-thunder)',wind:'var(--e-wind)',earth:'var(--e-earth)',light:'var(--e-light)',dark:'var(--e-dark)',red:'var(--e-fire)',blue:'var(--e-water)',green:'var(--e-wind)',gray:'#a6b2c2'};
  // couleur secondaire d'accent (pulsation des pastilles boss)
  var EL_ZC2 = {red:'#ff9d3a',blue:'#7ce0ff',green:'#b6ff5a',gray:'#ffffff'};

  var GRAY = '#a6b2c2';
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
  // part du disque occupee par la silhouette
  var ICO_PART = 0.66;
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

  // ---- échappement HTML ----
  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  function escAttr(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  // ---- quantité de pack « ×12 » / « WHM/BLM/RDM ×5 » → HTML (guide + éditeur DOM) ----
  function pqHtml(q){
    var m=q.match(/×\d+/), count=m?m[0]:'', rest=q.replace(/×\d+/,'').trim();
    if(rest.indexOf('/')>=0){
      var jobs=rest.split('/').map(function(s){ return s.trim(); }).filter(Boolean);
      return '<span class="pq pqlist">'+(count?'<b>'+count+'</b>':'')+jobs.map(function(j){ return '<span>'+j+'</span>'; }).join('')+'</span>';
    }
    return '<span class="pq">'+q+'</span>';
  }

  // ---- bande des tracés (3 couches : liseré sombre + couleur du boss + flux pointillé blanc) ----
  // Konva (map-studio, unités canvas px) — largeurs de base, à multiplier par fs
  var BAND_KONVA = {CASW:20, CORW:14, FLW:5.5, FDA:9.5, FDB:15, ALPHA:0.82, CASE:'rgba(9,13,18,.5)', INK:'#0d1218', CREAM:'#f6ead0', FALLBACK:'#e5342b'};
  // SVG (app.js / guide, unités viewBox 0..100) — multiplicateurs par fs
  var BAND_SVG = {cw:2.25, rw:1.5, fw:0.62, fdaA:1.0, fdaB:2.05, foff:-3.05, ALPHA:0.82, FALLBACK:'#e5342b'};

  // ---- sérialisation data.js (chaînes ; format STABLE, partagé par les outils ET relu par app.js) ----
  // champs optionnels d'une pastille, omis quand ils valent le défaut → data.js propre + rétro-compatible
  function pinMeta(o){
    var s=(o.lp&&o.lp!=='bottom')?", lp:'"+o.lp+"'":"";
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
    s+=" {name:'"+escJs(b.name)+"',n:"+b.n+",el:'"+b.el+"', x:"+r1(b.x)+",y:"+r1(b.y)+pastille+pinMeta(b)+"},\n";});return s+'];';}
  function packsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(p){s+=" {name:'"+escJs(p.name)+"', el:'"+p.el+"', x:"+r1(p.x)+",y:"+r1(p.y)+", q:'"+escJs(p.q||'')+"', ph:"+p.ph+pinMeta(p)+"},\n";});return s+'];';}
  function midsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(m){s+=" {name:'"+escJs(m.name)+"', el:'"+m.el+"', x:"+r1(m.x)+",y:"+r1(m.y)+pinMeta(m)+"},\n";});return s+'];';}

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
  function icoSrc(ico){
    if(ICO_JOBS.indexOf(ico) >= 0) return ICO_DOSSIER + 'jobs/' + ico + '.png';
    if(ICO_MARQUEURS.indexOf(ico) >= 0) return ICO_DOSSIER + 'markers/' + ico + '.png';
    return '';
  }
  function icoNom(ico){ return ICO_NOM[ico] || ico; }
  // Les couleurs de rôle du guide, en hex : Konva ne lit pas les variables CSS.
  var ROLE_HEX = {tank:'#4c9df0', heal:'#3fca6a', dd:'#f2564d', buff:'#e9c23e', all:'#8a94a6'};
  // le rôle qu'un marqueur générique évoque — le reste reste neutre
  var ICO_ROLE = {DANGER:'dd', ATTACK:'dd', HEAL:'heal', START:'heal',
                  BUFF:'buff', CHEST:'buff', FOCUS:'buff'};
  function icoCouleur(ico, ROLE){
    if(ICO_JOBS.indexOf(ico) >= 0) return ROLE_HEX[roleDuJob(ROLE || {}, ico)] || ROLE_HEX.all;
    return ROLE_HEX[ICO_ROLE[ico] || 'all'];
  }
  function iconesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(i){
    // la taille ne s'ecrit que si on l'a changee : une icone ordinaire reste courte
    var t=(icoT(i)!==1)?", t:"+(Math.round(icoT(i)*100)/100):"";
    s+=" {ico:'"+escJs(i.ico)+"', c:'"+escJs(i.c||'')+"', x:"+r1(i.x)+",y:"+r1(i.y)+t+pinMeta(i)+"},\n";});return s+'];';}
  // routesConst lit rt.points (chaîne à jour) + les champs optionnels name/c1/a/fs
  function routesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(rt){var ex='';
    if(rt.name)ex+=", name:'"+escJs(rt.name)+"'";
    if(rt.c1)ex+=", c1:'"+rt.c1+"'";
    if(rt.a!=null&&Math.abs(rt.a-BAND_KONVA.ALPHA)>0.001)ex+=", a:"+(Math.round(rt.a*100)/100);
    if(rt.fs!=null&&Math.abs(rt.fs-1)>0.001)ex+=", fs:"+(Math.round(rt.fs*100)/100);
    s+=" {n:"+rt.n+", el:'"+rt.el+"'"+ex+", points:'"+(rt.points||'')+"'},\n";});return s+'];';}

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
      ex+=", c:'"+(o.c||SHAPE_DEF.c)+"'";
      if(o.sw!=null&&Math.abs(o.sw-SHAPE_DEF.sw)>0.001)ex+=", sw:"+(Math.round(o.sw*100)/100);
      if(o.k==='rect'&&o.r)ex+=", r:"+(Math.round(o.r*100)/100);
    }
    if(o.a!=null&&Math.abs(o.a-def)>0.001)ex+=", a:"+(Math.round(o.a*100)/100);
    if(o.rot)ex+=", rot:"+r1(o.rot);
    s+=" {k:'"+o.k+"', x:"+r1(o.x)+",y:"+r1(o.y)+", w:"+r1(o.w)+",h:"+r1(o.h)+ex+"},\n";});
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
  function textBold(o){ return !o || o.b!==0; }              // gras par défaut
  function textItalic(o){ return !!(o&&o.i); }
  function textOutline(o){ return (o&&o.ol!=null) ? !!o.ol : !(o&&o.bg); } // auto : contour si pas de bg
  // décoration (souligné / barré) — chaîne partagée : 'underline', 'line-through', ou les deux
  function textDeco(o){ var d=[]; if(o&&o.u)d.push('underline'); if(o&&o.st)d.push('line-through'); return d.join(' '); }
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
  function textParse(o){return parseRich(o).map(function(ln){return {t:ln.prefix+ln.runs.map(function(r){return r.t;}).join(''),list:ln.list};});}
  function textLines(o){ return textParse(o).map(function(x){return x.t;}); }
  function escJs(v){return String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r/g,'').replace(/\n/g,'\\n');}
  // gras/italique/souligné/barré/couleur sont désormais INLINE (dans t) → non sérialisés au niveau bloc
  function textsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(t){
    var ex='';
    if(textAlign(t)!=='c')ex+=", al:'"+textAlign(t)+"'";
    if(t.f&&t.f!=='mono')ex+=", f:'"+t.f+"'";
    if(t.ol===0)ex+=", ol:0"; else if(t.ol===1)ex+=", ol:1";
    if(t.bg)ex+=", bg:1";
    if(t.sh==='pill')ex+=", sh:'pill'";   // pastille ronde (« puce ») — même objet, autre forme
    s+=" {x:"+r1(t.x)+",y:"+r1(t.y)+", t:'"+escJs(t.t)+"', s:"+(Math.round((t.s||1.5)*100)/100)+", c:'"+(t.c||'#ffffff')+"'"+ex+"},\n";});return s+'];';}

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
  function compoCreneaux(c){
    if(c && c.creneaux) return c.creneaux.map(function(x){ return x.slice(); });
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
    return 'const '+nm+'={taille:'+((c&&c.taille)||6)+',creneaux:[\n'
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
    ['zones','zones']];
  function resoudreCartes(floors, cartes){
    (floors || []).forEach(function(f){
      var c = (cartes || {})[f.carte];
      if(!c) return;
      CHAMPS_CARTE.forEach(function(p){
        var v = c[p[1]];
        f[p[0]] = (v === undefined) ? (p[0] === 'points' || p[0] === 'startNode' ? '' : null) : v;
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
          var pn = f.phasesNom || f.__phases || 'PHASES';
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
    resoudreCartes:resoudreCartes, deposeCartes:deposeCartes,
    carteConst:carteConst, cartesConst:cartesConst,
    chapitresConst:chapitresConst, corpsTableau:corpsTableau,
    ROLES_OK:ROLES_OK, roleDuJob:roleDuJob, roleConst:roleConst,
    TAILLES:TAILLES, compoCreneaux:compoCreneaux, compoJobs:compoJobs, compoConst:compoConst,
    compoVariantes:compoVariantes, variante:variante,
    jobsDeLaVariante:jobsDeLaVariante, jobDiscrimine:jobDiscrimine, jobExclu:jobExclu,
    EL_KEYS:EL_KEYS, EL_HEX:EL_HEX, EL_VAR:EL_VAR, EL_ZC2:EL_ZC2,
    elHex:elHex,
    POI_SIZE:POI_SIZE, poiSize:poiSize, labelGap:labelGap,
    r1:r1, clamp:clamp,
    parsePts:parsePts, ptsStr:ptsStr,
    segDist:segDist, projectOnSeg:projectOnSeg, midpoint:midpoint, axisLock:axisLock,
    esc:esc, escAttr:escAttr, pqHtml:pqHtml,
    BAND_KONVA:BAND_KONVA, BAND_SVG:BAND_SVG,
    pinMeta:pinMeta, bossesConst:bossesConst, packsConst:packsConst, midsConst:midsConst, routesConst:routesConst,
    ICO_JOBS:ICO_JOBS, ICO_MARQUEURS:ICO_MARQUEURS, icoSrc:icoSrc, icoNom:icoNom, icoCouleur:icoCouleur,
    ICO_PART:ICO_PART, ICO_T:ICO_T, icoT:icoT,
    ROLE_HEX:ROLE_HEX, iconesConst:iconesConst,
    SHAPE_DEF:SHAPE_DEF, shapeAlpha:shapeAlpha, shapeStroke:shapeStroke, shapesConst:shapesConst,
    TEXT_FONT:TEXT_FONT, textFont:textFont, textAdv:textAdv, textAlign:textAlign, textBold:textBold, textItalic:textItalic, textOutline:textOutline, textDeco:textDeco,
    parseInline:parseInline, parseRich:parseRich, runsToHtml:runsToHtml, stripRuns:stripRuns,
    textParse:textParse, textLines:textLines, textsConst:textsConst
  };

  // data.js est chargé AVANT ce fichier partout : on branche les chapitres sur
  // leur carte ici, une fois, plutôt que dans chaque page.
  // `typeof` et pas `global.X` : un const de premier niveau n'atterrit pas sur
  // window, il vit dans la portée de script.
  if(typeof FLOORS !== 'undefined' && typeof CARTES !== 'undefined') resoudreCartes(FLOORS, CARTES);
})(typeof window!=='undefined'?window:this);
