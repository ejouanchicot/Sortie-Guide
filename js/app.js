/* ============================================================
   app.js — MOTEUR (rendu + interactions)
   ------------------------------------------------------------
   Les DONNÉES de la strat sont dans data.js (chargé AVANT).
   Ici : i18n, colorisation, rendu des cartes, filtres, thème…
   Gère 2 étages (Top Floor / Sous-sol) via FLOORS.
   ============================================================ */


// ---- i18n FR / EN ----
const LANG=(function(){try{var l=localStorage.getItem('sortie_lang');return l==='en'?'en':'fr';}catch(e){return 'fr';}})();
// TR (traductions) vit dans js/i18n.js — contenu, pas moteur
function tr(s){ return (LANG==='en' && s!=null && TR[s]!==undefined) ? TR[s] : s; }

// ---- colorisation des éléments dans le texte ----
// Rendu d'une carte de strat : js/strat-render.js, partagé avec l'outil d'écriture
// (tools/strat-studio.html) pour que l'aperçu y soit le VRAI rendu, pas une imitation.
const esc=window.SORTIE.esc;
// Dans un ATTRIBUT, esc() ne suffit pas : il laisse passer le guillemet, et une
// strat reçue en profitait pour poser un gestionnaire d'événement.
const escAttr=window.SORTIE.escAttr;
STRATR.config({tr:tr, MOB:MOB, ELC:window.SORTIE.EL_VAR, ROLE:ROLE});
const jcol=STRATR.jcol, colorize=STRATR.colorize, roleChip=STRATR.roleChip;
const lineHtml=STRATR.lineHtml, groupBody=STRATR.groupBody;
const cardHtml=STRATR.cardHtml;


// ============================================================
//  RENDU (multi-étages)
// ============================================================
const app=document.getElementById("app");
// marqueur de départ "S" — même style plat que les destinations : disque bleu, liseré crème, contour encre
function ovDot(x,y,l){x=window.SORTIE.nombreSur(x);y=window.SORTIE.nombreSur(y);return '<circle cx="'+x+'" cy="'+y+'" r="2.0" fill="#0d1218"/>'
  +'<circle cx="'+x+'" cy="'+y+'" r="1.82" fill="#f6ead0"/>'
  +'<circle cx="'+x+'" cy="'+y+'" r="1.48" fill="#3f86d6"/>'
  +'<text x="'+x+'" y="'+(y+0.62)+'" text-anchor="middle" class="ovn">'+window.SORTIE.esc(l)+'</text>';}
// couleurs des éléments + accents + constantes de bande : socle partagé (js/sortie-map-core.js, chargé avant app.js)
const ELC=window.SORTIE.EL_VAR;
const ZC2=window.SORTIE.EL_ZC2;
const SB=window.SORTIE.BAND_SVG;
// échelle globale des images de mobs + marge des labels (réglées dans Map Studio, stockées dans data.js)
try{var _ms=(typeof MOBSCALE!=='undefined'&&MOBSCALE)?MOBSCALE:1, _lm=(typeof LBLMARGIN!=='undefined'&&LBLMARGIN!=null)?LBLMARGIN:6;
    document.documentElement.style.setProperty('--mobscale',_ms);
    document.documentElement.style.setProperty('--lblmargin',_lm+'px');
    // marge du label à l'échelle de la carte — même formule que l'éditeur, tenue par le socle
    document.documentElement.style.setProperty('--ovlblm',(Math.round(window.SORTIE.labelGap(_lm)/1024*1000)/10)+'cqw');
    // tailles des marqueurs : le CSS suit le socle au lieu de recopier 13.5 / 9.5 / 7
    var _P=window.SORTIE.POI_SIZE, _pc=function(v){return (Math.round(v*10000)/100)+'%';};
    document.documentElement.style.setProperty('--poi-boss',_pc(_P.boss));
    document.documentElement.style.setProperty('--poi-pack',_pc(_P.pack));
    document.documentElement.style.setProperty('--poi-mid',_pc(_P.mid));
    document.documentElement.style.setProperty('--poi-ico',_pc(_P.ico));}catch(e){}
// La quantité d'un pack suit son nom en ligne, comme dans l'atelier Carte.

let curFloor=null;      // descripteur d'étage courant
let curBossN={};        // boss par n° pour l'étage courant
let spy=null;           // IntersectionObserver de la nav
let curZone=-1;         // zone courante du sous-sol (-1 = Tous, 0-3 = E/F/G/H)

function introHtml(f){ return LANG==='en'?f.introEn:f.introFr; }

