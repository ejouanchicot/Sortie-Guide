/* ============================================================
   strat-studio.js — outil d'écriture des stratégies
   ------------------------------------------------------------
   Édite PHASES / PHASES_B (et les blocs BUFFS_*) de js/data.js, plus
   TR de js/i18n.js. Trois colonnes : l'arbre du run, l'édition, et
   l'aperçu — qui est le RENDU RÉEL du guide, via js/strat-render.js.

   Structure au clic (phases, cartes, groupes : opérations rares),
   lignes en texte (le geste qu'on répète des centaines de fois).

   Chargé APRÈS data.js, i18n.js, sortie-map-core.js, strat-render.js
   et strat-core.js.
   ============================================================ */
(function(){
  "use strict";
  var S = window.SORTIE, SC = window.STRATCORE, R = window.STRATR;
  if(!S || !SC || !R){ document.body.innerHTML = '<p style="padding:30px;font:14px sans-serif;color:#f88">'
    + 'Socle manquant — ouvre le projet via un serveur local, pas en double-cliquant le fichier.</p>'; return; }

  // l'aperçu ne traduit pas : on écrit en français, la colonne des traductions gère l'anglais
  R.config({tr:function(s){return s;}, MOB:(typeof MOB!=='undefined'?MOB:{}), ELC:S.EL_VAR,
            ROLE:(typeof ROLE!=='undefined'?ROLE:{})});

  var FL = (typeof FLOORS!=='undefined') ? FLOORS : [];
  var BUFFS = {BUFFS_P1:(typeof BUFFS_P1!=='undefined'?BUFFS_P1:null),
               BUFFS_STD:(typeof BUFFS_STD!=='undefined'?BUFFS_STD:null),
               BUFFS_B:(typeof BUFFS_B!=='undefined'?BUFFS_B:null)};
  var TRAD = (typeof TR!=='undefined') ? TR : {};
  var JOBSL = (typeof JOBS!=='undefined') ? JOBS.concat(['WHM','WAR','RUN','ALL']) : ['ALL'];
  var LANES = [['','—'],['tank','tank'],['buff','buff'],['dd','dd'],['heal','heal'],['rules','rules'],['rules proc','procs'],['mb','mb']];
  var LANE_COL = {tank:'var(--r-tank)', buff:'var(--r-buff)', dd:'var(--r-dd)', heal:'var(--r-heal)',
                  rules:'#e0964f', 'rules proc':'#e0964f', mb:'var(--e-fire)'};

  var idx = 0;                 // étage courant
  var sel = null;              // {t:'phase'|'card'|'group', p, c, g}
  var dirty = false;
  var $ = function(id){ return document.getElementById(id); };
  var esc = S.escAttr;

  function etage(){ return FL[idx] || {phases:[]}; }
  function phases(){ return etage().phases || []; }
  function bossParN(){ var m={}; (etage().bosses||[]).forEach(function(b){ m[b.n]=b; }); return m; }

  /* ---------------- état modifié ---------------- */
  function touche(){ if(!dirty){ dirty = true; $('ssUnsaved').classList.add('on'); } }
  function propre(){ dirty = false; $('ssUnsaved').classList.remove('on'); }
  function toast(msg, cls){ var t=$('ssToast'); t.textContent=msg; t.className=cls||''; t.style.opacity='1';
    clearTimeout(t._t); t._t=setTimeout(function(){ t.style.opacity='0'; }, 2600); }
  function demande(msg, opts){ opts=opts||{}; return new Promise(function(res){
    var b=$('ssModal'); $('ssModalTtl').textContent=opts.titre||'Confirmer'; $('ssModalMsg').innerHTML=msg;
    $('ssModalYes').textContent=opts.ok||'Supprimer';
    $('ssModalYes').className='ss-btn '+(opts.danger===false?'primary':'danger');
    b.hidden=false;
    function fin(v){ b.hidden=true; $('ssModalYes').onclick=null; $('ssModalNo').onclick=null; res(v); }
    $('ssModalYes').onclick=function(){fin(true);}; $('ssModalNo').onclick=function(){fin(false);}; }); }

  /* ---------------- arbre ---------------- */
  function noeud(cls, lvl, libelle, etiquette, couleur, actifSi, onClick, actions){
    var d = document.createElement('div');
    d.className = 'ss-node ss-lvl'+lvl + (actifSi?' on':'');
    d.innerHTML = (etiquette?'<span class="tag" style="--gc:'+(couleur||'var(--dim)')+'">'+esc(etiquette)+'</span>':'')
      + '<span class="lab">'+esc(libelle)+'</span>'
      + '<span class="acts">'+(actions||[]).map(function(a){
          return '<button type="button" data-a="'+a[0]+'" title="'+esc(a[1])+'">'+a[2]+'</button>'; }).join('')+'</span>';
    d.addEventListener('click', function(e){
      var b = e.target.closest('button[data-a]');
      if(b){ e.stopPropagation(); actionNoeud(b.dataset.a, cls); return; }
      onClick(); });
    return d;
  }
  function estSel(t,p,c,g){ return sel && sel.t===t && sel.p===p && sel.c===c && sel.g===g; }

  function buildTree(){
    var host = $('ssTree'); host.innerHTML='';
    phases().forEach(function(ph, pi){
      var ctx = {p:pi};
      host.appendChild(noeud(ctx, 1, (ph.sector?ph.sector+' · ':'')+(ph.boss||'?')+(ph.soon?' (à venir)':''),
        'P'+ph.n, 'var(--accent2)', estSel('phase',pi,undefined,undefined),
        function(){ choisir('phase',pi); },
        [['up','Monter','↑'],['down','Descendre','↓'],['del','Supprimer','✕']]));
      (ph.cards||[]).forEach(function(cd, ci){
        host.appendChild(noeud({p:pi,c:ci}, 2, cd.name||'(sans nom)',
          cd.kind==='boss'?'BOSS':(cd.klabel||'FARM'), cd.kind==='boss'?'var(--violet)':'var(--r-buff)',
          estSel('card',pi,ci,undefined), function(){ choisir('card',pi,ci); },
          [['up','Monter','↑'],['down','Descendre','↓'],['del','Supprimer','✕']]));
        (cd.groups||[]).forEach(function(g, gi){
          host.appendChild(noeud({p:pi,c:ci,g:gi}, 3, g.label||'(sans titre)',
            (g.lines||[]).length+'L', LANE_COL[g.cls]||'var(--dim)',
            estSel('group',pi,ci,gi), function(){ choisir('group',pi,ci,gi); },
            [['up','Monter','↑'],['down','Descendre','↓'],['del','Supprimer','✕']]));
        });
        var addG = document.createElement('button');
        addG.className='ss-add'; addG.textContent='＋ groupe';
        addG.addEventListener('click', function(){ ajouteGroupe(pi,ci); });
        host.appendChild(addG);
      });
      var addC = document.createElement('button');
      addC.className='ss-add'; addC.style.marginLeft='13px'; addC.textContent='＋ carte';
      addC.addEventListener('click', function(){ ajouteCarte(pi); });
      host.appendChild(addC);
    });
    majStat();
  }
  function actionNoeud(a, ctx){
    var ph = phases()[ctx.p];
    var liste, i;
    if(ctx.g!=null){ liste = ph.cards[ctx.c].groups; i = ctx.g; }
    else if(ctx.c!=null){ liste = ph.cards; i = ctx.c; }
    else { liste = phases(); i = ctx.p; }
    if(a==='up' && i>0){ liste.splice(i-1,0,liste.splice(i,1)[0]); sel=null; touche(); buildTree(); rendre(); return; }
    if(a==='down' && i<liste.length-1){ liste.splice(i+1,0,liste.splice(i,1)[0]); sel=null; touche(); buildTree(); rendre(); return; }
    if(a==='del'){
      var quoi = ctx.g!=null?'ce groupe':(ctx.c!=null?'cette carte':'cette phase entière');
      demande('Supprimer <b>'+quoi+'</b> ? Le guide ne l’affichera plus après enregistrement.',
        {titre:'Supprimer'}).then(function(v){ if(!v)return;
          liste.splice(i,1); sel=null; touche(); buildTree(); rendre(); });
    }
  }
  function ajouteCarte(pi){
    var ph = phases()[pi]; ph.cards = ph.cards || [];
    ph.cards.push({kind:'pack', name:'Nouvelle carte', tag:'', groups:[]});
    touche(); choisir('card', pi, ph.cards.length-1);
  }
  function ajouteGroupe(pi,ci){
    var cd = phases()[pi].cards[ci]; cd.groups = cd.groups || [];
    cd.groups.push({label:'Nouveau groupe', cls:'', lines:[]});
    touche(); choisir('group', pi, ci, cd.groups.length-1);
  }
  $('ssAddPhase').addEventListener('click', function(){
    var ps = phases();
    var n = ps.reduce(function(m,p){ return Math.max(m, p.n||0); }, 0) + 1;
    ps.push({n:n, boss:'Nouveau boss', title:'Phase '+n, route:'', cards:[]});
    etage().phases = ps; touche(); choisir('phase', ps.length-1);
  });

  function choisir(t,p,c,g){ sel = {t:t, p:p, c:c, g:g}; buildTree(); editeur(); rendre(); }

  /* ---------------- édition ---------------- */
  function champ(lib, id, val, ph){
    return '<div class="ss-f"><label for="'+id+'">'+lib+'</label>'
      + '<input type="text" id="'+id+'" value="'+esc(val==null?'':val)+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></div>';
  }
  function editeur(){
    var body = $('ssEditBody'), ttl = $('ssEditTtl'), dot = $('ssEditDot');
    if(!sel){ body.innerHTML='<p class="ss-empty">Choisis une phase, une carte ou un groupe dans l’arbre.</p>';
      ttl.textContent='Édition'; return; }
    var ph = phases()[sel.p];
    if(!ph){ sel=null; return editeur(); }

    if(sel.t==='phase'){
      ttl.textContent='Phase '+ph.n; dot.style.background='var(--accent2)';
      var opts = ['(aucun)'].concat(Object.keys(BUFFS).filter(function(k){return BUFFS[k];}));
      var cur = Object.keys(BUFFS).find(function(k){ return BUFFS[k]===ph.buffs; }) || '(aucun)';
      body.innerHTML =
        '<div class="ss-two">'+champ('Numéro d’ordre','f_n',ph.n)+champ('Secteur (sous-sol)','f_sector',ph.sector||'')+'</div>'
        + champ('Boss','f_boss',ph.boss||'')
        + champ('Titre affiché','f_title',ph.title||'')
        + champ('Déplacement','f_route',ph.route||'','Mur de droite, plein SUD → coin bas-gauche.')
        + '<div class="ss-f"><label for="f_buffs">Buffs de trajet</label><select id="f_buffs">'
        + opts.map(function(o){ return '<option'+(o===cur?' selected':'')+'>'+o+'</option>'; }).join('')+'</select></div>'
        + '<div class="ss-f"><label>Phase « à venir »</label><div class="ss-chips" id="f_soon">'
        + '<button type="button" data-v="0"'+(!ph.soon?' class="on"':'')+'>écrite</button>'
        + '<button type="button" data-v="1"'+(ph.soon?' class="on"':'')+'>à venir</button></div></div>';
      lie('f_n', function(v){ ph.n = parseInt(v,10)||ph.n; });
      lie('f_sector', function(v){ if(v) ph.sector=v; else delete ph.sector; });
      lie('f_boss', function(v){ ph.boss=v; });
      lie('f_title', function(v){ ph.title=v; });
      lie('f_route', function(v){ ph.route=v; });
      $('f_buffs').addEventListener('change', function(e){
        ph.buffs = BUFFS[e.target.value] || undefined; if(!ph.buffs) delete ph.buffs; touche(); rendre(); });
      chips('f_soon', function(v){ if(v==='1') ph.soon=true; else delete ph.soon; });
      return;
    }
    var cd = ph.cards && ph.cards[sel.c];
    if(!cd){ sel={t:'phase',p:sel.p}; return editeur(); }

    if(sel.t==='card'){
      ttl.textContent='Carte'; dot.style.background = cd.kind==='boss'?'var(--violet)':'var(--r-buff)';
      body.innerHTML =
        '<div class="ss-f"><label>Nature</label><div class="ss-chips" id="f_kind">'
        + '<button type="button" data-v="pack"'+(cd.kind!=='boss'?' class="on"':'')+'>farm</button>'
        + '<button type="button" data-v="boss"'+(cd.kind==='boss'?' class="on"':'')+'>boss</button></div></div>'
        + champ('Nom','f_name',cd.name||'')
        + champ('Résumé (ligne grise sous le titre)','f_tag',cd.tag||'','weak Fire · SC → MB Fire')
        + champ('Étiquette personnalisée','f_klabel',cd.klabel||'','FARM par défaut · ex. MIDBOSS')
        + '<div class="ss-f"><label>Vignette d’en-tête</label><div class="ss-chips" id="f_nohead">'
        + '<button type="button" data-v="0"'+(!cd.noHeadImg?' class="on"':'')+'>auto</button>'
        + '<button type="button" data-v="1"'+(cd.noHeadImg?' class="on"':'')+'>aucune</button></div></div>'
        + '<div class="ss-help">La vignette est trouvée en cherchant un nom de mob dans le <b>nom de la carte</b>. '
        + '« Pack · Ghost ×3 » accroche seule le portrait de Ghost, et la couleur d’accent vient de ce pack.</div>';
      chips('f_kind', function(v){ cd.kind=v; });
      lie('f_name', function(v){ cd.name=v; });
      lie('f_tag', function(v){ cd.tag=v; });
      lie('f_klabel', function(v){ if(v) cd.klabel=v; else delete cd.klabel; });
      chips('f_nohead', function(v){ if(v==='1') cd.noHeadImg=true; else delete cd.noHeadImg; });
      return;
    }

    var g = cd.groups && cd.groups[sel.g];
    if(!g){ sel={t:'card',p:sel.p,c:sel.c}; return editeur(); }
    ttl.textContent='Groupe'; dot.style.background = LANE_COL[g.cls]||'var(--dim)';
    var mobs = Object.keys((typeof MOB!=='undefined')?MOB:{});
    body.innerHTML =
      champ('Titre du groupe','f_label',g.label||'')
      + '<div class="ss-f"><label>Lane (couleur et rôle du groupe)</label><div class="ss-chips" id="f_cls">'
      + LANES.map(function(l){ return '<button type="button" data-v="'+l[0]+'" style="--gc:'+(LANE_COL[l[0]]||'var(--dim)')+'"'
          +((g.cls||'')===l[0]?' class="on"':'')+'>'+l[1]+'</button>'; }).join('')+'</div></div>'
      + champ('Aparté (italique, filet à gauche)','f_note',g.note||'')
      + '<div class="ss-f"><label for="f_img">Portrait de mob</label><select id="f_img"><option value="">(aucun)</option>'
      + mobs.map(function(m){ return '<option'+(g.img===m?' selected':'')+'>'+m+'</option>'; }).join('')+'</select></div>'
      + '<div class="ss-f"><label for="f_lines">Lignes — une par action</label>'
      + '<textarea id="f_lines" spellcheck="false"></textarea></div>'
      + '<div class="ss-help">'
      + '<b>PLD</b>  texte             rôles séparés par des virgules\n'
      + '<b>PLD!</b> texte             ! = avertissement (ambre)\n'
      + '<b>PLD@DNC</b> texte          réservé à une comp\n'
      + 'PLD texte  <b>?</b>condition   deux espaces avant le ?\n'
      + '<b>-</b>  action              action de plus sur la même ligne</div>';
    lie('f_label', function(v){ g.label=v; });
    chips('f_cls', function(v){ g.cls=v; dot.style.background=LANE_COL[v]||'var(--dim)'; });
    lie('f_note', function(v){ if(v) g.note=v; else delete g.note; });
    $('f_img').addEventListener('change', function(e){ if(e.target.value) g.img=e.target.value; else delete g.img; touche(); rendre(); });
    var ta = $('f_lines');
    ta.value = SC.linesToText(g.lines||[]);
    var t=null;
    ta.addEventListener('input', function(){
      clearTimeout(t);
      t = setTimeout(function(){ g.lines = SC.parseLines(ta.value); touche(); rendre(); buildTree(); }, 220);
    });
  }
  function lie(id, fn){ var e=$(id); if(!e)return;
    e.addEventListener('input', function(){ fn(e.value); touche(); rendre(); buildTree(); }); }
  function chips(id, fn){ var h=$(id); if(!h)return;
    h.querySelectorAll('button[data-v]').forEach(function(b){
      b.addEventListener('click', function(){
        h.querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on'); fn(b.dataset.v); touche(); rendre(); buildTree(); }); }); }

  /* ---------------- aperçu ---------------- */
  function rendre(){
    var host = $('ssPreview');
    if(!sel){ host.innerHTML='<p class="ss-empty">L’aperçu s’affiche quand tu choisis une carte ou un groupe.</p>'; majTrad(); return; }
    var ph = phases()[sel.p]; if(!ph){ host.innerHTML=''; return; }
    var f = etage(), bn = bossParN();
    if(sel.t==='phase'){
      host.innerHTML = R.buffsHtml(ph.buffs)
        + '<div class="cards">'+(ph.cards||[]).map(function(c){ return R.cardHtml(c, ph, f, bn); }).join('')+'</div>';
    } else {
      var cd = ph.cards[sel.c];
      if(!cd){ host.innerHTML=''; return; }
      host.innerHTML = '<div class="cards">'+R.cardHtml(cd, ph, f, bn)+'</div>';
      if(sel.t==='group'){
        var grps = host.querySelectorAll('.grp');
        if(grps[sel.g]) grps[sel.g].style.outline = '2px solid var(--accent)';
      }
    }
    majTrad();
  }

  /* ---------------- traductions ---------------- */
  function majTrad(){
    var manque = SC.manquantes(phases(), TRAD);
    $('ssTrCount').textContent = manque.length;
    var host = $('ssTr');
    if(!manque.length){ host.innerHTML='<p class="ss-trok">Tout est traduit pour cet étage.</p>'; return; }
    host.innerHTML = manque.slice(0,40).map(function(fr,i){
      return '<div class="ss-trrow"><div class="ss-trfr">'+esc(fr)+'</div>'
        + '<input type="text" data-i="'+i+'" placeholder="traduction anglaise…"></div>'; }).join('')
      + (manque.length>40?'<p class="ss-empty" style="margin-top:8px">… et '+(manque.length-40)+' autres.</p>':'');
    host.querySelectorAll('input[data-i]').forEach(function(e){
      e.addEventListener('change', function(){
        var fr = manque[+e.dataset.i];
        if(e.value.trim()){ TRAD[fr] = e.value.trim(); touche(); majTrad(); }
      });
    });
  }
  function majStat(){
    var n = phases().length, c=0, g=0, l=0;
    phases().forEach(function(p){ (p.cards||[]).forEach(function(x){ c++; (x.groups||[]).forEach(function(y){ g++; l+=(y.lines||[]).length; }); }); });
    $('ssStat').textContent = n+' phases · '+c+' cartes · '+g+' groupes · '+l+' lignes';
  }

  /* ---------------- écriture des fichiers ---------------- */
  function idbReq(fn){ return new Promise(function(res,rej){ var r=indexedDB.open('stratstudio',1);
    r.onupgradeneeded=function(){ r.result.createObjectStore('kv'); };
    r.onerror=function(){ rej(r.error); };
    r.onsuccess=function(){ try{ fn(r.result,res,rej); }catch(e){ rej(e); } }; }); }
  function idbGet(k){ return idbReq(function(db,res,rej){ var t=db.transaction('kv','readonly').objectStore('kv').get(k);
    t.onsuccess=function(){res(t.result);}; t.onerror=function(){rej(t.error);}; }); }
  function idbSet(k,v){ return idbReq(function(db,res,rej){ var t=db.transaction('kv','readwrite').objectStore('kv').put(v,k);
    t.onsuccess=function(){res();}; t.onerror=function(){rej(t.error);}; }); }
  var handles = {};
  async function fichier(cle, nom){
    if(handles[cle]) return handles[cle];
    try{ var h = await idbGet(cle); if(h){ handles[cle]=h; return h; } }catch(e){}
    var res = await window.showOpenFilePicker({types:[{description:nom, accept:{'text/javascript':['.js']}}]});
    handles[cle] = res[0]; try{ await idbSet(cle, res[0]); }catch(e){}
    return handles[cle];
  }
  async function permission(h){ var o={mode:'readwrite'};
    if((await h.queryPermission(o))==='granted') return true;
    return (await h.requestPermission(o))==='granted'; }
  // remplacement bloc par bloc, comme Map Studio : on ne touche à rien d'autre dans le fichier
  function applique(txt, blocs){
    var absents = [];
    blocs.forEach(function(b){
      var re = new RegExp('const '+b.nom+'\\s*=\\s*[\\[{][\\s\\S]*?\\n[\\]}];');
      if(!re.test(txt)){ absents.push(b.nom); return; }
      txt = txt.replace(re, function(){ return b.txt; });
    });
    return {texte:txt, absents:absents};
  }
  function blocsData(){
    var reg = {}; Object.keys(BUFFS).forEach(function(k){ if(BUFFS[k]) reg[k]=BUFFS[k]; });
    var out = [];
    Object.keys(reg).forEach(function(k){ out.push({nom:k, txt:SC.buffsConst(k, reg[k])}); });
    FL.forEach(function(f){
      var nom = (f.id==='top') ? 'PHASES' : 'PHASES_B';
      out.push({nom:nom, txt:SC.phasesConst(nom, f.phases||[], reg)});
    });
    return out;
  }
  async function enregistrer(){
    if(!window.showOpenFilePicker){ toast('Utilise Chrome ou Edge pour l’écriture directe.','err'); return; }
    try{
      var h = await fichier('data', 'js/data.js');
      if(!(await permission(h))){ toast('Permission refusée sur data.js.','err'); return; }
      var txt = await (await h.getFile()).text();
      var r = applique(txt, blocsData());
      if(r.absents.length){ toast('Blocs introuvables dans ce fichier : '+r.absents.join(', ')+'. Est-ce le bon data.js ?','err'); return; }
      var w = await h.createWritable(); await w.write(r.texte); await w.close();

      var h2 = await fichier('i18n', 'js/i18n.js');
      if(await permission(h2)){
        var t2 = await (await h2.getFile()).text();
        var r2 = applique(t2, [{nom:'TR', txt:SC.trConst('TR', TRAD)}]);
        if(r2.absents.length) toast('data.js écrit, mais le bloc TR est introuvable dans ce fichier.','err');
        else { var w2 = await h2.createWritable(); await w2.write(r2.texte); await w2.close();
               propre(); toast('data.js et i18n.js écrits — le guide se met à jour.','ok'); return; }
      }
      propre(); toast('data.js écrit (i18n.js non enregistré).','ok');
    }catch(e){ if(e.name!=='AbortError') toast('Erreur : '+e.message,'err'); }
  }
  async function recharger(){
    if(dirty && !(await demande('Tu as des modifications <b>non enregistrées</b>. Recharger la page va les <b>perdre</b>.',
      {titre:'Recharger', ok:'Recharger quand même'}))) return;
    location.reload();
  }

  /* ---------------- démarrage ---------------- */
  $('ssFloor').addEventListener('click', function(e){
    var b = e.target.closest('button[data-i]'); if(!b) return;
    $('ssFloor').querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); });
    b.classList.add('on'); idx = +b.dataset.i; sel=null; buildTree(); editeur(); rendre();
  });
  $('ssSave').addEventListener('click', enregistrer);
  $('ssReload').addEventListener('click', recharger);
  window.addEventListener('keydown', function(e){
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); enregistrer(); }
  });
  buildTree(); editeur(); rendre();
  window.__SS = {choisir:choisir, etat:function(){ return {idx:idx, sel:sel, dirty:dirty}; },
                 blocsData:blocsData, applique:applique};   // crochets de test
})();
