/* ============================================================
   map-studio.js — moteur de l'editeur de carte (Konva)
   ------------------------------------------------------------
   Extrait de map-studio.html. Charge APRES js/data.js,
   js/sortie-map-core.js et vendor/konva.min.js, dont il depend.
   ============================================================ */
(function(){
  "use strict";

  /* ============================================================
     0 · SOCLE PARTAGÉ + constantes locales
     ============================================================ */
  const S=window.SORTIE;                          // couleurs, points, géométrie (js/sortie-map-core.js)
  if(!S){const lm=document.getElementById('loadmsg');if(lm)lm.textContent='sortie-map-core.js non chargé — ouvre le projet via un serveur (pas ce fichier HTML seul).';const sp=document.querySelector('.spin');if(sp)sp.style.display='none';return;}
  const r1=S.r1, elc=S.elHex, esc=S.escAttr;      // raccourcis les plus utilisés
  const BK=S.BAND_KONVA;                           // largeurs/couleurs de la bande des tracés (échelle canvas)
  const BASE='../', MAP=1024;

  // conversions % <-> pixels canvas (spécifiques à ce backend Konva)
  const C=v=>v/100*MAP, U=v=>v/MAP*100;
  const flatCanvas=arr=>arr.flatMap(p=>[C(p[0]),C(p[1])]);
  // opacité de couleur / largeur de bande effectives d'un tracé (défauts si non définis)
  const ra=rt=>rt.a!=null?rt.a:BK.ALPHA;
  const fsz=rt=>rt.fs!=null?rt.fs:1;

  /* ============================================================
     1 · ÉTAT
     ============================================================ */
  let FL=(typeof FLOORS!=='undefined')?FLOORS:[];
  const stageWrap=document.querySelector('.stage-wrap'), loadingEl=document.getElementById('loading'), loadmsg=document.getElementById('loadmsg');
  let stage,layer,gMap,gShapes,gRoutes,gPins,gTexts,gEdit,curIdx=0,anim=null,selNode=null,tool='select',spaceDown=false;
  let mobScale=(typeof MOBSCALE!=='undefined'&&MOBSCALE)?MOBSCALE:1;
  let labelMargin=(typeof LBLMARGIN!=='undefined'&&LBLMARGIN!=null)?LBLMARGIN:6;
  let curRoute=0,selHandleIdx=-1;
  let dirty=false;   // des modifications ne sont pas encore écrites dans data.js
  // « Marqueurs » regroupait boss, mid-boss, packs et depart sous un seul
  // interrupteur : impossible de ne regarder que les boss. Chaque type a
  // desormais le sien, et le groupe reste la pour tout eteindre d'un coup.
  /* ---------------- LE CATALOGUE DES TYPES DE MARQUEUR ----------------
     Ajouter un type demandait de toucher treize endroits, dispersés dans le
     fichier, dont aucun ne signale l'oubli. La derniere fois — les icones —
     quatre ont ete manques : coller une icone la rangeait en pack et gravait
     une creature fantome dans data.js, Ctrl+Z ne defaisait pas sa pose, et
     supprimer une carte annoncait qu'on ne perdait rien.

     Une seule entree ici, et les listes qui suivent s'en deduisent. Ce qu'une
     entree dit :
       cle      · le `kind` porte par le noeud Konva
       calque   · son libelle dans le panneau des calques
       carte    · le tableau de la carte ou il vit (null : pas un objet de la
                  carte — le depart est un champ, les numeros suivent leur boss)
       titre    · comment on le nomme dans une carte de reglages
       palette  · la categorie de la barre de pose qui le propose */
  const TYPES=[
    {cle:'boss',  calque:'Boss',             carte:'bosses', titre:'Boss',     palette:'boss'},
    {cle:'mid',   calque:'Mid-boss',         carte:'mids',   titre:'Midboss',  palette:'mid'},
    {cle:'pack',  calque:'Packs',            carte:'packs',  titre:'Pack',     palette:'pack'},
    {cle:'ico',   calque:'Icônes',           carte:'icones', titre:'Icône',    palette:'job'},
    {cle:'num',   calque:'Numéros d’ordre',  carte:null,     titre:'Numéro'},
    {cle:'start', calque:'Départ',           carte:null,     titre:'Départ'}
  ];
  const TYPE=Object.fromEntries(TYPES.map(t=>[t.cle,t]));
  // le tableau de la carte qui porte ce type — la seule table a consulter
  function tableauDe(f,cle){const t=TYPE[cle];return (t&&t.carte)?(f[t.carte]=f[t.carte]||[]):null;}
  const layerVis=Object.assign({map:true,shapes:true,routes:true,texts:true,pins:true},
                               Object.fromEntries(TYPES.map(t=>[t.cle,true])));
  const TYPES_PIN=TYPES.map(t=>[t.cle,t.calque]);
  /* Le type d'un marqueur. Attention : les pastilles numerotees des boss
     portent kind:'marker' — ce sont les ronds 1..4, deplacables a part, pas
     le depart. Les confondre affichait « Depart 4 » sur une carte qui n'a
     qu'un seul S. */
  function typePin(n){
    if(n.name()==='start')return 'start';
    const k=n._meta&&n._meta.kind;
    if(k==='marker')return 'num';
    return (TYPE[k]&&TYPE[k].carte)?k:null;   // null : l'anneau de selection
  }
  // Phase 3 : création de marqueurs depuis une palette d'images
  let armedPin=null,palCat='boss';
  let tirePal=null;    // ce qu'on est en train de glisser depuis la palette
  let armedShape=null;   // 'rect' | 'ell' | {src} : ce que les outils Formes / Image vont poser
  let lastPh=1;   // dernière phase choisie pour un pack — reprise à la création suivante
  /* ---------------- ce qu'on peut poser SUR cette carte ----------------
     Les dix-huit noms de mobs de Sortie vivaient ici, en dur, dans un atelier
     qui est pourtant cense ignorer ce qu'on ecrit avec lui : preparer une strat
     pour un autre donjon obligeait a editer le moteur. Ils sont maintenant dans
     data.js, portes par la carte — c'est elle qui sait quelles creatures on y
     rencontre, pas l'outil.

     Le filet reste le meme : une image que le roster ne classe pas est proposee
     partout plutot qu'invisible, et une carte SANS roster propose tout ce que
     MOB connait. Une carte neuve n'a donc rien a declarer pour etre utilisable. */
  function rosterCarte(){const c=REG[(FL[curIdx]||{}).carte];return (c&&c.roster)||null;}
  function rosterFor(cat,MOBimg){
    const r=rosterCarte();
    const tous=Object.keys(MOBimg);
    if(!r)return tous;                                  // rien de declare : tout est propose
    const classes=new Set([].concat(r.boss||[],r.mid||[],r.pack||[]));
    const base=(r[cat]||[]).filter(n=>MOBimg[n]);
    if(cat!=='pack')return base;
    // un pack non classe reste visible : c'est le filet, et il a deja servi
    return base.concat(tous.filter(n=>!classes.has(n)));}
  const pinSize=S.poiSize;                        // tailles des marqueurs : socle partagé

  const imgCache={};
  function loadImg(src){return new Promise(res=>{if(imgCache[src])return res(imgCache[src]);const im=new Image();im.onload=()=>{imgCache[src]=im;res(im);};im.onerror=()=>res(null);im.src=src;});}
  const draw=()=>layer.batchDraw();

  /* ============================================================
     2 · SCÈNE (Konva : zoom, pan, ajuster)
     ============================================================ */
  function initStage(){
    stage=new Konva.Stage({container:'stage',width:Math.max(1,stageWrap.clientWidth),height:Math.max(1,stageWrap.clientHeight),draggable:false});
    layer=new Konva.Layer();stage.add(layer);
    stage.on('wheel',e=>{e.evt.preventDefault();const old=stage.scaleX(),pt=stage.getPointerPosition();
      const m={x:(pt.x-stage.x())/old,y:(pt.y-stage.y())/old},dir=e.evt.deltaY>0?-1:1,ns=Math.max(.12,Math.min(6,old*(dir>0?1.08:1/1.08)));
      stage.scale({x:ns,y:ns});stage.position({x:pt.x-m.x*ns,y:pt.y-m.y*ns});updateZoom();});
    stage.on('mousemove',()=>{const p=stage.getPointerPosition();if(!p)return;
      document.getElementById('coords').textContent='x '+U((p.x-stage.x())/stage.scaleX()).toFixed(1)+'  ·  y '+U((p.y-stage.y())/stage.scaleY()).toFixed(1);});
    stage.on('mousedown',e=>{ if(spaceDown||e.target!==stage)return;
      if(mapEd){closeMapEdit();return;}          // clic ailleurs = valide l'édition, garde la sélection
      if(tool==='select')select(null); });
    stage.on('dragmove',()=>{if(mapEd)positionMapEdit();if(mapPanel)positionMapPanel();}); // suit le pan pendant l'édition sur carte
    /* ---- tracé au glisser : on dessine la forme à sa taille, comme dans un logiciel de dessin.
       Un simple clic (déplacement sous le seuil) pose la taille par défaut, pour ne pas obliger
       à viser. Maj contraint au carré / cercle. ---- */
    let trace=null,traceGhost=null;
    const pointCarte=()=>{const p=stage.getPointerPosition();if(!p)return null;
      return {x:U((p.x-stage.x())/stage.scaleX()),y:U((p.y-stage.y())/stage.scaleY())};};
    stage.on('mousedown touchstart',e=>{
      if(spaceDown||!(tool==='shape'||tool==='image')||!armedShape)return;
      const q=pointCarte();if(!q||q.x<0||q.x>100||q.y<0||q.y>100)return;
      trace={x0:q.x,y0:q.y,x1:q.x,y1:q.y};
      traceGhost=new Konva.Rect({x:C(q.x),y:C(q.y),width:0,height:0,
        stroke:'#54d1c4',strokeWidth:2,dash:[7,5],fill:'rgba(84,209,196,.10)',listening:false});
      gEdit.add(traceGhost);draw();});
    stage.on('mousemove touchmove',e=>{
      if(!trace)return;const q=pointCarte();if(!q)return;
      trace.x1=S.clamp(q.x);trace.y1=S.clamp(q.y);
      let w=trace.x1-trace.x0,h=trace.y1-trace.y0;
      if(e.evt&&e.evt.shiftKey){const m=Math.max(Math.abs(w),Math.abs(h));w=Math.sign(w||1)*m;h=Math.sign(h||1)*m;}
      traceGhost.position({x:C(Math.min(trace.x0,trace.x0+w)),y:C(Math.min(trace.y0,trace.y0+h))});
      traceGhost.size({width:C(Math.abs(w)),height:C(Math.abs(h))});
      const hint=document.getElementById('ar_hint');
      if(hint)hint.innerHTML='<b>'+r1(Math.abs(w))+' × '+r1(Math.abs(h))+' %</b> — relâche pour poser. <b>Maj</b> contraint au carré.';
      draw();});
    stage.on('mouseup touchend',e=>{
      if(!trace)return;const t=trace,g=traceGhost;trace=null;traceGhost=null;
      if(g)g.destroy();draw();
      let w=t.x1-t.x0,h=t.y1-t.y0;
      if(e.evt&&e.evt.shiftKey){const m=Math.max(Math.abs(w),Math.abs(h));w=Math.sign(w||1)*m;h=Math.sign(h||1)*m;}
      const cx=t.x0+w/2, cy=t.y0+h/2;
      const petit=Math.abs(w)<1.5||Math.abs(h)<1.5;      // simple clic : taille par défaut
      const dims=petit?null:{w:r1(Math.abs(w)),h:r1(Math.abs(h))};
      if(tool==='image')createShape('img',petit?t.x0:cx,petit?t.y0:cy,armedShape.src,dims);
      else createShape(armedShape,petit?t.x0:cx,petit?t.y0:cy,null,dims);});
    stage.on('click tap',e=>{ if(spaceDown)return; const nm=e.target.name&&e.target.name();
      const p=stage.getPointerPosition();if(!p)return;const mx=U((p.x-stage.x())/stage.scaleX()),my=U((p.y-stage.y())/stage.scaleY());
      if(tool==='path'){ if(nm==='phandle'||nm==='phit')return; if(mx<0||mx>100||my<0||my>100)return; addRoutePoint(mx,my); return; }
      if(tool==='pin'&&armedPin){ if(nm==='pin'||nm==='marker')return; if(mx<0||mx>100||my<0||my>100)return; placePin(armedPin.kind,armedPin.name,mx,my); return; }
      if(tool==='pipette'){ pickColorAt(p); return; }
      if(tool==='text'){ if(nm==='text')return; if(mx<0||mx>100||my<0||my>100)return; createText(mx,my); } });
    /* Le depot sur la carte. On passe par setPointersPositions pour que Konva
       traduise l'evenement DOM dans ses coordonnees a lui : zoom et deplacement
       de la vue sont ainsi pris en compte, comme pour un clic. */
    const zone=stage.container();
    zone.addEventListener('dragover',e=>{ if(!tirePal)return;
      e.preventDefault(); try{e.dataTransfer.dropEffect='copy';}catch(_){} });
    zone.addEventListener('drop',e=>{ if(!tirePal)return; e.preventDefault();
      const d=tirePal; tirePal=null;
      stage.setPointersPositions(e);
      const q=stage.getPointerPosition(); if(!q)return;
      const dx=U((q.x-stage.x())/stage.scaleX()), dy=U((q.y-stage.y())/stage.scaleY());
      if(dx<0||dx>100||dy<0||dy>100)return;      // lache a cote de la carte : sans effet
      placePin(d.kind,d.name,dx,dy); });

    // pinch-zoom + pan à deux doigts (tactile mobile/tablette)
    let _pd=0,_pc=null;
    stage.on('touchmove',ev=>{const t=ev.evt.touches;if(!(t&&t.length>=2))return;ev.evt.preventDefault();
      if(stage.isDragging())stage.stopDrag();
      const r=stage.container().getBoundingClientRect();
      const p1={x:t[0].clientX-r.left,y:t[0].clientY-r.top},p2={x:t[1].clientX-r.left,y:t[1].clientY-r.top};
      const d=Math.hypot(p1.x-p2.x,p1.y-p2.y),c={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2};
      if(!_pd){_pd=d;_pc=c;return;}
      const old=stage.scaleX(),rel={x:(c.x-stage.x())/old,y:(c.y-stage.y())/old},ns=Math.max(.12,Math.min(6,old*d/_pd));
      stage.scale({x:ns,y:ns});stage.position({x:c.x-rel.x*ns+(c.x-_pc.x),y:c.y-rel.y*ns+(c.y-_pc.y)});
      _pd=d;_pc=c;updateZoom();});
    stage.on('touchend',ev=>{if(!ev.evt.touches||ev.evt.touches.length<2){_pd=0;_pc=null;}});
    /* resize : jamais 0 (Konva plante sinon), puis on RÉTABLIT le cadrage.
       C'était un re-fit : revenir à l'onglet Carte — ce qui déclenche un
       resize — recadrait sur l'étage entier, et on reperdait le zoom qu'on
       venait de prendre pour placer un marqueur au pixel près. Sans cadrage
       retenu, `reprendVue` fait le fit d'origine. */
    let _rz;window.addEventListener('resize',()=>{stage.width(Math.max(1,stageWrap.clientWidth));stage.height(Math.max(1,stageWrap.clientHeight));clearTimeout(_rz);_rz=setTimeout(reprendVue,160);});
  }
  function updateZoom(){document.getElementById('zoomLbl').textContent='Zoom '+Math.round(stage.scaleX()*100)+' %';if(mapEd)positionMapEdit();if(mapPanel)positionMapPanel();noteVueBientot();}
  /* Le cadrage appartient a la carte qu'on regarde, pas a la session.
     Enregistrer peut faire recharger la page — et on repartait cadre sur la
     carte entiere, alors qu'on travaillait zoome dans un coin. Chaque carte
     retient donc le sien. */
  const VUES='studio_vues';let tVue=null;
  const ZMIN=.12, ZMAX=6;                       // les bornes de la molette
  /* La scene n'est mesurable que si elle est VISIBLE. Quand l'atelier ouvre sur
     l'onglet Strategie, la carte naît dans un panneau masque : elle mesure 0, et
     le cadrage calcule la-dessus vaut un zoom de 0,1 %. Le retenir, puis le
     rappliquer en revenant sur la carte, donnait une carte « qui ne charge
     plus » — elle etait la, grande comme un point. On ne retient donc rien tant
     qu'on ne voit rien, et on se mefie d'un cadrage hors des bornes. */
  function mesurable(){return stageWrap.clientWidth>40 && stageWrap.clientHeight>40;}
  function vues(){try{return JSON.parse(localStorage.getItem(VUES)||'{}');}catch(e){return {};}}
  function noteVueBientot(){clearTimeout(tVue);tVue=setTimeout(noteVue,300);}
  function noteVue(){if(!stage||!mesurable())return;const nom=(FL[curIdx]||{}).carte;if(!nom)return;
    const s=stage.scaleX();if(!(s>=ZMIN&&s<=ZMAX))return;
    const v=vues();v[nom]={s:s,x:stage.x(),y:stage.y()};
    try{localStorage.setItem(VUES,JSON.stringify(v));}catch(e){}}
  // le cadrage retenu, ou la carte entiere si on ne le connait pas — ou s'il est
  // hors de ce que la molette permet, donc qu'il ne vient pas d'un geste
  // …et d'un cadrage qui laisse la carte entierement hors de l'ecran : une
  // fenetre redimensionnee, un cadrage venu d'un autre poste, et on ouvre sur
  // du vide sans savoir qu'il suffirait de recadrer.
  function seVoit(v){const W=stageWrap.clientWidth,H=stageWrap.clientHeight,c=MAP*v.s;
    return v.x<W && v.y<H && v.x+c>0 && v.y+c>0;}
  function reprendVue(){const v=vues()[(FL[curIdx]||{}).carte];
    if(!mesurable()||!v||!(v.s>=ZMIN&&v.s<=ZMAX)||!seVoit(v)){fit();return;}
    stage.scale({x:v.s,y:v.s});stage.position({x:v.x,y:v.y});updateZoom();}
  function fit(){const W=Math.max(1,stageWrap.clientWidth),H=Math.max(1,stageWrap.clientHeight),pad=Math.min(64,W*.06,H*.06),w=Math.max(1,W-pad*2),h=Math.max(1,H-pad*2),s=Math.min(w/MAP,h/MAP);
    stage.scale({x:s,y:s});stage.position({x:(W-MAP*s)/2,y:(H-MAP*s)/2});updateZoom();}
  function setPanMode(on){stage.draggable(on);stage.container().style.cursor=on?'grab':'default';}
  // anim du flux : ne tourne que si l'onglet est visible, le calque Tracés visible, et qu'un flux existe
  function animShouldRun(){return !document.hidden && layerVis.routes && gRoutes && gRoutes.find('.flow').length>0;}
  function updateAnim(){if(!anim)return;if(animShouldRun()){if(!anim.isRunning())anim.start();}else if(anim.isRunning())anim.stop();}

  /* ============================================================
     3 · RENDU D'UN ÉTAGE
     ============================================================ */
  /* Deux rendus qui se chevauchaient se marchaient dessus.

     rendEtage est asynchrone — il attend le fond de carte, puis CHAQUE vignette
     de mob — et il réaffecte gMap, gPins… au début. Qu'un second rendu parte
     pendant qu'un premier attend, et le premier continue d'ajouter ses
     marqueurs dans les groupes du second : la carte portait alors chaque boss
     en double. Ça se voyait au démarrage, parce que la coque recharge la strat
     pendant que boot dessine déjà. Changer de carte remettait tout d'aplomb —
     un rendu seul, sans personne pour lui passer devant.

     On les met à la queue leu leu, et on saute celui qu'une demande plus
     récente a déjà périmé : seul le dernier étage demandé se dessine. */
  let rendDemande=0, rendFile=Promise.resolve();
  // vrai pendant qu'on change de chapitre : l'historique du chapitre d'arrivée
  // n'existe pas encore, et annuler y rejouerait celui qu'on vient de quitter
  let enRoute=false;
  function renderFloor(idx){
    const moi=++rendDemande;
    rendFile=rendFile.catch(()=>{}).then(()=>(moi===rendDemande)?rendEtage(idx):undefined);
    return rendFile;
  }
  /* Le voile de chargement s'allume ici et s'éteignait TOUT EN BAS. Entre les
     deux : le fond, les formes, les tracés, les marqueurs, les icônes, les
     textes. Rien n'était gardé, et personne n'attrapait la promesse — boot()
     appelle renderFloor(0) sans .catch, et la file ne rattrape que pour laisser
     passer le rendu SUIVANT.
     Une strat reçue dont un champ n'a pas la forme attendue laissait donc le
     lead devant le voile et le spinner, pour toujours. Aucun toast, aucun
     message, la seule trace dans une console qu'il n'ouvre pas. Il rechargeait,
     même résultat, puisque la strat vient de la bibliothèque.
     Le voile ne s'éteint donc plus depuis le fond du dessin, mais ICI, après
     le try : quel que soit le chemin pris, on repasse par cette ligne. Et
     quand ça échoue, le catch écrit la panne à l'endroit même où la carte
     aurait dû s'afficher. */
  async function rendEtage(idx){
    try{ await rendEtageOuPanne(idx); }
    catch(e){
      if(window.console) console.error(e);
      loadmsg.innerHTML = '<b>Cette carte n’a pas pu s’afficher.</b><br>'
        + 'Sa strat contient quelque chose que l’atelier ne sait pas relire. '
        + 'Change de chapitre, ou rouvre une autre strat depuis la bibliothèque.';
      loadmsg.style.maxWidth='34em';loadmsg.style.textAlign='center';loadmsg.style.lineHeight='1.5';
      return;   // on sort AVANT la ligne qui éteint : le voile reste, et il explique
    }
    loadingEl.style.display='none';
  }
  async function rendEtageOuPanne(idx){
    curIdx=idx;armedPin=null;armedShape=null;select(null);const f=FL[idx];if(!f)return;
    majSelCarte();
    loadingEl.style.display='flex';loadmsg.textContent='Chargement de la carte…';
    loadmsg.style.maxWidth='';loadmsg.style.textAlign='';loadmsg.style.lineHeight='';
    layer.destroyChildren();if(anim){anim.stop();anim=null;}
    gMap=new Konva.Group();gShapes=new Konva.Group();gRoutes=new Konva.Group();gPins=new Konva.Group();gTexts=new Konva.Group();gEdit=new Konva.Group();
    layer.add(gMap,gShapes,gRoutes,gPins,gTexts,gEdit);   // les formes se posent SOUS les traces et les marqueurs
    const mimg=f.map?await loadImg(BASE+f.map):null;   // une carte neuve n'a pas encore de fond
    if(mimg)gMap.add(new Konva.Image({image:mimg,width:MAP,height:MAP,cornerRadius:6,listening:false}));
    else gMap.add(new Konva.Rect({width:MAP,height:MAP,fill:'#e9d9b0',cornerRadius:6}));
    gMap.add(new Konva.Rect({width:MAP,height:MAP,stroke:'#3a5170',strokeWidth:1.5,cornerRadius:6,listening:false}));

    for(const o of (f.shapes||[]))await addShape(o);

    const routes=(f.routes&&f.routes.length)?f.routes:[];
    routes.forEach(rt=>{rt._pts=S.parsePts(rt.points);makeRouteLines(rt);});
    if(f.start)gPins.add(startMarker(f.start));

    const MOBimg=(typeof MOB!=='undefined')?MOB:{};
    const jobs=[];(f.packs||[]).forEach(o=>jobs.push({kind:'pack',o}));(f.mids||[]).forEach(o=>jobs.push({kind:'mid',o}));(f.bosses||[]).forEach(o=>jobs.push({kind:'boss',o}));
    for(const j of jobs){await addPin(j.kind,j.o,pinSize(j.kind),MOBimg);}
    for(const o of (f.icones||[]))await addIcone(o);
    (f.texts||[]).forEach(o=>addText(o));

    applyVis();
    anim=new Konva.Animation(fr=>{const d=fr.time/1000*20;gRoutes.find('.flow').forEach(l=>{const dd=l.dash(),per=(dd[0]+dd[1])||24.5;l.dashOffset(-(d%per));});},layer);updateAnim();
    setToolMode();reprendVue();buildLayers();
  }
  /* ---------- les ICÔNES : un job, ou un marqueur générique ----------
     Un AUTOCOLLANT : le dessin a la couleur de son rôle, cerné de blanc, posé
     sur la carte avec une ombre. Un seul jeu d'images sert pour les 22 jobs et
     les 13 marqueurs — la couleur vient du jeton, pas du fichier. */
  const ICO_SIZE=S.poiSize('ico');      // la meme valeur que le guide, tenue par le socle
  const ICOCACHE={};
  // Les 35 icônes sont des silhouettes blanches sur transparent. On les garde
  // en mémoire — la même icône sert souvent plusieurs fois sur une carte.
  function icoImg(ico){
    const src=S.icoSrc(ico);if(!src)return Promise.resolve(null);
    if(!ICOCACHE[ico])ICOCACHE[ico]=loadImg(BASE+src);
    return ICOCACHE[ico];
  }

  /* L'autocollant lui-même, composé une fois par (icône, couleur) puis gardé.
     Le guide obtient son contour d'un filtre SVG ; Konva dessine sur une toile
     et n'en a pas. On le retrouve en reposant la silhouette tout autour d'elle-
     même, sur assez de directions pour que le bord soit rond et non hérissé —
     à huit, un emblème de job sort en fourrure.
     On compose sur une TOILE et non dans une image fabriquée : relire les
     pixels d'une image locale est interdit quand l'atelier est ouvert depuis un
     fichier, et il doit s'ouvrir hors ligne. */
  /* Le cache est BORNE : la couleur vient d'un selecteur qui previent a chaque
     mouvement du curseur, et chaque teinte laisse deux toiles de 256x256. Une
     seance de reglage en produisait des dizaines, gardees pour toujours —
     l'onglet gonflait de plusieurs mega-octets sans que rien ne le libere.
     Au-dela de la limite, on oublie les plus anciennes : ce sont les teintes
     qu'on a traversees en glissant, pas celles qu'on a choisies. */
  const COLLE=new Map(), COLLE_REF=256, COLLE_DIRS=36, COLLE_MAX=48;
  function icoColle(ico,col,bord){
    const cle=ico+'|'+col+'|'+bord;
    if(COLLE.has(cle)){
      const v=COLLE.get(cle);COLLE.delete(cle);COLLE.set(cle,v);   // la plus recemment servie passe en queue
      return v;
    }
    const p=icoImg(ico).then(im=>im?composeColle(im,col,bord):null);
    COLLE.set(cle,p);
    while(COLLE.size>COLLE_MAX)COLLE.delete(COLLE.keys().next().value);
    return p;
  }
  function composeColle(im,col,bord){
    const R=COLLE_REF, r=R*S.ICO_BORD, place=R*S.ICO_PART;
    // le dessin, à l'échelle qui le fait tenir dans la part qui lui revient :
    // le reste du jeton appartient au contour
    const k=place/Math.max(im.width,im.height), w=im.width*k, h=im.height*k;
    const x=(R-w)/2, y=(R-h)/2;
    const c=document.createElement('canvas');c.width=R;c.height=R;
    const g=c.getContext('2d');
    for(let i=0;i<COLLE_DIRS;i++){
      const a=i/COLLE_DIRS*2*Math.PI;
      g.drawImage(im, x+Math.cos(a)*r, y+Math.sin(a)*r, w, h);
    }
    // tout ce qui a été posé devient le contour, d'un bloc
    g.globalCompositeOperation='source-in';
    g.fillStyle=bord;g.fillRect(0,0,R,R);
    g.globalCompositeOperation='source-over';
    // puis le dessin par-dessus, à la couleur du rôle
    const c2=document.createElement('canvas');c2.width=R;c2.height=R;
    const g2=c2.getContext('2d');
    g2.drawImage(im,x,y,w,h);
    g2.globalCompositeOperation='source-in';
    g2.fillStyle=col;g2.fillRect(0,0,R,R);
    g.drawImage(c2,0,0);
    return c;
  }
  /* La carte se dessine sur une toile, mais la PALETTE est du HTML : elle
     montre l'autocollant tel qu'il se posera, et son contour lui vient donc
     d'un filtre SVG, comme dans le guide. Le socle les trace tous les deux, si
     bien que la barre, la carte et le guide s'accordent sans se recopier. */
  function poseFiltres(){
    if(document.getElementById(S.icoFiltreId(S.ICO_CONTOUR_DEF)))return;
    const filtres=Object.keys(S.ICO_CONTOURS)
      .map(b=>S.icoFiltre(S.icoFiltreId(b),S.ICO_CONTOURS[b])).join('');
    const d=document.createElement('div');
    d.innerHTML='<svg width="0" height="0" aria-hidden="true" focusable="false"'
      +' style="position:absolute">'+filtres+'</svg>';
    document.body.appendChild(d.firstChild);
  }
  poseFiltres();
  // L'ombre qui pose l'autocollant sur la carte : le fond de Sortie est beige
  // clair, un contour blanc seul s'y noierait. Elle suit la taille du jeton.
  function ombreColle(node,d){
    const O=S.ICO_OMBRE;
    node.shadowColor('#000');node.shadowBlur(d*O.flou);
    node.shadowOffsetY(d*O.dy);node.shadowOpacity(O.alpha);
  }
  function icoDiam(o){return MAP*ICO_SIZE*mobScale*S.icoT(o);}
  async function addIcone(o){
    const cible=gPins,col=o.c||'#8a94a6',d=icoDiam(o);
    if(o.name==null)o.name=S.icoNom(o.ico);   // ce que le label affiche par défaut
    const g=new Konva.Group({x:C(o.x),y:C(o.y),name:'pin'});g._meta={kind:'ico',o};g._base=ICO_SIZE;
    // L'autocollant est déjà composé, contour compris : il occupe TOUT le
    // jeton, là où la silhouette d'avant se logeait dans un disque.
    const im=await icoColle(o.ico,col,S.icoBordHex(o));
    if(im){
      const ki=new Konva.Image({image:im,width:d,height:d,offsetX:d/2,offsetY:d/2,listening:false});
      ombreColle(ki,d);
      g.add(ki);g._ico=ki;}
    const hit=Math.max(d,34);
    g.add(new Konva.Rect({width:hit,height:hit,offsetX:hit/2,offsetY:hit/2,fill:'transparent'}));
    g._iw=d;g._ih=d;
    const lbl=pinLabel(o,col);g.add(lbl);g._lbl=lbl;placeLabel(g);if(o.hl)lbl.visible(false);
    wireHover(g);
    g.on('click tap',e=>{e.cancelBubble=true;if(mapEd&&mapEd.cfg.o===o)return;if(selNode===g)editLabelOnMap(o);else select(g);});
    g.on('dragmove',()=>{o.x=r1(U(g.x()));o.y=r1(U(g.y()));liveUpdate();});
    g.on('dragend',commit);
    cible.add(g);
  }
  // Redonne a une icone son diametre : l'autocollant, son ombre et la place du
  // label. Sert au curseur de taille comme a l'echelle globale des vignettes.
  function retailleIco(o,g){
    g=g||pinNode(o); if(!g)return;
    const d=icoDiam(o);
    if(g._ico){g._ico.width(d);g._ico.height(d);g._ico.offsetX(d/2);g._ico.offsetY(d/2);
      ombreColle(g._ico,d);}
    const hit=g.findOne('Rect'); if(hit){const c=Math.max(d,34);
      hit.width(c);hit.height(c);hit.offsetX(c/2);hit.offsetY(c/2);}
    g._iw=d;g._ih=d;placeLabel(g);
    if(selNode===g)drawRing(g);
    draw();}
  /* la couleur est libre (un hex), pas le vocabulaire `el` des boss et des packs :
     les douze éléments n'ont pas de jaune, et un job buff en a besoin.
     Elle teint le DESSIN lui-même, tout comme le choix du contour le change :
     dans les deux cas il faut recomposer l'autocollant — le temps que ça prend,
     c'est un cache qui le paie, pas le lead. */
  function recolorIco(o){const g=pinNode(o);if(!g)return;const col=o.c||'#8a94a6';
    if(g._lbl&&g._lbl._bg)g._lbl._bg.stroke(col);
    if(g._ico)icoColle(o.ico,col,S.icoBordHex(o)).then(im=>{
      if(im&&g._ico){g._ico.image(im);draw();}});
    draw();}

  function startMarker(s){const g=new Konva.Group({x:C(s.x),y:C(s.y),listening:false,name:'start'});
    g.add(new Konva.Circle({radius:20,fill:BK.INK}),new Konva.Circle({radius:18.5,fill:BK.CREAM}),new Konva.Circle({radius:15,fill:'#3f86d6'}));
    g.add(new Konva.Text({text:s.l||'S',fontFamily:'JetBrains Mono',fontStyle:'bold',fontSize:18,fill:'#fff',width:40,height:40,align:'center',verticalAlign:'middle',offsetX:20,offsetY:20}));return g;}

  /* ============================================================
     4 · MARQUEURS (pins / midboss / boss) + numéro (rond numéroté des boss)
     ============================================================ */
  // câblage commun sélection + curseurs (identique pour marqueurs et numéros)
  function wireHover(g){
    g.on('mouseenter',()=>{if(tool==='select'&&!spaceDown)stage.container().style.cursor='move';});
    g.on('mouseleave',()=>{stage.container().style.cursor=(tool==='pan'||spaceDown)?'grab':'default';});
  }
  async function addPin(kind,o,sizeFrac,MOBimg){
    // Le groupe d'accueil est retenu AVANT d'attendre la vignette : si un autre
    // etage se dessine pendant ce temps, gPins ne designe plus le meme groupe,
    // et le marqueur irait se poser sur la carte d'a cote. Ajoute au groupe
    // d'origine — detruit entre-temps — il disparait simplement, et le prochain
    // rendu le redessine au bon endroit depuis la donnee, qui est intacte.
    const cible=gPins;
    const col=elc(o.el);
    const g=new Konva.Group({x:C(o.x),y:C(o.y),name:'pin',opacity:kind==='mid'?.8:1});g._meta={kind,o};g._base=sizeFrac;
    const src=MOBimg[o.name]?BASE+MOBimg[o.name]:null,im=src?await loadImg(src):null;let iw,ih;
    if(kind==='mid')g.add(new Konva.Circle({radius:MAP*sizeFrac*mobScale*.75,stroke:col,strokeWidth:1.4,dash:[5,5],opacity:.45,listening:false}));
    if(im){const nat=Math.max(im.width,im.height),s=(MAP*sizeFrac*mobScale)/nat;iw=im.width*s;ih=im.height*s;
      g.add(new Konva.Image({image:im,width:iw,height:ih,offsetX:iw/2,offsetY:ih/2,shadowColor:col,shadowBlur:10,shadowOpacity:.55,listening:false}));}
    else{iw=ih=MAP*sizeFrac*mobScale;g.add(new Konva.Circle({radius:ih/2,fill:'#243247',stroke:col,strokeWidth:2}));}
    g.add(new Konva.Rect({width:Math.max(iw,34),height:Math.max(ih,34),offsetX:Math.max(iw,34)/2,offsetY:Math.max(ih,34)/2,fill:'transparent'}));
    const lbl=pinLabel(o,col);g.add(lbl);g._lbl=lbl;g._ih=ih;g._iw=iw;placeLabel(g);if(o.hl)lbl.visible(false);
    wireHover(g);
    // clic = sélectionne · re-clic (déjà sélectionnée) = éditer le label sur la carte
    // clic = sélectionne (carte de propriétés) · re-clic (déjà sélectionné) = éditer le label sur la carte
    g.on('click tap',e=>{e.cancelBubble=true;if(mapEd&&mapEd.cfg.o===o)return;if(selNode===g)editLabelOnMap(o);else select(g);});
    g.on('dragmove',()=>{o.x=r1(U(g.x()));o.y=r1(U(g.y()));liveUpdate();});
    g.on('dragend',commit);
    cible.add(g);
    if(kind==='boss'&&o.nx!=null)addMarker(o,col,cible);   // sa pastille suit le meme groupe
  }
  // texte du label : label perso s'il existe, sinon nom (+ quantité du pack quand pas de label perso)
  // source du label : HTML enrichi perso (o.label) sinon le nom en gras (+ quantité)
  function labelSource(o){const custom=(o.label!=null&&String(o.label).trim());
    if(custom)return o.label;
    return '<b>'+esc(o.name)+((o.q)?'  '+esc(o.q):'')+'</b>';}
  // label = groupe : fond + runs stylés (mêmes outils de texte que l'outil Texte)
  function pinLabel(o,col){const l=new Konva.Group({listening:false});
    const bg=new Konva.Rect({fill:'rgba(9,13,18,.86)',cornerRadius:6,stroke:col,strokeWidth:1.4});
    l.add(bg);l._bg=bg;l._runs=[];buildLabelContent(l,o);return l;}
  function buildLabelContent(l,o){(l._runs||[]).forEach(n=>n.destroy());l._runs=[];
    const fs=15,pad=6,lh=fs*1.3;
    const parsed=S.parseRich(labelSource(o));
    const rows=parsed.map(ln=>{const segs=[];if(ln.prefix)segs.push({t:ln.prefix});(ln.runs||[]).forEach(r=>segs.push(r));const rr=makeRunNodes(segs,fs,'JetBrains Mono','#fff',{});return {rr:rr,al:ln.align||'l'};});
    let w=0;rows.forEach(r=>{w=Math.max(w,r.rr.w);});const totalH=rows.length*lh;
    rows.forEach((row,i)=>{const al=row.al;let cx=pad;if(al==='c')cx=pad+(w-row.rr.w)/2;else if(al==='r')cx=pad+(w-row.rr.w);
      row.rr.nodes.forEach(t=>{t.position({x:cx,y:pad+i*lh+(lh-fs)/2});l.add(t);l._runs.push(t);cx+=t._w;});});
    const bw=w+pad*2,bh=totalH+pad*2;l._bg.width(bw);l._bg.height(bh);l._w=bw;l._h=bh;l._bg.moveToBottom();}
  // place le label autour de l'image selon o.lp (top/bottom/left/right) avec la marge globale
  function placeLabel(g){const lbl=g._lbl;if(!lbl)return;const w=lbl._w||lbl.width(),h=lbl._h||lbl.height(),iw=g._iw||30,ih=g._ih||30,m=S.labelGap(labelMargin),lp=(g._meta.o.lp||'bottom');
    if(lp==='top'){lbl.position({x:0,y:-(ih/2+m)});lbl.offset({x:w/2,y:h});}
    else if(lp==='left'){lbl.position({x:-(iw/2+m),y:0});lbl.offset({x:w,y:h/2});}
    else if(lp==='right'){lbl.position({x:iw/2+m,y:0});lbl.offset({x:0,y:h/2});}
    else{lbl.position({x:0,y:ih/2+m});lbl.offset({x:w/2,y:0});}}
  function replaceAllLabels(){if(gPins)gPins.getChildren().forEach(n=>{if(n.name()==='pin')placeLabel(n);});draw();}
  function addMarker(o,col,cible){const R=21;const g=new Konva.Group({x:C(o.nx),y:C(o.ny),name:'marker'});g._meta={kind:'marker',o};
    g.add(new Konva.Circle({radius:R,fill:BK.INK}),new Konva.Circle({radius:R-1.5,fill:BK.CREAM}),new Konva.Circle({radius:R-4.5,fill:col,shadowColor:col,shadowBlur:8,shadowOpacity:.5}));
    g.add(new Konva.Text({text:String(o.n),fontFamily:'JetBrains Mono',fontStyle:'bold',fontSize:20,fill:'#fff',width:R*2,height:R*2,align:'center',verticalAlign:'middle',offsetX:R,offsetY:R,shadowColor:'#000',shadowBlur:2,shadowOpacity:.5}));
    wireHover(g);
    g.on('click tap',e=>{e.cancelBubble=true;select(g);});
    g.on('dragmove',()=>{o.nx=r1(U(g.x()));o.ny=r1(U(g.y()));liveUpdate();});
    g.on('dragend',commit);
    o._mk=g;(cible||gPins).add(g);}

  function setToolMode(){const drag=(tool==='select'&&!spaceDown);
    // marqueurs cliquables/déplaçables en Sélection (et cliquables en Navigation) ; en Tracé/Marqueur/Texte les clics vont à la scène
    if(gPins){gPins.getChildren().forEach(n=>{if(n.name()==='pin'||n.name()==='marker')n.draggable(drag);});gPins.listening(tool==='select'||tool==='pan');}
    if(gTexts){gTexts.getChildren().forEach(n=>{if(n.name()==='text')n.draggable(drag);});gTexts.listening(tool==='select'||tool==='pan'||tool==='text');}
    if(gShapes){gShapes.getChildren().forEach(n=>n.draggable(drag));gShapes.listening(tool==='select'||tool==='pan');}
    if(!drag)detachTransformer(); else if(selNode&&selNode._meta&&selNode._meta.kind==='shape')attachTransformer(selNode);
    setPanMode(tool==='pan'||spaceDown);
    if((tool==='path'||tool==='text')&&!spaceDown)stage.container().style.cursor='crosshair';
    else if(tool==='pipette'&&!spaceDown)stage.container().style.cursor='cell';
    else if((tool==='shape'||tool==='image')&&!spaceDown)stage.container().style.cursor=armedShape?'crosshair':'default';
    else if(tool==='pin'&&!spaceDown)stage.container().style.cursor=armedPin?'crosshair':'default';
    const _m=(tool==='pan'||spaceDown)?['<path d="M8 13V5.5a1.5 1.5 0 013 0V12m0-1v-1.5a1.5 1.5 0 013 0V12m0-.5a1.5 1.5 0 013 0V16a5 5 0 01-5 5h-1.6a5 5 0 01-3.5-1.5L5 16.5"/>','Navigation']
      :(tool==='pin'?['<circle cx="12" cy="10" r="3"/><path d="M12 21c5-5.5 7-8.5 7-11a7 7 0 10-14 0c0 2.5 2 5.5 7 11z"/>','Placer un marqueur']
      :tool==='path'?['<path d="M4 20l6-11 5 4 5-9"/><circle cx="4" cy="20" r="1.6"/><circle cx="20" cy="4" r="1.6"/>','Tracer un chemin']
      :tool==='text'?['<path d="M5 6h14M12 6v13M9 19h6"/>','Ajouter du texte']
      :tool==='shape'?['<rect x="4" y="4" width="7" height="7" rx="1"/><circle cx="16.5" cy="16.5" r="3.5"/>','Poser une forme']
      :tool==='image'?['<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-9 9"/>','Poser une image']
      :tool==='pipette'?['<path d="M14 6l4 4M18 2l4 4-3 3-4-4zM14 6L5 15v4h4l9-9"/>','Prelever une couleur']
      :['<path d="M4 3l7 17 2.5-6.5L20 11z"/>','Déplacer les marqueurs']);
    document.getElementById('modeChip').innerHTML='<svg class="mhi" viewBox="0 0 24 24">'+_m[0]+'</svg>'+_m[1];
    updatePathUI();updatePinUI();refreshPathEdit();
    if(tool!=='pin'&&tool!=='shape'&&tool!=='image')closeArmBar();
    if(tool==='pin'){select(null);showPalette();}
    else if(tool==='shape'||tool==='image'){select(null);showShapeHint();}
    else if(tool==='text'){select(null);showTextHint();}
    else if(tool==='pipette'){showPipetteHint();}
    else if(tool!=='path')select(selNode);}

  /* ============================================================
     4c · FORMES (rectangle, ellipse, image)
     ------------------------------------------------------------
     Un seul type d'objet pour les trois outils : ils partagent centre et
     taille et ne different que par `k`. Posees SOUS tout le reste, elles
     servent a marquer une zone, pas a couvrir les marqueurs.
     ============================================================ */
  const SH_DEF=S.SHAPE_DEF;
  function shapeNode(o){return gShapes?gShapes.getChildren().find(n=>n._meta&&n._meta.o===o):null;}
  const shColor=o=>o.c||SH_DEF.c;
  // dessine (ou redessine) le corps de la forme dans son groupe
  async function paintShape(g){const o=g._meta.o;
    (g._body||[]).forEach(n=>n.destroy());g._body=[];
    const w=Math.max(2,C(o.w)),h=Math.max(2,C(o.h)),al=S.shapeAlpha(o),sw=C(S.shapeStroke(o));
    let node;
    if(o.k==='img'){
      const im=o.src?await loadImg(BASE+o.src):null;
      node=im?new Konva.Image({image:im,width:w,height:h,offsetX:w/2,offsetY:h/2,opacity:al,listening:false})
             :new Konva.Rect({width:w,height:h,offsetX:w/2,offsetY:h/2,fill:'rgba(150,180,225,.10)',stroke:'#6c7f9c',strokeWidth:2,dash:[8,6],listening:false});
    }else if(o.k==='ell'){
      node=new Konva.Ellipse({radiusX:w/2,radiusY:h/2,fill:shColor(o),opacity:al,
        stroke:sw?shColor(o):null,strokeWidth:sw,strokeScaleEnabled:false,listening:false});
    }else{
      node=new Konva.Rect({width:w,height:h,offsetX:w/2,offsetY:h/2,cornerRadius:C(o.r||0),fill:shColor(o),opacity:al,
        stroke:sw?shColor(o):null,strokeWidth:sw,listening:false});
    }
    g.add(node);g._body.push(node);node.moveToBottom();
    // zone de saisie : toujours pleine, meme si la forme est presque transparente
    g._hit.width(w);g._hit.height(h);g._hit.offsetX(w/2);g._hit.offsetY(h/2);g._hit.moveToTop();
    g.rotation(o.rot||0);
    draw();}
  async function addShape(o){
    const g=new Konva.Group({x:C(o.x),y:C(o.y),rotation:o.rot||0,name:'shape'});g._meta={kind:'shape',o};g._body=[];
    const hit=new Konva.Rect({fill:'transparent'});g._hit=hit;g.add(hit);
    wireHover(g);
    g.on('click tap',e=>{e.cancelBubble=true;select(g);});
    g.on('dragmove',()=>{o.x=r1(U(g.x()));o.y=r1(U(g.y()));liveUpdate();});
    g.on('dragend',commit);
    gShapes.add(g);await paintShape(g);return g;}
  function refreshShape(o){const g=shapeNode(o);if(g)paintShape(g).then(()=>{if(selNode===g){drawRing(g);if(shTr)shTr.forceUpdate();}});}

  /* ---------- manipulation directe : poignees de redimensionnement et de rotation ----------
     Konva.Transformer plutot qu'une pastille maison : 8 poignees, rotation, contraintes et
     bornes gerees par la bibliotheque. La conversion echelle -> w/h se fait au RELACHEMENT :
     appliquee en direct, elle se battrait avec le transformer a chaque image. Pendant le geste
     on se contente de rafraichir la taille affichee dans la carte. */
  let shTr=null;
  function detachTransformer(){if(shTr){const n=shTr.nodes()[0];if(n)n.off('.tr');shTr.destroy();shTr=null;draw();}}
  function attachTransformer(g){
    detachTransformer();
    if(!g||tool!=='select'||!g._meta||g._meta.kind!=='shape')return;
    const o=g._meta.o;
    shTr=new Konva.Transformer({nodes:[g],
      padding:3, anchorSize:9, anchorCornerRadius:3, anchorStrokeWidth:2, borderStrokeWidth:1.5,
      anchorFill:'#0b1019', anchorStroke:'#54d1c4', borderStroke:'#54d1c4', borderDash:[6,4],
      rotateAnchorOffset:26, rotationSnaps:[0,45,90,135,180,225,270,315], rotationSnapTolerance:4,
      keepRatio:false, shiftBehavior:'keepRatio',       // Maj = proportions conservees, comme partout ailleurs
      ignoreStroke:true, flipEnabled:false,
      boundBoxFunc:(vieux,neuf)=>(Math.abs(neuf.width)<8||Math.abs(neuf.height)<8)?vieux:neuf});
    gEdit.add(shTr);
    g.on('transform.tr',()=>{
      const wv=document.getElementById('sh_size');
      if(wv)wv.textContent=r1(o.w*Math.abs(g.scaleX()))+' × '+r1(o.h*Math.abs(g.scaleY()))+' %';});
    g.on('transformend.tr',()=>{
      o.w=Math.max(0.5,r1(o.w*Math.abs(g.scaleX())));
      o.h=Math.max(0.5,r1(o.h*Math.abs(g.scaleY())));
      g.scale({x:1,y:1});
      o.x=r1(S.clamp(U(g.x())));o.y=r1(S.clamp(U(g.y())));
      const rot=r1(((g.rotation()%360)+360)%360);o.rot=rot||undefined;if(!o.rot)delete o.rot;
      lastShape.w=o.w;lastShape.h=o.h;
      paintShape(g).then(()=>{if(shTr)shTr.forceUpdate();syncShapePanel(o);});
      commit();});
    draw();}
  async function createShape(k,x,y,src,dims){const f=FL[curIdx];
    const o={k:k,x:r1(S.clamp(x)),y:r1(S.clamp(y)),w:(dims?dims.w:lastShape.w),h:(dims?dims.h:lastShape.h)};
    if(k==='img'){o.src=src||'';
      // posée d'un simple clic : on respecte le rapport naturel de l'image plutôt que de l'écraser
      if(!dims&&o.src){const im=await loadImg(BASE+o.src);
        if(im&&im.width&&im.height)o.h=r1(o.w*im.height/im.width);}}
    else{o.c=lastShape.c;}
    lastShape.w=o.w;lastShape.h=o.h;
    (f.shapes=f.shapes||[]).push(o);
    await addShape(o);buildLayers();
    // Comme dans un logiciel de dessin : tracer rend la main a la Selection, la forme prete a
    // etre ajustee (poignees + carte de reglages). On ne pose pas dix rectangles identiques a la
    // suite comme des marqueurs ; et l'outil reste memorise, une touche suffit a y revenir.
    pick('select');const g=shapeNode(o);if(g)select(g);
    commit();
    toast((k==='img'?'Image posée':(k==='ell'?'Ellipse posée':'Rectangle posé'))+' — S ou I pour en tracer une autre.','ok');}
  function deleteShape(o){const f=FL[curIdx],arr=f.shapes,i=arr?arr.indexOf(o):-1;if(i>=0)arr.splice(i,1);
    const g=shapeNode(o);if(g)g.destroy();select(null);buildLayers();draw();commit();}
  // valeurs reprises d'une forme a la suivante
  let lastShape={w:14,h:10,c:SH_DEF.c};
  function syncShapePanel(o){const sz=document.getElementById('sh_size');
    if(sz)sz.textContent=r1(o.w)+' × '+r1(o.h)+' %';
    const rv=document.getElementById('sh_rotv');if(rv)rv.textContent=r1(o.rot||0)+'°';}
  function openShapePanel(o){const g=shapeNode(o);if(!g)return;
    // On écarte l'ancre de la hauteur des poignées : au-dessus il y a le manche de rotation
    // (rotateAnchorOffset), en dessous les poignées de redimensionnement. Sans cette marge la
    // carte se posait dessus et les poignées devenaient inatteignables.
    const anchor=()=>{const bb=g.getClientRect({relativeTo:layer}),sc=stage.scaleX()||1;
      return {x:bb.x+bb.width/2, y:bb.y-40/sc, y2:bb.y+bb.height+12/sc};};
    const nom={rect:'Rectangle',ell:'Ellipse',img:'Image'}[o.k]||'Forme';
    const al=Math.round(S.shapeAlpha(o)*100), sw=S.shapeStroke(o);
    let h='<div class="mptitle" style="--dot:'+(o.k==='img'?'#8b7cff':shColor(o))+'">'+nom+'</div>';
    if(o.k!=='img'){
      h+='<div class="mprow"><span class="mplbl">Forme</span><div class="mpseg" id="sh_k">'+
         [['rect','▭'],['ell','◯']].map(t=>'<button data-k="'+t[0]+'"'+(o.k===t[0]?' class="on"':'')+' title="'+(t[0]==='rect'?'Rectangle':'Ellipse')+'">'+t[1]+'</button>').join('')+'</div></div>';
      h+='<div class="mprow"><span class="mplbl">Couleur</span><input class="mpcol" id="sh_c" type="color" value="'+shColor(o)+'"><div class="mpsw" id="sh_sw"></div></div>';
      h+='<div class="mprow"><span class="mplbl">Contour</span><input class="mprange" id="sh_st" type="range" min="0" max="150" value="'+Math.round(sw*100)+'"><span class="mpval" id="sh_stv">'+(sw?r1(sw)+' %':'aucun')+'</span></div>';
      if(o.k==='rect')h+='<div class="mprow"><span class="mplbl">Coins</span><input class="mprange" id="sh_r" type="range" min="0" max="600" value="'+Math.round((o.r||0)*100)+'"><span class="mpval" id="sh_rv">'+r1(o.r||0)+' %</span></div>';
    }
    h+='<div class="mprow"><span class="mplbl">Opacité</span><input class="mprange" id="sh_a" type="range" min="0" max="100" value="'+al+'"><span class="mpval" id="sh_av">'+al+' %</span></div>';
    h+='<div class="mprow"><span class="mplbl">Taille</span><span class="mpsize" id="sh_size">'+r1(o.w)+' × '+r1(o.h)+' %</span>'+
       (o.rot?'<span class="mprot" id="sh_rotv">'+r1(o.rot)+'°</span>':'')+'</div>';
    h+='<div class="mpacts"><button class="mpbtn primary" id="sh_fit">'+RESET_SVG+' Carrer</button>'+
       '<button class="mpbtn danger" id="sh_del" title="Supprimer cette forme">'+TRASH_SVG+'</button></div>';
    h+='<div class="mpnote">Glisse la forme pour la déplacer · les <b>poignées</b> la redimensionnent · celle du dessus la fait pivoter.<br><b>Maj</b> conserve les proportions · <b>S</b> ou <b>I</b> pour en tracer une autre.</div>';
    openMapPanel(o,anchor,h,()=>{
      mapPanel.node=g;
      const maj=()=>{refreshShape(o);commitSoon();};
      if(o.k!=='img'){
        const setC=hex=>{o.c=hex;lastShape.c=hex;const t=document.querySelector('#mappanel .mptitle');if(t)t.style.setProperty('--dot',hex);
          const ci=document.getElementById('sh_c');if(ci&&ci.value!==hex)ci.value=hex;maj();};
        document.getElementById('sh_c').addEventListener('input',e=>setC(e.target.value));
        const sw2=document.getElementById('sh_sw');S.EL_KEYS.forEach(k=>{const d=document.createElement('div');
          d.className='sw';d.style.background=elc(k);d.title=k;d.addEventListener('click',()=>setC(elc(k)));sw2.appendChild(d);});
        document.querySelectorAll('#sh_k button[data-k]').forEach(b=>b.addEventListener('click',()=>{
          o.k=b.dataset.k;document.querySelectorAll('#sh_k button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
          refreshShape(o);commitSoon();openShapePanel(o);}));
        const st=document.getElementById('sh_st');st.addEventListener('input',()=>{o.sw=(+st.value)/100;
          document.getElementById('sh_stv').textContent=o.sw?r1(o.sw)+' %':'aucun';maj();});
        const rr=document.getElementById('sh_r');if(rr)rr.addEventListener('input',()=>{o.r=(+rr.value)/100;
          document.getElementById('sh_rv').textContent=r1(o.r)+' %';maj();});
      }
      const aa=document.getElementById('sh_a');aa.addEventListener('input',()=>{o.a=(+aa.value)/100;
        document.getElementById('sh_av').textContent=(+aa.value)+' %';maj();});
      document.getElementById('sh_fit').addEventListener('click',()=>{const m=Math.max(o.w,o.h);o.w=o.h=lastShape.w=lastShape.h=m;
        syncShapePanel(o);maj();if(shTr)shTr.forceUpdate();});
      const del=document.getElementById('sh_del');del.addEventListener('click',()=>{del.blur();
        askConfirm('Supprimer cette '+nom.toLowerCase()+' ? Elle sera retirée de data.js au prochain enregistrement.',{title:'Supprimer la forme'})
          .then(v=>{if(v){closeMapPanel();deleteShape(o);}});});
    });}

  /* ---------- Phase 3 : palette + création + suppression ---------- */
  // (la taille des mobs est un réglage global : elle vit dans l'inspecteur, plus dans la barre du haut)
  function updatePinUI(){}
  /* ---------- barre d'armement flottante : on choisit QUOI poser, au-dessus de la carte ----------
     L'inspecteur ne sert plus qu'à guider. Le SHELL de la barre (titre, catégories, recherche)
     n'est construit qu'à l'ouverture : taper dans la recherche ne redessine QUE la grille,
     sinon le champ serait recréé à chaque lettre et perdrait le focus. */
  let armSearch='';
  const MOBOF=()=>(typeof MOB!=='undefined')?MOB:{};
  // ROLE dit de quelle couleur part un job : il appartient a CETTE strat, et se
  // regle dans l'atelier Strategie — un NIN peut tanker ici et DPS ailleurs.
  const ROLEOF=()=>(typeof ROLE!=='undefined')?ROLE:{};
  const MOBPIN_SVG='<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="3"/><path d="M12 21c5-5.5 7-8.5 7-11a7 7 0 10-14 0c0 2.5 2 5.5 7 11z"/></svg>';
  function ensureArmEl(){let w=document.getElementById('armbar');if(!w){w=document.createElement('div');w.id='armbar';stageWrap.appendChild(w);}return w;}
  function closeArmBar(){const w=document.getElementById('armbar');if(w){w.classList.remove('on');w.innerHTML='';}}
  // Jobs et marqueurs ne sont pas des creatures : ils ne viennent pas du roster
  // de l'etage, et on peut les chercher par leur nom francais (« coffre »).
  const estIco=()=>palCat==='job'||palCat==='marq';
  function placeholderPalette(){return palCat==='job'?'chercher un job…'
    :palCat==='marq'?'chercher un repère…':'chercher une créature…';}
  function armRoster(){const names=palCat==='job'?S.ICO_JOBS:palCat==='marq'?S.ICO_MARQUEURS
                        :rosterFor(palCat,MOBOF());
    const q=armSearch.trim().toLowerCase();
    return q?names.filter(n=>(n+' '+S.icoNom(n)).toLowerCase().includes(q)):names;}
  function showPalette(){if(tool!=='pin')return;setInspTitle('Nouveau marqueur','var(--cyan)');
    document.getElementById('inspBody').innerHTML='<div class="hintbox"><b>Glisse</b> un marqueur de la barre vers l’endroit voulu sur la carte — c’est le plus direct. Sinon <b>clique-le</b> puis clique la carte. Dans les deux cas on repasse en <b>Sélection</b> avec le marqueur posé, sa carte de réglages ouverte. <b>Échap</b> ferme la barre.</div>';
    openArmBar();}
  // Coquille commune aux trois barres (marqueur, forme, image) : tete + fermeture + deplacement.
  // Renvoie null si la barre est deja ouverte pour le meme outil, pour ne pas casser une frappe.
  const ARCLOSE='<button type="button" class="arclose" id="ar_x" title="Fermer (revenir en Sélection)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  function armShell(kind,svg,titre,tete,corps){
    const w=ensureArmEl();
    if(w.classList.contains('on')&&w.dataset.kind===kind)return null;
    w.dataset.kind=kind;
    w.innerHTML='<div class="arcard"><div class="arhead" title="Glisser pour déplacer la barre · double-clic pour la recentrer">'+
      '<span class="artitle">'+svg+titre+'</span>'+(tete||'')+ARCLOSE+'</div>'+(corps||'')+'</div>';
    w.classList.add('on');w.classList.remove('armed');
    document.getElementById('ar_x').addEventListener('click',()=>pick('select'));
    const t=w.querySelector('.arhead');
    wireBoxDrag(t,()=>{const r=w.getBoundingClientRect(),wr=stageWrap.getBoundingClientRect();
        return {x:r.left-wr.left,y:r.top-wr.top};},
      (base,dx,dy)=>placeArmBar(base.x+dx,base.y+dy));
    t.addEventListener('dblclick',e=>{if(e.target.closest(CMD))return;e.preventDefault();armPos=null;placeArmBar();});
    placeArmBar();
    return w;}
  function openArmBar(){
    const cats=[['boss','Boss'],['mid','Midboss'],['pack','Pack'],['job','Jobs'],['marq','Marqueurs']];
    const w=armShell('pin',MOBPIN_SVG,'Poser un marqueur',
      '<div class="arseg" id="ar_cat">'+cats.map(c=>'<button type="button" data-pc="'+c[0]+'"'+(palCat===c[0]?' class="on"':'')+'>'+c[1]+'</button>').join('')+'</div>'+
      '<input class="arsearch" id="ar_q" placeholder="'+placeholderPalette()+'" value="'+esc(armSearch)+'">',
      '<div class="argrid" id="ar_grid"></div><div class="arhint" id="ar_hint"></div>');
    if(!w){renderArmGrid();return;}   // déjà ouverte : ne pas casser la frappe en cours
    w.querySelectorAll('#ar_cat button[data-pc]').forEach(b=>b.addEventListener('click',()=>{
      palCat=b.dataset.pc;armedPin=null;
      w.querySelectorAll('#ar_cat button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
      const q=document.getElementById('ar_q');if(q)q.placeholder=placeholderPalette();
      renderArmGrid();}));
    const qi=document.getElementById('ar_q');
    qi.addEventListener('input',()=>{armSearch=qi.value;renderArmGrid();});
    qi.addEventListener('focus',()=>{w.classList.remove('armed');});   // rouvrir la grille pour changer de créature
    // Échap dans le champ : vide la recherche, puis (2e fois) sort de l'outil
    qi.addEventListener('keydown',e=>{if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();
      if(armSearch){armSearch='';qi.value='';renderArmGrid();}else pick('select');});
    renderArmGrid();qi.focus();}

  /* ---------- barres d'armement des outils Formes et Image ---------- */
  const SHAPE_SVG='<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1"/><circle cx="16.5" cy="16.5" r="3.5"/></svg>';
  const IMAGE_SVG='<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-9 9"/></svg>';
  function openShapeBar(){
    const w=armShell('shape',SHAPE_SVG,'Poser une forme',
      '<div class="arseg" id="ar_k">'+[['rect','Rectangle'],['ell','Ellipse']]
        .map(t=>'<button type="button" data-k="'+t[0]+'"'+(armedShape===t[0]?' class="on"':'')+'>'+t[1]+'</button>').join('')+'</div>'+
      '<input class="arcol" id="ar_col" type="color" value="'+lastShape.c+'" title="Couleur de la forme">',
      '<div class="arhint" id="ar_hint"></div>');
    if(!w)return;
    w.querySelectorAll('#ar_k button[data-k]').forEach(b=>b.addEventListener('click',()=>{
      armedShape=b.dataset.k;
      w.querySelectorAll('#ar_k button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
      stage.container().style.cursor='crosshair';shapeHint();}));
    document.getElementById('ar_col').addEventListener('input',e=>{lastShape.c=e.target.value;shapeHint();});
    shapeHint();}
  function shapeHint(){const h=document.getElementById('ar_hint');if(!h)return;
    h.innerHTML=armedShape?('<b>'+(armedShape==='ell'?'Ellipse':'Rectangle')+'</b> armé — <b>glisse sur la carte</b> pour la tracer à sa taille, ou clique pour la taille par défaut. <b>Maj</b> contraint au carré.')
      :'Choisis une forme, puis glisse sur la carte pour la tracer.';}
  function openImageBar(){
    const w=armShell('image',IMAGE_SVG,'Poser une image',
      '<input class="arsearch" id="ar_q" placeholder="chercher une image…" value="'+esc(armSearch)+'">',
      '<div class="argrid" id="ar_grid"></div><div class="arhint" id="ar_hint"></div>');
    if(!w){renderImageGrid();return;}
    const qi=document.getElementById('ar_q');
    qi.addEventListener('input',()=>{armSearch=qi.value;renderImageGrid();});
    qi.addEventListener('focus',()=>{w.classList.remove('armed');});
    qi.addEventListener('keydown',e=>{if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();
      if(armSearch){armSearch='';qi.value='';renderImageGrid();}else pick('select');});
    renderImageGrid();qi.focus();}
  // catalogue = les images du projet declarees dans data.js (MOB)
  function imageRoster(){const M=MOBOF(),q=armSearch.trim().toLowerCase();
    return Object.keys(M).filter(n=>!q||n.toLowerCase().includes(q)).map(n=>({nom:n,src:M[n]}));}
  function renderImageGrid(){const w=document.getElementById('armbar');if(!w||w.dataset.kind!=='image')return;
    const grid=document.getElementById('ar_grid'),liste=imageRoster();
    grid.style.display=liste.length?'':'none';
    grid.innerHTML=liste.map(it=>'<button type="button" class="palbtn'+(armedShape&&armedShape.src===it.src?' on':'')+'" data-src="'+esc(it.src)+'"><img src="'+BASE+it.src+'" alt="'+esc(it.nom)+'"><span>'+esc(it.nom)+'</span></button>').join('');
    grid.querySelectorAll('.palbtn').forEach(b=>b.addEventListener('click',()=>{
      armedShape={src:b.dataset.src};
      grid.querySelectorAll('.palbtn').forEach(x=>x.classList.remove('on'));b.classList.add('on');
      stage.container().style.cursor='crosshair';
      const qi=document.getElementById('ar_q');if(qi)qi.blur();
      imageHint();}));
    imageHint();}
  function imageHint(){const w=document.getElementById('armbar'),h=document.getElementById('ar_hint');if(!h)return;
    if(w)w.classList.toggle('armed',!!(armedShape&&armedShape.src)&&document.activeElement!==document.getElementById('ar_q'));
    if(!imageRoster().length){h.innerHTML='Aucune image'+(armSearch.trim()?' pour « '+esc(armSearch)+' »':'')+'.';return;}
    h.innerHTML=(armedShape&&armedShape.src)?'<b>Image armée</b> — <b>glisse</b> pour la cadrer, ou clique pour la poser à son rapport naturel.'
      :'Choisis une image, puis glisse sur la carte pour la cadrer.';}
  function showShapeHint(){
    setInspTitle(tool==='image'?'Nouvelle image':'Nouvelle forme','var(--cyan)');
    document.getElementById('inspBody').innerHTML='<div class="hintbox">'+
      (tool==='image'
        ? 'Choisis une image dans la barre du haut, puis <b>glisse sur la carte</b> pour la cadrer — un simple clic la pose à son rapport naturel. Elle se pose <b>sous</b> les tracés et les marqueurs.'
        : 'Choisis <b>Rectangle</b> ou <b>Ellipse</b> et sa couleur dans la barre du haut, puis <b>glisse sur la carte</b> pour tracer la forme à sa taille. <b>Maj</b> contraint au carré. Elle se pose <b>sous</b> les tracés et les marqueurs.')+
      '<br><br>Le tracé terminé, tu repasses en <b>Sélection</b> avec la forme prête : <b>poignées</b> pour la redimensionner et la faire pivoter, carte flottante pour la couleur et l\u2019opacité.</div>';
    if(tool==='image')openImageBar();else openShapeBar();}

  /* ---------- pipette : prélève une couleur sur la carte ---------- */
  let pipetteHex=null;
  function showPipetteHint(){setInspTitle('Pipette','var(--gold)');
    document.getElementById('inspBody').innerHTML='<div class="hintbox"><b>Clique n\u2019importe où sur la carte</b> pour relever la couleur du pixel.<br><br>'+
      'Si un objet est sélectionné (forme, texte, tracé), la couleur lui est appliquée directement. Sinon elle devient la couleur des <b>prochaines formes</b> et reste copiable ici.</div>'+
      '<div class="fld"><label>Dernière couleur relevée</label><div class="in" id="pip_out" style="display:flex;align-items:center;gap:9px">'+
      (pipetteHex?'<span style="width:18px;height:18px;border-radius:6px;border:1px solid var(--line2);background:'+pipetteHex+'"></span><code>'+pipetteHex+'</code>':'—')+'</div></div>';}
  function pickColorAt(p){
    let hex=null;
    try{const cv=layer.getCanvas(),pr=cv.getPixelRatio?cv.getPixelRatio():1;
      const ctx=cv._canvas.getContext('2d',{willReadFrequently:true});
      const d=ctx.getImageData(Math.round(p.x*pr),Math.round(p.y*pr),1,1).data;
      hex='#'+[d[0],d[1],d[2]].map(v=>('0'+v.toString(16)).slice(-2)).join('');
    }catch(e){toast('Cette couleur n’a pas pu être relevée — réessaie sur une zone pleine.','err');return;}
    pipetteHex=hex;
    const m=selNode&&selNode._meta;
    if(m&&m.kind==='shape'&&m.o.k!=='img'){m.o.c=hex;refreshShape(m.o);commit();toast('Forme colorée en '+hex+'.','ok');}
    else if(m&&m.kind==='text'){m.o.c=hex;refreshText(m.o);commit();toast('Texte coloré en '+hex+'.','ok');}
    else{lastShape.c=hex;toast(hex+' relevé — couleur des prochaines formes.','ok');}
    showPipetteHint();}
  // position libre de la barre (null = centrée en haut, son comportement par défaut)
  let armPos=null;
  function placeArmBar(x,y){const w=document.getElementById('armbar');if(!w)return;
    if(x!=null)armPos={x:x,y:y};
    if(!armPos){w.classList.remove('moved');w.style.left='';w.style.top='';return;}
    const wr=stageWrap.getBoundingClientRect(),bw=w.offsetWidth,bh=w.offsetHeight;
    const cx=Math.max(6,Math.min(armPos.x,wr.width-bw-6));      // bornée dans le cadre de la carte
    const cy=Math.max(6,Math.min(armPos.y,wr.height-bh-6));
    w.classList.add('moved');w.style.left=cx+'px';w.style.top=cy+'px';}
  function renderArmGrid(){const w=document.getElementById('armbar');if(!w||!w.classList.contains('on'))return;
    const grid=document.getElementById('ar_grid'),MOBimg=MOBOF(),names=armRoster();
    grid.style.display=names.length?'':'none';
    grid.innerHTML=names.map(n=>{
      const on=armedPin&&armedPin.name===n?' on':'';
      // Une icone s'affiche par MASQUE : un SVG charge en <img> ne prend pas la
      // couleur de la page, et sortirait en noir sur le fond sombre de la barre.
      // le masque en style en ligne : une url() dans une variable CSS se
      // resoudrait depuis la feuille, donc « tools/xi-studio-icons/… »
      const u=BASE+S.icoSrc(n);
      // l'apercu montre le marqueur TEL QU'IL SERA POSE : sa couleur de depart
      // et son contour, pas une silhouette blanche qu'on ne reconnait qu'apres
      const vue=estIco()?'<span class="icocolle" style="--pc:'+S.icoCouleur(n,ROLEOF())
                        +';--bordf:url(#'+S.icoFiltreId(S.ICO_CONTOUR_DEF)+')">'
                        +'<i class="icoprev" style="-webkit-mask-image:url('+u+');mask-image:url('+u+')"></i></span>'
                        :'<img src="'+BASE+MOBimg[n]+'" alt="'+esc(n)+'">';
      return '<button type="button" draggable="true" class="palbtn'+on+'" data-name="'+esc(n)+'">'+vue+
             '<span>'+esc(estIco()?S.icoNom(n):n)+'</span></button>';}).join('');
    /* Glisser-deposer : on prend le marqueur dans la barre et on le lache ou
       il va. C'est le geste qu'on fait naturellement — armer puis viser demande
       de tenir en tete ce qui est arme, et un clic distrait posait un deuxieme
       marqueur sans qu'on l'ait voulu.
       Le clic reste possible pour qui prefere viser : il arme, on clique, et on
       repasse aussitot en Selection. */
    grid.querySelectorAll('.palbtn').forEach(b=>{
      b.addEventListener('dragstart',e=>{
        tirePal={kind:palCat,name:b.dataset.name};
        // setData est obligatoire pour que le navigateur autorise le glisser
        try{e.dataTransfer.setData('text/plain',b.dataset.name);
            e.dataTransfer.effectAllowed='copy';}catch(_){}
        const v=b.querySelector('img,.icocolle');
        if(v&&e.dataTransfer.setDragImage)try{e.dataTransfer.setDragImage(v,20,20);}catch(_){}
        b.classList.add('tire');});
      b.addEventListener('dragend',()=>{tirePal=null;b.classList.remove('tire');});});
    grid.querySelectorAll('.palbtn').forEach(b=>b.addEventListener('click',()=>{
      armedPin={kind:palCat,name:b.dataset.name};
      grid.querySelectorAll('.palbtn').forEach(x=>x.classList.remove('on'));b.classList.add('on');
      stage.container().style.cursor='crosshair';
      const qi=document.getElementById('ar_q');if(qi)qi.blur();   // sinon le focus rouvrirait la grille
      renderArmHint();}));
    renderArmHint();}
  function renderArmHint(){const w=document.getElementById('armbar'),hint=document.getElementById('ar_hint');if(!hint)return;
    // repliée dès qu'une créature est armée : la grille masquerait le haut de la carte
    if(w)w.classList.toggle('armed',!!armedPin&&document.activeElement!==document.getElementById('ar_q'));
    if(!armRoster().length){hint.innerHTML='Rien'+(armSearch.trim()?' pour « '+esc(armSearch)+' »':'')+' dans cette catégorie.';return;}
    hint.innerHTML=armedPin?('<b>'+esc(estIco()?S.icoNom(armedPin.name):armedPin.name)+'</b> armé — clique la carte pour le poser. <b>Échap</b> désarme.')
      :('<b>Glisse</b> '+(estIco()?'une icône':'une créature')+' sur la carte — ou clique-la d’abord, puis la carte.');}
  // pose + ouvre la carte de réglages du marqueur posé, SANS désarmer ni changer d'outil
  async function placePin(kind,name,x,y){const f=FL[curIdx];x=r1(S.clamp(x));y=r1(S.clamp(y));let o;
    // une icone n'est pas une creature : ni element, ni quantite, ni phase —
    // juste un dessin et sa couleur
    if(kind==='job'||kind==='marq'){
      o={ico:name,x,y,c:S.icoCouleur(name,ROLEOF()),hl:1};
      (f.icones=f.icones||[]).push(o);
      await addIcone(o);
      poseFinie(o,S.icoNom(name));
      return;}
    /* Ce qu'on pose arrive NU : ni etiquette, ni pastille numerotee. On place
       d'abord, on nomme ensuite — et sur une carte deja chargee, un marqueur
       qui arrive avec son texte et son rond recouvre ce qu'on visait.
       Les deux se rallument d'une case dans la carte de reglages. */
    // chaque type a sa forme propre — un boss porte un numero, un pack une
    // quantite et une phase — mais c'est le catalogue qui dit ou le ranger
    if(kind==='boss'){const maxN=(f.bosses||[]).reduce((m,b)=>Math.max(m,b.n||0),0);o={name,n:maxN+1,el:'gray',x,y,hl:1};}
    else if(kind==='mid'){o={name,el:'gray',x,y,hl:1};}
    else{kind='pack';o={name,el:'gray',x,y,q:'×1',ph:lastPh,hl:1};}
    tableauDe(f,kind).push(o);
    await addPin(kind,o,pinSize(kind),MOBOF());
    poseFinie(o,name);}
  /* On repasse en Selection avec le marqueur qu'on vient de poser, et sa carte
     de reglages ouverte : c'est presque toujours pour l'ajuster tout de suite.
     L'outil restait arme, et le clic suivant en posait un deuxieme par accident. */
  function poseFinie(o,nom){
    buildLayers();draw();
    pick('select');
    const g=pinNode(o); if(g)select(g);
    commit();toast(nom+' posé — il est sélectionné, glisse-le pour l’ajuster.','ok');}
  function deletePin(o,kind){const f=FL[curIdx];
    const arr=tableauDe(f,kind);
    const i=arr?arr.indexOf(o):-1;if(i>=0)arr.splice(i,1);
    const g=pinNode(o);if(g)g.destroy();if(o._mk)o._mk.destroy();
    select(null);buildLayers();draw();commit();}
  // échelle globale des mobs — même facteur pour tous (garde leur ratio)
  function applyMobScale(){ if(!gPins)return;
    gPins.getChildren().forEach(n=>{ if(n.name()!=='pin')return; const kind=n._meta.kind,base=n._base,im=n.findOne('Image');
      if(im){const nat=Math.max(im.image().width,im.image().height),s=(MAP*base*mobScale)/nat,w=im.image().width*s,h=im.image().height*s;
        im.width(w);im.height(h);im.offsetX(w/2);im.offsetY(h/2);n._iw=w;n._ih=h;placeLabel(n);}
      const rc=n.findOne('Circle'); if(kind==='mid'&&rc)rc.radius(MAP*base*mobScale*.75);
      if(kind==='ico')retailleIco(n._meta.o,n);   // pas d'image a l'echelle naturelle : tout suit le jeton
    });
    if(selNode)drawRing(selNode); draw();
    commitSoon();   // l'affichage des valeurs est à paintGlobals (deux curseurs à tenir synchronisés)
  }

  /* ============================================================
     4b · TEXTES / ANNOTATIONS (titres, notes, listes)
     ------------------------------------------------------------
     Modèle {x,y,t,s,c,list?,bg?} — s = taille en % de carte,
     t = texte multi-lignes, list = 'b'(puces)|'n'(numéros),
     bg = fond sombre. Rendu centré, à l'échelle de la carte.
     ============================================================ */
  function textNode(o){return gTexts?gTexts.getChildren().find(n=>n.name()==='text'&&n._meta&&n._meta.o===o):null;}
  // pose une suite de runs (segments stylés) sur UNE ligne → nœuds Konva.Text positionnés + largeur
  function makeRunNodes(segs,fs,fam,defc,opts){opts=opts||{};const nodes=[];let w=0;
    segs.forEach(r=>{if(r.t==null||r.t==='')return;
      let fst=(r.b?'bold':'')+(r.i?' italic':'');fst=fst.trim()||'normal';
      let deco=(r.u?'underline':'')+(r.st?' line-through':'');deco=deco.trim();
      const fill=r.c||defc;
      const t=new Konva.Text({text:r.t,fontFamily:fam,fontStyle:fst,fontSize:fs,lineHeight:1,textDecoration:deco,fill:fill,listening:false});
      // gras plus marqué : on épaissit le glyphe avec un contour de la couleur du texte (faux-bold)
      if(r.b){t.stroke(fill);t.strokeWidth(fs*0.09);t.fillAfterStrokeEnabled(true);
        if(opts.shadow||opts.outline){t.shadowColor('#05080c');t.shadowBlur(fs*0.14);t.shadowOpacity(.85);t.shadowEnabled(true);}}
      else if(opts.outline){t.stroke('#05080c');t.strokeWidth(fs*0.16);t.fillAfterStrokeEnabled(true);}
      else if(opts.shadow){t.shadowColor('#000');t.shadowBlur(fs*0.16);t.shadowOpacity(.7);t.shadowEnabled(true);}
      t._w=t.width();nodes.push(t);w+=t._w;});
    if(!nodes.length){const t=new Konva.Text({text:' ',fontFamily:fam,fontSize:fs,lineHeight:1,listening:false});t._w=t.width();nodes.push(t);w+=t._w;}
    return {nodes,w};}
  // rendu texte enrichi PAR LIGNE et PAR RUN (gras/ital/soul/barré/couleur inline)
  function relayoutText(g){const o=g._meta.o,bg=g._bg,hit=g._hit;
    const fs=Math.max(2,(o.s||1.5)/100*MAP),lh=fs*1.34;
    // « puce » = même objet texte, rendu en pastille ronde (comme le Numéro d'un boss) :
    // disque de la couleur choisie, liseré crème, texte en blanc.
    const pill=o.sh==='pill';
    const blockAl=S.textAlign(o),fam=S.textFont(o),outline=S.textOutline(o),defc=pill?'#ffffff':(o.c||'#fff');
    (g._lines||[]).forEach(n=>n.destroy());g._lines=[];
    const parsed=S.parseRich(o);if(!parsed.length)parsed.push({list:null,prefix:'',runs:[{t:' '}]});
    const rows=parsed.map(ln=>{const segs=[];if(ln.prefix)segs.push({t:ln.prefix});(ln.runs||[]).forEach(r=>segs.push(r));
      const rr=makeRunNodes(segs,fs,fam,defc,{outline:outline,shadow:!o.bg&&!outline});return {rr:rr,al:ln.align||(ln.list?'l':blockAl)};});
    let blockW=fs;rows.forEach(r=>{blockW=Math.max(blockW,r.rr.w);});
    const totalH=rows.length*lh,y0=-totalH/2,dy=(lh-fs)/2;
    rows.forEach((row,i)=>{const al=row.al;let sx=-blockW/2;if(al==='c')sx=-row.rr.w/2;else if(al==='r')sx=blockW/2-row.rr.w;
      let cx=sx;row.rr.nodes.forEach(t=>{t.position({x:cx,y:y0+i*lh+dy});g.add(t);g._lines.push(t);cx+=t._w;});});
    const padX=fs*0.55,padY=fs*0.34;let bw=blockW+padX*2,bh=totalH+padY*2;
    if(pill){const d=Math.max(bw,bh)+fs*0.25;bw=bh=d;}   // carré → cornerRadius = moitié = disque
    bg.width(bw);bg.height(bh);bg.offsetX(bw/2);bg.offsetY(bh/2);
    bg.cornerRadius(pill?bw/2:fs*0.28);
    bg.fill(pill?(o.c||BK.FALLBACK):'rgba(9,13,18,.82)');
    bg.stroke(pill?BK.CREAM:'rgba(246,234,208,.22)');
    bg.strokeWidth(pill?Math.max(1,fs*0.13):1);
    bg.visible(pill||!!o.bg);
    hit.width(bw);hit.height(bh);hit.offsetX(bw/2);hit.offsetY(bh/2);
    bg.moveToBottom();hit.moveToTop();}
  function addText(o){
    const g=new Konva.Group({x:C(o.x),y:C(o.y),name:'text'});g._meta={kind:'text',o};g._lines=[];
    const bg=new Konva.Rect({fill:'rgba(9,13,18,.82)',stroke:'rgba(246,234,208,.22)',strokeWidth:1,listening:false});
    const hit=new Konva.Rect({fill:'transparent'});
    g.add(bg,hit);g._bg=bg;g._hit=hit;
    relayoutText(g);
    wireHover(g);
    // clic sur un texte = le sélectionne ET ouvre l'éditeur (glisser = déplacer)
    g.on('click tap',e=>{e.cancelBubble=true;if(tool!=='select')pick('select');if(mapEd&&mapEd.cfg.o===o)return;select(g);editTextOnMap(o);});
    g.on('dragmove',()=>{o.x=r1(U(g.x()));o.y=r1(U(g.y()));liveUpdate();});
    g.on('dragend',commit);
    gTexts.add(g);return g;}
  function refreshText(o){const g=textNode(o);if(!g)return;relayoutText(g);if(selNode===g)drawRing(g);draw();commitSoon();}
  function createText(x,y){const f=FL[curIdx];x=r1(S.clamp(x));y=r1(S.clamp(y));
    const o={x,y,t:'',s:1.5,c:'#ffffff'};(f.texts=f.texts||[]).push(o);
    addText(o);buildLayers();pick('select');const g=textNode(o);if(g)select(g);
    commit();editTextOnMap(o);}
  function deleteText(o){const f=FL[curIdx];const arr=f.texts;const i=arr?arr.indexOf(o):-1;if(i>=0)arr.splice(i,1);
    const g=textNode(o);if(g)g.destroy();select(null);buildLayers();draw();commit();}
  function showTextHint(){if(tool!=='text')return;setInspTitle('Annotation texte','var(--cyan)');
    document.getElementById('inspBody').innerHTML='<div class="hintbox"><b>Clique sur la carte</b> pour ajouter un texte. Tu pourras ensuite écrire plusieurs lignes, sélectionner un mot et le mettre en gras / italique / couleur, faire des listes, régler la taille et un fond.</div>';}

  // L'editeur de texte enrichi (contenteditable, barre d'outils, listes, casse) vit dans
  // js/rich-editor.js : c'est du DOM generique, sans Konva ni etat du studio. Expose window.RICH.
  const RICH=window.RICH;
  /* ============================================================
     5 · TRACÉS — rendu 3 couches (liseré + couleur + flux)
     ============================================================ */
  function activeRoutes(){return (FL[curIdx]&&FL[curIdx].routes)||[];}
  function clearHandles(){if(gEdit)gEdit.destroyChildren();}
  function makeRouteLines(rt){const pts=flatCanvas(rt._pts||[]),col=rt.c1||elc(rt.el)||BK.FALLBACK;
    const a=ra(rt),s=fsz(rt);
    const cas=new Konva.Line({points:pts,stroke:BK.CASE,strokeWidth:BK.CASW*s,lineCap:'round',lineJoin:'round',listening:false});
    const core=new Konva.Line({points:pts,stroke:col,strokeWidth:BK.CORW*s,opacity:a,lineCap:'round',lineJoin:'round',listening:false});
    const fl=new Konva.Line({points:pts,stroke:'#fff',strokeWidth:BK.FLW*s,dash:[BK.FDA*s,BK.FDB*s],lineCap:'round',lineJoin:'round',listening:false,name:'flow',opacity:.95,shadowColor:'#000',shadowBlur:2,shadowOpacity:.5});
    gRoutes.add(cas,core,fl);rt._case=cas;rt._rail=core;rt._flow=fl;}
  function applyRouteColors(rt){const col=rt.c1||elc(rt.el)||BK.FALLBACK;if(rt._rail){rt._rail.stroke(col);rt._rail.opacity(ra(rt));}draw();commitSoon();}
  function applyBandSize(rt){const s=fsz(rt);if(rt._case)rt._case.strokeWidth(BK.CASW*s);if(rt._rail)rt._rail.strokeWidth(BK.CORW*s);if(rt._flow){rt._flow.strokeWidth(BK.FLW*s);rt._flow.dash([BK.FDA*s,BK.FDB*s]);}draw();commitSoon();}
  function ghost(on){if(gPins)gPins.opacity(on?0.22:1);if(gRoutes)gRoutes.opacity(on?0.5:1);draw();}
  function syncRouteLine(rt){rt.points=S.ptsStr(rt._pts);const flat=flatCanvas(rt._pts);if(rt._case)rt._case.points(flat);if(rt._rail)rt._rail.points(flat);if(rt._flow)rt._flow.points(flat);draw();}

  /* ============================================================
     6 · TRACÉS — édition des points (outil « path »)
     ============================================================ */
  function addNewRoute(){const f=FL[curIdx];if(!f.routes)f.routes=[];const maxN=f.routes.reduce((m,r)=>Math.max(m,r.n||0),0);
    const rt={n:maxN+1,el:'red',points:'',_pts:[]};f.routes.push(rt);makeRouteLines(rt);curRoute=f.routes.length-1;selHandleIdx=-1;
    buildRoutePicker();refreshPathEdit();buildLayers();updateAnim();commit();toast('Nouveau tracé '+rt.n+' — clique sur la carte pour poser les points.','ok');}
  function deleteRoute(){const f=FL[curIdx];if(!f.routes||!f.routes.length)return;const rt=f.routes[curRoute];
    askConfirm('Supprimer le tracé <b>'+(rt.name?esc(rt.name):(rt.n!=null?rt.n:curRoute+1))+'</b> ? Le guide ne l’affichera plus.',{title:'Supprimer le tracé'}).then(v=>{if(!v)return;
      if(rt._case)rt._case.destroy();if(rt._rail)rt._rail.destroy();if(rt._flow)rt._flow.destroy();f.routes.splice(curRoute,1);curRoute=Math.max(0,curRoute-1);selHandleIdx=-1;
      buildRoutePicker();refreshPathEdit();buildLayers();updateAnim();commit();});}
  function refreshPathEdit(){clearHandles();if(tool!=='path'){syncRoutePanel();draw();return;}
    const routes=activeRoutes();if(!routes.length){renderRouteInspector();syncRoutePanel();draw();return;}if(curRoute>=routes.length)curRoute=0;
    const rt=routes[curRoute];if(!rt._pts)rt._pts=S.parsePts(rt.points);
    const hit=new Konva.Line({points:flatCanvas(rt._pts),stroke:'#54d1c4',strokeWidth:20,opacity:0.001,lineCap:'round',lineJoin:'round',name:'phit'});
    hit.on('dblclick dbltap',()=>insertRoutePoint(rt));gEdit.add(hit);
    rt._pts.forEach((p,idx)=>{const sel=idx===selHandleIdx;
      const h=new Konva.Circle({x:C(p[0]),y:C(p[1]),radius:sel?8:6.5,fill:sel?'#54d1c4':'#0b1019',stroke:'#54d1c4',strokeWidth:2,draggable:true,name:'phandle'});h._idx=idx;
      h.on('dragstart',()=>{h._o=[U(h.x()),U(h.y())];ghost(true);});
      h.on('dragmove',e=>{const ev=e.evt||{};let nx=U(h.x()),ny=U(h.y());const pts=rt._pts,mid=idx>0&&idx<pts.length-1;
        if((ev.ctrlKey||ev.metaKey)&&mid){const a=pts[idx-1],b=pts[idx+1];
          // Ctrl+Maj = projeté sur la droite préc→suiv (garde collinéaire) · Ctrl = milieu exact
          const q=ev.shiftKey?S.projectOnSeg(nx,ny,a,b):S.midpoint(a,b);nx=q[0];ny=q[1];h.x(C(nx));h.y(C(ny));}
        else if(ev.shiftKey){const o=h._o||[nx,ny];const q=S.axisLock(nx,ny,o[0],o[1]);nx=q[0];ny=q[1];h.x(C(nx));h.y(C(ny));}
        rt._pts[idx]=[r1(nx),r1(ny)];syncRouteLine(rt);});
      h.on('dragend',()=>{ghost(false);selHandleIdx=idx;refreshPathEdit();commit();});
      h.on('click tap',e=>{e.cancelBubble=true;selHandleIdx=idx;refreshPathEdit();});
      h.on('mouseenter',()=>stage.container().style.cursor='pointer');
      h.on('mouseleave',()=>stage.container().style.cursor=spaceDown?'grab':'crosshair');
      gEdit.add(h);});
    renderRouteInspector();syncRoutePanel();
    draw();}
  function addRoutePoint(x,y){const rt=activeRoutes()[curRoute];if(!rt)return;if(!rt._pts)rt._pts=S.parsePts(rt.points);rt._pts.push([r1(x),r1(y)]);selHandleIdx=rt._pts.length-1;syncRouteLine(rt);refreshPathEdit();commit();}
  function insertRoutePoint(rt){const p=stage.getPointerPosition();const mx=U((p.x-stage.x())/stage.scaleX()),my=U((p.y-stage.y())/stage.scaleY());
    let best=1,bd=1e9;for(let i=0;i<rt._pts.length-1;i++){const d=S.segDist(mx,my,rt._pts[i],rt._pts[i+1]);if(d<bd){bd=d;best=i+1;}}
    rt._pts.splice(best,0,[r1(mx),r1(my)]);selHandleIdx=best;syncRouteLine(rt);refreshPathEdit();commit();}
  function deleteSelHandle(){const rt=activeRoutes()[curRoute];if(!rt||selHandleIdx<0||rt._pts.length<=2)return;rt._pts.splice(selHandleIdx,1);selHandleIdx=-1;syncRouteLine(rt);refreshPathEdit();commit();}
  function undoLastPoint(){const rt=activeRoutes()[curRoute];if(!rt||rt._pts.length<=2)return;rt._pts.pop();selHandleIdx=-1;syncRouteLine(rt);refreshPathEdit();commit();}
  function updatePathUI(){const isPath=tool==='path';
    document.getElementById('pathCtx').style.display=isPath?'inline-flex':'none';
    if(isPath)buildRoutePicker();}
  function buildRoutePicker(){const f=FL[curIdx],routes=f.routes||[],host=document.getElementById('pathCtx'),bn={};(f.bosses||[]).forEach(b=>bn[b.n]=b);
    let h='<span style="color:var(--dim);font-size:11px">Tronçon :</span>';
    routes.forEach((rt,i)=>{const b=bn[rt.n],col=rt.c1||elc(rt.el||(b&&b.el));const nm=rt.name?esc(rt.name):(b?rt.n+' '+esc(b.name):'Tracé '+(rt.n!=null?rt.n:i+1));h+='<button class="rchip'+(i===curRoute?' on':'')+'" data-r="'+i+'" style="--rc:'+col+'">'+nm+'</button>';});
    h+='<button class="rchip mini" id="rNew" title="Nouveau tracé indépendant" aria-label="Nouveau tracé"><svg class="bi" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>';
    h+='<button class="rchip mini" id="rDel" title="Supprimer ce tracé" aria-label="Supprimer ce tracé"><svg class="bi" viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7v13a1 1 0 001 1h10a1 1 0 001-1V7M10 11v6M14 11v6"/></svg></button>';
    h+='<button class="rchip mini" id="rUndo" title="Retirer le dernier point (Ctrl+Z)" aria-label="Annuler"><svg class="bi" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 010 10H9"/></svg></button>';
    host.innerHTML=h;
    host.querySelectorAll('.rchip[data-r]').forEach(btn=>btn.addEventListener('click',()=>{curRoute=+btn.dataset.r;selHandleIdx=-1;buildRoutePicker();refreshPathEdit();}));
    document.getElementById('rNew').addEventListener('click',addNewRoute);
    document.getElementById('rDel').addEventListener('click',deleteRoute);
    document.getElementById('rUndo').addEventListener('click',undoLastPoint);}
  // l'inspecteur ne configure plus le tracé : il ne garde que l'aide (raccourcis d'édition des points)
  function renderRouteInspector(){if(tool!=='path')return;const routes=activeRoutes(),body=document.getElementById('inspBody');
    if(!routes.length){body.innerHTML='<div class="empty">Aucun tracé. Clique sur ＋ dans la barre du haut pour en créer un.</div>';setInspTitle('Tracés');return;}
    const rt=routes[curRoute];if(!rt)return;
    setInspTitle('Tracé '+(rt.n!=null?rt.n:curRoute+1),S.couleurSure(rt.c1,elc(rt.el)));
    body.innerHTML='<div class="hintbox">Les réglages du tracé (nom, couleur, opacité, largeur, suppression) sont dans la <b>carte flottante posée au milieu du tracé</b>.<br><br>'+
      '<b>Clic</b> = ajouter un point · <b>glisser</b> = déplacer · <b>double-clic</b> sur le tracé = insérer · <b>Suppr</b> = retirer.<br>'+
      '<b>Maj</b>+glisser = axe horizontal/vertical · <b>Ctrl</b>+glisser = centrer entre voisins · <b>Ctrl+Maj</b>+glisser = aligner sur la droite préc→suiv.</div>';}

  /* ---- Carte flottante du tracé : ancrée au milieu du tracé, elle suit zoom/pan ---- */
  let panelRoute=null;
  function routeMid(rt){const p=(rt&&rt._pts)||[];
    if(!p.length)return {x:C(50),y:C(50)};
    if(p.length===1)return {x:C(p[0][0]),y:C(p[0][1])};
    const i=Math.floor((p.length-1)/2),m=S.midpoint(p[i],p[i+1]);
    return {x:C(m[0]),y:C(m[1])};}
  // (ré)ouvre la carte seulement quand le tracé courant change — sinon on repositionne
  function syncRoutePanel(){
    if(tool!=='path'){if(panelRoute){closeMapPanel();panelRoute=null;}return;}
    const rt=activeRoutes()[curRoute];
    if(!rt){if(panelRoute){closeMapPanel();panelRoute=null;}return;}
    if(panelRoute!==rt||!mapPanel){openRoutePanel(rt);return;}
    const c=document.getElementById('rp_pcount');if(c)c.textContent=rt._pts.length;
    positionMapPanel();}
  function openRoutePanel(rt){
    const f=FL[curIdx],bn={};(f.bosses||[]).forEach(b=>bn[b.n]=b);const b=bn[rt.n];
    const defName=b?(rt.n+' · '+b.name):('Tracé '+(rt.n!=null?rt.n:curRoute+1));
    const curCol=rt.c1||elc(rt.el)||BK.FALLBACK;
    let h='<div class="mptitle" style="--dot:'+curCol+'">Tracé '+(rt.n!=null?rt.n:curRoute+1)+(b?' · '+esc(b.name):'')+'</div>';
    h+='<div class="mprow"><span class="mplbl">Nom</span><input class="mpin" id="rp_name" type="text" value="'+esc(rt.name||'')+'" placeholder="'+esc(defName)+'"></div>';
    h+='<div class="mprow"><span class="mplbl">Couleur</span><input class="mpcol" id="rp_c1" type="color" value="'+curCol+'"><div class="mpsw" id="rp_sw"></div></div>';
    h+='<div class="mprow"><span class="mplbl">Opacité</span><input class="mprange" id="rp_a" type="range" min="0" max="100" value="'+Math.round(ra(rt)*100)+'"><span class="mpval" id="rp_av">'+Math.round(ra(rt)*100)+'%</span></div>';
    h+='<div class="mprow"><span class="mplbl">Largeur</span><input class="mprange" id="rp_fs" type="range" min="40" max="220" value="'+Math.round(fsz(rt)*100)+'"><span class="mpval" id="rp_fsv">'+Math.round(fsz(rt)*100)+'%</span></div>';
    h+='<div class="mpacts"><button class="mpbtn primary" id="rp_reset" title="Reprendre la couleur de l’élément du boss">'+RESET_SVG+' Couleur du boss</button>'+
       '<button class="mpbtn danger" id="rp_del" title="Supprimer ce tracé">'+TRASH_SVG+'</button></div>';
    h+='<div class="mpnote"><span id="rp_pcount">'+((rt._pts||[]).length)+'</span> points · clic = ajouter · dbl-clic = insérer · Suppr = retirer</div>';
    openMapPanel(rt,()=>routeMid(rt),h,()=>{
      panelRoute=rt;
      const nm=document.getElementById('rp_name');
      nm.addEventListener('input',()=>{rt.name=nm.value;buildRoutePicker();commitSoon();});
      const setCol=hex=>{rt.c1=hex;applyRouteColors(rt);buildRoutePicker();
        const t=document.querySelector('#mappanel .mptitle');if(t)t.style.setProperty('--dot',hex);
        const ci=document.getElementById('rp_c1');if(ci&&ci.value!==hex)ci.value=hex;};
      document.getElementById('rp_c1').addEventListener('input',e=>setCol(e.target.value));
      const sw=document.getElementById('rp_sw');S.EL_KEYS.forEach(k=>{const d=document.createElement('div');
        d.className='sw';d.style.background=elc(k);d.title=k;d.addEventListener('click',()=>setCol(elc(k)));sw.appendChild(d);});
      const ai=document.getElementById('rp_a');ai.addEventListener('input',()=>{rt.a=(+ai.value)/100;document.getElementById('rp_av').textContent=(+ai.value)+'%';applyRouteColors(rt);});
      const fi=document.getElementById('rp_fs');fi.addEventListener('input',()=>{rt.fs=(+fi.value)/100;document.getElementById('rp_fsv').textContent=(+fi.value)+'%';applyBandSize(rt);});
      document.getElementById('rp_reset').addEventListener('click',()=>{delete rt.c1;applyRouteColors(rt);buildRoutePicker();panelRoute=null;syncRoutePanel();});
      document.getElementById('rp_del').addEventListener('click',()=>deleteRoute());   // annuler laisse la carte en place
    });}

  /* ============================================================
     7 · SÉLECTION + INSPECTEUR (marqueurs / numéros)
     ============================================================ */
  // titre + pastille de couleur de l'inspecteur reflètent ce qu'on édite
  function setInspTitle(t,color){const el=document.getElementById('inspTitle');if(el)el.textContent=t;const d=document.getElementById('inspDot');if(d){const c=S.couleurSure(color,'var(--cyan)');d.style.background=c;d.style.boxShadow='0 0 8px '+c;}}
  const isMobile=()=>window.matchMedia('(max-width:820px)').matches;
  function openInsp(){if(isMobile())document.body.classList.add('insp-open');}
  function closeInsp(){document.body.classList.remove('insp-open');}
  function select(node){
    // en cours d'édition sur la carte : sélectionner un AUTRE objet ferme l'éditeur / la carte de propriétés d'abord
    if(mapEd&&(!node||!node._meta||node._meta.o!==mapEd.cfg.o))closeMapEdit();
    if(mapPanel&&node!==mapPanel.node)closeMapPanel();
    layer.find('.selring').forEach(r=>r.destroy());selNode=node;const body=document.getElementById('inspBody');
    if(!node){body.innerHTML='<div class="empty">Sélectionne un objet sur la carte (clic), puis <b>glisse-le</b> ou règle-le dans sa carte flottante.</div>';setInspTitle('Inspecteur');closeInsp();
      detachTransformer();draw();return;}
    drawRing(node);renderInspector(node._meta);openInsp();
    attachTransformer(node&&node._meta&&node._meta.kind==='shape'?node:null);
    draw();
  }
  function drawRing(node){layer.find('.selring').forEach(r=>r.destroy());
    if(node._meta&&node._meta.kind==='shape')return;      // les poignees du transformer tiennent lieu de cadre
    const bb=node.getClientRect({relativeTo:layer});
    gPins.add(new Konva.Rect({x:bb.x-6,y:bb.y-6,width:bb.width+12,height:bb.height+12,stroke:'#54d1c4',strokeWidth:2,dash:[6,4],cornerRadius:8,listening:false,name:'selring'}));}
  function liveUpdate(){if(selNode)drawRing(selNode);
    if(selNode){const o=selNode._meta.o,mk=selNode._meta.kind;
      if(mk==='marker'){setVal('nx',o.nx);setVal('ny',o.ny);}else{setVal('x',o.x);setVal('y',o.y);}}
    if(mapEd)positionMapEdit();if(mapPanel)positionMapPanel();draw();commitSoon();}
  function setVal(id,v){const el=document.getElementById('f_'+id);if(el&&document.activeElement!==el)el.value=v;}

  function renderInspector(m){const o=m.o,body=document.getElementById('inspBody');
    if(m.kind==='marker'){setInspTitle('Numéro · '+o.name,elc(o.el));body.innerHTML=
      '<div class="fld"><label>Numéro du marqueur</label><div class="in">'+esc(o.name)+' · n°'+o.n+'</div></div>'+
      '<div class="fld two"><div><label>nx (%)</label><input id="f_nx" type="number" step="0.1" value="'+o.nx+'"></div><div><label>ny (%)</label><input id="f_ny" type="number" step="0.1" value="'+o.ny+'"></div></div>'+
      '<div class="hintbox">Glisse le numéro sur la carte, ou ajuste nx/ny. Il s’affiche près du boss.</div>';
      bindNum('nx',v=>{o.nx=v;o._mk.x(C(v));liveUpdate();});bindNum('ny',v=>{o.ny=v;o._mk.y(C(v));liveUpdate();});return;}
    if(m.kind==='shape'){const nom={rect:'Rectangle',ell:'Ellipse',img:'Image'}[o.k]||'Forme';
      setInspTitle(nom,o.k==='img'?'var(--violet)':shColor(o));
      body.innerHTML='<div class="hintbox"><b>Clique</b> la forme sur la carte : sa carte de réglages s\u2019ouvre à côté (couleur, opacité, contour, taille). <b>Glisse</b> la forme sur la carte pour la déplacer.</div>';
      openShapePanel(o);return;}
    if(m.kind==='text'){renderTextInspector(o);return;}
    if(m.kind==='ico'){setInspTitle('Icône · '+S.icoNom(o.ico),o.c||'var(--cyan)');
      body.innerHTML='<div class="hintbox"><b>Clique</b> l’icône sur la carte : sa carte de réglages s’ouvre à côté (couleur du dessin, contour noir ou blanc, taille, position du label). <b>Glisse</b> l’icône pour la déplacer, « <b>Éditer le label</b> » pour le texte, la corbeille pour la supprimer.</div>';
      openIcoPanel(o);return;}
    // boss / pack / mid : réglages sur la carte (carte flottante), inspecteur = simple astuce cohérente avec le texte
    const kindLbl=(TYPE[m.kind]||{}).titre;
    setInspTitle(kindLbl+' · '+o.name,elc(o.el));
    body.innerHTML='<div class="hintbox"><b>Clique</b> le marqueur sur la carte : sa carte de réglages s’ouvre à côté (élément, position du label, quantité, masquer). <b>Glisse</b> le marqueur pour le déplacer, « <b>Éditer le label</b> » pour le texte, la corbeille pour le supprimer.</div>';
    openPinPanel(o,m.kind);
  }
  // inspecteur d'un texte — mini-éditeur façon traitement de texte
  //   police · taille · gras/italique/souligné/barré · couleur · surlignage · alignement · listes · contour
  // inspecteur d'un texte : tout se fait sur la carte → juste une astuce
  function renderTextInspector(o){const body=document.getElementById('inspBody');setInspTitle('Texte',o.c||'var(--cyan)');
    body.innerHTML='<div class="hintbox"><b>Clique</b> le texte sur la carte pour l’éditer — la barre d’outils regroupe tout (gras, italique, couleur, alignement, listes, taille, police, fond, contour). <b>Glisse</b> le texte (ou la poignée du popover) pour le déplacer. <b>Suppr</b>, ou la corbeille du popover, pour le supprimer.</div>';}
  function bindNum(id,fn){const el=document.getElementById('f_'+id);if(!el)return;el.addEventListener('input',()=>{const v=parseFloat(el.value);if(!isNaN(v))fn(r1(v));});}
  function pinNode(o){return gPins.getChildren().find(n=>n.name()==='pin'&&n._meta&&n._meta.o===o);}
  // n° d'ordre disponibles sur l'étage courant = ceux des boss (c'est la clé qui relie
  // un pack à sa phase (ph) et un tracé à son boss (n) dans data.js).
  function phaseChoices(){const f=FL[curIdx];const ns=[...new Set((f.bosses||[]).map(b=>b.n).filter(n=>n!=null))].sort((a,b)=>a-b);
    return ns.length?ns:[1,2,3,4];}
  // PHASES / PHASES_B sont écrits à la main : l'éditeur ne peut que signaler le décalage
  function phaseExists(n){const f=FL[curIdx];return (f.phases||[]).some(p=>p.n===n);}
  function relabel(o){const g=pinNode(o);if(!g||!g._lbl)return;buildLabelContent(g._lbl,o);g._lbl.visible(!o.hl);placeLabel(g);draw();commitSoon();}
  function recolor(o){const g=pinNode(o),col=elc(o.el);if(g){const im=g.findOne('Image');if(im)im.shadowColor(col);const c=g.findOne('Circle');if(c)c.stroke(col);const tag=g._lbl&&g._lbl._bg;if(tag)tag.stroke(col);}
    if(o._mk){const inner=o._mk.getChildren()[2];inner.fill(col);inner.shadowColor(col);}draw();commitSoon();}

  /* ============================================================
     ÉDITION DIRECTE SUR LA CARTE — overlay contenteditable + barre flottante
     Sert aux annotations (champ t) ET aux labels de marqueurs (champ label).
     ============================================================ */
  let mapEd=null,mapPanel=null;
  function ensureMapEditEl(){let w=document.getElementById('mapedit');if(!w){w=document.createElement('div');w.id='mapedit';stageWrap.appendChild(w);}return w;}
  function ensurePanelEl(){let w=document.getElementById('mappanel');if(!w){w=document.createElement('div');w.id='mappanel';stageWrap.appendChild(w);}return w;}
  function placeCaretEnd(el){const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
  // ancre le popover au texte + le garde dans les bords (bascule au-dessus/dessous, décalage horizontal)
  // positionne un popover flottant (édition texte OU carte de propriétés) : ancre + bascule dessus/dessous + clamp horizontal
  //   off = écart choisi à la poignée. Tant qu'il est nul, la boîte est collée à son objet et
  //   bascule dessus/dessous selon la place. Dès qu'on l'a déplacée, elle garde cet écart (donc
  //   elle suit toujours l'objet au zoom et au pan), on fige la bascule pour qu'elle ne saute pas
  //   en plein glisser, on la borne dans le cadre, et la flèche qui pointait l'objet disparaît.
  //   L'ancre peut fournir y2 = bas de l'objet. Sans lui, basculer « dessous » repartait du HAUT
  //   de l'objet, donc la carte se posait SUR lui : pour une grande forme elle la recouvrait
  //   entierement, et plus aucun clic n'atteignait le canvas (ni deplacement, ni selection).
  function positionFloat(w,anchorFn,off,noFlip){const s=stage.scaleX(),a=anchorFn();
    const dx=(off&&off.x)||0, dy=(off&&off.y)||0, bouge=!!(dx||dy);
    const sx=stage.x()+a.x*s+dx, sy=stage.y()+a.y*s+dy, card=w.firstElementChild;
    w.style.left=sx+'px';w.style.top=sy+'px';if(!card)return;const wr=stageWrap.getBoundingClientRect();
    if(bouge||noFlip){
      w.classList.remove('below');card.style.transform='translate(-50%,-100%)';
      const r=card.getBoundingClientRect();let mx=0,my=0;
      if(r.left<wr.left+6)mx=(wr.left+6)-r.left;else if(r.right>wr.right-6)mx=(wr.right-6)-r.right;
      if(r.top<wr.top+6)my=(wr.top+6)-r.top;else if(r.bottom>wr.bottom-6)my=(wr.bottom-6)-r.bottom;
      if(mx||my)card.style.transform='translate(calc(-50% + '+mx+'px),calc(-100% + '+my+'px))';
      w.classList.toggle('moved',bouge||!!my);     // bornee en hauteur : la fleche ne pointe plus rien
      card.style.setProperty('--arrow','calc(50% - '+mx+'px)');
      return;}
    w.classList.remove('moved');
    w.classList.remove('below');card.style.transform='translate(-50%,-100%)';
    if(card.getBoundingClientRect().top<wr.top+6){          // pas la place au-dessus : on passe dessous
      w.classList.add('below');
      if(a.y2!=null)w.style.top=(stage.y()+a.y2*s+dy)+'px'; // ... a partir du BAS de l'objet
      card.style.transform='translate(-50%,0)';}
    const r=card.getBoundingClientRect();let sh=0;
    if(r.left<wr.left+6)sh=(wr.left+6)-r.left;else if(r.right>wr.right-6)sh=(wr.right-6)-r.right;
    if(sh){card.style.transform='translate(calc(-50% + '+sh+'px),'+(w.classList.contains('below')?'0':'-100%')+')';
      card.style.setProperty('--arrow','calc(50% - '+sh+'px)');}else card.style.setProperty('--arrow','50%');}
  // écart de la carte de propriétés : conservé d'un objet à l'autre — une fois écartée du chemin,
  // elle doit le rester pour le marqueur suivant, sinon on la repousse à chaque pose.
  let panelOff={x:0,y:0};
  function positionMapEdit(){if(!mapEd)return;positionFloat(mapEd.wrap,mapEd.cfg.anchor);}
  function positionMapPanel(){if(!mapPanel)return;positionFloat(mapPanel.wrap,mapPanel.anchor,panelOff,mapPanel.noFlip);}
  /* ---- glisser une boîte flottante par sa barre de titre (comme une fenêtre) ---- */
  // Toute la zone haute déplace la boîte, sauf les commandes qu'elle contient (segments,
  // recherche, fermeture) : sur celles-là on laisse l'événement suivre son cours, sans quoi
  // le champ de recherche ne prendrait plus le focus.
  const CMD='button,input,select,textarea,label,.sw,a';
  function wireBoxDrag(barre,debut,pendant,fin){if(!barre)return;
    barre.classList.add('boxdrag');
    barre.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest(CMD))return;
      e.preventDefault();e.stopPropagation();
      const sx=e.clientX,sy=e.clientY,base=debut();
      try{barre.setPointerCapture(e.pointerId);}catch(_){}
      barre.classList.add('grabbing');
      const mv=ev=>pendant(base,ev.clientX-sx,ev.clientY-sy);
      const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
        barre.classList.remove('grabbing');if(fin)fin();};
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);});}
  // poignée : glisser déplace le texte (annotations : o.x/o.y libres)
  function wireGrip(grip){if(!grip)return;
    grip.addEventListener('pointerdown',e=>{e.preventDefault();if(!mapEd)return;const o=mapEd.cfg.o,sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y,sc=stage.scaleX();
      try{grip.setPointerCapture(e.pointerId);}catch(_){}
      const onMove=ev=>{o.x=r1(S.clamp(ox+U((ev.clientX-sx)/sc)));o.y=r1(S.clamp(oy+U((ev.clientY-sy)/sc)));if(mapEd&&mapEd.cfg.onInput)mapEd.cfg.onInput();positionMapEdit();};
      const onUp=()=>{document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);commit();};
      document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp);});}
  const GRIP_SVG='<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
  // réglages « bloc » (annotations) sous la zone de saisie : taille · police · fond · contour
  function addBlockControls(cfg,ed){const o=cfg.o,sz=Math.round((o.s||1.5)*10)/10;
    const html='<div class="meblock">'+
      '<span class="melbl">Taille</span><input type="range" id="mped_s" min="1.2" max="8" step="0.1" value="'+sz+'"><span id="mped_sv" class="melbl" style="min-width:32px">'+sz+'%</span>'+
      '<div class="meseg" id="mped_font">'+[['mono','Mono'],['sans','Sans'],['serif','Serif']].map(f=>'<button data-f="'+f[0]+'"'+(((o.f)||'mono')===f[0]?' class="on"':'')+'>'+f[1]+'</button>').join('')+'</div>'+
      // couleur du BLOC : couleur par défaut du texte, et couleur du disque en mode Puce
      '<input type="color" id="mped_c" value="'+(o.c||'#ffffff')+'" title="Couleur du bloc (texte, ou disque de la puce)" style="width:34px;height:22px;padding:1px;background:rgba(0,0,0,.3);border:1px solid var(--line);border-radius:6px;cursor:pointer">'+
      '<label class="mechk"><input type="checkbox" id="mped_bg"'+(o.bg?' checked':'')+'> Fond</label>'+
      '<label class="mechk"><input type="checkbox" id="mped_ol"'+(S.textOutline(o)?' checked':'')+'> Contour</label>'+
      '<label class="mechk" title="Pastille ronde de la couleur choisie, comme le numéro d’un boss"><input type="checkbox" id="mped_pill"'+(o.sh==='pill'?' checked':'')+'> Puce</label>'+
      '<button class="metrash" id="mped_del" title="Supprimer ce texte"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7v13a1 1 0 001 1h10a1 1 0 001-1V7M10 11v6M14 11v6"/></svg></button></div>';
    ed.insertAdjacentHTML('afterend',html);ed.style.fontFamily=S.textFont(o);
    const del=document.getElementById('mped_del');if(del)del.addEventListener('click',()=>{del.blur();askConfirm('Supprimer ce texte ? Il sera retiré de data.js au prochain enregistrement.',{title:'Supprimer le texte'}).then(v=>{if(!v)return;
      if(mapEd&&mapEd.cfg.o===o){mapEd=null;const w=document.getElementById('mapedit');if(w){w.classList.remove('on','below');w.innerHTML='';}}
      deleteText(o);});});
    const ss=document.getElementById('mped_s');ss.addEventListener('input',()=>{o.s=Math.round(parseFloat(ss.value)*10)/10;document.getElementById('mped_sv').textContent=o.s+'%';if(cfg.onInput)cfg.onInput();positionMapEdit();});
    document.querySelectorAll('#mped_font button[data-f]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());
      b.addEventListener('click',()=>{if(b.dataset.f==='mono')delete o.f;else o.f=b.dataset.f;document.querySelectorAll('#mped_font button').forEach(x=>x.classList.remove('on'));b.classList.add('on');ed.style.fontFamily=S.textFont(o);if(cfg.onInput)cfg.onInput();positionMapEdit();});});
    const bg=document.getElementById('mped_bg'),ol=document.getElementById('mped_ol'),pill=document.getElementById('mped_pill');
    bg.addEventListener('change',()=>{if(bg.checked)o.bg=1;else delete o.bg;if(o.ol==null)ol.checked=S.textOutline(o);if(cfg.onInput)cfg.onInput();});
    ol.addEventListener('change',()=>{o.ol=ol.checked?1:0;if(cfg.onInput)cfg.onInput();});
    const ci=document.getElementById('mped_c');
    if(ci)ci.addEventListener('input',()=>{o.c=ci.value;if(cfg.onInput)cfg.onInput();});
    if(pill)pill.addEventListener('change',()=>{
      if(pill.checked){o.sh='pill';bg.checked=false;delete o.bg;
        // le texte d'une puce est forcé en blanc : un disque blanc par défaut serait illisible
        if(!o.c||o.c.toLowerCase()==='#ffffff'){o.c=S.EL_HEX.gray;if(ci)ci.value=o.c;}}
      else delete o.sh;
      if(cfg.onInput)cfg.onInput();positionMapEdit();});}
  function openMapEdit(cfg){closeMapEdit();closeMapPanel();mapEd={wrap:ensureMapEditEl(),cfg:cfg};const w=mapEd.wrap;
    w.innerHTML='<div class="mecard">'+RICH.toolbarHtml('mped')+'<div id="mped" class="mped" contenteditable="true" spellcheck="false" data-ph="'+esc(cfg.placeholder||'texte…')+'"></div></div>';
    const tb=document.getElementById('mped_tb');
    tb.insertAdjacentHTML('beforeend','<span class="rsep"></span>'+
      '<button data-list="b" title="Liste à puces">•</button><button data-list="n" title="Liste numérotée">1.</button><button data-list="" title="Ligne normale" style="font-size:12px">Aa</button>');
    if(cfg.block){tb.insertAdjacentHTML('afterbegin','<button class="megrip" title="Glisser pour déplacer le texte">'+GRIP_SVG+'</button><span class="rsep"></span>');wireGrip(tb.querySelector('.megrip'));}
    const ed=document.getElementById('mped');mapEd.ed=ed;
    if(cfg.block)addBlockControls(cfg,ed);
    RICH.wire('mped',cfg.o,cfg.field,()=>{if(cfg.onInput)cfg.onInput();positionMapEdit();});
    tb.querySelectorAll('button[data-list]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());
      b.addEventListener('click',()=>{RICH.applyList(cfg.o,b.dataset.list,'mped',cfg.field);if(cfg.onInput)cfg.onInput();positionMapEdit();});});
    ed.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMapEdit();}});
    w.classList.add('on');positionMapEdit();ed.focus();placeCaretEnd(ed);}
  function closeMapEdit(){if(!mapEd)return;const c=mapEd.cfg,ed=mapEd.ed;if(ed&&ed._sync)ed._sync();
    const w=mapEd.wrap;mapEd=null;w.classList.remove('on','below');w.innerHTML='';if(c.commit)c.commit();commit();}
  function editTextOnMap(o){const g=textNode(o);if(!g)return;
    openMapEdit({o:o,field:'t',block:true,anchor:()=>({x:C(o.x),y:C(o.y)}),placeholder:'écris ton texte…',
      onInput:()=>refreshText(o),
      commit:()=>{if(!o.t||!o.t.replace(/<[^>]*>/g,'').trim()){deleteText(o);return;}refreshText(o);if(selNode===g)drawRing(g);draw();}});}
  function editLabelOnMap(o){const g=pinNode(o);if(!g||!g._lbl)return;const kind=g._meta.kind;closeMapPanel();
    openMapEdit({o:o,field:'label',anchor:()=>{const bb=g._lbl.getClientRect({relativeTo:layer});return {x:bb.x+bb.width/2,y:bb.y+bb.height/2};},placeholder:esc(o.name),
      onInput:()=>relabel(o),
      commit:()=>{if(!o.label||!o.label.replace(/<[^>]*>/g,'').trim())delete o.label;relabel(o);
        if(selNode===g)openPinPanel(o,kind);}});}   // rouvre la carte de propriétés après édition du label
  /* ---- Carte flottante de propriétés (marqueurs) : même ergonomie que l'édition de texte ---- */
  function closeMapPanel(){if(!mapPanel)return;const w=mapPanel.wrap;mapPanel=null;w.classList.remove('on','below');w.innerHTML='';}
  function openMapPanel(o,anchorFn,html,wire,noFlip){closeMapPanel();const w=ensurePanelEl();mapPanel={wrap:w,anchor:anchorFn,o:o,noFlip:!!noFlip};
    w.innerHTML='<div class="mecard">'+html+'</div>';w.classList.add('on');positionMapPanel();if(wire)wire(w);
    // la barre de titre déplace la carte, quel qu'en soit le contenu
    const ttl=w.querySelector('.mptitle');
    if(ttl){ttl.title='Glisser pour déplacer cette carte · double-clic pour la remettre en place';
      wireBoxDrag(ttl,()=>({x:panelOff.x,y:panelOff.y}),(base,dx,dy)=>{panelOff={x:base.x+dx,y:base.y+dy};positionMapPanel();});
      ttl.addEventListener('dblclick',e=>{if(e.target.closest(CMD))return;e.preventDefault();panelOff={x:0,y:0};positionMapPanel();});}}
  const TRASH_SVG='<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7v13a1 1 0 001 1h10a1 1 0 001-1V7M10 11v6M14 11v6"/></svg>';
  const PENCIL_SVG='<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
  const RESET_SVG='<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9 9 9 0 01-7.5-4M3 12a9 9 0 019-9 9 9 0 017.5 4"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>';
  function openPinPanel(o,kind){const g=pinNode(o);if(!g)return;const col=elc(o.el);
    const anchor=()=>{const bb=g.getClientRect({relativeTo:layer});return {x:bb.x+bb.width/2,y:bb.y,y2:bb.y+bb.height};};
    const kindLbl=(TYPE[kind]||{}).titre||'Marqueur';
    let h='<div class="mptitle" style="--dot:'+col+'">'+kindLbl+' · '+esc(o.name)+'</div>';
    h+='<div class="mprow"><span class="mplbl">Élément</span><div class="mpsw" id="mp_el"></div></div>';
    // n° d'ordre du boss : c'est lui qui relie le marqueur à sa phase, son onglet et son tracé
    if(kind==='boss')h+='<div class="mprow"><span class="mplbl">N° d’ordre</span><input class="mpin" id="mp_n" type="number" min="1" step="1" style="flex:none;width:62px" value="'+(o.n!=null?o.n:1)+'"></div>'+
      '<div class="mpwarn" id="mp_nwarn"></div>';
    if(kind==='pack'){
      h+='<div class="mprow"><span class="mplbl">Quantité</span><input class="mpin" id="mp_q" type="text" value="'+esc(o.q||'')+'"></div>';
      // sans ce réglage, tout pack créé restait sur ph:1 et n'apparaissait que dans la phase 1 du guide
      h+='<div class="mprow"><span class="mplbl">Phase</span><div class="mpseg" id="mp_ph">'+
         phaseChoices().map(n=>'<button data-ph="'+n+'"'+((o.ph||1)===n?' class="on"':'')+'>'+n+'</button>').join('')+'</div></div>';
    }
    h+='<div class="mprow"><span class="mplbl">Label</span><div class="mpseg" id="mp_lp">'+
       ['top','left','bottom','right'].map(d=>'<button data-lp="'+d+'" title="Label en '+({top:'haut',left:'gauche',bottom:'bas',right:'droite'}[d])+'"'+((o.lp||'bottom')===d?' class="on"':'')+'>'+({top:'↑',left:'←',bottom:'↓',right:'→'}[d])+'</button>').join('')+'</div></div>';
    h+='<div class="mprow"><label class="mpchk"><input type="checkbox" id="mp_hl"'+(o.hl?' checked':'')+'> Masquer le label</label></div>';
    if(kind==='boss')h+='<div class="mprow"><label class="mpchk"><input type="checkbox" id="mp_num"'+(o.nx!=null?' checked':'')+'> Pastille numérotée sur la carte</label></div>';
    h+='<div class="mpacts"><button class="mpbtn primary" id="mp_edlbl">'+PENCIL_SVG+' Éditer le label</button>'+
       '<button class="mpbtn danger" id="mp_del" title="Supprimer ce marqueur">'+TRASH_SVG+'</button></div>';
    openMapPanel(o,anchor,h,()=>{
      mapPanel.node=g;
      const sw=document.getElementById('mp_el');S.EL_KEYS.forEach(k=>{const b=document.createElement('div');b.className='sw'+(o.el===k?' on':'');b.style.background=elc(k);b.title=k;
        b.addEventListener('click',()=>{o.el=k;recolor(o);const t=document.querySelector('#mappanel .mptitle');if(t)t.style.setProperty('--dot',elc(k));[...sw.children].forEach(c=>c.classList.remove('on'));b.classList.add('on');});sw.appendChild(b);});
      if(kind==='boss'){const ni=document.getElementById('mp_n'),wn=document.getElementById('mp_nwarn');
        const checkN=()=>{if(!wn)return;const f=FL[curIdx];const dup=(f.bosses||[]).some(b=>b!==o&&b.n===o.n);
          const orphan=!phaseExists(o.n);
          wn.classList.toggle('on',dup||orphan);
          wn.innerHTML=dup?('⚠ le n° '+o.n+' est déjà pris par un autre boss de cet étage.')
            :(orphan?('⚠ aucune phase n°'+o.n+' dans data.js : le boss s’affichera sur la carte mais sans strat ni onglet.'):'');};
        if(ni)ni.addEventListener('input',()=>{const v=parseInt(ni.value,10);if(isNaN(v)||v<1)return;o.n=v;
          if(o._mk){const t=o._mk.findOne('Text');if(t){t.text(String(v));draw();}}
          checkN();commitSoon();});
        checkN();}
      if(kind==='pack'){const qi=document.getElementById('mp_q');if(qi)qi.addEventListener('input',()=>{o.q=qi.value;relabel(o);positionMapPanel();});
        document.querySelectorAll('#mp_ph button[data-ph]').forEach(btn=>btn.addEventListener('click',()=>{
          o.ph=+btn.dataset.ph;lastPh=o.ph;   // mémorisé : poser une série de packs pour la même phase
          document.querySelectorAll('#mp_ph button[data-ph]').forEach(x=>x.classList.remove('on'));btn.classList.add('on');commitSoon();}));}
      document.querySelectorAll('#mp_lp button[data-lp]').forEach(btn=>btn.addEventListener('click',()=>{o.lp=btn.dataset.lp;placeLabel(pinNode(o));draw();document.querySelectorAll('#mp_lp button[data-lp]').forEach(x=>x.classList.remove('on'));btn.classList.add('on');commitSoon();}));
      const hi=document.getElementById('mp_hl');if(hi)hi.addEventListener('change',()=>{if(hi.checked)o.hl=1;else delete o.hl;relabel(o);});
      /* Le rond numerote se pose et se retire ici. Il vit a cote du marqueur,
         avec ses propres coordonnees : on l'allume, il apparait sous le boss,
         et on le glisse ou on veut. */
      const nb=document.getElementById('mp_num');
      if(nb)nb.addEventListener('change',e=>{
        if(e.target.checked){o.nx=r1(o.x);o.ny=r1(S.clamp(o.y+6));
          if(!o._mk)addMarker(o,elc(o.el),gPins);}
        else{if(o._mk){o._mk.destroy();o._mk=null;}delete o.nx;delete o.ny;}
        buildLayers();draw();commitSoon();});
      document.getElementById('mp_edlbl').addEventListener('click',()=>editLabelOnMap(o));
      const del=document.getElementById('mp_del');if(del)del.addEventListener('click',()=>{del.blur();askConfirm('Supprimer le marqueur <b>'+esc(o.name)+'</b> ? Il sera retiré de data.js au prochain enregistrement.',{title:'Supprimer le marqueur'}).then(v=>{if(v){closeMapPanel();deletePin(o,kind);}});});
    });}

  /* La carte de reglages d'une ICONE. Elle ressemble a celle d'un marqueur,
     mais sa couleur est LIBRE : pas les douze elements, un simple selecteur.
     Les elements n'ont aucun jaune, et un job buff en a besoin — et surtout
     une icone n'appartient a aucun element, elle dit une consigne. */
  function openIcoPanel(o){const g=pinNode(o);if(!g)return;const nom=S.icoNom(o.ico);
    const anchor=()=>{const bb=g.getClientRect({relativeTo:layer});return {x:bb.x+bb.width/2,y:bb.y,y2:bb.y+bb.height};};
    const roles=[['tank','Tank'],['heal','Soin'],['dd','Dégâts'],['buff','Buffs'],['all','Neutre']];
    let h='<div class="mptitle" style="--dot:'+esc(o.c||'#8a94a6')+'">Icône · '+esc(nom)+'</div>';
    h+='<div class="mprow"><span class="mplbl">Couleur</span><div class="mpsw" id="mp_ic"></div>'+
       '<input class="mpcol" id="mp_icc" type="color" value="'+esc(o.c||'#8a94a6')+'" title="Une autre couleur"></div>';
    // Le contour : noir sur un fond clair, blanc sur une salle sombre. C'est le
    // lead qui voit sa carte, pas nous — on lui laisse les deux.
    h+='<div class="mprow"><span class="mplbl">Contour</span><div class="mpseg wide" id="mp_b">'+
       [['noir','Noir'],['blanc','Blanc']].map(([k,t])=>'<button data-b="'+k+'" title="Contour '+t.toLowerCase()+'"'+
         (S.icoBord(o)===k?' class="on"':'')+'>'+t+'</button>').join('')+'</div></div>';
    h+='<div class="mprow"><span class="mplbl">Taille</span>'+
       '<input class="mprange" id="mp_t" type="range" min="'+S.ICO_T.min+'" max="'+S.ICO_T.max+'" step="'+S.ICO_T.pas+'" value="'+S.icoT(o)+'">'+
       '<span class="mpval" id="mp_tv">×'+S.icoT(o).toFixed(2)+'</span></div>';
    h+='<div class="mprow"><span class="mplbl">Label</span><div class="mpseg" id="mp_lp">'+
       ['top','left','bottom','right'].map(d=>'<button data-lp="'+d+'" title="Label en '+({top:'haut',left:'gauche',bottom:'bas',right:'droite'}[d])+'"'+((o.lp||'bottom')===d?' class="on"':'')+'>'+({top:'↑',left:'←',bottom:'↓',right:'→'}[d])+'</button>').join('')+'</div></div>';
    h+='<div class="mprow"><label class="mpchk"><input type="checkbox" id="mp_hl"'+(o.hl?' checked':'')+'> Masquer le label</label></div>';
    h+='<div class="mpacts"><button class="mpbtn primary" id="mp_edlbl">'+PENCIL_SVG+' Éditer le label</button>'+
       '<button class="mpbtn danger" id="mp_del" title="Supprimer cette icône">'+TRASH_SVG+'</button></div>';
    openMapPanel(o,anchor,h,()=>{
      mapPanel.node=g;
      const pose=c=>{o.c=c;recolorIco(o);const t=document.querySelector('#mappanel .mptitle');if(t)t.style.setProperty('--dot',c);commitSoon();};
      const sw=document.getElementById('mp_ic');
      roles.forEach(([k,titre])=>{const col=S.ROLE_HEX[k];const b=document.createElement('div');
        b.className='sw'+((o.c||'').toLowerCase()===col.toLowerCase()?' on':'');b.style.background=col;b.title=titre;
        b.addEventListener('click',()=>{pose(col);const ci=document.getElementById('mp_icc');if(ci)ci.value=col;
          [...sw.children].forEach(c=>c.classList.remove('on'));b.classList.add('on');});sw.appendChild(b);});
      document.getElementById('mp_icc').addEventListener('input',e=>{pose(e.target.value);
        [...sw.children].forEach(c=>c.classList.remove('on'));});
      document.querySelectorAll('#mp_b button[data-b]').forEach(b=>b.addEventListener('click',()=>{
        // le defaut ne s'ecrit pas dans data.js
        o.b=(b.dataset.b===S.ICO_CONTOUR_DEF)?undefined:b.dataset.b;
        document.querySelectorAll('#mp_b button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
        recolorIco(o);commitSoon();}));
      const tr=document.getElementById('mp_t'),tv=document.getElementById('mp_tv');
      if(tr)tr.addEventListener('input',()=>{const v=parseFloat(tr.value);
        o.t=(v===1)?undefined:v;            // la valeur par defaut ne s'ecrit pas
        if(tv)tv.textContent='×'+v.toFixed(2);
        retailleIco(o,g);commitSoon();});
      document.querySelectorAll('#mp_lp button[data-lp]').forEach(b=>b.addEventListener('click',()=>{
        o.lp=b.dataset.lp;document.querySelectorAll('#mp_lp button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
        placeLabel(g);draw();commitSoon();}));
      document.getElementById('mp_hl').addEventListener('change',e=>{o.hl=e.target.checked?1:0;
        if(g._lbl)g._lbl.visible(!o.hl);draw();commitSoon();});
      document.getElementById('mp_edlbl').addEventListener('click',()=>editLabelOnMap(o));
      const del=document.getElementById('mp_del');
      if(del)del.addEventListener('click',()=>{del.blur();
        askConfirm('Supprimer l’icône <b>'+esc(nom)+'</b> ? Elle sera retirée de data.js au prochain enregistrement.',
          {title:'Supprimer l’icône'}).then(v=>{if(v){closeMapPanel();deletePin(o,'ico');}});});
    });}

  /* ============================================================
     8 · CALQUES
     ============================================================ */
  function eye(on){return on?'<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>':'<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.2A10.9 10.9 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 3.9M6.1 6.1A17 17 0 002 12s3.5 7 10 7a10.6 10.6 0 003.4-.6"/></svg>';}
  function comptePins(){const c=Object.fromEntries(TYPES.map(t=>[t.cle,0]));
    if(gPins)gPins.getChildren().forEach(n=>{const t=typePin(n);if(t&&t in c)c[t]++;});return c;}
  function ligneCalque(k,nom,n,sous){
    const el=document.createElement('div');
    el.className='lay'+(layerVis[k]?'':' off')+(sous?' sub':'');
    el.innerHTML='<span class="eye">'+eye(layerVis[k])+'</span><span>'+nom+'</span>'
      +'<span class="cnt">'+n+'</span>';
    el.addEventListener('click',()=>{
      if(k==='pins'){
        // le groupe : tout eteindre si quelque chose est allume, tout rallumer sinon
        const allume=layerVis.pins&&TYPES_PIN.some(t=>layerVis[t[0]]);
        layerVis.pins=!allume;TYPES_PIN.forEach(t=>{layerVis[t[0]]=!allume;});
      } else {
        layerVis[k]=!layerVis[k];
        if(TYPES_PIN.some(t=>t[0]===k)&&layerVis[k])layerVis.pins=true;   // rallumer un type rallume le groupe
      }
      buildLayers();});
    return el;
  }
  function buildLayers(){
    applyVis();   // un marqueur pose pendant que son type est eteint reste cache
    const host=document.getElementById('layers');if(!host)return;host.innerHTML='';
    const c=comptePins();
    const total=TYPES_PIN.reduce((n,t)=>n+c[t[0]],0);   // pas une somme ecrite a la main : un type de plus l'aurait oubliee
    host.appendChild(ligneCalque('pins','Marqueurs',total,false));
    TYPES_PIN.forEach(([k,nom])=>{ if(c[k])host.appendChild(ligneCalque(k,nom,c[k],true)); });
    /* On compte ce que porte la CARTE, pas ce que Konva dessine : un trace vaut
       trois lignes a l'ecran (gaine, rail, flux) et un fond vaut l'image plus
       son cadre. Le panneau annoncait donc « Tracés = 12 » pour quatre traces. */
    const f=FL[curIdx]||{};
    [['texts','Textes & notes',(f.texts||[]).length],
     ['routes','Tracés',(f.routes||[]).length],
     ['shapes','Formes & images',(f.shapes||[]).length],
     ['map','Carte (fond)',f.map?1:0]]
      .forEach(([k,nom,n])=>host.appendChild(ligneCalque(k,nom,n,false)));
  }
  function applyVis(){if(gMap)gMap.visible(layerVis.map);if(gShapes)gShapes.visible(layerVis.shapes);if(gRoutes)gRoutes.visible(layerVis.routes);if(gTexts)gTexts.visible(layerVis.texts);
    if(gPins){gPins.visible(layerVis.pins);
      // et dans le groupe, chaque type suit le sien
      gPins.getChildren().forEach(n=>{const t=typePin(n);if(t&&t in layerVis)n.visible(!!layerVis[t]);});}
    updateAnim();draw();}

  /* ============================================================
     9 · OUTILS (rail latéral) + raccourcis
     ============================================================ */
  document.getElementById('rail').addEventListener('click',e=>{const t=e.target.closest('.tool');if(!t)return;
    if(t.hasAttribute('data-soon')){toast('Cet outil arrive bientôt.');return;}
    document.querySelectorAll('.tool').forEach(x=>{x.classList.remove('on');if(!x.hasAttribute('data-soon'))x.setAttribute('aria-pressed','false');});
    t.classList.add('on');t.setAttribute('aria-pressed','true');tool=t.dataset.tool;setToolMode();});
  function pick(t){const el=document.querySelector('.tool[data-tool="'+t+'"]');if(el&&!el.hasAttribute('data-soon'))el.click();}

  /* ============================================================
     10 · SAUVEGARDE data.js (File System Access + anti-reset)
     ------------------------------------------------------------
     Le format sérialisé ci-dessous doit rester STRICTEMENT identique
     à ce qu'attend le reste du projet : on remplace bloc par bloc via
     regex dans data.js, sans toucher au reste du fichier.
     ============================================================ */
  // Poignées, permissions et remplacement bloc par bloc : js/data-file.js,
  // partagé avec l’atelier Stratégie pour que les deux outils écrivent à l'identique.
  const DF=window.DATAFILE;
  function setFname(n){document.getElementById('fname').textContent=n?'📄 '+n:'';}
  // témoin « non enregistré » : le seul rappel visuel que le travail n'est encore qu'en mémoire
  function setDirty(v){dirty=!!v;const el=document.getElementById('unsaved');if(el)el.classList.toggle('on',dirty);}
  // blocs data.js d'UN étage — les noms et le format doivent rester STRICTEMENT stables
  // Le registre des cartes : un chapitre pointe une carte, et l'atelier edite
  // les tableaux de la carte a travers lui. On les REDESCEND dans le registre
  // avant d'ecrire, parce que « annuler » et le premier marqueur d'une carte
  // vide reaffectent f.bosses avec un tableau neuf.
  const REG=(typeof CARTES!=='undefined')?CARTES:{};

  /* ---------------- quelle carte pour ce chapitre ? ----------------
     Une carte est un module : le chapitre la DESIGNE. On peut donc en
     choisir une autre, en creer une, ou renommer celle en cours — et deux
     chapitres qui pointent la meme carte se partagent son travail. */
  /* La forme d'une carte neuve vient du SOCLE, elle n'est plus recopiée ici :
     les deux listes avaient divergé sur « icones », et resoudreCartes donnait
     alors au chapitre un tableau détaché du registre. Les icônes posées sur une
     carte créée dans l'atelier s'affichaient, le témoin « non enregistré »
     s'allumait, l'enregistrement se disait fait — et elles n'étaient nulle part
     au rechargement. */
  const CARTE_VIDE=()=>S.carteVide();

  // Meme modale, avec un champ. window.prompt sort du theme et bloque l'onglet.
  function askText(msg,opts){opts=opts||{};return new Promise(res=>{
    const back=document.getElementById('modal'),ttl=document.getElementById('modalTtl'),
          m=document.getElementById('modalMsg'),ok=document.getElementById('modalOk'),
          cancel=document.getElementById('modalCancel');
    ttl.textContent=opts.title||'Saisie';
    m.innerHTML=msg+'<input type="text" class="msaisie" id="modalIn">';
    ok.textContent=opts.ok||'Valider';ok.className='tbtn primary';
    back.hidden=false;modalOpen=true;requestAnimationFrame(()=>back.classList.add('show'));
    const champ=document.getElementById('modalIn');champ.value=opts.valeur||'';
    setTimeout(()=>{try{champ.focus();champ.select();}catch(e){}},30);
    function done(v){back.classList.remove('show');modalOpen=false;setTimeout(()=>{back.hidden=true;},180);
      ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);
      back.removeEventListener('mousedown',onBack);document.removeEventListener('keydown',onKey,true);res(v);}
    function onOk(){done(champ.value);}function onCancel(){done(null);}
    function onBack(e){if(e.target===back)done(null);}
    function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(null);}
      else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();done(champ.value);}}
    ok.addEventListener('click',onOk);cancel.addEventListener('click',onCancel);
    back.addEventListener('mousedown',onBack);document.addEventListener('keydown',onKey,true);});}

  function chapitresAvec(nom){return FL.filter(f=>f.carte===nom).length;}
  function majSelCarte(){
    const host=document.getElementById('carteBar');if(!host)return;
    const f=FL[curIdx]||{},noms=Object.keys(REG);
    const n=chapitresAvec(f.carte);
    // Tout ce qui concerne la carte tient dans le selecteur — comme pour les
    // strats. Un bouton de plus dans la barre la faisait deborder, et ces
    // gestes sont rares : on les cherche la ou on choisit la carte.
    const aFond=!!(REG[f.carte]&&REG[f.carte].fond);
    host.innerHTML='<span class="ctxlab">Carte</span>'
      +'<select id="carteSel" title="La carte de ce chapitre — en choisir une autre va la voir, sans rien rattacher">'
      + noms.map(k=>'<option value="'+esc(k)+'"'+(k===f.carte?' selected':'')+'>'+esc(k)+'</option>').join('')
      +'<option disabled>──────────</option>'
      +'<option value="__neuve__">＋ Nouvelle carte…</option>'
      +'<option value="__fond__">▣ '+(aFond?'Changer l’image de fond…':'Poser une image de fond…')+'</option>'
      +'<option value="__renom__">✎ Renommer cette carte</option>'
      +(noms.length>1?'<option value="__suppr__">✕ Supprimer cette carte</option>':'')
      +'</select>'
      +(n>1?'<span class="cartepart" title="Cette carte sert a plusieurs chapitres">partagée par '+n+' chapitres</span>':'');
    document.getElementById('carteSel').addEventListener('change',e=>{
      const v=e.target.value;
      if(v==='__neuve__'){nouvelleCarte();return;}
      if(v==='__fond__'){majSelCarte();choisirFond();return;}
      if(v==='__renom__'){majSelCarte();renommeCarte();return;}
      if(v==='__suppr__'){majSelCarte();supprimeCarte();return;}
      choisirCarte(v);});
  }

  /* Effacer le fichier de fond. Sans corbeille : il part du disque.
     On ne le fait donc QUE si l'utilisateur l'a coche, et jamais quand une
     autre carte s'en sert — verifie par l'appelant. */
  async function supprimeImage(chemin){
    // le NOM du fichier seul : la poignee vise deja son dossier, et removeEntry
    // refuse un separateur. Avec « cartes/map-x.webp », l'effacement echouait.
    const nomF=String(chemin||'').split('/').pop();
    if(!nomF||!II)return;
    let dir=await II.dossierPret();
    if(!dir){
      const a=await II.acces();                 // le clic sur « Supprimer » est le geste
      if(a.ou!=='ok'){
        toast('L\u2019image '+nomF+' n\u2019a pas pu être effacée : dossier img inaccessible.','err');
        return;}
      dir=a.dossier;
    }
    try{ await window.DATAFILE.supprimeFichier(dir,nomF);
         toast('Image '+nomF+' effacée du dossier img.','ok'); }
    catch(e){ await erreur('L\u2019image n\u2019a pas pu être effacée',
      'La carte, elle, est bien supprimée. Le fichier <b>'+esc(nomF)+'</b> est resté dans img.',
      e&&(e.name+' \u2014 '+e.message)); }
  }

  /* ---- supprimer une carte ----
     Delicat : un chapitre la DESIGNE par son nom. Le laisser pointer vers rien
     donnerait un chapitre sans carte, sans que rien ne le dise. Les chapitres
     concernes basculent donc sur une autre carte, et on l'annonce AVANT. */
  async function supprimeCarte(){
    const noms=Object.keys(REG);
    if(noms.length<2){toast('Il faut garder au moins une carte.','err');return;}
    const f=FL[curIdx];if(!f||!REG[f.carte])return;
    const nom=f.carte,c=REG[nom],n=chapitresAvec(nom);
    const suite=noms.filter(k=>k!==nom)[0];

    // ce qu'on perd vraiment : le contenu pose sur la carte
    // les icones comptent parmi les marqueurs : sans elles, supprimer une carte
    // qui porte dix reperes annoncait qu'on ne perdait rien
    const quoi=[['marqueur',TYPES.filter(t=>t.carte).reduce((n,t)=>n+((c[t.carte]||[]).length),0)],
                ['trace',(c.routes||[]).length],['texte',(c.texts||[]).length],
                ['forme',(c.shapes||[]).length]]
      .filter(x=>x[1]).map(x=>x[1]+' '+x[0]+(x[1]>1?'s':'')).join(', ');

    // L'image de fond : on ne l'efface que si elle ne sert qu'ici. Deux cartes
    // peuvent partager un fond, et l'effacer casserait l'autre sans prevenir.
    const fond=c.fond||'';
    const partagee=fond?Object.keys(REG).filter(k=>k!==nom&&(REG[k].fond||'')===fond):[];
    const effacable=!!fond&&!partagee.length&&!!II&&window.DATAFILE.dispoDossier();
    // cochee d'avance seulement si c'est l'outil qui a cree ce fichier : son nom
    // se deduit alors de celui de la carte. Une image posee a la main, non.
    const nommeeParLOutil=effacable&&fond===II.cheminFond(nom);

    const r=await askConfirm('Supprimer <b>'+esc(nom)+'</b> ?'
      +(quoi?'<br><br>Elle porte '+quoi+' \u2014 tout part avec elle.':'')
      +(n?'<br><br><b>'+n+' chapitre'+(n>1?'s l\u2019utilisent':' l\u2019utilise')+'</b> : '
         +(n>1?'ils passeront':'il passera')+' sur \u00ab '+esc(suite)+' \u00bb.':'')
      +(fond&&partagee.length?'<br><br><small>Son image de fond sert aussi a \u00ab '
         +esc(partagee[0])+' \u00bb : elle reste dans le dossier img.</small>':''),
      {title:'Supprimer la carte',ok:'Supprimer',
       case: effacable?{texte:'Effacer aussi <code>'+esc(fond)+'</code> du dossier '
              +'<b>img</b> \u2014 definitif, sans corbeille',coche:nommeeParLOutil}:null});
    if(!r){majSelCarte();return;}

    S.deposeCartes(FL,REG);                 // on n'abandonne pas le travail en cours
    delete REG[nom];
    FL.forEach(x=>{if(x.carte===nom)x.carte=suite;});
    S.resoudreCartes(FL,REG);
    setDirty(true);await renderFloor(curIdx);resetHistory();majSelCarte();
    toast('\u00ab '+nom+' \u00bb supprim\u00e9e'+(n?' \u2014 '+n+' chapitre(s) sur \u00ab '+suite+' \u00bb':'')+'.','ok');
    if(effacable&&r&&r.coche)await supprimeImage(fond);
  }

  /* ---- poser une image de fond ----
     Elle est redimensionnee, convertie en WebP et deposee dans img/ ; la carte
     n'en retient que le CHEMIN. Une image glissee dans les donnees les ferait
     grossir de plusieurs centaines de kilo-octets par carte, dans un fichier
     qu'on lit et qu'on versionne a la main. */
  /* ⚠ IL FAUT DEUX GESTES, la premiere fois seulement.

     Un navigateur n'ouvre un selecteur — de fichier comme de dossier — que sur
     un vrai geste de l'utilisateur, et chaque selecteur CONSOMME ce geste. Or
     l'evenement « change » d'un champ de fichier n'en produit pas un nouveau :
     apres le choix de l'image, il ne reste plus rien pour demander le dossier.
     C'est ce qui rendait « SecurityError: Must be handling a user gesture ».

     On ne peut donc pas enchainer les deux depuis un seul clic. Le premier
     import demande le dossier depuis SON PROPRE bouton, puis l'image depuis un
     second. Ensuite la poignee est memorisee et un seul geste suffit. */
  const II=window.IMPORTIMAGE;
  async function choisirFond(){
    const f=FL[curIdx];if(!f||!REG[f.carte]){toast('Choisis d’abord une carte.','err');return;}
    if(!II){toast('L’import d’image n’est pas disponible ici.','err');return;}

    // lire la poignee memorisee ne demande rien : le geste reste utilisable
    const dejaLa=await II.dossierPret();
    if(dejaLa || !window.DATAFILE.dispoDossier()){ ouvreFichier(dejaLa); return; }

    /* Le nom du dossier vient de IMPORTIMAGE, jamais écrit à la main : depuis le
       rangement de img/, les fonds vivent dans img/cartes, et ces messages
       envoyaient encore le lead déposer son image dans img/. Il faisait
       exactement ce qu'on lui disait, et son fond ne s'affichait jamais. */
    const ok=await askConfirm('Pour ranger l’image dans le projet, le navigateur doit d’abord '
      +'t’autoriser à écrire dans le dossier <b>'+esc(II.DOSSIER)+'</b>.<br><br>'
      +'À faire <b>une seule fois</b> : il s’en souviendra ensuite, et tu n’auras plus '
      +'qu’à choisir l’image.',
      {title:'Où ranger l’image ?',ok:'Choisir le dossier',danger:false});
    if(!ok)return;

    const a=await II.acces();                     // le clic ci-dessus est le geste
    if(a.ou==='annule')return;
    if(a.ou==='refuse'){
      await erreur('Le dossier img n’a pas pu être ouvert',
        'Le navigateur a refusé l’accès au dossier. Si le message ci-dessous parle '
        + 'd’un <b>geste de l’utilisateur</b>, re-essaie : il faut cliquer sur le bouton '
        + 'de la boite, pas ailleurs.', a.pourquoi);
      return;}

    const suite=await askConfirm('Dossier <b>img</b> autorisé.<br><br>'
      +'Choisis maintenant l’image de fond — elle sera redimensionnée, convertie et rangée.',
      {title:'C’est bon',ok:'Choisir l’image',danger:false});
    if(!suite)return;
    ouvreFichier(a.dossier);                      // et celui-la est le second geste
  }
  function ouvreFichier(dossier){
    const inp=document.createElement('input');
    inp.type='file';inp.accept='image/*';
    inp.addEventListener('change',()=>{if(inp.files[0])poseFond(inp.files[0],dossier);});
    inp.click();
  }
  // `dossier` vient de choisirFond : soit la poignee deja autorisee, soit
  // celle qu'on vient d'obtenir, soit null quand le navigateur ne sait pas
  // ecrire dans un dossier.
  async function poseFond(fichier,dossier){
    const f=FL[curIdx],nomCarte=f.carte,c=REG[nomCarte];
    const nomFichier=II.nomDeFichier(nomCarte);

    let prete;
    try{ prete=await II.prepare(fichier); }
    catch(e){ await erreur('Cette image n’a pas pu être lue',
      'Le navigateur n’a pas su la décoder. Essaie un PNG, un JPEG ou un WebP.',
      e && (e.name + ' — ' + e.message)); return; }

    if(!dossier){
      II.telecharge(prete,nomFichier);
      await askConfirm('Ton navigateur ne sait pas écrire dans un dossier — Chrome ou Edge le font.<br><br>'
        +'L’image convertie vient d’être téléchargée sous le nom <b>'+esc(nomFichier)+'</b>. '
        +'Dépose-la dans <b>'+esc(II.DOSSIER)+'</b>, à l’intérieur du projet, et elle apparaîtra.',
        {title:'À poser toi-même',ok:'Compris',danger:false});
    } else {
      const r=await II.depose(dossier,prete,nomFichier,{confirme:nom=>
        askConfirm('<b>'+esc(nom)+'</b> existe déjà dans <b>'+esc(II.DOSSIER)+'</b>.<br><br>'
          +'Une autre carte s’en sert peut-être : elle changerait de fond elle aussi.',
          {title:'Remplacer l’image ?',ok:'Remplacer'})});
      if(r.ou==='annule')return;
      if(r.ou==='refuse'){
        await erreur('L’image n’a pas pu être écrite',
          'Le dossier a peut-être été déplacé ou renommé. Il est oublié : au prochain '
          + 'essai, on te le redemandera.', r.pourquoi);
        return;
      }
    }

    c.fond=II.cheminFond(nomCarte);
    S.resoudreCartes(FL,REG);
    delete imgCache[BASE+c.fond];            // sinon on reverrait l'ancienne
    setDirty(true);await renderFloor(curIdx);fit();majSelCarte();
    const gain=prete.avant.poids>prete.apres.poids
      ? ' · '+II.ko(prete.avant.poids)+' → '+II.ko(prete.apres.poids) : '';
    toast('Fond posé en '+prete.w+'×'+prete.h+gain+'.','ok');
  }
  // Aller à un chapitre : le segment d'en haut et la scène disent la même chose.
  function allerEtage(i){
    if(i<0||i>=FL.length||i===curIdx)return;
    document.querySelectorAll('#floorSeg button').forEach(x=>
      x.classList.toggle('on', +x.dataset.i===i));
    /* resetHistory APRÈS le rendu, et c'est tout le sujet. Depuis que les
       rendus passent par une file, curIdx n'est plus posé tout de suite :
       resetHistory prenait donc son instantané du chapitre qu'on QUITTE, et le
       premier Ctrl+Z le réappliquait au chapitre où l'on arrive.
       Mesuré : ouvrir sur le sous-sol, taper Ctrl+Z par réflexe, et Dhartok,
       Triboulex, Aïta, Gartell et Aminon devenaient les quatre boss du
       rez-de-chaussée — marqueurs, packs, tracés et textes avec. Le témoin
       « non enregistré » s'allumait, et blocs() écrivait bien les mauvais boss.
       La coque rejouant le chapitre mémorisé au démarrage, il suffisait d'avoir
       fermé l'atelier en bas la veille.

       Mais poser resetHistory après le rendu n'a fait que RÉTRÉCIR la fenêtre,
       pas la fermer : entre le clic et la fin du dessin — le fond, puis chaque
       vignette de mob — curIdx est déjà sur le nouveau chapitre pendant que
       l'historique tient encore l'instantané de l'ancien. Un Ctrl+Z tapé là
       écrasait toujours, 3 fois sur 3 ; à partir de 100 ms d'attente, plus
       jamais. C'est donc une COURSE, et on ne la gagne pas avec un délai.
       Pendant le trajet il n'y a rien à annuler sur le chapitre où l'on
       arrive : on le dit, au lieu de rejouer un passé qui n'est pas le sien. */
    enRoute = true;
    var fin = function(){ enRoute = false; resetHistory(); };
    renderFloor(i).then(fin, fin);
  }

  /* Choisir une carte ici, c'est ALLER LA VOIR — pas rattacher le chapitre
     courant à elle.

     L'inverse a coûté cher, et en silence : un coup d'œil au sous-sol par ce
     menu, et le chapitre du haut se retrouvait dessiné sur la carte du bas.
     Sa strat allait alors chercher, pour chaque étape, le marqueur du même
     numéro — sur l'autre carte. Degei affichait le portrait de Dhartok,
     Leshonn celui d'Aïta, et rien ne signalait quoi que ce soit.

     Une carte appartient à son chapitre. On ne le défait donc que dans le seul
     cas où c'est nécessaire : une carte que PERSONNE n'utilise, et qui serait
     autrement impossible à ouvrir. */
  async function choisirCarte(nom){
    const f=FL[curIdx];if(!f||!REG[nom]||f.carte===nom){majSelCarte();return;}
    const i=FL.findIndex(x=>x.carte===nom);
    if(i>=0){ majSelCarte(); allerEtage(i); return; }

    const ok=await askConfirm(
      '<b>'+esc(nom)+'</b> n’est utilisée par aucun chapitre — il n’y a pas de chapitre '
      +'où aller la voir.<br><br>Le chapitre <b>'+esc(f.fr||f.id)+'</b> passerait de '
      +'<b>'+esc(f.carte)+'</b> à celle-ci : ses marqueurs, ses tracés et les portraits '
      +'de sa strat viendraient de cette carte-là.',
      {title:'Rattacher ce chapitre à cette carte ?',ok:'Rattacher',danger:false});
    if(!ok){majSelCarte();return;}
    S.deposeCartes(FL,REG);          // on n'abandonne pas le travail en cours
    f.carte=nom;S.resoudreCartes(FL,REG);
    setDirty(true);renderFloor(curIdx);resetHistory();majSelCarte();
    toast('Ce chapitre utilise maintenant « '+nom+' ».','ok');
  }
  async function nouvelleCarte(){
    majSelCarte();                   // le select reprend sa valeur le temps de la saisie
    const nom=(await askText('Ce nom sert à la retrouver et à la réutiliser dans une autre strat.',
      {title:'Nouvelle carte',valeur:'Nouvelle carte',ok:'Créer'})||'').trim();
    if(!nom)return;
    if(REG[nom]!==undefined){toast('Une carte porte déjà ce nom.','err');return;}
    REG[nom]=CARTE_VIDE();
    const f=FL[curIdx];if(f){f.carte=nom;S.resoudreCartes(FL,REG);}
    setDirty(true);await renderFloor(curIdx);resetHistory();majSelCarte();
    toast('Carte « '+nom+' » créée. Choisis son image de fond.','ok');
    // On enchaine sur l'image : c'est le geste suivant de toute facon, et une
    // carte vide sans rien a poser dessus ne dit pas quoi faire.
    choisirFond();
  }
  async function renommeCarte(){
    const f=FL[curIdx];if(!f||!REG[f.carte])return;
    const ancien=f.carte;
    const nom=(await askText('Les chapitres qui utilisent cette carte suivront.',
      {title:'Renommer la carte',valeur:ancien,ok:'Renommer'})||'').trim();
    if(!nom||nom===ancien)return;
    if(REG[nom]!==undefined){toast('Une carte porte déjà ce nom.','err');return;}
    // on reconstruit le dictionnaire pour garder l'ORDRE : sinon la carte
    // renommee sauterait en fin de fichier a chaque enregistrement
    const neuf={};Object.keys(REG).forEach(k=>{neuf[k===ancien?nom:k]=REG[k];});
    Object.keys(REG).forEach(k=>{delete REG[k];});
    Object.keys(neuf).forEach(k=>{REG[k]=neuf[k];});
    FL.forEach(x=>{if(x.carte===ancien)x.carte=nom;});
    setDirty(true);majSelCarte();
    toast('Renommée — '+chapitresAvec(nom)+' chapitre(s) concerné(s).','ok');
  }
  // ⚠ on sérialise TOUS les étages, pas seulement celui affiché : sinon les modifications
  // faites sur l'autre étage avant de changer d'onglet étaient perdues sans le moindre avertissement.
  function blocksToSave(){
    FL.forEach(f=>{(f.routes||[]).forEach(rt=>{if(rt._pts)rt.points=S.ptsStr(rt._pts);});}); // fige les points edites
    S.deposeCartes(FL,REG);
    return [{nom:'CARTES',txt:S.cartesConst('CARTES',REG)},
            // le lien chapitre -> carte s'edite ici : ce bloc doit suivre
            {nom:'FLOORS',txt:S.chapitresConst('FLOORS',FL)},
            {nom:'MOBSCALE',scalaire:true,txt:'const MOBSCALE='+r1(mobScale)+';'},
            {nom:'LBLMARGIN',scalaire:true,txt:'const LBLMARGIN='+r1(labelMargin)+';'}];}
  /* ============================================================
     10b · EXPORT — image de la carte, ou blocs data.js
     ------------------------------------------------------------
     L'image est rendue à l'échelle 1:1 de la carte (1024 px), pas à ce
     qu'on voit à l'écran : on neutralise zoom et pan le temps du rendu,
     et on masque le calque d'édition (poignées, aperçu de tracé, cadre
     de sélection) qui n'a rien à faire dans une image livrée.
     ============================================================ */
  const EXP_MIME={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'};
  let expFmt='png', expEch=2, expQual=0.92;
  /* Le nom du fichier vient de la CARTE. Il etait prefixe « sortie- » en dur,
     et un troisieme chapitre serait sorti en « sous-sol » quoi qu'il porte. */
  function nomFichier(ext){
    const nom=(FL[curIdx]||{}).carte||'carte';
    let n=String(nom);
    if(n.normalize)n=n.normalize('NFD').replace(/[̀-ͯ]/g,'');
    n=n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return (n||'carte')+'.'+ext;}
  function telecharger(href,nom){const a=document.createElement('a');
    a.href=href;a.download=nom;document.body.appendChild(a);a.click();a.remove();}
  async function exportImage(){
    if(!stage)return;
    const sx=stage.scaleX(),sy=stage.scaleY(),px=stage.x(),py=stage.y();
    const ringVis=[];layer.find('.selring').forEach(r=>{ringVis.push([r,r.visible()]);r.visible(false);});
    const editVis=gEdit?gEdit.visible():null;if(gEdit)gEdit.visible(false);
    const trVis=shTr?shTr.visible():null;if(shTr)shTr.visible(false);
    stage.scale({x:1,y:1});stage.position({x:0,y:0});stage.draw();
    let cv=null,err=null;
    try{ cv=stage.toCanvas({x:0,y:0,width:MAP,height:MAP,pixelRatio:expEch}); }catch(e){err=e;}
    // remise en état AVANT toute alerte : la vue de l'utilisateur ne doit pas rester cassée
    stage.scale({x:sx,y:sy});stage.position({x:px,y:py});
    ringVis.forEach(([r,v])=>r.visible(v));
    if(gEdit&&editVis!=null)gEdit.visible(editVis);
    if(shTr&&trVis!=null)shTr.visible(trVis);
    updateZoom();stage.draw();
    if(err||!cv){toast('La carte n’a pas pu être mise en image. Recharge la page et réessaie.','err');return;}
    // Blob plutôt que data-URL : en 4096 px la chaîne base64 dépasse les 25 Mo et
    // certains navigateurs refusent de la télécharger.
    cv.toBlob(blob=>{
      if(!blob){toast('Export impossible : encodage refusé.','err');return;}
      const u=URL.createObjectURL(blob);
      telecharger(u,nomFichier(expFmt==='jpeg'?'jpg':expFmt));
      setTimeout(()=>URL.revokeObjectURL(u),60000);   // large : un 4096 px met du temps a partir
      toast('Image exportée en '+(MAP*expEch)+' px · '+(blob.size/1024/1024).toFixed(1)+' Mo.','ok');
    },EXP_MIME[expFmt],expQual);}
  // Blocs data.js : le même texte que celui écrit par Enregistrer, mais téléchargeable
  // ou copiable — utile hors Chrome, ou pour transmettre la carte sans donner le fichier.
  function texteBlocs(){
    return '/* Cette carte vient de l’atelier XI STUDIO — à coller dans js/data.js en remplacement\n'
      +'   des blocs de même nom. Le reste du fichier ne doit pas être touché. */\n\n'
      // `txt`, pas `text` : c'est le nom que blocksToSave donne à ses blocs, et
      // celui que data-file.js relit. Avec `text`, l'export sortait vide — neuf
      // lignes blanches sous l'en-tête, sans un mot pour prévenir.
      + blocksToSave().map(b=>b.txt).join('\n\n')+'\n';}
  function exportBlocs(copier){
    const txt=texteBlocs();
    if(copier){
      (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(txt)
        :Promise.reject(new Error('presse-papier indisponible')))
        .then(()=>toast('Carte copiée — le lead qui la reçoit la colle dans son projet.','ok'))
        .catch(function(){ toast('Le presse-papier a été refusé — clique dans la page, puis réessaie.','err'); });
      return;}
    telecharger(URL.createObjectURL(new Blob([txt],{type:'text/javascript'})),'data-blocs.js');
    toast('Carte téléchargée — donne ce fichier au lead qui la reprend.','ok');}
  function openExport(){
    const seg=(id,vals,cur)=>'<div class="mpseg wide" id="'+id+'">'+vals.map(v=>
      '<button type="button" data-v="'+v[0]+'"'+(String(cur)===String(v[0])?' class="on"':'')+'>'+v[1]+'</button>').join('')+'</div>';
    let h='<div class="mptitle" style="--dot:var(--gold)">Exporter</div>';
    h+='<div class="mprow"><span class="mplbl">Format</span>'+seg('ex_f',[['png','PNG'],['jpeg','JPEG'],['webp','WebP']],expFmt)+'</div>';
    h+='<div class="mprow"><span class="mplbl">Taille</span>'+seg('ex_e',[[1,'1024'],[2,'2048'],[4,'4096']],expEch)+'</div>';
    h+='<div class="mprow" id="ex_qrow"><span class="mplbl">Qualité</span><input class="mprange" id="ex_q" type="range" min="50" max="100" value="'+Math.round(expQual*100)+'"><span class="mpval" id="ex_qv">'+Math.round(expQual*100)+' %</span></div>';
    h+='<div class="mpacts"><button class="mpbtn primary" id="ex_img">Télécharger l’image</button></div>';
    h+='<div class="mprow" style="margin-top:12px;border-top:1px solid var(--hair);padding-top:11px"><span class="mplbl">Donner la carte</span></div>';
    h+='<div class="mpacts"><button class="mpbtn primary" id="ex_dl">Télécharger</button>'
      +'<button class="mpbtn" id="ex_cp">Copier</button></div>';
    h+='<div class="mpnote">L’image est rendue à l’échelle de la carte, sans les poignées d’édition. En dessous, c’est la carte elle-même — exactement ce qu’écrit <b>Enregistrer</b> — pour la donner à un autre lead qui la reprendra dans son projet.</div>';
    openMapPanel({},()=>({x:MAP/2,y:MAP*0.42}),h,()=>{
      const majQ=()=>{const r=document.getElementById('ex_qrow');if(r)r.style.display=(expFmt==='png')?'none':'';};
      document.querySelectorAll('#ex_f button[data-v]').forEach(b=>b.addEventListener('click',()=>{
        expFmt=b.dataset.v;document.querySelectorAll('#ex_f button').forEach(x=>x.classList.remove('on'));b.classList.add('on');majQ();}));
      document.querySelectorAll('#ex_e button[data-v]').forEach(b=>b.addEventListener('click',()=>{
        expEch=+b.dataset.v;document.querySelectorAll('#ex_e button').forEach(x=>x.classList.remove('on'));b.classList.add('on');}));
      const q=document.getElementById('ex_q');q.addEventListener('input',()=>{expQual=(+q.value)/100;
        document.getElementById('ex_qv').textContent=(+q.value)+' %';});
      document.getElementById('ex_img').addEventListener('click',()=>{closeMapPanel();exportImage();});
      document.getElementById('ex_dl').addEventListener('click',()=>exportBlocs(false));
      document.getElementById('ex_cp').addEventListener('click',()=>exportBlocs(true));
      majQ();},true);}

  async function save(){
    if(!DF.dispo()){toast('Utilise Chrome ou Edge pour l’enregistrement direct.','err');return;}
    // un commitSoon() en vol relèverait le témoin JUSTE APRÈS l'enregistrement (il appelle commit,
    // qui marque modifié) : on le vide d'abord, sinon on se retrouve « modifié » à peine sauvegardé.
    clearTimeout(histTimer);commit();
    try{const h=await DF.poignee('data','js/data.js');setFname(h.name);
      if(!(await DF.permission(h))){toast('Permission refusée.','err');return;}
      const r=DF.remplace(await DF.lis(h),blocksToSave());
      if(r.absents.length){
        // aucun bloc n'est ajouté d'office : un bloc manquant veut dire mauvais fichier
        /* L'ancien message accusait TOUJOURS le fichier — « Est-ce le bon
           data.js ? » — et le lead rechoisissait en boucle celui qui était le
           bon. Un bloc absent veut dire deux choses, et la seconde est bien
           plus fréquente : le fichier ne connaît pas encore ce chapitre. La
           coque le dit déjà comme ça ; l'atelier Carte était resté en arrière. */
        if(!await askConfirm(
             'Ta carte a un chapitre que « '+esc(h.name)+' » ne connaît pas encore.'
           + '<br><br>Rien n’a été enregistré. Si c’est bien le projet où doit vivre '
           + 'cette strat, publie-la d’abord depuis l’atelier Stratégie ; sinon, '
           + 'choisis le fichier du projet d’où elle vient.',
             {title:'Ce projet est en retard d’un chapitre',ok:'Choisir un autre fichier',danger:false}))return;
        await DF.oublie('data');
        return save();}
      await DF.ecris(h,r.texte);
      setDirty(false);
      toast('Enregistré dans data.js (tous les chapitres) — le guide se met à jour.','ok');
    }catch(e){if(e.name!=='AbortError'){ if(window.console) console.error(e);
        toast('L’enregistrement n’a pas abouti — rien n’a été perdu, ton travail est toujours là. Réessaie.','err'); }}
  }
  // relecture : DF.connue et pas DF.poignee — faire surgir un sélecteur de
  // fichier sur un simple « recharger » serait incompréhensible.
  async function syncFromFile(silent){const h=await DF.connue('data');if(!h){if(!silent)toast('Choisis d’abord ton data.js (Enregistrer une fois).','err');return;}
    // relire le disque écrase tout ce qui n'a pas été enregistré → on demande avant
    if(dirty&&!silent&&!(await askConfirm('Tu as des modifications <b>non enregistrées</b>. Recharger depuis le disque va les <b>perdre définitivement</b>.',{title:'Recharger data.js',ok:'Recharger quand même'})))return;
    try{if(!(await DF.permission(h)))return;const text=await DF.lis(h);
      const fresh=new Function(text+'\n; return {F:(typeof FLOORS!=="undefined")?FLOORS:null,C:(typeof CARTES!=="undefined")?CARTES:null,M:(typeof MOBSCALE!=="undefined")?MOBSCALE:1};')();
      // On REMPLIT FL et le registre, on ne les réaffecte pas : la coque et
      // l'atelier Stratégie en tiennent les mêmes références depuis le départ.
      if(fresh&&fresh.F&&fresh.F.length){
        FL.length=0;fresh.F.forEach(f=>FL.push(f));
        if(fresh.C){Object.keys(REG).forEach(k=>delete REG[k]);Object.keys(fresh.C).forEach(k=>REG[k]=fresh.C[k]);}
        S.resoudreCartes(FL,REG);
        mobScale=fresh.M||1;paintGlobals();renderFloor(curIdx);resetHistory();setDirty(false);if(!silent)toast('Rechargé depuis le disque.','ok');}
    }catch(e){if(!silent){ if(window.console) console.error(e);
        toast('Le fichier n’a pas pu être relu — vérifie qu’il n’a pas été déplacé, puis réessaie.','err'); }}}

  /* ============================================================
     11 · BARRE / RACCOURCIS / TOAST / BOOT
     ============================================================ */
  // Un onglet par chapitre, nommé par le contenu (FLOORS), pas par le code.
  /* Rappelable, et pas une fois pour toutes : les chapitres ne sont pas les
     mêmes d'une strat à l'autre. Construits au seul chargement, ils restaient
     ceux de la strat de départ — la coque cherchait alors « le bouton 2 » dans
     une liste qui n'en comptait que deux, ne trouvait rien, et n'appelait donc
     jamais allerEtage. L'en-tête affichait « Chapitre C », la carte montrait le
     A, et tout ce qu'on y posait partait dans le A. */
  function construitChapitres(){
    const h=document.getElementById('floorSeg');
    if(FL.length<2){h.style.display='none';h.innerHTML='';return;}
    h.style.display='';
    h.innerHTML=FL.map((f,i)=>'<button data-i="'+i+'"'+(i===curIdx?' class="on"':'')+'>'
      +esc(f.fr||f.en||('Chapitre '+(i+1)))+'</button>').join('');
  }
  construitChapitres();
  document.getElementById('floorSeg').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;allerEtage(+b.dataset.i);});
  document.getElementById('btnFit').addEventListener('click',fit);
  document.getElementById('btnSave').addEventListener('click',save);
  document.getElementById('btnExport').addEventListener('click',openExport);
  document.getElementById('btnSync').addEventListener('click',()=>syncFromFile(false));
  // réglages globaux — le curseur du haut et celui de l'inspecteur pilotent la même valeur
  function paintGlobals(){
    [['gsMob',mobScale],['gsLbl',labelMargin]].forEach(p=>{
      const el=document.getElementById(p[0]);if(el&&el.value!=String(p[1]))el.value=p[1];});
    const bv=document.getElementById('gsMobVal'),lv=document.getElementById('gsLblVal');
    if(bv)bv.textContent=Math.round(mobScale*100)+' %';if(lv)lv.textContent=labelMargin;}
  function setMobScale(v){mobScale=v;paintGlobals();applyMobScale();}
  function setLabelMargin(v){labelMargin=v;paintGlobals();replaceAllLabels();commitSoon();}
  (function(){
    document.getElementById('gsMob').addEventListener('input',e=>setMobScale(parseFloat(e.target.value)));
    document.getElementById('gsLbl').addEventListener('input',e=>setLabelMargin(parseInt(e.target.value,10)));
    paintGlobals();})();
  document.getElementById('zoomLbl').addEventListener('click',fit);
  document.addEventListener('visibilitychange',updateAnim); // libère le CPU quand l'onglet est caché
  // panneau inspecteur repliable (mobile/tablette) — la carte garde tout l'espace
  document.getElementById('inspClose').addEventListener('click',closeInsp);
  document.getElementById('mBackdrop').addEventListener('click',closeInsp);
  document.getElementById('inspFab').addEventListener('click',()=>document.body.classList.toggle('insp-open'));
  // les raccourcis d'outils n'agissent que si la souris survole la carte (pas le rail/inspecteur/header)
  let overMap=false;
  stageWrap.addEventListener('mouseenter',()=>{overMap=true;});
  stageWrap.addEventListener('mouseleave',()=>{overMap=false;if(spaceDown){spaceDown=false;setToolMode();}});
  const inField=e=>/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable;

  /* ============================================================
     HISTORIQUE (annuler / rétablir) + presse-papiers
     ------------------------------------------------------------
     On mémorise l'état DONNÉES de l'étage courant (pas les nœuds
     Konva) ; restaurer = ré-appliquer puis renderFloor().
     ============================================================ */
  let hist=[],hidx=-1,histTimer=null,clip=null;
  function cleanPin(o){const c=Object.assign({},o);delete c._mk;return c;}
  function snapState(){const f=FL[curIdx];(f.routes||[]).forEach(rt=>{if(rt._pts)rt.points=S.ptsStr(rt._pts);});
    return JSON.stringify({
      // tous les tableaux de marqueurs, tires du catalogue : un type de plus est
      // pris dans l'historique sans qu'on ait a y penser. C'est l'oubli de cette
      // ligne qui empechait Ctrl+Z de defaire la pose d'une icone.
      pins:Object.fromEntries(TYPES.filter(t=>t.carte)
        .map(t=>[t.carte,(f[t.carte]||[]).map(cleanPin)])),
      texts:(f.texts||[]).map(o=>Object.assign({},o)),
      shapes:(f.shapes||[]).map(o=>Object.assign({},o)),
      routes:(f.routes||[]).map(rt=>({n:rt.n,el:rt.el,c1:rt.c1,a:rt.a,fs:rt.fs,name:rt.name,points:rt.points})),
      mobScale:mobScale,labelMargin:labelMargin});}
  function restoreState(json){const st=JSON.parse(json),f=FL[curIdx];
    TYPES.filter(t=>t.carte).forEach(t=>{ f[t.carte]=(st.pins&&st.pins[t.carte])||[]; });
    f.texts=st.texts;f.routes=st.routes;f.shapes=st.shapes||[];
    mobScale=st.mobScale;labelMargin=st.labelMargin;paintGlobals();
    renderFloor(curIdx);}
  // un pas d'historique = une vraie modification → c'est le bon endroit pour lever le témoin
  function commit(){const s=snapState();if(hidx>=0&&hist[hidx]===s)return;hist=hist.slice(0,hidx+1);hist.push(s);hidx=hist.length-1;
    if(hist.length>80){hist.shift();hidx--;}setDirty(true);}
  function commitSoon(){clearTimeout(histTimer);histTimer=setTimeout(commit,450);}
  // vide l'historique (il ne traverse pas les étages) SANS toucher au témoin : changer
  // d'étage ne sauve rien, les modifs de l'étage quitté restent en attente d'enregistrement.
  function resetHistory(){clearTimeout(histTimer);hist=[];hidx=-1;const d=dirty;commit();setDirty(d);}
  // Tant que le chapitre d'arrivée se dessine, son historique n'existe pas :
  // annuler y appliquerait celui du chapitre qu'on vient de quitter.
  function undo(){if(enRoute){toast('Rien à annuler.');return;}
    clearTimeout(histTimer);commit();if(hidx>0){hidx--;restoreState(hist[hidx]);toast('Annulé.');}else toast('Rien à annuler.');}
  function redo(){if(enRoute){toast('Rien à rétablir.');return;}
    clearTimeout(histTimer);if(hidx<hist.length-1){hidx++;restoreState(hist[hidx]);toast('Rétabli.');}else toast('Rien à rétablir.');}

  // ---- copier / coller / dupliquer / supprimer l'élément sélectionné ----
  function selData(){if(!selNode||!selNode._meta||selNode._meta.kind==='marker')return null;return {kind:selNode._meta.kind,o:cleanPin(selNode._meta.o)};}
  function copySel(){const d=selData();if(!d)return;clip=d;toast('Copié — Ctrl+V pour coller.','ok');}
  async function pasteObj(entry){if(!entry)return;const f=FL[curIdx],kind=entry.kind,o=cleanPin(entry.o);
    o.x=r1(S.clamp((o.x!=null?o.x:50)+2));o.y=r1(S.clamp((o.y!=null?o.y:50)+2));
    if(kind==='shape'){(f.shapes=f.shapes||[]).push(o);await addShape(o);buildLayers();pick('select');const g=shapeNode(o);if(g)select(g);}
    else if(kind==='text'){(f.texts=f.texts||[]).push(o);addText(o);buildLayers();pick('select');const g=textNode(o);if(g)select(g);}
    /* Une icone n'est ni une forme ni une creature : sans cette branche, elle
       tombait dans « pack » et s'ecrivait dans data.js en creature fantome,
       sans element ni phase — « el:'undefined', ph:undefined ». */
    else{
      /* Le catalogue dit dans QUEL tableau ce type vit. Avant, tout ce qui
         n'etait ni forme ni texte ni boss ni mid tombait dans « pack » : une
         icone collee devenait une creature sans element ni phase, gravee dans
         data.js. Un type inconnu ne se colle plus nulle part. */
      const arr=tableauDe(f,kind); if(!arr)return;
      if(kind==='boss'){const maxN=(f.bosses||[]).reduce((mx,b)=>Math.max(mx,b.n||0),0);o.n=maxN+1;
        o.nx=r1(S.clamp((o.nx!=null?o.nx:o.x)+2));o.ny=r1(S.clamp((o.ny!=null?o.ny:o.y)+2));}
      arr.push(o);
      if(kind==='ico')await addIcone(o);
      else await addPin(kind,o,pinSize(kind),(typeof MOB!=='undefined')?MOB:{});
      buildLayers();pick('select');const g=pinNode(o);if(g)select(g);}
    commit();toast('Collé.','ok');}
  function duplicateSel(){const d=selData();if(d)pasteObj(d);}
  function deleteSelNow(){if(!selNode||!selNode._meta)return;const m=selNode._meta;if(m.kind==='shape')deleteShape(m.o);else if(m.kind==='text')deleteText(m.o);else if(m.kind!=='marker')deletePin(m.o,m.kind);}
  function confirmDeleteSel(){if(!selNode||!selNode._meta)return;const m=selNode._meta;if(m.kind==='marker')return;
    if(m.kind==='shape')askConfirm('Supprimer cette forme ?',{title:'Supprimer la forme'}).then(v=>{if(v)deleteShape(m.o);});
    else if(m.kind==='text')askConfirm('Supprimer ce texte ?',{title:'Supprimer le texte'}).then(v=>{if(v)deleteText(m.o);});
    else askConfirm('Supprimer le marqueur <b>'+esc(m.o.name)+'</b> ? Elle sera retirée de data.js au prochain enregistrement.',{title:'Supprimer le marqueur'}).then(v=>{if(v)deletePin(m.o,m.kind);});}
  function nudgeSel(key,big){if(!selNode||!selNode._meta)return;const m=selNode._meta,step=big?2:0.4;
    let dx=0,dy=0;if(key==='arrowleft')dx=-step;else if(key==='arrowright')dx=step;else if(key==='arrowup')dy=-step;else dy=step;
    if(m.kind==='marker'){m.o.nx=r1(S.clamp(m.o.nx+dx));m.o.ny=r1(S.clamp(m.o.ny+dy));selNode.x(C(m.o.nx));selNode.y(C(m.o.ny));}
    else{m.o.x=r1(S.clamp(m.o.x+dx));m.o.y=r1(S.clamp(m.o.y+dy));selNode.x(C(m.o.x));selNode.y(C(m.o.y));}
    liveUpdate();commitSoon();}

  window.addEventListener('keydown',e=>{if(inField(e)||modalOpen)return;
    /* Ces raccourcis n'appartiennent qu'a l'atelier qu'on a SOUS LES YEUX.
       Sous la coque a onglets, ils restaient a l'ecoute meme depuis l'onglet
       Strategie : un Ctrl+Z tape sur du texte defaisait aussi, en silence et
       hors de vue, le dernier geste de la carte. Et defaire remplace les
       calques du chapitre courant — marqueurs, tracés, textes — que
       l'enregistrement gravait ensuite dans data.js. Une carte y a laisse ses
       cinq boss. Seul, l'atelier garde bien sur tous ses raccourcis. */
    if(window.__STUDIO && window.__STUDIO.actif() !== 'map') return;
    const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
    // --- raccourcis globaux façon appli Windows (n'importe où) ---
    // Dans la coque à onglets, c'est ELLE qui enregistre — carte et strat en une
    // seule passe sur le fichier. Garder ce raccourci actif ici lançait DEUX
    // écritures concurrentes sur data.js : chacune lisait le fichier avant que
    // l'autre n'écrive, et la dernière arrivée effaçait les blocs de la première.
    // Le bouton de cette barre, lui, était déjà masqué par la coque.
    if(mod&&k==='s'){e.preventDefault();if(!document.getElementById('stSave'))save();return;}
    if(mod&&k==='z'&&!e.shiftKey){e.preventDefault();undo();return;}
    if(mod&&(k==='y'||(k==='z'&&e.shiftKey))){e.preventDefault();redo();return;}
    if(mod&&k==='c'){if(selNode){e.preventDefault();copySel();}return;}
    if(mod&&k==='x'){if(selNode&&selNode._meta&&selNode._meta.kind!=='marker'){e.preventDefault();copySel();deleteSelNow();}return;}
    if(mod&&k==='v'){if(clip){e.preventDefault();pasteObj(clip);}return;}
    if(mod&&k==='d'){if(selNode){e.preventDefault();duplicateSel();}return;}
    if(k==='delete'||k==='backspace'){
      if(tool==='path'&&selHandleIdx>=0){e.preventDefault();deleteSelHandle();return;}
      if(selNode&&selNode._meta&&selNode._meta.kind!=='marker'){e.preventDefault();confirmDeleteSel();return;}}
    if(k==='arrowup'||k==='arrowdown'||k==='arrowleft'||k==='arrowright'){
      if(selNode&&selNode._meta&&tool!=='path'){e.preventDefault();nudgeSel(k,e.shiftKey);return;}}
    // Échap : désarmer / désélectionner, où que soit la souris (les réglages sont hors carte)
    if(k==='escape'){
      if(tool==='pin'&&armedPin){armedPin=null;renderArmGrid();stage.container().style.cursor='default';return;}
      if((tool==='shape'||tool==='image')&&armedShape){armedShape=null;stage.container().style.cursor='default';
        if(tool==='image'){renderImageGrid();}else{document.querySelectorAll('#ar_k button').forEach(x=>x.classList.remove('on'));shapeHint();}return;}
      if(tool==='path'&&selHandleIdx>=0){selHandleIdx=-1;refreshPathEdit();return;}
      select(null);return;}
    // --- raccourcis d'outils : seulement quand la souris survole la carte ---
    if(!overMap)return;
    if(k===' '){if(!spaceDown){spaceDown=true;setToolMode();}e.preventDefault();}
    else if(k==='f')fit();else if(k==='v')pick('select');else if(k==='h')pick('pan');else if(k==='p')pick('path');else if(k==='n')pick('pin');else if(k==='t')pick('text');
    else if(k==='s')pick('shape');else if(k==='i')pick('image');else if(k==='k')pick('pipette');});
  // relâchement d'Espace : toujours traité (sort du mode navigation même si la souris a quitté la carte), sauf en pleine saisie
  window.addEventListener('keyup',e=>{if(inField(e))return;if(e.key===' '&&spaceDown){spaceDown=false;setToolMode();}});

  // Une erreur porte une information dont on a besoin pour agir : elle reste
  // trois fois plus longtemps qu'une confirmation, qu'on ne relit jamais.
  function toast(msg,cls){const el=document.getElementById('toast');el.textContent=msg;el.className=cls||'';
    el.style.opacity='1';clearTimeout(el._t);
    el._t=setTimeout(()=>el.style.opacity='0',cls==='err'?9000:2600);}

  // modale de confirmation maison → Promise<bool>. opts: {title, ok, danger:false pour un bouton neutre}
  let modalOpen=false;
  // Recopier dans le presse-papier. navigator.clipboard REFUSE quand la page
  // n'a pas le focus : un refus ne doit pas rester sans suite, on repasse par
  // la vieille methode, qui part d'un clic et passe donc partout.
  function copieTexte(txt){
    const vieille=()=>new Promise((res,rej)=>{
      const z=document.createElement('textarea');z.value=txt;
      z.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(z);z.focus();z.select();
      let ok=false;try{ok=document.execCommand('copy');}catch(e){}
      z.remove();ok?res():rej(new Error('copie refusee'));});
    if(navigator.clipboard&&navigator.clipboard.writeText)
      return navigator.clipboard.writeText(txt).catch(vieille);
    return vieille();
  }

  /* Une panne se lit, et se recopie. Un toast s'evapore avant qu'on ait fini
     la phrase, et on ne peut rien en faire — or c'est justement le message
     qu'on voudrait pouvoir montrer a quelqu'un. */
  function erreur(titre,phrase,detail){
    return askConfirm(phrase+(detail?'<br><br><code class="mdet">'+esc(detail)+'</code>':''),
      {title:titre,ok:'Fermer',danger:false,seul:true,copie:detail?(titre+' — '+detail):phrase});
  }

  function askConfirm(msg,opts){opts=opts||{};return new Promise(res=>{
    const back=document.getElementById('modal'),ttl=document.getElementById('modalTtl'),m=document.getElementById('modalMsg'),ok=document.getElementById('modalOk'),cancel=document.getElementById('modalCancel'),cop=document.getElementById('modalCopy');
    ttl.textContent=opts.title||'Confirmer';m.innerHTML=msg;ok.textContent=opts.ok||'Supprimer';ok.className='tbtn '+(opts.danger===false?'primary':'danger');
    // Fermer une boite programme son escamotage 180 ms plus tard. Si une
    // seconde s'ouvre avant (une panne juste apres une confirmation, par
    // exemple), ce minuteur la refermait aussitot. On l'annule.
    clearTimeout(back._cache);
    cancel.hidden=!!opts.seul;
    if(cop){cop.hidden=!opts.copie;cop.textContent='Copier le message';}
    // Une case a cocher pour ce qu'on ne peut pas deviner a la place de
    // l'utilisateur. La reponse devient un objet — toujours vrai — donc les
    // appels qui ne testent que « annule ou pas » n'ont rien a changer.
    const caseL=document.getElementById('modalCaseL'),caseI=document.getElementById('modalCase');
    if(caseL){caseL.hidden=!opts.case;
      if(opts.case){document.getElementById('modalCaseT').innerHTML=opts.case.texte;
                    caseI.checked=!!opts.case.coche;}}
    back.hidden=false;modalOpen=true;requestAnimationFrame(()=>back.classList.add('show'));
    function done(v){back.classList.remove('show');modalOpen=false;back._cache=setTimeout(()=>{back.hidden=true;cancel.hidden=false;if(cop)cop.hidden=true;},180);
      ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);back.removeEventListener('mousedown',onBack);document.removeEventListener('keydown',onKey,true);
      if(cop)cop.removeEventListener('click',onCopy);res(v);}
    // copier ne ferme PAS : on peut vouloir relire, ou recopier
    function onOk(){done(opts.case?{coche:!!caseI.checked}:true);}
    function onCancel(){done(false);}
    function onCopy(){copieTexte(opts.copie).then(()=>{cop.textContent='Copie';
      setTimeout(()=>{if(cop)cop.textContent='Copier le message';},1800);})
      .catch(()=>{cop.textContent='Selectionne le texte a la main';});}
    function onBack(e){if(e.target===back)done(false);}
    function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false);}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();done(opts.case?{coche:!!caseI.checked}:true);}}
    ok.addEventListener('click',onOk);cancel.addEventListener('click',onCancel);back.addEventListener('mousedown',onBack);document.addEventListener('keydown',onKey,true);
    if(cop&&opts.copie)cop.addEventListener('click',onCopy);
    setTimeout(()=>{try{ok.focus();}catch(e){}},30);});}

  function boot(){if(typeof Konva==='undefined'){loadmsg.textContent='Konva n’a pas pu se charger.';return;}
    if(typeof S==='undefined'||!S){loadmsg.textContent='sortie-map-core.js introuvable.';return;}
    if(!FL.length){loadmsg.textContent='data.js introuvable ou vide.';return;}
    initStage();DF.connue('data').then(h=>{if(h)setFname(h.name);});renderFloor(0);resetHistory();setDirty(false);}
  // dernier filet : fermer l'onglet avec du travail en mémoire
  // Pas de garde beforeunload : le dialogue de fermeture est IMPOSÉ par le navigateur, aucune page
  // ne peut le remplacer par sa propre modale. Et en Live Server, enregistrer fait recharger la page,
  // donc il se déclenchait à chaque sauvegarde. Le témoin « non enregistré » et la confirmation sur
  // Recharger suffisent. (Pour le remettre : window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}}))
  // Ce que la coque de l'outil unifié (studio.js) doit pouvoir demander :
  // les blocs à écrire, l'état « non enregistré », et de le baisser une fois
  // la sauvegarde faite. Le reste de l'atelier ne change pas.
  /* « dessiné » et « cliquable » ne sont pas le même instant — voir recharge().
     Le repli au chronomètre n'est pas de la ceinture-bretelles : dans un onglet
     caché, et dans un navigateur sans affichage, requestAnimationFrame peut ne
     jamais se déclencher. Sans lui, la promesse ne se résolvait pas du tout et
     le test mourait sur « Runtime.callFunctionOn timed out » — une panne bien
     pire que celle qu'on voulait éviter. */
  function deuxImages(){
    return new Promise(function(ok){
      var fait = false, fin = function(){ if(!fait){ fait = true; ok(); } };
      if(typeof requestAnimationFrame === 'function')
        requestAnimationFrame(function(){ requestAnimationFrame(fin); });
      setTimeout(fin, 80);
    });
  }
  window.__MS={
    blocs:function(){clearTimeout(histTimer);commit();return blocksToSave();},
    sale:function(){return dirty;},
    propre:function(){setDirty(false);},
    fichier:setFname,
    // la coque a charge une autre strat dans les globales : on repart de zero.
    // L'echelle des vignettes et la marge des etiquettes sont des nombres :
    // elles ne peuvent pas voyager par les globales, la coque les passe ici.
    /* recharge REND sa promesse, et pret() celle du dernier rendu demandé.
       Sans ça, un test n'avait aucun moyen de savoir quand la carte a fini de
       se dessiner : il dormait 1,5 s en espérant que ça suffise. Ça suffisait
       seul et plus forcément à quatre navigateurs en parallèle — le rouge au
       hasard qui a coûté le passage de six tests de front à quatre.

       Les DEUX images d'attente comptent : Konva reconstruit son hit-graph au
       dessin, pas à la fin du calcul. Sans elles la carte est correcte à
       l'écran mais ne répond pas encore au clic — un test qui cliquait tout de
       suite ne sélectionnait rien, et c'était indiscernable d'une panne. */
    recharge:function(o){if(o){if(typeof o.mobScale==='number')mobScale=o.mobScale;
                               if(typeof o.labelMargin==='number')labelMargin=o.labelMargin;}
                         paintGlobals();curIdx=0;construitChapitres();var q=renderFloor(0);resetHistory();setDirty(false);
                         return q.then(deuxImages);},
    pret:function(){return rendFile.then(deuxImages);},
    // la coque rappelle ceci quand elle ouvre une autre strat
    chapitres:construitChapitres,
    reglages:function(){return {mobScale:mobScale,labelMargin:labelMargin};}
  };
  if(document.readyState!=='loading')boot();else window.addEventListener('DOMContentLoaded',boot);
})();