function zoneTabsHtml(floor){
  if(!(floor&&floor.zones&&floor.zones.length)) return '';
  var allTab='<button class="zonetab all'+(curZone<0?' on':'')+'" data-z="-1" title="Toutes les zones">'+tr("Tous")+'</button>';
  // étage haut : onglets = n° de destination (1-4), triés dans l'ordre du run ; sous-sol : lettres de secteur
  var useNum = floor.id==='top';
  var items = floor.zones.map(function(z,i){ return {i:i, label: useNum?String(z.n):z.sector, sort: useNum?z.n:i, title:z.sector}; });
  if(useNum) items.sort(function(a,b){ return a.sort-b.sort; });
  return '<div class="zonetabs">'+allTab+items.map(function(it){
    return '<button class="zonetab'+(it.i===curZone?' on':'')+'" data-z="'+it.i+'" title="'+escAttr(it.title)+'">'+esc(it.label)+'</button>';
  }).join('')+'</div>';
}
// annotation texte → SVG (viewBox 0..100, donc s = taille en unités = % de carte)
// mini-éditeur : police, gras/italique/souligné/barré, alignement L/C/R, listes, contour/fond
function txtSvg(o){
  var S=window.SORTIE;
  // « puce » (sh:'pill') = même objet texte rendu en pastille ronde, comme le numéro d'un boss
  var pill=(o.sh==='pill');
  var parsed=S.parseRich(o), fs=S.nombreSur(o.s,1.5), lh=fs*1.34, defc=pill?'#ffffff':S.couleurSure(o.c,'#ffffff'), adv=S.textAdv(o), blockAl=S.textAlign(o), outline=S.textOutline(o);
  var lineW=parsed.map(function(ln){var s=(ln.prefix||'');(ln.runs||[]).forEach(function(r){s+=r.t;});return s.length*fs*adv;});
  var blockW=Math.max.apply(null,lineW.concat([fs]));
  var x0=o.x-blockW/2, xR=o.x+blockW/2, yc=o.y-(parsed.length-1)*lh/2;
  var box='';
  if(pill){var d=Math.max(blockW+fs*1.1, parsed.length*lh+fs*0.5)+fs*0.25;
    box='<circle cx="'+o.x+'" cy="'+o.y+'" r="'+(d/2)+'" style="fill:'+S.couleurSure(o.c,SB.FALLBACK)+';stroke:#f6ead0;stroke-width:'+(fs*0.13)+'px"/>';}
  else if(o.bg){var w=blockW+fs*1.1, hh=parsed.length*lh+fs*0.5;
    box='<rect x="'+(o.x-w/2)+'" y="'+(o.y-hh/2)+'" width="'+w+'" height="'+hh+'" rx="'+(fs*0.28)+'" style="fill:rgba(9,13,18,.82);stroke:rgba(246,234,208,.22);stroke-width:'+(fs*0.03)+'px"/>';}
  var base='font-size:'+fs+'px;font-family:'+S.textFont(o)+';fill:'+defc+';dominant-baseline:central'
    +(outline?';paint-order:stroke;stroke:#05080c;stroke-width:'+(fs*0.16)+'px;stroke-linejoin:round':'');
  var texts=parsed.map(function(ln,i){
    var al=ln.align||(ln.list?'l':blockAl), anchor=al==='l'?'start':(al==='r'?'end':'middle'), ax=al==='l'?x0:(al==='r'?xR:o.x);
    var segs=[]; if(ln.prefix)segs.push({t:ln.prefix}); (ln.runs||[]).forEach(function(r){segs.push(r);});
    var tspans=segs.map(function(r){ if(r.t==null||r.t==='')return '';
      var st=''; if(r.b)st+='font-weight:700;'; if(r.i)st+='font-style:italic;';
      var d=(r.u?'underline':'')+(r.st?' line-through':''); if(d.trim())st+='text-decoration:'+d.trim()+';';
      if(r.c)st+='fill:'+S.couleurSure(r.c,'#ffffff')+';';
      return '<tspan'+(st?' style="'+st+'"':'')+'>'+esc(r.t)+'</tspan>';}).join('');
    return '<text x="'+ax+'" y="'+(yc+i*lh)+'" text-anchor="'+anchor+'" style="'+base+'">'+tspans+'</text>';}).join('');
  return box+texts;
}
function textsSvg(f){ return (f.texts&&f.texts.length)?f.texts.map(txtSvg).join(''):''; }
// formes libres (outils Formes / Image de Map Studio) — rendues EN PREMIER dans le SVG,
// donc sous les tracés, le départ et les annotations, comme dans l'éditeur
function shapeSvg(o){
  // Une forme vient de la strat, donc d'un fichier qu'on a pu recevoir : sa
  // couleur, sa taille et sa source d'image sont du texte d'auteur, pas des
  // valeurs sûres. Un guillemet suffisait à sortir de l'attribut.
  var S=window.SORTIE, a=S.shapeAlpha(o), sw=S.shapeStroke(o), c=S.couleurSure(o.c,S.SHAPE_DEF.c);
  var N=S.nombreSur;
  var ox=N(o.x), oy=N(o.y), ow=N(o.w), oh=N(o.h);
  var x=ox-ow/2, y=oy-oh/2;
  // rotation autour du centre, comme dans l'éditeur
  var rot = o.rot ? ' transform="rotate('+N(o.rot)+' '+ox+' '+oy+')"' : '';
  if(o.k==='img') return o.src
    ? '<image href="'+escAttr(o.src)+'" x="'+x+'" y="'+y+'" width="'+ow+'" height="'+oh+'"'
      +' preserveAspectRatio="none" opacity="'+a+'"'+rot+'/>'
    : '';
  var trait = sw ? ';stroke:'+c+';stroke-width:'+sw+'px' : '';
  if(o.k==='ell') return '<ellipse cx="'+ox+'" cy="'+oy+'" rx="'+(ow/2)+'" ry="'+(oh/2)+'" style="fill:'+c+';opacity:'+a+trait+'"'+rot+'/>';
  return '<rect x="'+x+'" y="'+y+'" width="'+ow+'" height="'+oh+'" rx="'+N(o.r)+'" style="fill:'+c+';opacity:'+a+trait+'"'+rot+'/>';
}
function shapesSvg(f){ return (f.shapes&&f.shapes.length)?f.shapes.map(shapeSvg).join(''):''; }
function buildOverview(f, floor){
  var intro=introHtml(f);
  var mapBlock;
  if(f.map){
    mapBlock='<div class="ovmap mapfig">'
      /* PAS de loading="lazy" ici, contrairement aux vignettes : c'est la
         seule image que le lead est venu voir. « lazy » disait au navigateur
         qu'elle n'était pas pressée, sur l'écran qu'il attend. */
      +'<img src="'+escAttr(f.map)+'" alt="Carte complète du run" fetchpriority="high" decoding="async" onerror="this.closest(\'.ovmap\').classList.add(\'nomap\')">'
      /* Ce bloc ne s'affiche QUE si l'image a échoué (.nomap, posé par onerror).
         Il était masqué sans condition, donc jamais vu : quand un fond ne
         chargeait pas, le lecteur voyait un cadre vide, sans un mot — le
         silence exact qu'on s'interdit ailleurs. Et il parlait à l'auteur
         (« ajoute maps/overview.png », un dossier qui n'existe plus) alors
         que c'est le LECTEUR qui a l'écran sous les yeux, et qu'il n'a rien
         à ajouter. On lui dit ce qui manque et ce qui reste vrai. */
      +'<div class="mapmiss">'+tr("Le fond de cette carte ne s'affiche pas")+' — '
      +tr("les positions restent justes, seule l'image manque.")+'</div>'
      +'<svg class="ovroute" viewBox="0 0 100 100" aria-hidden="true">'
      +'<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa9e6"/><stop offset="1" stop-color="#8b7cff"/></linearGradient></defs>'
      +shapesSvg(f)
      +((f.routes&&f.routes.length)
          // couleur, opacité et points d'un tracé viennent de la strat reçue :
          // la couleur est normalisée, le reste ramené à des nombres
          ? f.routes.map(function(rt){var col=window.SORTIE.couleurSure(rt.c1,ELC[rt.el]||SB.FALLBACK);var op=(rt.a!=null?window.SORTIE.nombreSur(rt.a,SB.ALPHA):SB.ALPHA);var s=(rt.fs!=null?window.SORTIE.nombreSur(rt.fs,1):1);var cw=(SB.cw*s),rw=(SB.rw*s),fw=(SB.fw*s),fda=(SB.fdaA*s)+' '+(SB.fdaB*s),foff=(SB.foff*s);var pts=escAttr(rt.points);return '<polyline class="ovcase" points="'+pts+'" style="--cw:'+cw+'"/><polyline class="ovrail" points="'+pts+'" style="stroke:'+col+';opacity:'+op+';--rw:'+rw+'"/><polyline class="ovflow" points="'+pts+'" style="--fw:'+fw+';--fda:'+fda+';--foff:'+foff+'"/>';}).join('')
          : (f.points?'<polyline class="ovcase" points="'+escAttr(f.points)+'"/><polyline class="ovrail" points="'+escAttr(f.points)+'"/><polyline class="ovflow" points="'+escAttr(f.points)+'"/>':''))
      +(f.start?ovDot(f.start.x,f.start.y,f.start.l):'')
      +textsSvg(f)
      +'</svg></div>';
  } else {
    mapBlock='<div class="ovmap nomap mapsoonwrap"><div class="mapsoon"><span class="msicon">🗺️</span>'+tr("Carte à venir")+'<span class="mssub">'+tr("on la placera avec l'éditeur")+'</span></div></div>';
  }
  var sub = f.map ? '<span class="ovsub"><span class="zoomhint">'+tr("cliquer sur la carte pour agrandir")+'</span></span>' : '';
  return '<section class="overview">'
    +'<div class="ovhead"><span class="ovtitle">'+tr("Vue d'ensemble du run")+'</span>'+sub+'</div>'
    +'<div class="ovgrid">'
    // L'intro est écrite EN HTML par l'auteur — paragraphes, gras, classe
    // d'astuce — donc on ne peut pas l'échapper sans casser la mise en page.
    // Injectée telle quelle, elle exécutait son code à l'ouverture du guide,
    // sans un clic : c'était le chemin le plus court pour une strat reçue.
    // Le socle ne garde que la mise en forme, et jette le reste.
    +'<div class="ovside"><div class="ovintro">'+window.SORTIE.htmlSur(intro)+'</div></div>'
    +'<div class="ovmapwrap">'+mapBlock+zoneTabsHtml(floor)+'</div>'
    +'</div></section>';
}

