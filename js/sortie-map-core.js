/* ============================================================
   sortie-map-core.js — SOCLE PARTAGÉ (couleurs · points · géométrie)
   ------------------------------------------------------------
   Logique commune à map-studio.html, map-editor.html et app.js.
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

  // ---- sérialisation data.js (chaînes ; format STABLE, partagé par map-studio ET map-editor) ----
  // champs optionnels d'une pastille, omis quand ils valent le défaut → data.js propre + rétro-compatible
  function pinMeta(o){
    var s=(o.lp&&o.lp!=='bottom')?", lp:'"+o.lp+"'":"";
    if(o.label&&String(o.label).trim())s+=", label:'"+escJs(o.label)+"'";
    if(o.hl)s+=", hl:1";
    return s;
  }
  // name / q passent par escJs : une apostrophe dans un nom ou une quantité (« L'ombre ×3 »)
  // produisait un data.js invalide — le guide ne se chargeait plus du tout.
  function bossesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(b){s+=" {name:'"+escJs(b.name)+"',n:"+b.n+",el:'"+b.el+"', x:"+r1(b.x)+",y:"+r1(b.y)+", nx:"+r1(b.nx)+",ny:"+r1(b.ny)+pinMeta(b)+"},\n";});return s+'];';}
  function packsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(p){s+=" {name:'"+escJs(p.name)+"', el:'"+p.el+"', x:"+r1(p.x)+",y:"+r1(p.y)+", q:'"+escJs(p.q||'')+"', ph:"+p.ph+pinMeta(p)+"},\n";});return s+'];';}
  function midsConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(m){s+=" {name:'"+escJs(m.name)+"', el:'"+m.el+"', x:"+r1(m.x)+",y:"+r1(m.y)+pinMeta(m)+"},\n";});return s+'];';}
  // routesConst lit rt.points (chaîne à jour) + les champs optionnels name/c1/a/fs
  function routesConst(nm,arr){var s='const '+nm+'=[\n';(arr||[]).forEach(function(rt){var ex='';
    if(rt.name)ex+=", name:'"+escJs(rt.name)+"'";
    if(rt.c1)ex+=", c1:'"+rt.c1+"'";
    if(rt.a!=null&&Math.abs(rt.a-BAND_KONVA.ALPHA)>0.001)ex+=", a:"+(Math.round(rt.a*100)/100);
    if(rt.fs!=null&&Math.abs(rt.fs-1)>0.001)ex+=", fs:"+(Math.round(rt.fs*100)/100);
    s+=" {n:"+rt.n+", el:'"+rt.el+"'"+ex+", points:'"+(rt.points||'')+"'},\n";});return s+'];';}

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

  global.SORTIE = {
    EL_KEYS:EL_KEYS, EL_HEX:EL_HEX, EL_VAR:EL_VAR, EL_ZC2:EL_ZC2,
    elHex:elHex,
    r1:r1, clamp:clamp,
    parsePts:parsePts, ptsStr:ptsStr,
    segDist:segDist, projectOnSeg:projectOnSeg, midpoint:midpoint, axisLock:axisLock,
    esc:esc, escAttr:escAttr, pqHtml:pqHtml,
    BAND_KONVA:BAND_KONVA, BAND_SVG:BAND_SVG,
    pinMeta:pinMeta, bossesConst:bossesConst, packsConst:packsConst, midsConst:midsConst, routesConst:routesConst,
    TEXT_FONT:TEXT_FONT, textFont:textFont, textAdv:textAdv, textAlign:textAlign, textBold:textBold, textItalic:textItalic, textOutline:textOutline, textDeco:textDeco,
    parseInline:parseInline, parseRich:parseRich, runsToHtml:runsToHtml, stripRuns:stripRuns,
    textParse:textParse, textLines:textLines, textsConst:textsConst
  };
})(typeof window!=='undefined'?window:this);
