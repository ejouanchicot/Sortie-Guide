/* ============================================================
   strat-studio.js — outil d'écriture des stratégies
   ------------------------------------------------------------
   Édite PHASES / PHASES_B (et les blocs BUFFS_*) de js/data.js, plus
   TR de js/i18n.js.

   UNE ÉTAPE = UNE PAGE. Le run se pense en P1 P2 P3 P4 : la colonne de
   gauche ne montre donc QUE les étapes, et tout le contenu de l'étape
   choisie tient dans un seul texte qu'on lit de haut en bas, dans
   l'ordre du guide. Une première version découpait chaque étape en
   blocs puis en rubriques dans un arbre : quarante lignes de navigation
   pour du contenu qui se lit d'un bloc.

   Chargé APRÈS data.js, i18n.js, sortie-map-core.js, strat-render.js
   et strat-core.js.
   ============================================================ */
(function(){
  "use strict";
  var S = window.SORTIE, SC = window.STRATCORE, R = window.STRATR;
  if(!S || !SC || !R){ document.body.innerHTML = '<p style="padding:30px;font:14px sans-serif;color:#f88">'
    + 'Socle manquant — ouvre le projet via un serveur local, pas en double-cliquant le fichier.</p>'; return; }

  // l'aperçu n'a pas à traduire : on écrit en français, la colonne de droite gère l'anglais
  R.config({tr:function(s){return s;}, MOB:(typeof MOB!=='undefined'?MOB:{}), ELC:S.EL_VAR,
            ROLE:(typeof ROLE!=='undefined'?ROLE:{})});

  var FL = (typeof FLOORS!=='undefined') ? FLOORS : [];
  var BUFFS = {BUFFS_P1:(typeof BUFFS_P1!=='undefined'?BUFFS_P1:null),
               BUFFS_STD:(typeof BUFFS_STD!=='undefined'?BUFFS_STD:null),
               BUFFS_B:(typeof BUFFS_B!=='undefined'?BUFFS_B:null)};
  var TRAD = (typeof TR!=='undefined') ? TR : {};
  var JOBSL = (typeof JOBS!=='undefined') ? JOBS.concat(['WHM','ALL']) : ['ALL'];

  var idx = 0;        // étage
  var selP = null;    // index de l'étape ouverte
  var dirty = false;
  var $ = function(id){ return document.getElementById(id); };
  var esc = S.escAttr;

  function etage(){ return FL[idx] || {phases:[]}; }
  function phases(){ return etage().phases || []; }
  function bossParN(){ var m={}; (etage().bosses||[]).forEach(function(b){ m[b.n]=b; }); return m; }
  function couleurEtape(ph){ var b = bossParN()[ph.n]; return b ? S.EL_VAR[b.el] : 'var(--dim)'; }

  /* ---------------- état ---------------- */
  function touche(){ if(!dirty){ dirty = true; $('ssUnsaved').classList.add('on'); } memoriseBientot(); }
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

  /* ---------------- colonne 1 : les étapes, rien d'autre ---------------- */
  function buildTree(){
    var host = $('ssTree'); host.innerHTML='';
    phases().forEach(function(ph, pi){
      var d = document.createElement('div');
      d.className = 'ss-step' + (selP===pi ? ' on' : '');
      var nb = (ph.cards||[]).reduce(function(m,c){ return m + (c.groups||[]).length; }, 0);
      d.innerHTML = '<span class="ss-pn" style="--pc:'+couleurEtape(ph)+'">'+esc(ph.sector||('P'+ph.n))+'</span>'
        + '<span class="ss-pl"><b>'+esc(ph.boss||'—')+'</b>'
        + '<i>'+(ph.soon ? 'à venir' : (nb ? nb+(nb>1?' rubriques':' rubrique') : 'vide'))+'</i></span>'
        + '<span class="acts">'
        + '<button type="button" data-a="up" title="Monter">↑</button>'
        + '<button type="button" data-a="down" title="Descendre">↓</button>'
        + '<button type="button" data-a="del" title="Supprimer l’étape">✕</button></span>';
      d.addEventListener('click', function(e){
        var b = e.target.closest('button[data-a]');
        if(b){ e.stopPropagation(); actionEtape(b.dataset.a, pi); return; }
        choisir(pi);
      });
      host.appendChild(d);
    });
    majStat();
  }
  function actionEtape(a, i){
    var ps = phases();
    if(a==='up' && i>0){ ps.splice(i-1,0,ps.splice(i,1)[0]); selP=i-1; touche(); buildTree(); return; }
    if(a==='down' && i<ps.length-1){ ps.splice(i+1,0,ps.splice(i,1)[0]); selP=i+1; touche(); buildTree(); return; }
    if(a==='del') demande('Supprimer l’étape <b>'+esc(ps[i].boss||('P'+ps[i].n))+'</b> et tout son contenu ?',
      {titre:'Supprimer l’étape'}).then(function(v){ if(!v)return;
        ps.splice(i,1); selP=null; touche(); buildTree(); editeur(); rendre(); });
  }
  $('ssAddPhase').addEventListener('click', function(){
    var ps = phases(), n = ps.reduce(function(m,p){ return Math.max(m, p.n||0); }, 0) + 1;
    ps.push({n:n, boss:'Nouveau boss', title:'', route:'', cards:[]});
    etage().phases = ps; touche(); choisir(ps.length-1);
  });
  function choisir(pi){ selP = pi; buildTree(); editeur(); rendre(); }

  /* ---------------- colonne 2 : une étape, une page ---------------- */
  function accueil(){
    var ps = phases(), prem = ps.length ? (ps[0].boss || 'la première étape') : null;
    return '<div class="ss-hero">'
      + '<h2>Écrire la stratégie du guide</h2>'
      + '<p>Cet outil remplit le texte que les joueurs lisent : ce que fait chaque job, à quel moment du run. '
      + 'Il écrit directement dans les fichiers du site.</p>'
      + '<ol class="ss-steps">'
      + '<li><b>Choisis une étape</b> à gauche — le run en compte quatre.</li>'
      + '<li><b>Écris son contenu</b> dans une seule page, de haut en bas : les blocs, leurs rubriques, les actions. '
      + 'Des boutons insèrent la mise en forme et l’outil relit chaque ligne sous tes yeux.</li>'
      + '<li><b>Regarde à droite</b> — c’est le rendu réel du guide, mis à jour pendant que tu écris. '
      + 'Rien n’est écrit sur disque tant que tu ne cliques pas <b>Enregistrer</b>.</li>'
      + '</ol>'
      + (prem ? '<button class="ss-btn primary" id="ssGo">Commencer par '+esc(prem)+'</button>' : '')
      + '<p class="ss-mini-note">Rien n’est définitif : <b>Ctrl+Z</b> annule.</p></div>';
  }
  function editeur(){
    var body = $('ssEditBody'), ttl = $('ssEditTtl'), dot = $('ssEditDot');
    var ps = phases();
    if(selP==null || !ps[selP]){
      body.innerHTML = accueil(); ttl.textContent='Ce que tu écris'; dot.style.background='var(--dim)';
      var go = $('ssGo'); if(go) go.addEventListener('click', function(){ choisir(0); });
      return;
    }
    var ph = ps[selP];
    ttl.textContent = (ph.sector?ph.sector+' · ':'')+'Étape '+ph.n+' — '+(ph.boss||'');
    dot.style.background = couleurEtape(ph);

    var noms = Object.keys(BUFFS).filter(function(k){ return BUFFS[k]; });
    var cur = noms.filter(function(k){ return BUFFS[k]===ph.buffs; })[0] || '';
    body.innerHTML =
      '<div class="ss-hdr">'
      + '<div class="ss-f"><label for="f_boss">Boss</label><input type="text" id="f_boss" value="'+esc(ph.boss||'')+'"></div>'
      + '<div class="ss-f"><label for="f_title">Titre affiché</label><input type="text" id="f_title" value="'+esc(ph.title||'')+'"></div>'
      + '<div class="ss-f ss-narrow"><label for="f_buffs">Buffs de trajet</label><select id="f_buffs">'
      +   '<option value="">aucun</option>'
      +   noms.map(function(o){ return '<option'+(o===cur?' selected':'')+'>'+o+'</option>'; }).join('')
      + '</select></div></div>'
      + '<div class="ss-f"><label for="f_route">Comment on y va</label>'
      +   '<input type="text" id="f_route" value="'+esc(ph.route||'')+'" placeholder="Mur de droite, plein SUD → coin bas-gauche."></div>'
      + '<div class="ss-f"><label for="f_txt">Le contenu de l’étape</label>'
      + '<div class="ss-tb" id="f_tb">'
      +   '<button type="button" data-ins="bloc" class="wide">＋ bloc</button>'
      +   '<button type="button" data-ins="rub" class="wide">＋ rubrique</button>'
      +   '<span class="ss-tbsep"></span><span class="ss-tbl">job</span>'
      +   JOBSL.map(function(j){ return '<button type="button" data-job="'+j+'">'+j+'</button>'; }).join('')
      +   '<span class="ss-tbsep"></span>'
      +   '<button type="button" data-mk="warn" title="Marquer la ligne comme un avertissement">⚠ alerte</button>'
      +   '<button type="button" data-mk="cond" title="Ajouter une condition en fin de ligne">? condition</button>'
      +   '<button type="button" data-mk="comp" title="Réserver la ligne à une composition">@ comp</button>'
      +   '<button type="button" data-mk="sub" title="Ajouter une action à la ligne précédente">＋ action</button>'
      + '</div>'
      + '<textarea id="f_txt" spellcheck="false" placeholder="## boss  Boss · Degei"></textarea>'
      + '<div class="ss-read" id="f_read"></div></div>';

    lie('f_boss', function(v){ ph.boss=v; });
    lie('f_title', function(v){ ph.title=v; });
    lie('f_route', function(v){ ph.route=v; });
    $('f_buffs').addEventListener('change', function(e){
      if(e.target.value) ph.buffs = BUFFS[e.target.value]; else delete ph.buffs;
      touche(); rendre(); });

    var ta = $('f_txt');
    ta.value = SC.phaseToText(ph);
    var t=null;
    function relit(){
      clearTimeout(t);
      t = setTimeout(function(){ SC.textToPhase(ta.value, ph); touche(); rendre(); buildTree(); }, 240);
      lecture(ta);
    }
    ta.addEventListener('input', relit);
    ['click','keyup','focus'].forEach(function(ev){ ta.addEventListener(ev, function(){ lecture(ta); }); });
    lecture(ta);
    $('f_tb').addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      if(b.dataset.job) insereDebut(ta, b.dataset.job+'  ');
      else if(b.dataset.ins==='bloc') insereApres(ta, '\n## boss  Nom du bloc\n~ résumé en une ligne\n');
      else if(b.dataset.ins==='rub') insereApres(ta, '\n# Titre de la rubrique  [tank]\n');
      else if(b.dataset.mk==='warn') marqueWarn(ta);
      else if(b.dataset.mk==='cond') insereFin(ta, '  ?');
      else if(b.dataset.mk==='comp') insereApresRoles(ta, '@DNC');
      else if(b.dataset.mk==='sub') insereFin(ta, '\n-  ');
      ta.dispatchEvent(new Event('input', {bubbles:true}));
    });
  }
  function lie(id, fn){ var e=$(id); if(!e)return;
    e.addEventListener('input', function(){ fn(e.value); touche(); rendre(); buildTree(); }); }

  /* ---------------- aides à la saisie ----------------
     Toutes travaillent sur la LIGNE DU CURSEUR : on ne réécrit jamais tout le texte. */
  function bornesLigne(ta){
    var v = ta.value, i = ta.selectionStart;
    var d = v.lastIndexOf('\n', i-1) + 1;
    var f = v.indexOf('\n', i); if(f < 0) f = v.length;
    return {d:d, f:f, txt:v.slice(d,f)};
  }
  function poseLigne(ta, b, neuve, curseur){
    ta.value = ta.value.slice(0,b.d) + neuve + ta.value.slice(b.f);
    var pos = b.d + (curseur==null ? neuve.length : curseur);
    ta.focus(); ta.setSelectionRange(pos,pos);
  }
  var RE_TETE = /^([A-Z]{2,4}(?:\s*,\s*[A-Z]{2,4})*)(!?)(@[A-Za-z]+)?(\s*)/;
  function insereDebut(ta, txt){
    var b = bornesLigne(ta), m = b.txt.match(RE_TETE);
    if(m){
      var jobs = m[1].split(',').map(function(x){return x.trim();}), nouveau = txt.trim();
      if(jobs.indexOf(nouveau) < 0) jobs.push(nouveau);
      poseLigne(ta, b, jobs.join(',')+m[2]+(m[3]||'')+'  '+b.txt.slice(m[0].length));
    } else poseLigne(ta, b, txt + b.txt, txt.length);
  }
  function marqueWarn(ta){
    var b = bornesLigne(ta), m = b.txt.match(RE_TETE);
    if(!m){ poseLigne(ta, b, 'ALL!  ' + b.txt); return; }
    poseLigne(ta, b, m[1] + (m[2]==='!'?'':'!') + (m[3]||'') + '  ' + b.txt.slice(m[0].length));
  }
  function insereApresRoles(ta, txt){
    var b = bornesLigne(ta), m = b.txt.match(RE_TETE);
    if(!m){ poseLigne(ta, b, 'ALL'+txt+'  '+b.txt); return; }
    if(m[3]) return;
    poseLigne(ta, b, m[1]+m[2]+txt+'  '+b.txt.slice(m[0].length));
  }
  function insereFin(ta, txt){
    var b = bornesLigne(ta);
    poseLigne(ta, b, b.txt.replace(/\s+$/,'') + txt);
  }
  // un bloc ou une rubrique s'insère APRÈS la ligne courante, jamais au milieu d'une action
  function insereApres(ta, txt){
    var b = bornesLigne(ta);
    ta.value = ta.value.slice(0,b.f) + txt + ta.value.slice(b.f);
    var pos = b.f + txt.length;
    ta.focus(); ta.setSelectionRange(pos,pos);
  }

  /* ---------------- bandeau : comment l'outil comprend la ligne ---------------- */
  function lecture(ta){
    var host = $('f_read'); if(!host) return;
    var b = bornesLigne(ta), txt = b.txt.trim(), m;
    if(!txt){ host.innerHTML = '<span class="ss-rmuted">Ligne vide. Une action commence par le job : '
      + '<code>PLD  tank sur place</code></span>'; return; }
    if((m = txt.match(/^##\s+(\S+)\s*(.*)$/))){
      host.innerHTML = '<b class="ss-rj">bloc '+(/^boss$/i.test(m[1])?'boss':'farm')+'</b> · « '
        + esc(m[2].replace(/\[[^\]]*\]/g,'').trim()) + ' »'
        + (/sans portrait/i.test(m[2])?' · sans portrait':''); return; }
    if((m = txt.match(/^#\s+(.*)$/))){
      var th = (m[1].match(/\[([^\]:]+)\]/)||[])[1];
      host.innerHTML = '<b class="ss-rj">rubrique</b> · « '+esc(m[1].replace(/\[[^\]]*\]/g,'').trim())+' »'
        + (th ? ' · thème <b>'+esc(th)+'</b>' : ' · <span class="ss-rwarn">sans thème (gris)</span>'); return; }
    if(/^~/.test(txt)){ host.innerHTML = '<span class="ss-rmuted">Résumé du bloc — ou remarque de la rubrique s’il suit un titre.</span>'; return; }
    if(/^-\s+/.test(txt)){ host.innerHTML = '<span class="ss-rmuted">Action ajoutée à la ligne du dessus (puce).</span>'; return; }
    var l = SC.parseLines(txt)[0]; if(!l){ host.innerHTML=''; return; }
    var sansRole = !/^[A-Z]{2,4}(\s*,\s*[A-Z]{2,4})*[!@\s]/.test(txt);
    var bouts = [(l.r||['ALL']).map(function(r){ return '<b class="ss-rj">'+esc(r)+'</b>'; }).join(' + ')
      + (sansRole ? ' <span class="ss-rwarn">(aucun job écrit → attribué à TOUS)</span>' : '')];
    bouts.push('« ' + esc(Array.isArray(l.t)? l.t.join(' · ') : l.t) + ' »');
    if(l.warn) bouts.push('<span class="ss-rw">avertissement</span>');
    if(l.comp) bouts.push('réservé à la comp <b>'+esc(l.comp)+'</b>');
    if(l.cond) bouts.push('condition : <i>'+esc(l.cond)+'</i>');
    host.innerHTML = bouts.join(' · ');
  }

  /* ---------------- colonne 3 : l'aperçu de toute l'étape ---------------- */
  function rendre(){
    var host = $('ssPreview'), ps = phases();
    if(selP==null || !ps[selP]){
      host.innerHTML='<p class="ss-empty">Choisis une étape à gauche pour voir son rendu.</p>'; majTrad(); return; }
    var ph = ps[selP], f = etage(), bn = bossParN();
    host.innerHTML = R.buffsHtml(ph.buffs)
      + '<div class="cards">'+(ph.cards||[]).map(function(c){ return R.cardHtml(c, ph, f, bn); }).join('')+'</div>'
      + ((ph.cards||[]).length ? '' : '<p class="ss-empty">Cette étape n’a encore aucun bloc — utilise <b>＋ bloc</b>.</p>');
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
        if(e.value.trim()){ TRAD[fr] = e.value.trim(); touche(); majTrad(); } });
    });
  }
  function majStat(){
    var n = phases().length, c=0, g=0, l=0;
    phases().forEach(function(p){ (p.cards||[]).forEach(function(x){ c++; (x.groups||[]).forEach(function(y){ g++; l+=(y.lines||[]).length; }); }); });
    $('ssStat').textContent = n+' étapes · '+c+' blocs · '+g+' rubriques · '+l+' actions';
  }

  /* ---------------- annuler / rétablir ---------------- */
  var hist = [], hidx = -1, hTimer = null;
  function instantane(){ return JSON.stringify({p0:FL[0]&&FL[0].phases, p1:FL[1]&&FL[1].phases, tr:TRAD}); }
  function memorise(){ var v = instantane();
    if(hidx>=0 && hist[hidx]===v) return;
    hist = hist.slice(0, hidx+1); hist.push(v); hidx = hist.length-1;
    if(hist.length>60){ hist.shift(); hidx--; } }
  function memoriseBientot(){ clearTimeout(hTimer); hTimer = setTimeout(memorise, 500); }
  function restaure(v){ var st = JSON.parse(v);
    if(FL[0]) FL[0].phases = st.p0; if(FL[1]) FL[1].phases = st.p1;
    Object.keys(TRAD).forEach(function(k){ delete TRAD[k]; });
    Object.keys(st.tr).forEach(function(k){ TRAD[k] = st.tr[k]; });
    buildTree(); editeur(); rendre(); }
  function annuler(){ clearTimeout(hTimer); memorise();
    if(hidx>0){ hidx--; restaure(hist[hidx]); touche(); toast('Annulé.'); } else toast('Rien à annuler.'); }
  function retablir(){ clearTimeout(hTimer);
    if(hidx < hist.length-1){ hidx++; restaure(hist[hidx]); touche(); toast('Rétabli.'); } else toast('Rien à rétablir.'); }

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
  // remplacement bloc par bloc, comme Map Studio : le reste des fichiers n'est pas touché
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
  var explique = false;
  async function enregistrer(){
    if(!window.showOpenFilePicker){ toast('Utilise Chrome ou Edge pour l’écriture directe.','err'); return; }
    if(!explique && !handles.data){
      var ok = await demande('L’outil va écrire dans <b>js/data.js</b> puis <b>js/i18n.js</b>.<br><br>'
        + 'Le navigateur va te demander de choisir ces deux fichiers — c’est sa façon d’autoriser l’écriture. '
        + 'Seuls les blocs de stratégie sont remplacés, le reste des fichiers n’est pas touché.',
        {titre:'Enregistrer sur le disque', ok:'J’ai compris', danger:false});
      if(!ok) return;
      explique = true;
    }
    try{
      var h = await fichier('data', 'js/data.js');
      if(!(await permission(h))){ toast('Permission refusée sur data.js.','err'); return; }
      var txt = await (await h.getFile()).text();
      var r = applique(txt, blocsData());
      if(r.absents.length){ toast('Blocs introuvables : '+r.absents.join(', ')+'. Est-ce le bon data.js ?','err'); return; }
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
    if(dirty && !(await demande('Tu as des modifications <b>non enregistrées</b>. Recharger va les <b>perdre</b>.',
      {titre:'Recharger', ok:'Recharger quand même'}))) return;
    location.reload();
  }

  /* ---------------- démarrage ---------------- */
  $('ssFloor').addEventListener('click', function(e){
    var b = e.target.closest('button[data-i]'); if(!b) return;
    $('ssFloor').querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); });
    b.classList.add('on'); idx = +b.dataset.i; selP=null; buildTree(); editeur(); rendre();
  });
  $('ssSave').addEventListener('click', enregistrer);
  $('ssReload').addEventListener('click', recharger);
  window.addEventListener('keydown', function(e){
    var mod = e.ctrlKey||e.metaKey, k = e.key.toLowerCase();
    if(mod && k==='s'){ e.preventDefault(); enregistrer(); return; }
    if(mod && k==='z' && !e.shiftKey){ e.preventDefault(); annuler(); return; }
    if(mod && (k==='y' || (k==='z' && e.shiftKey))){ e.preventDefault(); retablir(); }
  });
  buildTree(); editeur(); rendre(); memorise();
  window.__SS = {choisir:choisir, etat:function(){ return {idx:idx, selP:selP, dirty:dirty}; },
                 blocsData:blocsData, applique:applique};
})();