// label d'une pastille : masqué (hl), ou texte perso (label), sinon le nom (+ quantité pour un pack)
function poiLabel(o,withQ){
  if(o.hl) return '';
  var custom=(o.label!=null && String(o.label).trim());
  var txt;
  if(custom){ // label enrichi → HTML inline sûr (gras/ital/soul/barré/couleur) ; alignement PAR LIGNE
    txt=window.SORTIE.parseRich(o.label).map(function(ln){
      var al=ln.align||'l', sty=al==='c'?'text-align:center':(al==='r'?'text-align:right':'text-align:left');
      return '<span style="display:block;'+sty+'">'+(ln.prefix?esc(ln.prefix):'')+window.SORTIE.runsToHtml(ln.runs)+'</span>';
    }).join('');
  } else { txt=esc(o.name); }
  // Quantité rendue comme dans Map Studio (labelSource) : à la suite du nom, sur la même ligne,
  // même graisse / taille / couleur, séparée par deux espaces. Avant, le guide en faisait un bloc
  // séparé sous le nom, plus petit et coloré (pqHtml) — les deux vues ne se ressemblaient pas.
  var q=(!custom && withQ && o.q)?'<span class="pq">&nbsp;&nbsp;'+esc(o.q)+'</span>':'';
  return '<span class="plabel">'+txt+q+'</span>';
}
/* Le contour des marqueurs est un filtre SVG, et un filtre doit vivre dans la
   page pour que le CSS puisse le nommer. Un par couleur de contour — le lead
   choisit noir ou blanc par icone. Ils sont poses ici, une fois, au lieu d'etre
   ecrits en dur dans index.html : c'est le socle qui les trace, et un export
   autonome emporte donc le meme trait que le site. */
function filtreIcones(){
  const S=window.SORTIE;
  if(document.getElementById(S.icoFiltreId(S.ICO_CONTOUR_DEF))) return;
  const filtres=Object.keys(S.ICO_CONTOURS)
    .map(b=>S.icoFiltre(S.icoFiltreId(b), S.ICO_CONTOURS[b])).join('');
  const d=document.createElement('div');
  d.innerHTML='<svg width="0" height="0" aria-hidden="true" focusable="false"'
    +' style="position:absolute">'+filtres+'</svg>';
  document.body.appendChild(d.firstChild);
}

