/* ============================================================
   strat-studio.js — outil d'écriture des stratégies
   ------------------------------------------------------------
   Édite PHASES / PHASES_B, COMPO, ROLE et BUFFS de js/data.js, plus
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

  // l'aperçu n'a pas à traduire : on écrit en français, la colonne de droite gère l'anglais.
  // base '../' : les chemins de data.js partent de la racine, cette page est dans tools/.
  R.config({tr:function(s){return s;}, MOB:(typeof MOB!=='undefined'?MOB:{}), ELC:S.EL_VAR,
            ROLE:(typeof ROLE!=='undefined'?ROLE:{}), base:'../'});

  var FL = (typeof FLOORS!=='undefined') ? FLOORS : [];
  // JEUX et pas BUFFS : `var BUFFS` ici masquerait le `const BUFFS` de data.js
  // dans toute l'IIFE, et `typeof BUFFS` ne verrait plus que la locale.
  var JEUX = (typeof BUFFS!=='undefined') ? BUFFS : {};
  var TRAD = (typeof TR!=='undefined') ? TR : {};
  var CP = (typeof COMPO!=='undefined') ? COMPO : {taille:6, jobs:[]};
  // Les 22 jobs de FFXI, dans un ordre stable — la référence pour les panneaux
  // Compo et Rôles, et pour le sélecteur « autre job ».
  function tousLesJobs(){
    var r = (typeof ROLE!=='undefined') ? Object.keys(ROLE) : [];
    return r.filter(function(j){ return j !== 'ALL'; });
  }
  // Barre de saisie : la compo, plus les jobs DÉJÀ cités dans la strat (un WAR
  // mentionné en alternative doit rester à portée), plus ALL. Le reste passe
  // par le bouton « autre » : on écrit avec six jobs, pas avec vingt-deux.
  function jobsCites(){
    var vus = {};
    (FL||[]).forEach(function(f){ (f.phases||[]).forEach(function(p){
      ((p.buffs && JEUX[p.buffs]) || []).forEach(function(l){ (l.r||[]).forEach(function(j){ vus[j]=1; }); });
      (p.cards||[]).forEach(function(c){ (c.groups||[]).forEach(function(g){
        (g.lines||[]).forEach(function(l){ (l.r||[]).forEach(function(j){ vus[j]=1; }); }); }); });
    }); });
    return Object.keys(vus);
  }
  function barreJobs(){
    var vus = {}, out = [];
    S.compoJobs(CP).concat(jobsCites()).forEach(function(j){
      if(j !== 'ALL' && !vus[j]){ vus[j]=1; out.push(j); } });
    out.push('ALL');
    return out;
  }

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

  // Même modale, mais avec un champ : rend le texte saisi, ou null si annulé.
  // (window.prompt existe, mais il sort du thème et bloque tout l'onglet.)
  function saisie(msg, opts){ opts=opts||{}; return new Promise(function(res){
    var b=$('ssModal');
    $('ssModalTtl').textContent = opts.titre||'Saisie';
    $('ssModalMsg').innerHTML = msg + '<input type="text" class="ss-msaisie" id="ssModalIn">';
    $('ssModalYes').textContent = opts.ok||'Valider';
    $('ssModalYes').className = 'ss-btn primary';
    b.hidden=false;
    var champ = $('ssModalIn');
    champ.value = opts.valeur||'';
    champ.focus(); champ.select();
    function fin(v){ b.hidden=true; champ.onkeydown=null;
      $('ssModalYes').onclick=null; $('ssModalNo').onclick=null; res(v); }
    champ.onkeydown = function(e){
      if(e.key==='Enter'){ e.preventDefault(); fin(champ.value); }
      if(e.key==='Escape'){ e.preventDefault(); fin(null); } };
    $('ssModalYes').onclick=function(){ fin(champ.value); };
    $('ssModalNo').onclick=function(){ fin(null); }; }); }

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
      + '<li><b>Écris comme tu le dirais</b> : un titre de rubrique sur sa ligne, puis les actions, '
      + 'une par ligne, en commençant par le job — <code>PLD : tank sur place</code>. Rien d’autre à retenir.</li>'
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

    // Le bloc de préparation se choisit par son NOM — le même que le guide
    // affiche en titre. Le choix « nouveau… » en crée un, et le crayon renomme
    // celui en cours dans toutes les étapes qui s'en servent.
    var noms = Object.keys(JEUX);
    var cur = ph.buffs || '';
    body.innerHTML =
      '<div class="ss-hdr">'
      + '<div class="ss-f"><label for="f_boss">Boss</label><input type="text" id="f_boss" value="'+esc(ph.boss||'')+'"></div>'
      + '<div class="ss-f"><label for="f_title">Titre affiché</label><input type="text" id="f_title" value="'+esc(ph.title||'')+'"></div>'
      + '<div class="ss-f ss-wide"><label for="f_buffs">Bloc de préparation</label>'
      +   '<div class="ss-frow"><select id="f_buffs">'
      +     '<option value="">aucun</option>'
      +     noms.map(function(o){ return '<option value="'+esc(o)+'"'+(o===cur?' selected':'')+'>'+esc(o)+'</option>'; }).join('')
      +     '<option value="__neuf__">＋ nouveau bloc…</option>'
      +   '</select>'
      +   '<button type="button" class="ss-mini" id="f_buffsRen" title="Renommer ce bloc partout"'
      +     (cur?'':' disabled')+'>renommer</button></div></div></div>'
      + '<div class="ss-f"><label for="f_route">Comment on y va</label>'
      +   '<input type="text" id="f_route" value="'+esc(ph.route||'')+'" placeholder="Mur de droite, plein SUD → coin bas-gauche."></div>'
      + '<div id="ssBuffs"></div>'
      + '<div id="ssBlocs"></div>'
      + '<div class="ss-addrow">'
      +   '<button type="button" class="ss-btn" id="ssAddFarm">＋ ajouter un farm</button>'
      +   '<button type="button" class="ss-btn" id="ssAddBoss">＋ ajouter un boss</button></div>';

    lie('f_boss', function(v){ ph.boss=v; });
    lie('f_title', function(v){ ph.title=v; });
    lie('f_route', function(v){ ph.route=v; });
    $('f_buffs').addEventListener('change', function(e){
      var v = e.target.value;
      if(v === '__neuf__'){ nouveauBuff(ph); return; }
      if(v) ph.buffs = v; else delete ph.buffs;
      touche(); editeur(); rendre(); });
    $('f_buffsRen').addEventListener('click', function(){ renommeBuff(ph.buffs); });
    $('ssAddFarm').addEventListener('click', function(){ ajouteBloc(ph,'pack'); });
    $('ssAddBoss').addEventListener('click', function(){ ajouteBloc(ph,'boss'); });
    dessineBuffs(ph);
    dessineBlocs(ph);
  }
  function ajouteBloc(ph, nature){
    ph.cards = ph.cards || [];
    ph.cards.push({kind:nature, name:(nature==='boss'?'Boss · ':'Pack · '), tag:'', groups:[]});
    touche(); dessineBlocs(ph); rendre(); buildTree();
  }
  // La même barre pour tout ce qui se saisit en lignes : les blocs de la strat
  // ET le bloc de préparation. Une seule barre à apprendre.
  function barreOutils(){
    return '<div class="ss-tb">'
      + '<span class="ss-tbl">job</span>'
      + barreJobs().map(function(j){
          var dansCompo = S.compoJobs(CP).indexOf(j) >= 0 || j === 'ALL';
          return '<button type="button" class="ss-job r-'+S.roleDuJob(typeof ROLE!=='undefined'?ROLE:{}, j)
            + (dansCompo ? '' : ' hors')+'" data-job="'+esc(j)+'"'
            + (dansCompo ? '' : ' title="Hors composition — cité ailleurs dans la strat"')+'>'+esc(j)+'</button>'; }).join('')
      + '<button type="button" class="ss-job ss-jplus" data-plus="1" title="Insérer un job hors composition">＋ job</button>'
      + '<span class="ss-tbsep"></span>'
      + '<button type="button" data-mk="warn" title="Marquer la ligne comme un avertissement">⚠ alerte</button>'
      + '<button type="button" data-mk="cond" title="Ajouter une condition en fin de ligne">? condition</button>'
      + '<button type="button" data-mk="comp" title="Réserver la ligne à une composition">@ comp</button>'
      + '<button type="button" data-mk="sub" title="Action de plus pour le même job">＋ action</button>'
      + '</div>';
  }
  // Branche une zone de saisie sur la même barre d'outils que les blocs.
  function branche(el, ta, lu, applique){
    var t = null;
    function relit(){
      clearTimeout(t);
      t = setTimeout(applique, 240);
      lecture(ta, lu);
    }
    ta.addEventListener('input', relit);
    ['click','keyup','focus'].forEach(function(ev){ ta.addEventListener(ev, function(){ lecture(ta, lu); }); });
    lecture(ta, lu);
    el.querySelector('.ss-tb').addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      if(b.dataset.plus){ choisirAutreJob(b, ta); return; }
      if(b.dataset.job) insereDebut(ta, b.dataset.job+' : ');
      else if(b.dataset.mk==='warn') marqueWarn(ta);
      else if(b.dataset.mk==='cond') insereFin(ta, '  ?');
      else if(b.dataset.mk==='comp') insereApresRoles(ta, '@DNC');
      else if(b.dataset.mk==='sub') insereFin(ta, '\n      ');
      ta.dispatchEvent(new Event('input', {bubbles:true}));
    });
  }

  // Le contenu du bloc de préparation, éditable ici même. Il est PARTAGÉ :
  // le bandeau dit combien d'étapes s'en servent, pour qu'on ne corrige pas
  // les six sans le savoir.
  function dessineBuffs(ph){
    var host = $('ssBuffs'); if(!host) return;
    var nom = ph.buffs;
    if(!nom || JEUX[nom] === undefined){ host.innerHTML = ''; return; }
    var n = compteEtapesAvec(nom);
    host.innerHTML = '<div class="ss-bloc ss-buffbloc">'
      + '<div class="ss-bhead">'
      +   '<span class="ss-bkind">préparation</span>'
      +   '<b class="ss-bnom">'+esc(nom)+'</b>'
      +   (n > 1 ? '<span class="ss-bpart" title="Ce contenu est partagé">partagé par '+n+' étapes</span>' : '')
      +   '<button type="button" class="ss-bdel" id="ssBuffDel" title="Supprimer ce bloc de préparation">✕</button>'
      + '</div>'
      + barreOutils()
      + '<textarea class="ss-btxt" spellcheck="false" placeholder="COR : Bolter\'s + Tactician\'s&#10;BRD : Mazurka"></textarea>'
      + '<div class="ss-read"></div></div>';
    var el = host.querySelector('.ss-bloc'),
        ta = el.querySelector('.ss-btxt'), lu = el.querySelector('.ss-read');
    ta.value = SC.linesToText(JEUX[nom]);
    branche(el, ta, lu, function(){
      // on remplace le CONTENU du tableau, pas le tableau : d'autres étapes
      // pointent sur le même nom, elles doivent voir la correction
      var neuf = SC.parseLines(ta.value);
      JEUX[nom].length = 0;
      neuf.forEach(function(l){ JEUX[nom].push(l); });
      touche(); rendre();
    });
    $('ssBuffDel').addEventListener('click', function(){ supprimeBuff(nom); });
  }
  function compteEtapesAvec(nom){
    var n = 0;
    FL.forEach(function(f){ (f.phases||[]).forEach(function(p){ if(p.buffs === nom) n++; }); });
    return n;
  }

  // Un bloc = une carte de formulaire. Sa nature, son nom et son résumé sont des CHAMPS ;
  // seul son contenu est du texte, et ce texte n'a plus aucun signe de structure.
  function dessineBlocs(ph){
    var host = $('ssBlocs');
    host.innerHTML = (ph.cards||[]).map(function(c, ci){
      return '<div class="ss-bloc" data-c="'+ci+'">'
        + '<div class="ss-bhead">'
        +   '<div class="ss-chips ss-kind">'
        +     '<button type="button" data-v="pack"'+(c.kind!=='boss'?' class="on"':'')+'>farm</button>'
        +     '<button type="button" data-v="boss"'+(c.kind==='boss'?' class="on"':'')+'>boss</button></div>'
        +   '<input type="text" class="ss-bname" value="'+esc(c.name||'')+'" placeholder="Nom du bloc — ex. Pack · Ghost ×3">'
        +   '<button type="button" class="ss-bdel" title="Supprimer ce bloc">✕</button>'
        + '</div>'
        + '<input type="text" class="ss-btag" value="'+esc(c.tag||'')+'" placeholder="Résumé en une ligne (facultatif)">'
        + barreOutils()
        + '<textarea class="ss-btxt" spellcheck="false" placeholder="Règle&#10;ALL : ne jamais fermer de SC Light"></textarea>'
        + '<div class="ss-read"></div></div>';
    }).join('');

    host.querySelectorAll('.ss-bloc').forEach(function(el){
      var ci = +el.dataset.c, c = ph.cards[ci];
      el.querySelectorAll('.ss-kind button').forEach(function(b){
        b.addEventListener('click', function(){
          c.kind = b.dataset.v;
          el.querySelectorAll('.ss-kind button').forEach(function(x){ x.classList.remove('on'); });
          b.classList.add('on'); touche(); rendre(); buildTree(); }); });
      var nm = el.querySelector('.ss-bname');
      nm.addEventListener('input', function(){ c.name = nm.value; touche(); rendre(); buildTree(); });
      var tg = el.querySelector('.ss-btag');
      tg.addEventListener('input', function(){ c.tag = tg.value; touche(); rendre(); });
      el.querySelector('.ss-bdel').addEventListener('click', function(){
        demande('Supprimer le bloc <b>'+esc(c.name||'sans nom')+'</b> et tout son contenu ?', {titre:'Supprimer le bloc'})
          .then(function(v){ if(!v) return; ph.cards.splice(ci,1); touche(); dessineBlocs(ph); rendre(); buildTree(); }); });

      var ta = el.querySelector('.ss-btxt'), lu = el.querySelector('.ss-read');
      ta.value = SC.blocToText(c);
      branche(el, ta, lu, function(){ SC.textToBloc(ta.value, c); touche(); rendre(); buildTree(); });
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
  var RE_TETE = /^([A-Za-z]{2,4}(?:\s*[,\/+]\s*[A-Za-z]{2,4})*)(!?)(@[A-Za-z]+)?(\s*(?::|—|–)?\s*)/;
  function insereDebut(ta, txt){
    var b = bornesLigne(ta), m = b.txt.match(RE_TETE);
    if(m){
      // le séparateur est déjà là : on n'ajoute QUE le code du job, sinon un
      // second clic écrivait « PLD,COR :@PLD : … »
      var jobs = m[1].split(',').map(function(x){return x.trim();}),
          nouveau = txt.replace(/\s*:\s*$/, '').trim();
      if(jobs.indexOf(nouveau) < 0) jobs.push(nouveau);
      poseLigne(ta, b, jobs.join(',')+m[2]+(m[3]||'')+' : '+b.txt.slice(m[0].length));
    } else poseLigne(ta, b, txt + b.txt, txt.length);
  }
  function marqueWarn(ta){
    var b = bornesLigne(ta), m = b.txt.match(RE_TETE);
    if(!m){ poseLigne(ta, b, 'ALL! : ' + b.txt); return; }
    poseLigne(ta, b, m[1] + (m[2]==='!'?'':'!') + (m[3]||'') + ' : ' + b.txt.slice(m[0].length));
  }
  function insereApresRoles(ta, txt){
    var b = bornesLigne(ta), m = b.txt.match(RE_TETE);
    if(!m){ poseLigne(ta, b, 'ALL'+txt+' : '+b.txt); return; }
    if(m[3]) return;
    poseLigne(ta, b, m[1]+m[2]+txt+' : '+b.txt.slice(m[0].length));
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
  function lecture(ta, host){
    host = host || $('f_read'); if(!host) return;
    var b = bornesLigne(ta), brut = b.txt, txt = brut.trim();
    if(!txt){ host.innerHTML = '<span class="ss-rmuted">Ligne vide. Une action commence par le job : '
      + '<code>PLD : tank sur place</code> — toute autre ligne devient un titre de rubrique.</span>'; return; }
    if(/^\s/.test(brut)){
      host.innerHTML = '<span class="ss-rmuted">Ligne indentée : action de plus pour le job du dessus (une puce).</span>'; return; }
    var mp = txt.match(/^\((.*)\)$/);
    if(mp){ host.innerHTML = '<span class="ss-rmuted">Remarque de la rubrique, affichée en italique.</span>'; return; }
    var nat = SC.ligneNaturelle(txt);
    if(!nat){                                   // pas de job en tête → c'est un titre
      var th = (txt.match(/\[([^\]:]+)\]/)||[])[1];
      var propre = txt.replace(/\[[^\]]*\]/g,'').trim();
      var devine = SC.THEMES[SC.themeDevine(propre)] || 'neutre';
      host.innerHTML = '<b class="ss-rj">rubrique</b> · « '+esc(propre)+' » · thème <b>'+esc(th||devine)+'</b>'
        + (th ? ' (imposé)' : ' (deviné d’après le titre)');
      return;
    }
    var l = SC.textToBloc('x\n'+txt, {}).groups[0].lines[0];
    if(!l){ host.innerHTML=''; return; }
    var bouts = [(l.r||['ALL']).map(function(r){ return '<b class="ss-rj">'+esc(r)+'</b>'; }).join(' + ')];
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
    host.innerHTML = R.buffsHtml(ph.buffs, JEUX[ph.buffs])
      + '<div class="cards">'+(ph.cards||[]).map(function(c){ return R.cardHtml(c, ph, f, bn); }).join('')+'</div>'
      + ((ph.cards||[]).length ? '' : '<p class="ss-empty">Cette étape n’a encore aucun bloc — utilise <b>＋ bloc</b>.</p>');
    majTrad();
  }

  /* ---------------- traductions ---------------- */
  function majTrad(){
    var manque = SC.manquantes(phases(), TRAD, JEUX);
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

  /* ---------------- jeux de buffs (blocs de préparation) ---------------- */
  // Le nom est le titre affiché : créer, c'est nommer. Renommer met à jour
  // toutes les étapes qui pointaient dessus — sinon elles se retrouveraient
  // à désigner un bloc qui n'existe plus.
  function nomLibre(propose){
    var n = propose, i = 2;
    while(JEUX[n] !== undefined) n = propose + ' ' + (i++);
    return n;
  }
  async function nouveauBuff(ph){
    var nom = await saisie('Nom du bloc — c\'est le titre que le guide affichera.',
      {titre:'Nouveau bloc de préparation', valeur:'Buffs', ok:'Créer'});
    if(nom === null){ editeur(); return; }              // annulé : on remet le choix d'avant
    nom = nom.trim();
    if(!nom){ toast('Il faut un nom.','err'); editeur(); return; }
    if(JEUX[nom] !== undefined){ toast('Ce nom existe déjà.','err'); editeur(); return; }
    JEUX[nom] = [];
    ph.buffs = nom;
    touche(); editeur(); rendre();
  }
  async function renommeBuff(ancien){
    if(!ancien || JEUX[ancien] === undefined) return;
    var nom = await saisie('Le nom sert de titre dans le guide. Les étapes qui utilisent ce bloc suivront.',
      {titre:'Renommer le bloc', valeur:ancien, ok:'Renommer'});
    if(nom === null) return;
    nom = nom.trim();
    if(!nom || nom === ancien) return;
    if(JEUX[nom] !== undefined){ toast('Ce nom existe déjà.','err'); return; }
    // on reconstruit le dico pour garder l'ORDRE : sinon le bloc renommé
    // sauterait en fin de fichier à chaque enregistrement.
    var neuf = {};
    Object.keys(JEUX).forEach(function(k){ neuf[k === ancien ? nom : k] = JEUX[k]; });
    Object.keys(JEUX).forEach(function(k){ delete JEUX[k]; });
    Object.keys(neuf).forEach(function(k){ JEUX[k] = neuf[k]; });
    FL.forEach(function(f){ (f.phases||[]).forEach(function(p){ if(p.buffs === ancien) p.buffs = nom; }); });
    touche(); editeur(); rendre();
    toast('Renommé — ' + nomsEtapesAvec(nom) + '.','ok');
  }
  function nomsEtapesAvec(nom){
    var n = compteEtapesAvec(nom);
    return n + ' étape' + (n>1?'s':'') + ' concernée' + (n>1?'s':'');
  }
  // Supprimer un jeu détache les étapes qui l'utilisaient : elles n'auraient
  // plus rien à afficher, autant le dire avant plutôt que les laisser pointer
  // dans le vide.
  async function supprimeBuff(nom){
    if(!nom || JEUX[nom] === undefined) return;
    var n = compteEtapesAvec(nom), lignes = (JEUX[nom]||[]).length;
    var ok = await demande('Supprimer le bloc <b>'+esc(nom)+'</b> et ses '
      + lignes + ' ligne' + (lignes>1?'s':'') + ' ?'
      + (n ? '<br><br>' + n + ' étape' + (n>1?'s':'') + ' s\'en ser' + (n>1?'vent':'t')
           + ' — elle' + (n>1?'s':'') + ' n\'aura' + (n>1?'ont':'') + ' plus de bloc de préparation.' : ''),
      {titre:'Supprimer le bloc de préparation'});
    if(!ok) return;
    delete JEUX[nom];
    FL.forEach(function(f){ (f.phases||[]).forEach(function(p){ if(p.buffs === nom) delete p.buffs; }); });
    touche(); editeur(); rendre();
    toast('Bloc supprimé' + (n ? ' — ' + n + ' étape' + (n>1?'s':'') + ' détachée' + (n>1?'s':'') : '') + '.','ok');
  }

  /* ---------------- « ＋ job » : un job hors composition ---------------- */
  // On écrit une strat avec six jobs, pas avec vingt-deux. Mais il faut pouvoir
  // noter « avec un WAR à la place du MNK, on fait ça » sans changer la compo :
  // le job choisi s'insère, et comme il est alors cité dans la strat il reste
  // dans la barre au prochain rendu.
  var popJob = null;
  function fermePopJob(){ if(popJob){ popJob.remove(); popJob = null; } }
  function choisirAutreJob(bouton, ta){
    if(popJob){ fermePopJob(); return; }
    var deja = barreJobs();
    var reste = tousLesJobs().filter(function(j){ return deja.indexOf(j) < 0; });
    popJob = document.createElement('div');
    popJob.className = 'ss-jpop';
    popJob.innerHTML = reste.length
      ? reste.map(function(j){ return '<button type="button" class="ss-job r-'
          + S.roleDuJob(typeof ROLE!=='undefined'?ROLE:{}, j) + '" data-job="'+esc(j)+'">'+esc(j)+'</button>'; }).join('')
      : '<span class="ss-jpop-vide">Les 22 jobs sont déjà dans la barre.</span>';
    var r = bouton.getBoundingClientRect();
    popJob.style.left = Math.round(Math.min(r.left, innerWidth - 250)) + 'px';
    popJob.style.top  = Math.round(r.bottom + 5) + 'px';
    document.body.appendChild(popJob);
    popJob.addEventListener('click', function(e){
      var b = e.target.closest('button[data-job]'); if(!b) return;
      var job = b.dataset.job;
      insereDebut(ta, job + ' : ');
      ta.dispatchEvent(new Event('input', {bubbles:true}));
      // Le job rejoint la barre tout de suite : re-dessiner tout le bloc
      // ferait perdre le curseur en pleine saisie, on greffe donc le bouton.
      var barre = bouton.parentNode;
      if(!barre.querySelector('button[data-job="'+job+'"]')){
        var n = document.createElement('button');
        n.type = 'button';
        n.className = 'ss-job hors r-' + S.roleDuJob(typeof ROLE!=='undefined'?ROLE:{}, job);
        n.dataset.job = job;
        n.title = 'Hors composition — cité ailleurs dans la strat';
        n.textContent = job;
        barre.insertBefore(n, bouton);
      }
      fermePopJob();
    });
  }
  document.addEventListener('mousedown', function(e){
    if(popJob && !popJob.contains(e.target) && !e.target.closest('[data-plus]')) fermePopJob();
  });

  /* ---------------- composition du groupe ---------------- */
  // La grille suit les quatre catégories plutôt qu'un alphabet : on compose un
  // groupe en pensant « il me faut un tank, deux soins », pas « il me faut un
  // job dont le nom commence par B ». Le compte par catégorie se lit à côté du
  // titre, c'est ce qu'on vérifie vraiment.
  function panneauCompo(){
    var g = $('ssCompoGrid'); if(!g) return;
    var jobs = S.compoJobs(CP), RT = (typeof ROLE!=='undefined') ? ROLE : {};
    $('ssCompoTailles').innerHTML = S.TAILLES.map(function(t){
      return '<button type="button" data-t="'+t+'"'+(CP.taille===t?' class="on"':'')+'>'+t+' joueurs</button>'; }).join('');
    var sup = jobs.length - CP.taille;
    $('ssCompoInfo').innerHTML = '<b class="n">'+jobs.length+'</b> job' + (jobs.length>1?'s':'')
      + ' pour <b class="n">'+CP.taille+'</b> place' + (CP.taille>1?'s':'')
      + (sup > 0 ? ' · <b>'+sup+' remplaçant'+(sup>1?'s':'')+'</b> — un même créneau tenu par deux jobs, comme PLD ou DNC'
        : sup < 0 ? ' · <b>'+(-sup)+' place'+(sup<-1?'s':'')+' encore vide'+(sup<-1?'s':'')+'</b>'
        : ' · <b>au complet</b>');
    g.innerHTML = Object.keys(ROLE_NOMS).map(function(r){
      var dedans = tousLesJobs().filter(function(j){ return S.roleDuJob(RT,j)===r && jobs.indexOf(j)>=0; });
      var liste  = tousLesJobs().filter(function(j){ return S.roleDuJob(RT,j)===r; });
      if(!liste.length) return '';
      return '<section class="ss-ccat r-'+r+'">'
        + '<h4>'+ROLE_NOMS[r]+'<span>'+dedans.length+'</span></h4>'
        + '<div class="ss-crow">'
        + liste.map(function(j){
            return '<button type="button" class="ss-cj r-'+r+(jobs.indexOf(j)>=0?' on':'')
              + '" data-job="'+esc(j)+'" aria-pressed="'+(jobs.indexOf(j)>=0)+'">'+esc(j)+'</button>'; }).join('')
        + '</div></section>';
    }).join('');
    var t = $('ssCompoBadge'); if(t) t.textContent = CP.taille;
  }
  function basculeCompo(job){
    var jobs = S.compoJobs(CP), i = jobs.indexOf(job);
    if(i >= 0) jobs.splice(i, 1); else jobs.push(job);
    CP.jobs = jobs;
    panneauCompo(); editeur(); rendre(); touche();
  }
  function tailleCompo(t){ CP.taille = t; panneauCompo(); touche(); }
  function ouvrirCompo(){ panneauCompo(); $('ssCompoPan').hidden = false; }
  function fermerCompo(){ $('ssCompoPan').hidden = true; }

  /* ---------------- rôle des jobs (par strat) ---------------- */
  // Un seul rôle par job : on choisit, on ne coche pas. D'où des boutons
  // radio (aria-checked) et non des cases à cocher — recliquer le rôle déjà
  // choisi ne le retire pas, un job garde toujours une couleur.
  var ROLE_NOMS = {tank:'Tank', heal:'Soin', buff:'Buff', dd:'DD'};
  function grilleRoles(){
    var g = $('ssRolesGrid'); if(!g || typeof ROLE === 'undefined') return;
    var dansCompo = S.compoJobs(CP);
    g.innerHTML = tousLesJobs().map(function(j){
      var actuel = S.roleDuJob(ROLE, j);
      return '<div class="ss-rrow' + (dansCompo.indexOf(j) >= 0 ? ' comp' : '') + '" role="radiogroup" aria-label="'+esc(j)+'">'
        + '<span class="ss-rjob r-'+actuel+'">'+esc(j)+'</span>'
        + Object.keys(ROLE_NOMS).map(function(r){
            var on = (r === actuel);
            return '<button type="button" role="radio" aria-checked="'+on+'" class="ss-rb r-'+r+(on?' on':'')
              + '" data-job="'+esc(j)+'" data-role="'+r+'">' + ROLE_NOMS[r] + '</button>';
          }).join('')
        + '</div>';
    }).join('');
  }
  function basculeRole(job, role){
    if(!S.ROLES_OK[role] || S.roleDuJob(ROLE, job) === role) return;
    ROLE[job] = role;
    grilleRoles();
    panneauCompo();   // la catégorie du job change, la grille de compo suit
    editeur(); rendre(); touche();
  }
  function ouvrirRoles(){ grilleRoles(); $('ssRolesPan').hidden = false; }
  function fermerRoles(){ $('ssRolesPan').hidden = true; }

  /* ---------------- écriture des fichiers ---------------- */
  // Poignées, permissions et remplacement bloc par bloc : js/data-file.js,
  // partagé avec Map Studio pour que les deux outils écrivent à l'identique.
  var DF = window.DATAFILE;
  function blocsData(){
    var out = [];
    if(typeof COMPO !== 'undefined') out.push({nom:'COMPO', scalaire:true, txt:S.compoConst('COMPO', CP)});
    if(typeof ROLE !== 'undefined') out.push({nom:'ROLE', txt:S.roleConst('ROLE', ROLE)});
    out.push({nom:'BUFFS', txt:SC.buffsConst('BUFFS', JEUX)});
    FL.forEach(function(f){
      var nom = (f.id==='top') ? 'PHASES' : 'PHASES_B';
      out.push({nom:nom, txt:SC.phasesConst(nom, f.phases||[])});
    });
    return out;
  }
  var explique = false;
  async function enregistrer(){
    if(!DF.dispo()){ toast('Utilise Chrome ou Edge pour l’écriture directe.','err'); return; }
    if(!explique){
      var ok = await demande('L’outil va écrire dans <b>js/data.js</b> puis <b>js/i18n.js</b>.<br><br>'
        + 'Le navigateur va te demander de choisir ces deux fichiers — c’est sa façon d’autoriser l’écriture. '
        + 'Seuls les blocs de stratégie sont remplacés, le reste des fichiers n’est pas touché.',
        {titre:'Enregistrer sur le disque', ok:'J’ai compris', danger:false});
      if(!ok) return;
      explique = true;
    }
    try{
      var h = await DF.poignee('data', 'js/data.js');
      if(!(await DF.permission(h))){ toast('Permission refusée sur data.js.','err'); return; }
      var r = DF.remplace(await DF.lis(h), blocsData());
      if(r.absents.length){
        await DF.oublie('data');   // sinon on rejouerait indéfiniment sur le mauvais fichier
        toast('Blocs introuvables : '+r.absents.join(', ')+'. Ce n’est pas le bon data.js — on le redemandera.','err');
        return; }
      await DF.ecris(h, r.texte);

      var h2 = await DF.poignee('i18n', 'js/i18n.js');
      if(await DF.permission(h2)){
        var r2 = DF.remplace(await DF.lis(h2), [{nom:'TR', txt:SC.trConst('TR', TRAD)}]);
        if(r2.absents.length){ await DF.oublie('i18n');
          toast('data.js écrit, mais le bloc TR est introuvable dans ce fichier.','err'); }
        else { await DF.ecris(h2, r2.texte);
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
  $('ssCompo').addEventListener('click', ouvrirCompo);
  $('ssCompoClose').addEventListener('click', fermerCompo);
  $('ssCompoTailles').addEventListener('click', function(e){
    var b = e.target.closest('button[data-t]'); if(b) tailleCompo(+b.dataset.t); });
  $('ssCompoGrid').addEventListener('click', function(e){
    var b = e.target.closest('button[data-job]'); if(b) basculeCompo(b.dataset.job); });
  $('ssCompoPan').addEventListener('mousedown', function(e){ if(e.target === this) fermerCompo(); });
  $('ssRoles').addEventListener('click', ouvrirRoles);
  $('ssRolesClose').addEventListener('click', fermerRoles);
  $('ssRolesGrid').addEventListener('click', function(e){
    var b = e.target.closest('button[data-role]'); if(!b) return;
    basculeRole(b.dataset.job, b.dataset.role);
  });
  // clic sur le fond = fermer, comme toute fenêtre modale
  $('ssRolesPan').addEventListener('mousedown', function(e){ if(e.target === this) fermerRoles(); });
  window.addEventListener('keydown', function(e){
    var mod = e.ctrlKey||e.metaKey, k = e.key.toLowerCase();
    if(e.key === 'Escape'){
      if(popJob){ fermePopJob(); return; }
      if(!$('ssRolesPan').hidden){ fermerRoles(); return; }
      if(!$('ssCompoPan').hidden){ fermerCompo(); return; }
    }
    if(mod && k==='s'){ e.preventDefault(); enregistrer(); return; }
    if(mod && k==='z' && !e.shiftKey){ e.preventDefault(); annuler(); return; }
    if(mod && (k==='y' || (k==='z' && e.shiftKey))){ e.preventDefault(); retablir(); }
  });
  buildTree(); editeur(); rendre(); memorise();
  $('ssCompoBadge').textContent = CP.taille;   // lisible sans ouvrir le panneau
  // crochet de test : le remplacement lui-même se teste sur window.DATAFILE
  window.__SS = {choisir:choisir, etat:function(){ return {idx:idx, selP:selP, dirty:dirty}; },
                 blocsData:blocsData, roles:ouvrirRoles, bascule:basculeRole,
                 compo:ouvrirCompo, basculeCompo:basculeCompo, taille:tailleCompo, barreJobs:barreJobs};
})();