function placePOIs(f){
  if(!f.map) return;
  const ovmap=document.querySelector('.ovmap'); if(!ovmap) return;
  if((f.icones||[]).length) filtreIcones();
  const N=f.bosses.length;
  const wrap=document.createElement('div'); wrap.className='ovpoi'; let h='';
  // Les icones (jobs, reperes, danger…) passent AVANT les mobs : ce sont des
  // annotations, elles ne doivent pas recouvrir ce qu'on affronte.
  (f.icones||[]).forEach(i=>{
    const src=window.SORTIE.icoSrc(i.ico); if(!src) return;
    // Masque CSS et pas <img> : un SVG chargé en image est un document isolé,
    // son `currentColor` ne voit pas la page et sortirait en noir. Le masque
    // prend la SILHOUETTE du fichier — que ce soit un SVG ou le PNG blanc d'un
    // job — et c'est la page qui la colore, à la couleur du rôle.
    const nom=window.SORTIE.icoNom(i.ico);
    h+='<div class="poi ico lp-'+escAttr(i.lp||'bottom')+'" style="left:'+window.SORTIE.nombreSur(i.x)+'%;top:'+window.SORTIE.nombreSur(i.y)+'%;--pc:'+window.SORTIE.couleurSure(i.c,'#8a94a6')+';--t:'+window.SORTIE.icoT(i)
      // --bordf : lequel des deux contours cette icone porte
      +';--bordf:url(#'+window.SORTIE.icoFiltreId(window.SORTIE.icoBord(i))+')">'
      // Le masque se pose ICI et pas dans une variable CSS : une url() portée
      // par une variable se résout depuis la FEUILLE qui s'en sert — on
      // demandait donc « css/xi-studio-icons/… », qui n'existe pas, et la
      // silhouette disparaissait sans un mot. En style en ligne, elle se
      // résout depuis la page, où le chemin est juste.
      +'<span class="icocolle"><i class="icoimg" role="img" aria-label="'+escAttr(nom)+'"'
      +' style="-webkit-mask-image:url('+escAttr(src)+');mask-image:url('+escAttr(src)+')"></i></span>'
      +poiLabel({label:i.label, hl:i.hl, name:nom},false)+'</div>';
  });
  // Le nom d'un mob et le chemin de sa vignette viennent tous deux de la strat
  // reçue : ils partent dans des attributs, donc par escAttr.
  const nb=window.SORTIE.nombreSur, coul=window.SORTIE.couleurSure;
  f.packs.forEach(p=>{ h+='<div class="poi pack lp-'+escAttr(p.lp||'bottom')+'" style="left:'+nb(p.x)+'%;top:'+nb(p.y)+'%;--pc:'+coul(ELC[p.el],'#a6b2c2')+'"><img src="'+escAttr(MOB[p.name])+'" alt="'+escAttr(p.name)+'" loading="lazy" decoding="async">'+poiLabel(p,true)+'</div>'; });
  (f.mids||[]).forEach(m=>{ h+='<div class="poi mid lp-'+escAttr(m.lp||'bottom')+'" style="left:'+nb(m.x)+'%;top:'+nb(m.y)+'%;--pc:'+coul(ELC[m.el],'#a6b2c2')+'"><img src="'+escAttr(MOB[m.name])+'" alt="'+escAttr(m.name)+'" loading="lazy" decoding="async">'+poiLabel(m,false)+'</div>'; });
  f.bosses.forEach(bo=>{
    var ad=(-(N-bo.n)*0.3375)+'s'; // onde de pulsation dans le sens du chemin (1→N)
    var pc2=ZC2[bo.el]||ELC[bo.el];
    h+='<div class="poi boss lp-'+escAttr(bo.lp||'bottom')+'" style="left:'+nb(bo.x)+'%;top:'+nb(bo.y)+'%;--pc:'+coul(ELC[bo.el],'#a6b2c2')+';--pc2:'+coul(pc2,'#a6b2c2')+';--ad:'+ad+'"><img src="'+escAttr(MOB[bo.name])+'" alt="'+escAttr(bo.name)+'" loading="lazy" decoding="async">'+poiLabel(bo,false)+'</div>';
    // la pastille numerotee est facultative : elle ne s'affiche que si le
    // boss en porte une (nx/ny). Son numero existe toujours, lui.
    if(bo.nx!=null&&bo.ny!=null)
      h+='<div class="ovnum" style="left:'+nb(bo.nx)+'%;top:'+nb(bo.ny)+'%;--pc:'+coul(ELC[bo.el],'#a6b2c2')+';--pc2:'+coul(pc2,'#a6b2c2')+';--ad:'+ad+'">'+esc(bo.n)+'</div>';
  });
  wrap.innerHTML=h; ovmap.appendChild(wrap);
}

function buildTimeline(f){
  const TL=document.createElement('div');TL.className='timeline';app.appendChild(TL);
  if(f.startNode){
    const startNode=document.createElement('div');startNode.className='tlstart';
    startNode.innerHTML='<span class="tldot">S</span><span class="tllab">'+esc(f.startNode)+'</span>';TL.appendChild(startNode);
  }
  const bossByN={}; f.bosses.forEach(b=>bossByN[b.n]=b); curBossN=bossByN;
  const idpfx=(f.id==='top'?'phase':'bphase');
  f.phases.forEach(p=>{
    const sec=document.createElement("section");
    sec.className="phase"+(p.soon?" soon":""); sec.id=idpfx+p.n;
    // secteur et numéro viennent de la strat reçue, et finissent dans du balisage
    const ptag = p.sector ? tr("SECTEUR")+' '+esc(p.sector) : 'PHASE '+esc(p.n);
    if(p.soon){
      sec.innerHTML='<div class="tlnode soon">'+esc(p.n)+'</div>'
        +'<div class="phcard sooncard">'
        +'<div class="phhead"><div class="phtop"><span class="phtag">'+ptag+'</span><span class="soonbadge">'+tr("à venir")+'</span></div>'
        +'<h2 class="phtitle">'+esc(tr(p.title||p.boss))+' 👑</h2>'
        +'<div class="phroute">'+tr("Pas encore fait — on le prépare plus tard.")+'</div>'
        +'</div></div>';
      TL.appendChild(sec); return;
    }
    let cards=""; p.cards.forEach(c=>{ cards+=cardHtml(c,p,f,bossByN); });
    // p.buffs est le NOM d'un jeu de BUFFS ; le titre affiché est ce nom.
    const buffsHtml = STRATR.buffsHtml(p.buffs, BUFFS[p.buffs]);
    const numPill=(k)=>{const bb=bossByN[k];return '<span class="segpill" style="--sc:'+window.SORTIE.couleurSure(bb?ELC[bb.el]:'var(--dim)','var(--dim)')+'">'+esc(k)+'</span>';};
    const fromHtml=p.n===1?'<span class="segstart">Start</span>':numPill(p.n-1);
    const segHtml='<span class="pseg">'+fromHtml+'<span class="segar">→</span>'+numPill(p.n)+'</span>';
    const bz=bossByN[p.n]; const pc=bz?ELC[bz.el]:'var(--r-buff)'; const pc2=bz?(ZC2[bz.el]||ELC[bz.el]):'var(--r-buff)';
    sec.style.setProperty('--pc',pc); sec.style.setProperty('--pc2',pc2);
    sec.innerHTML='<div class="tlnode" style="--pc:'+window.SORTIE.couleurSure(pc,'var(--r-buff)')+';--pc2:'+window.SORTIE.couleurSure(pc2,'var(--r-buff)')+'">'+esc(p.n)+'</div>'
      +'<div class="phcard">'
      +'<div class="phhead">'
      +'<div class="phtop"><span class="phtag">'+ptag+'</span>'+segHtml+'</div>'
      +'<h2 class="phtitle">'+esc(tr(p.title))+'</h2>'
      +(p.route?'<div class="phroute"><span class="rk">'+tr("Déplacement :")+'</span> '+esc(tr(p.route))+'</div>':'')
      +'</div>'
      +'<div class="pgrid"><div class="pleft">'
      +buffsHtml
      +'<div class="cards">'+cards+'</div>'
      +'</div></div>'
      +'</div>';
    TL.appendChild(sec);
  });
}

function buildNav(f){
  const nav=document.getElementById("nav");
  [...nav.querySelectorAll('.chip')].forEach(c=>c.remove());
  const idpfx=(f.id==='top'?'phase':'bphase');
  f.phases.forEach(p=>{
    const a=document.createElement("a");a.href="#"+idpfx+p.n;a.className="chip"+(p.soon?" soonchip":"");
    a.innerHTML='<b>'+esc(p.sector||p.n)+'</b>'+esc(p.boss);
    nav.appendChild(a);
  });
}

function placeNodes(){
  var nodes=[];
  document.querySelectorAll('.phase').forEach(function(ph){
    var node=ph.querySelector('.tlnode'), head=ph.querySelector('.phhead');
    if(node&&head){ var pr=ph.getBoundingClientRect(), hr=head.getBoundingClientRect();
      node.style.top=Math.max(0,(hr.top-pr.top)+(hr.height/2)-19)+'px'; nodes.push(node); }
  });
  // cale le rail animé pile entre le 1er et le dernier nœud (ou le nœud "S" s'il existe)
  var tl=document.querySelector('.timeline'); if(!tl||!nodes.length) return;
  var tlr=tl.getBoundingClientRect();
  var startDot=tl.querySelector('.tlstart .tldot');
  var topRef=startDot?startDot.getBoundingClientRect():nodes[0].getBoundingClientRect();
  var topY=(topRef.top-tlr.top)+topRef.height/2;
  var botY;
  if(nodes.length>1){ // plusieurs boss : le rail relie le 1er au dernier nœud
    var lastRef=nodes[nodes.length-1].getBoundingClientRect();
    botY=(lastRef.top-tlr.top)+lastRef.height/2;
  } else { // vue par-zone (un seul boss) : le rail descend depuis la pastille jusqu'au bas de la strat
    var ph=document.querySelector('.phase');
    botY=ph?((ph.getBoundingClientRect().bottom-tlr.top)-30):(tlr.height-40);
  }
  tl.style.setProperty('--rail-top', topY+'px');
  tl.style.setProperty('--rail-bottom', Math.max(0,tlr.height-botY)+'px');
  suitLaTimeline(tl);
}

/* Le rail est memorise en DISTANCE DEPUIS LE BAS. Tant que la timeline garde
   sa hauteur, c'est equivalent — mais elle ne la garde pas.

   `content-visibility:auto` laisse les cartes hors ecran sans mise en page :
   leurs hauteurs ne sont qu'ESTIMEES tant qu'on ne les a pas approchees. Quand
   elles se resolvent — en defilant, une fois les polices chargees — la timeline
   change de hauteur, et la distance calculee avant ne designe plus le meme
   endroit. Le rail s'arretait alors avant le dernier boss.

   Ca se voyait au sous-sol, dont les etapes sont presque vides : l'estimation
   y depassait le reel du simple au triple (5089 px estimes pour 1832 reels),
   et le trait s'arretait apres le 2. On surveille donc la hauteur, et on
   recalcule des qu'elle bouge. Pas de boucle : placer les noeuds (absolus) et
   poser deux variables ne changent aucune hauteur. */
var railRO = null, railCible = null;
function suitLaTimeline(tl){
  if(!window.ResizeObserver || railCible === tl) return;
  if(railRO) railRO.disconnect();
  railRO = new ResizeObserver(function(){ placeNodes(); });
  railRO.observe(tl); railCible = tl;
}

// vue "zone" du sous-sol : on ne garde que la zone courante (sa carte, son boss, son midboss, son chemin, sa card)
function effectiveFloor(f){
  const z=f.zones[curZone]||f.zones[0];
  const boss=f.bosses.find(b=>b.n===z.n);
  const mid=(f.mids||[]).find(m=>m.name===z.mid);
  const route=(f.routes||[]).find(r=>r.n===z.n);
  const phase=f.phases.find(p=>p.n===z.n);
  const zoneMap=!!z.map; // carte propre à la zone (sous-sol) vs carte entière filtrée (étage haut)
  const showWhole = !zoneMap && !route; // ni carte-zone ni tronçon d'étape → chemin complet
  return {id:f.id, map:z.map||f.map,
    // Les annotations sont posées sur la carte ENTIÈRE de l'étage : elles restent donc valables
    // sur tous les onglets qui affichent cette même carte (rez-de-chaussée), et sont masquées
    // seulement quand la zone a sa propre carte (sous-sol), où leurs coordonnées ne veulent
    // plus rien dire. Avant, `showWhole` les cachait aussi dès qu'un tronçon existait, donc
    // elles n'apparaissaient QUE sur l'onglet « Tous » — l'outil Texte était invisible partout ailleurs.
    texts: zoneMap ? [] : (f.texts||[]),
    shapes: zoneMap ? [] : (f.shapes||[]),
    icones: zoneMap ? [] : (f.icones||[]),   // une annotation comme les autres
    // avec un tronçon d'étape (routes) on n'affiche QUE ce tronçon ; le "S" seulement sur l'étape 1
    points: showWhole ? (f.points||'') : '',
    start: showWhole ? (f.start||null) : (route && z.n===1 ? (f.start||null) : null),
    startNode:'', routes:route?[route]:[],
    introFr:f.introFr, introEn:f.introEn,
    bosses:boss?[boss]:[], packs:(f.packs||[]).filter(function(pk){return pk.ph===z.n;}), mids:mid?[mid]:[], phases:phase?[phase]:[]};
}
function buildZoneSwitcher(f){
  const hasZones=!!(f.zones&&f.zones.length);
  const nav=document.getElementById('nav'); if(nav) nav.style.display=hasZones?'none':'';
  const zbar=document.getElementById('zone'); if(zbar) zbar.style.display='none'; // remplacé par les tabs sur la carte
}
function renderFloor(f){
  curFloor=f;
  const ef=(f.zones&&f.zones.length&&curZone>=0)?effectiveFloor(f):f;
  app.innerHTML=buildOverview(ef, f);
  placePOIs(ef);
  buildTimeline(ef);
  buildNav(ef);
  buildZoneSwitcher(f);
  // nav spy
  if(spy) spy.disconnect();
  const navLinks=[...document.querySelectorAll('#nav .chip')];
  if('IntersectionObserver' in window && navLinks.length){
    spy=new IntersectionObserver((ents)=>{ents.forEach(e=>{if(e.isIntersecting){const id=e.target.id;navLinks.forEach(a=>a.classList.toggle('navactive',a.getAttribute('href')==='#'+id));}});},{rootMargin:'-45% 0px -50% 0px'});
    document.querySelectorAll('.phase').forEach(s=>spy.observe(s));
  }
  if(typeof curJob!=='undefined' && curJob) applyMatch(curJob);
  applyFilter();
  requestAnimationFrame(placeNodes);
}

window.addEventListener('resize',placeNodes);
window.addEventListener('load',function(){placeNodes();setTimeout(placeNodes,300);});
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(placeNodes);}
setTimeout(placeNodes,600);

// ---- filtre par job ----
const jobsEl=document.getElementById("jobs");
const allBtn=document.createElement("button");allBtn.className="chip on";allBtn.id="jobAll";allBtn.textContent=tr("Tous");
jobsEl.appendChild(allBtn);
window.SORTIE.compoJobs(COMPO).forEach(j=>{
  const b=document.createElement("button");b.className="chip jobchip";b.dataset.j=j;b.textContent=j;
  b.style.setProperty("--jc",jcol(j));
  jobsEl.appendChild(b);
});
const soloBtn=document.createElement("button");soloBtn.className="chip";soloBtn.id="soloToggle";soloBtn.textContent="Solo";soloBtn.title=tr("N'afficher que mon rôle");
jobsEl.appendChild(soloBtn);
let curJob=null;
// Masquée par la VARIANTE de comp : soit elle est réservée à une autre, soit
// elle est tenue par un job que la variante active n'a pas.
// SORTIE.jobExclu ne regarde que les jobs de la compo — un job cité à titre
// indicatif (« avec un WAR… ») reste visible dans toutes les variantes.
function compHidden(el){
  const comp=document.body.getAttribute("data-comp");
  const dc=el.dataset.comp;
  if(dc && dc!==comp) return true;
  return (el.dataset.r||"").split(" ").some(j=>window.SORTIE.jobExclu(COMPO,comp,j));
}
function lineHidden(el){
  if(compHidden(el)) return true;
  if(document.body.classList.contains("solo") && curJob){
    const roles=(el.dataset.r||"").split(" ");
    if(roles.indexOf("ALL")<0 && roles.indexOf(curJob)<0) return true;
  }
  return false;
}
/* Un bloc dont toutes les lignes sont filtrées n'a plus lieu d'être : « Mon
   rôle » sur le PLD ne doit pas laisser une rubrique vide derrière lui.

   Mais TOUT bloc sans ligne visible était masqué, y compris ceux qui n'en ont
   aucune à filtrer. Un TP move s'écrit avec son nom en titre et ses effets en
   remarque — pas une seule ligne — et la liste entière disparaissait du guide,
   alors qu'elle s'affichait dans l'atelier.

   La règle sépare donc les deux cas : s'il y a des lignes, c'est le filtre qui
   décide, comme avant. S'il n'y en a aucune, il n'y a rien à filtrer — le bloc
   se montre s'il a quelque chose à dire. */
function plusRienAMontrer(el){
  const lignes = [...el.querySelectorAll(".line")];
  if(lignes.length) return !lignes.some(l => !lineHidden(l));
  return !el.querySelector(".glabel:not(:empty), .gnote");
}
function applyFilter(){
  const solo=document.body.classList.contains("solo") && !!curJob;
  document.querySelectorAll(".line").forEach(el=>{
    const roles=(el.dataset.r||"").split(" ");
    el.classList.toggle("comphide", compHidden(el));
    el.classList.toggle("solohide", solo && roles.indexOf("ALL")<0 && roles.indexOf(curJob)<0);
  });
  document.querySelectorAll(".grp").forEach(g=>{
    g.classList.toggle("emptyhide", plusRienAMontrer(g));
  });
  document.querySelectorAll(".card").forEach(c=>{
    // les cartes boss restent toujours visibles (marqueur de fin de secteur, même sans strat encore écrite)
    if(c.classList.contains("boss")){ c.classList.remove("emptyhide"); return; }
    c.classList.toggle("emptyhide", plusRienAMontrer(c));
  });
  // la préparation est un bloc comme les autres : ses lignes sont déjà passées
  // dans la boucle du dessus, il ne reste qu'à masquer le bloc s'il ne montre plus rien
  document.querySelectorAll(".buffs").forEach(bf=>{
    bf.classList.toggle("emptyhide", plusRienAMontrer(bf));
  });
  if(typeof placeNodes==='function') requestAnimationFrame(placeNodes);
}
function applyMatch(j){
  document.querySelectorAll(".line").forEach(el=>{
    const roles=(el.dataset.r||"").split(" ");
    el.classList.toggle("match", !!j && roles.indexOf(j)>=0);
  });
}
function setJob(j){
  curJob=j;
  document.querySelectorAll("#jobs .jobchip").forEach(b=>b.classList.remove("on"));allBtn.classList.remove("on");
  if(!j){allBtn.classList.add("on");document.body.classList.remove("jobsel");}
  else{const bb=document.querySelector('#jobs .jobchip[data-j="'+j+'"]');if(bb)bb.classList.add("on");document.body.classList.add("jobsel");}
  applyMatch(j);
  try{localStorage.setItem("sortie_role", j||"");}catch(e){}
  applyFilter();
}
jobsEl.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.id==="langToggle")return;
  if(b.id==="soloToggle"){
    document.body.classList.toggle("solo");
    soloBtn.classList.toggle("on",document.body.classList.contains("solo"));
    try{localStorage.setItem("sortie_solo",document.body.classList.contains("solo")?"1":"0");}catch(e){}
    applyFilter();return;
  }
  if(b.id==="jobAll")setJob(null);
  else setJob(b.dataset.j===curJob?null:b.dataset.j);
});

// ---- sélecteur de variante de comp ----
// Construit depuis COMPO.variantes : rien de propre à Sortie ici. S'il n'y a
// qu'une façon de jouer la strat, la rangée entière disparaît.
const compEl=document.getElementById("comp");
const VARIANTES=window.SORTIE.compoVariantes(COMPO);
function buildCompSwitcher(){
  if(VARIANTES.length<2){ compEl.style.display="none"; return; }
  VARIANTES.forEach(v=>{
    const b=document.createElement("button");
    b.className="chip compchip"; b.dataset.c=v.nom; b.textContent=v.nom;
    // un job qui donne son nom à la variante lui prête sa couleur de rôle
    b.style.setProperty("--jc", jcol(v.nom));
    compEl.appendChild(b);
  });
}
function setComp(c){
  document.body.setAttribute("data-comp",c);
  compEl.querySelectorAll(".compchip").forEach(b=>b.classList.toggle("on",b.dataset.c===c));
  // les chips de job suivent : on ne propose que les jobs réellement présents
  jobsEl.querySelectorAll(".jobchip").forEach(b=>{
    b.style.display = window.SORTIE.jobExclu(COMPO,c,b.dataset.j) ? "none" : "";
  });
  try{localStorage.setItem("sortie_comp",c);}catch(e){}
  if(curJob && window.SORTIE.jobExclu(COMPO,c,curJob)) setJob(null);
  applyFilter();
}
compEl.addEventListener("click",e=>{const b=e.target.closest(".compchip");if(b)setComp(b.dataset.c);});

// ---- sélecteur d'étage (Top Floor / Sous-sol) ----
const FLOOR_MAP={}; FLOORS.forEach(f=>FLOOR_MAP[f.id]=f);
const floorEl=document.getElementById("floor");
function floorLabel(f){ return LANG==='en'?f.en:f.fr; }
function buildFloorSwitcher(){
  if(!floorEl) return;
  FLOORS.forEach(f=>{
    const b=document.createElement("button");
    b.className="chip floorchip"; b.dataset.f=f.id;
    b.innerHTML='<b>'+esc(f.sub)+'</b>'+floorLabel(f);
    floorEl.appendChild(b);
  });
}
function setFloor(id){
  const f=FLOOR_MAP[id]||FLOORS[0];
  if(floorEl) floorEl.querySelectorAll(".floorchip").forEach(b=>b.classList.toggle("on",b.dataset.f===f.id));
  try{localStorage.setItem("sortie_floor",f.id);}catch(e){}
  renderFloor(f);
  window.scrollTo({top:0,behavior:'auto'});
}
if(floorEl) floorEl.addEventListener("click",e=>{const b=e.target.closest(".floorchip");if(b)setFloor(b.dataset.f);});

// ---- sélecteur de zone (sous-sol : E / F / G / H) ----
const zoneEl=document.getElementById("zone");
function setZone(i){ curZone=i; try{localStorage.setItem("sortie_zone",i);}catch(e){} renderFloor(curFloor); window.scrollTo({top:0,behavior:'auto'}); }
if(zoneEl) zoneEl.addEventListener("click",e=>{const b=e.target.closest(".zonechip"); if(b) setZone(+b.dataset.z);});
app.addEventListener("click",e=>{const zt=e.target.closest(".zonetab"); if(zt){ e.stopPropagation(); setZone(+zt.dataset.z); }});

// ---- lightbox pour agrandir les cartes ----
const lb=document.createElement("div");lb.className="lightbox hide";lb.innerHTML='<div class="lbstage"></div>';
document.body.appendChild(lb);
const lbStage=lb.querySelector(".lbstage");
function closeLb(){lb.classList.add("hide");lbStage.innerHTML="";}
// (re)construit la carte agrandie + les onglets de zone (All/A-D ou E-H) à côté
function buildLbOv(){
  const wrap=document.querySelector('.ovmapwrap'); if(!wrap) return false;
  const ov=wrap.querySelector('.ovmap'); if(!ov) return false;
  const box=document.createElement('div'); box.className='lbovbox';
  const clone=ov.cloneNode(true);
  clone.classList.remove('mapfig'); clone.classList.add('lbov');
  box.appendChild(clone);
  const tabs=wrap.querySelector('.zonetabs');
  if(tabs){ const tc=tabs.cloneNode(true); tc.classList.add('lbtabs'); box.appendChild(tc); }
  lbStage.innerHTML=''; lbStage.appendChild(box);
  return true;
}
document.getElementById("app").addEventListener("click",e=>{
  if(e.target.closest(".zonetab")) return; // clic onglet géré ailleurs, pas de zoom
  const fig=e.target.closest(".mapfig");if(!fig)return;
  if(fig.classList.contains("ovmap")){
    if(!buildLbOv()) return;
  }else{
    const img=e.target.closest(".mapfig img")||fig.querySelector("img");if(!img)return;
    lbStage.innerHTML='<img alt="Carte agrandie" src="'+img.src+'">';
  }
  lb.classList.remove("hide");
});
lb.addEventListener("click",e=>{
  const zt=e.target.closest('.zonetab');
  if(zt){ e.stopPropagation(); setZone(+zt.dataset.z); buildLbOv(); return; } // change de zone sans fermer
  closeLb();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLb();});

// ---- barre de progression du scroll ----
const sbar=document.getElementById("sbar");
function upbar(){const h=document.documentElement;const max=h.scrollHeight-h.clientHeight;sbar.style.width=(max>0?(h.scrollTop/max*100):0)+"%";}
window.addEventListener("scroll",upbar,{passive:true});
window.addEventListener("resize",upbar);

// ---- contrôles : thème + langue ----
document.documentElement.lang=LANG;
(function(){
  const host=document.getElementById("topctl")||jobsEl;
  const themeBtn=document.createElement("button");
  themeBtn.className="chip ctlbtn"; themeBtn.id="themeToggle";
  function paintTheme(){
    var cur=document.documentElement.getAttribute("data-theme")||"dark";
    themeBtn.textContent = cur==="light" ? "☾" : "☀";
    themeBtn.title = cur==="light" ? (LANG==='en'?"Dark mode":"Passer en sombre") : (LANG==='en'?"Light mode":"Passer en clair");
  }
  paintTheme();
  themeBtn.addEventListener("click",function(){
    var cur=document.documentElement.getAttribute("data-theme")||"dark";
    var nx=cur==="light"?"dark":"light";
    document.documentElement.setAttribute("data-theme",nx);
    try{localStorage.setItem("sortie_theme",nx);}catch(e){}
    paintTheme();
    if(typeof placeNodes==='function') requestAnimationFrame(placeNodes);
  });
  host.appendChild(themeBtn);
  const langBtn=document.createElement("button");
  langBtn.className="chip ctlbtn"; langBtn.id="langToggle";
  langBtn.textContent = LANG==='en' ? 'FR' : 'EN';
  langBtn.title = LANG==='en' ? 'Passer en français' : 'Switch to English';
  langBtn.addEventListener("click",function(){ try{localStorage.setItem("sortie_lang", LANG==='en'?'fr':'en');}catch(e){} location.reload(); });
  host.appendChild(langBtn);
})();
// mesure de la hauteur du sticky pour les offsets d'ancre
(function(){
  const stick=document.querySelector(".topstick");
  function measure(){ if(stick) document.documentElement.style.setProperty("--stickh",stick.offsetHeight+"px"); }
  measure(); window.addEventListener("resize",measure);
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(measure);}
})();
// ---- l'en-tete : titre et sous-titre viennent de la strat ----
// Ils etaient ecrits en dur dans index.html, et une seconde fois en
// anglais ici meme. Un guide d'un autre contenu annoncait donc la
// composition de Sortie. Meme fonction que celle de l'export.
(function(){
  var nom = (typeof NOM!=="undefined" && NOM) ? NOM : "";
  var e = STRATR.entete(tr(nom), (typeof COMPO!=="undefined")?COMPO:null, LANG);
  var h = document.getElementById("gTitre"); if(h) h.innerHTML = e.titre;
  var b = document.getElementById("gSous");  if(b) b.innerHTML = e.sous;
  // L'onglet nomme d'abord le contenu, l'outil ensuite : un onglet se coupe par
  // la droite, et ce qu'on cherche entre dix onglets ouverts c'est « Sortie ».
  document.title = nom + (LANG==="en" ? " · Run guide" : " · Guide de run")
                       + " — XI STUDIO";
})();
if(LANG==='en'){
  document.querySelectorAll(".rlabel").forEach(function(el){
    var t=el.textContent.trim();
    if(t==="Mon rôle") el.textContent="My role";
    else if(t==="Étage") el.textContent="Floor";
  });
  var foot=document.querySelector(".foot");
  if(foot) foot.textContent="Run strategy · interactive layout · click your job to highlight your actions.";
}

// ============================================================
//  INIT
// ============================================================
buildFloorSwitcher();
buildCompSwitcher();
const NOMS_VAR=VARIANTES.map(v=>v.nom);
let initComp=NOMS_VAR[0]||"";
try{const s=localStorage.getItem("sortie_comp");if(NOMS_VAR.indexOf(s)>=0)initComp=s;}catch(e){}
setComp(initComp);

let initFloor="top";try{const s=localStorage.getItem("sortie_floor");if(s==="top"||s==="bottom")initFloor=s;}catch(e){}
try{const z=localStorage.getItem("sortie_zone");if(z!=null&&!isNaN(+z))curZone=+z;}catch(e){}
setFloor(initFloor);

try{if(localStorage.getItem("sortie_solo")==="1"){document.body.classList.add("solo");soloBtn.classList.add("on");}}catch(e){}
try{var savedRole=localStorage.getItem("sortie_role");
  // on ne restaure le job mémorisé que s'il est bien là dans la variante active
  if(savedRole){ if(window.SORTIE.compoJobs(COMPO).indexOf(savedRole)>=0 && !window.SORTIE.jobExclu(COMPO,initComp,savedRole)) setJob(savedRole); else applyFilter(); }
  else applyFilter();
}catch(e){applyFilter();}
upbar();
