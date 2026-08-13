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
        + '<button type="button" data-a="up" title="Plus tôt dans le run">↑</button>'
        + '<button type="button" data-a="down" title="Plus tard dans le run">↓</button>'
        + '<button type="button" data-a="del" title="Supprimer cette étape du run">✕</button></span>';
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
  /* ---------------- l'écran d'accueil : apprendre en dix secondes ----------
     Il n'y a qu'UNE chose à comprendre pour se servir de l'outil : la façon
     d'écrire une ligne. On ne la décrit donc pas, on la MONTRE — le texte
     d'un côté, ce que le groupe lira de l'autre, rendu par le vrai moteur du
     guide. Ce qui est affiché à droite n'est pas une image d'illustration :
     c'est le même code que la colonne 3 et que le site. */
  var DEMO = 'Buff · farm\n'
    + 'COR : Chaos Roll\n'
    + '      Samurai Roll\n'
    + 'BRD : Honor March  ?si le RDM est absent\n'
    + '\n'
    + 'Règle\n'
    + 'ALL! : ne jamais fermer de SC Light\n'
    + 'DNC@DNC : Ruthless Stroke';

  function demoHtml(){
    var bloc = SC.textToBloc(DEMO, {});
    return '<div class="card pack" style="--ac:var(--r-buff)"><div class="cbody">'
      + (bloc.groups || []).map(function(g){
          return '<div class="grp '+(g.cls||'')+'">'
            + '<div class="glabel '+(g.cls||'')+'">'+esc(g.label)+'</div>'
            + R.groupBody(g) + '</div>'; }).join('')
      + '</div></div>';
  }

  function accueil(){
    var ps = phases(), prem = ps.length ? (ps[0].boss || 'la première étape') : null;
    var n = ps.length;

    return '<div class="ss-hero">'
      + '<h2>Écris ta stratégie, ton groupe la lit pendant le run</h2>'
      + '<p>Tu notes ce que fait chaque job et à quel moment. Ce que tu obtiens, c’est une page '
      + 'que chacun ouvre sur son second écran : il y filtre <b>son</b> job, et la lit en anglais '
      + 'si c’est sa langue.</p>'

      // ---- le plan AVANT la grammaire : le vocabulaire de l'outil ----
      + '<div class="ss-plan">'
      +   '<div class="ss-plan-i"><b>Le run se découpe en étapes.</b> Un boss, un pack à farm, '
      +     'un secteur… c’est la colonne de gauche' + (n ? ' — il y en a ' + (n === 1 ? 'une' : n) + ' ici' : '') + '.</div>'
      +   '<div class="ss-plan-i"><b>Dans une étape, tu décris ce qu’on affronte.</b> '
      +     'Un <i>farm</i>, un <i>boss</i>, autant que nécessaire.</div>'
      +   '<div class="ss-plan-i"><b>Et pour chacun, des rubriques.</b> Les buffs, les règles, '
      +     'ce que font les DD… Une rubrique contient des actions, une par ligne.</div>'
      + '</div>'

      // ---- la grammaire, montrée plutôt qu'expliquée ----
      + '<h3 class="ss-hero-h3">Une action par ligne, en commençant par le job</h3>'
      + '<div class="ss-demo">'
      +   '<div class="ss-demo-col"><span class="ss-demo-lab">Ce que tu tapes</span>'
      +     '<pre class="ss-demo-src">'+esc(DEMO)+'</pre></div>'
      +   '<div class="ss-demo-fleche" aria-hidden="true">→</div>'
      +   '<div class="ss-demo-col"><span class="ss-demo-lab">Ce qu’ils voient</span>'
      +     '<div class="ss-demo-out">'+demoHtml()+'</div></div>'
      + '</div>'

      // ---- les cinq signes, et rien de plus ----
      + '<div class="ss-cles">'
      +   '<div class="ss-cle"><code>JOB :</code><span>Le job, en tête de ligne. Une ligne <b>sans</b> job devient un titre de rubrique.</span></div>'
      +   '<div class="ss-cle r-sub"><code>··</code><span>Décalée vers la droite : une <b>action de plus</b> pour le même job.</span></div>'
      +   '<div class="ss-cle r-warn"><code>!</code><span>Après le job : c’est une <b>alerte</b>, ce qui fait wipe si on l’oublie.</span></div>'
      +   '<div class="ss-cle r-cond"><code>?</code><span>En fin de ligne : ça ne vaut que dans ce <b>cas précis</b>.</span></div>'
      +   '<div class="ss-cle r-comp"><code>@</code><span>Après le job : réservé à une <b>composition</b> donnée.</span></div>'
      + '</div>'
      + '<p class="ss-mini-note">Tu n’as pas à les retenir : des boutons les posent pour toi '
      + 'au-dessus de chaque zone de saisie.</p>'

      + '<p class="ss-hero-go">'
      + (n ? 'Ouvre une étape à gauche pour continuer. '
          : 'Cette strat est encore vide : sa première étape reste à créer. ')
      + 'Ce que tu écris apparaît aussitôt à droite, tel que ton groupe le verra — et '
      + 'rien n’est sauvegardé tant que tu ne cliques pas <b>Enregistrer</b>. '
      + '<b>Ctrl+Z</b> annule, toujours.</p>'
      // Le libellé vient du contenu : « Degei » ici, « Sheol C » ailleurs.
      // Sans aucune étape, il n'y a rien à ouvrir — on propose d'en créer une.
      + (prem ? '<button class="ss-btn primary" id="ssGo">Ouvrir · '+esc(prem)+'</button>'
              : '<button class="ss-btn primary" id="ssGoNew">＋ Créer la première étape</button>')
      + '</div>';
  }
  function editeur(){
    var body = $('ssEditBody'), ttl = $('ssEditTtl'), dot = $('ssEditDot');
    var ps = phases();
    if(selP==null || !ps[selP]){
      body.innerHTML = accueil(); ttl.textContent='La stratégie de l’étape'; dot.style.background='var(--dim)';
      var go = $('ssGo'); if(go) go.addEventListener('click', function(){ choisir(0); });
      var neuf = $('ssGoNew'); if(neuf) neuf.addEventListener('click', function(){ $('ssAddPhase').click(); });
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
      + '<div class="ss-f"><label for="f_boss">Cible de l’étape</label><input type="text" id="f_boss" value="'+esc(ph.boss||'')+'" placeholder="Skomora"></div>'
      + '<div class="ss-f"><label for="f_title">Titre de l’étape</label><input type="text" id="f_title" value="'+esc(ph.title||'')+'" placeholder="Ghost → Skomora"></div>'
      + '<div class="ss-f ss-wide"><label for="f_buffs">Préparation avant l’étape</label>'
      +   '<div class="ss-frow"><select id="f_buffs">'
      +     '<option value="">aucun</option>'
      +     noms.map(function(o){ return '<option value="'+esc(o)+'"'+(o===cur?' selected':'')+'>'+esc(o)+'</option>'; }).join('')
      +     '<option value="__neuf__">＋ nouvelle préparation…</option>'
      +   '</select>'
      +   '<button type="button" class="ss-mini" id="f_buffsRen" title="Renommer cette préparation partout où elle sert"'
      +     (cur?'':' disabled')+'>renommer</button></div></div></div>'
      + '<div class="ss-f"><label for="f_route">Comment on y va (facultatif)</label>'
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
            + (dansCompo ? '' : ' title="Pas dans la compo, mais cité ailleurs dans la strat"')+'>'+esc(j)+'</button>'; }).join('')
      + '<button type="button" class="ss-job ss-jplus" data-plus="1" title="Citer un job qui n’est pas dans la compo — une alternative, par exemple">＋ job</button>'
      + '<span class="ss-tbsep"></span>'
      + '<button type="button" data-mk="warn" title="Mettre la ligne en alerte — ce qui fait wipe">⚠ alerte</button>'
      + '<button type="button" data-mk="cond" title="N’appliquer la ligne que dans un cas précis">? condition</button>'
      + '<button type="button" data-mk="comp" title="N’afficher la ligne que pour une composition">@ comp</button>'
      + '<button type="button" data-mk="sub" title="Une action de plus pour le même job">＋ action</button>'
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
      +   '<button type="button" class="ss-bdel" id="ssBuffDel" title="Supprimer cette préparation">✕</button>'
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
        +   '<input type="text" class="ss-bname" value="'+esc(c.name||'')+'" placeholder="Ce qu’on affronte — ex. Pack · Ghost ×3">'
        +   '<button type="button" class="ss-bdel" title="Supprimer ce qu’on affronte, et tout son contenu">✕</button>'
        + '</div>'
        + '<input type="text" class="ss-btag" value="'+esc(c.tag||'')+'" placeholder="Le principe en une ligne (facultatif) — ex. weak Fire · SC → MB Fire">'
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
  /* ---------------- se mettre à la place d'une composition ----------------
     Une strat avec des remplaçants ne se lit pas pareil selon qui est là :
     avec PLD on ne voit pas les lignes du DNC, et inversement. Il faut donc
     pouvoir relire l'étape avec les yeux d'une comp, comme le fait le guide.

     Les variantes viennent de COMPO.variantes, déclarées dans la strat — la
     même source que le guide. Rien de propre à Sortie, et une strat qui n'en
     déclare aucune n'affiche simplement pas le sélecteur. */
  var vueComp = '';   // '' = tout voir
  function compsUtilisees(){ return S.compoVariantes(CP).map(function(v){ return v.nom; }); }
  function dessineVue(){
    var host = $('ssVue'); if(!host) return;
    var cs = compsUtilisees();
    if(cs.length < 2){ host.innerHTML = ''; return; }   // rien à choisir
    if(cs.indexOf(vueComp) < 0) vueComp = '';
    host.innerHTML = '<button type="button" data-c=""'+(vueComp===''?' class="on"':'')+'>tout</button>'
      + cs.map(function(c){ return '<button type="button" data-c="'+esc(c)+'"'
          + (vueComp===c?' class="on"':'')+'>'+esc(c)+'</button>'; }).join('');
  }
  // Exactement la règle du guide (app.js lineHidden), sur la même source.
  function filtreVue(host){
    host.querySelectorAll('.line, .bl').forEach(function(el){
      var dc = el.getAttribute('data-comp') || '';
      var jobs = (el.getAttribute('data-r')||'').split(/\s+/);
      var cache = false;
      if(vueComp){
        if(dc && dc !== vueComp) cache = true;
        jobs.forEach(function(j){ if(S.jobExclu(CP, vueComp, j)) cache = true; });
      }
      el.style.display = cache ? 'none' : '';
    });
    // une rubrique ou une carte entièrement masquée n'a plus lieu d'être
    host.querySelectorAll('.grp').forEach(function(g){
      var l = g.querySelectorAll('.line');
      g.style.display = (l.length && ![].every.call(l, function(x){ return x.style.display==='none'; }))
        || !l.length ? '' : 'none';
    });
    var b = host.querySelector('.buffs');
    if(b){ var bl = b.querySelectorAll('.bl');
      b.style.display = (bl.length && [].every.call(bl, function(x){ return x.style.display==='none'; })) ? 'none' : ''; }
  }

  function rendre(){
    var host = $('ssPreview'), ps = phases();
    dessineVue();
    if(selP==null || !ps[selP]){
      host.innerHTML='<p class="ss-empty">Choisis une étape à gauche pour voir son rendu.</p>'; majTrad(); return; }
    var ph = ps[selP], f = etage(), bn = bossParN();
    host.innerHTML = R.buffsHtml(ph.buffs, JEUX[ph.buffs])
      + '<div class="cards">'+(ph.cards||[]).map(function(c){ return R.cardHtml(c, ph, f, bn); }).join('')+'</div>'
      + ((ph.cards||[]).length ? '' : '<p class="ss-empty">Rien à affronter dans cette étape pour l’instant — ajoute un farm ou un boss.</p>');
    filtreVue(host);
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
    var nom = await saisie('Ce nom sera le titre affiché en tête du bloc, dans le guide.',
      {titre:'Nouvelle préparation', valeur:'Buffs', ok:'Créer'});
    if(nom === null){ editeur(); return; }              // annulé : on remet le choix d'avant
    nom = nom.trim();
    if(!nom){ toast('Donne-lui un nom.','err'); editeur(); return; }
    if(JEUX[nom] !== undefined){ toast('Une préparation porte déjà ce nom.','err'); editeur(); return; }
    JEUX[nom] = [];
    ph.buffs = nom;
    touche(); editeur(); rendre();
  }
  async function renommeBuff(ancien){
    if(!ancien || JEUX[ancien] === undefined) return;
    var nom = await saisie('Ce nom est le titre affiché dans le guide. Toutes les étapes qui s’en servent suivront.',
      {titre:'Renommer le bloc', valeur:ancien, ok:'Renommer'});
    if(nom === null) return;
    nom = nom.trim();
    if(!nom || nom === ancien) return;
    if(JEUX[nom] !== undefined){ toast('Une préparation porte déjà ce nom.','err'); return; }
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
      {titre:'Supprimer cette préparation'});
    if(!ok) return;
    delete JEUX[nom];
    FL.forEach(function(f){ (f.phases||[]).forEach(function(p){ if(p.buffs === nom) delete p.buffs; }); });
    touche(); editeur(); rendre();
    toast('Préparation supprimée' + (n ? ' — ' + n + ' étape' + (n>1?'s':'') + ' détachée' + (n>1?'s':'') : '') + '.','ok');
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
  // Une place par ligne. Une place à plusieurs jobs, ce sont des remplaçants —
  // et c'est ça qu'il faut voir : « la 6ᵉ place, c'est PLD ou DNC », pas une
  // grille de 22 cases où PLD et DNC seraient cochés sans qu'on sache pourquoi.
  function panneauCompo(){
    var g = $('ssCompoGrid'); if(!g) return;
    var crs = S.compoCreneaux(CP), RT = (typeof ROLE!=='undefined') ? ROLE : {};
    $('ssCompoTailles').innerHTML = S.TAILLES.map(function(t){
      return '<button type="button" data-t="'+t+'"'+(CP.taille===t?' class="on"':'')+'>'+t+' joueurs</button>'; }).join('');
    var vs = S.compoVariantes(CP), ecart = crs.length - CP.taille;
    $('ssCompoInfo').innerHTML = '<b class="n">'+crs.length+'</b> place' + (crs.length>1?'s':'')
      + ' sur <b class="n">'+CP.taille+'</b>'
      + (ecart > 0 ? ' · <b>'+ecart+' de trop</b>'
        : ecart < 0 ? ' · <b>'+(-ecart)+' à remplir</b>' : ' · <b>au complet</b>')
      + (vs.length > 1 ? ' — ' + vs.length + ' façons de jouer : <b>' + vs.map(function(v){ return esc(v.nom); }).join('</b>, <b>') + '</b>'
                       : ' — une seule façon de jouer');
    g.innerHTML = crs.map(function(cr, i){
      return '<div class="ss-cslot'+(cr.length>1?' flex':'')+'" data-i="'+i+'">'
        + '<span class="ss-cnum">'+(i+1)+'</span>'
        + '<div class="ss-cjobs">'
        + cr.map(function(j, k){
            return (k ? '<span class="ss-cou">ou</span>' : '')
              + '<span class="ss-cj r-'+S.roleDuJob(RT,j)+'" data-i="'+i+'" data-k="'+k+'">'+esc(j)
              + '<button type="button" data-act="del" data-i="'+i+'" data-k="'+k+'" title="Retirer de la compo">✕</button></span>'; }).join('')
        + '<button type="button" class="ss-cadd" data-act="alt" data-i="'+i+'" title="Quelqu’un d’autre peut tenir cette place">＋ remplaçant</button>'
        + '</div></div>';
    }).join('')
      + '<button type="button" class="ss-cnew" data-act="place">＋ ajouter une place</button>';
    var t = $('ssCompoBadge'); if(t) t.textContent = CP.taille;
  }
  // Ajouter un job, c'est le mettre SUR UNE PLACE : soit une nouvelle, soit en
  // remplaçant d'une place existante. C'est la seule façon de dire « il
  // remplace celui-là ».
  function choisitJobPour(titre, msg){
    var deja = S.compoJobs(CP);
    var reste = tousLesJobs().filter(function(j){ return deja.indexOf(j) < 0; });
    if(!reste.length){ toast('Les 22 jobs sont déjà sur une place.','err'); return Promise.resolve(null); }
    return new Promise(function(res){
      var b = $('ssModal'), oui = $('ssModalYes'), non = $('ssModalNo'), msgEl = $('ssModalMsg');
      $('ssModalTtl').textContent = titre;
      msgEl.innerHTML = msg + '<div class="ss-mjobs">'
        + reste.map(function(j){ return '<button type="button" class="ss-job r-'
            + S.roleDuJob(typeof ROLE!=='undefined'?ROLE:{}, j) + '" data-job="'+esc(j)+'">'+esc(j)+'</button>'; }).join('')
        + '</div>';
      oui.style.display = 'none';         // on valide en cliquant un job
      non.textContent = 'Annuler';
      b.hidden = false;
      function fin(v){ b.hidden = true; oui.style.display = ''; non.textContent = 'Annuler';
        msgEl.onclick = null; non.onclick = null; res(v); }
      msgEl.onclick = function(e){ var x = e.target.closest('button[data-job]'); if(x) fin(x.dataset.job); };
      non.onclick = function(){ fin(null); };
    });
  }
  function actionCompo(act, i, k){
    var crs = S.compoCreneaux(CP);
    if(act === 'del'){
      if(crs.length === 1 && crs[0].length === 1){ toast('Un groupe garde au moins une place.','err'); return; }
      crs[i].splice(k, 1);
      if(!crs[i].length) crs.splice(i, 1);
      CP.creneaux = crs; majCompo(); return;
    }
    if(act === 'alt'){
      choisitJobPour('Remplaçant de la place ' + (i+1),
        'Qui d’autre peut tenir cette place ? Le guide proposera alors les deux façons de jouer le run.')
        .then(function(j){ if(!j) return; crs[i].push(j); CP.creneaux = crs; majCompo(); });
      return;
    }
    if(act === 'place'){
      choisitJobPour('Nouvelle place', 'Qui occupe cette place de plus ?')
        .then(function(j){ if(!j) return; crs.push([j]); CP.creneaux = crs; majCompo(); });
    }
  }
  function majCompo(){ panneauCompo(); editeur(); rendre(); touche(); }
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
    // le titre du guide : sans lui, toutes les strats publiees s'appelleraient
    // encore comme la premiere
    if(typeof NOM !== 'undefined') out.push({nom:'NOM', scalaire:true, txt:'const NOM='+JSON.stringify(nomStrat())+';'});
    if(typeof MOB !== 'undefined') out.push({nom:'MOB', txt:SC.mobConst('MOB', MOB)});
    if(typeof COMPO !== 'undefined') out.push({nom:'COMPO', scalaire:true, txt:S.compoConst('COMPO', CP)});
    if(typeof ROLE !== 'undefined') out.push({nom:'ROLE', txt:S.roleConst('ROLE', ROLE)});
    out.push({nom:'BUFFS', txt:SC.buffsConst('BUFFS', JEUX)});
    FL.forEach(function(f){
      var nom = f.phasesNom || ((f.id==='top') ? 'PHASES' : 'PHASES_B');
      out.push({nom:nom, txt:SC.phasesConst(nom, f.phases||[])});
    });
    return out;
  }
  // La coque connait le nom de la strat ouverte ; hors d'elle, on garde
  // celui deja ecrit dans le fichier.
  function nomStrat(){
    var s = document.getElementById('stStratSel');
    var o = s && s.selectedOptions && s.selectedOptions[0];
    if(o && o.value && o.value.slice(0,2) !== '__') return o.textContent;
    return (typeof NOM !== 'undefined') ? NOM : '';
  }
  var explique = false;
  async function enregistrer(){
    if(!DF.dispo()){ toast('La sauvegarde directe demande Chrome ou Edge.','err'); return; }
    if(!explique){
      var ok = await demande('Ta strat et sa version anglaise vont être sauvegardées dans le projet.<br><br>'
        + 'Le navigateur va te demander de désigner deux fichiers, <b>js/data.js</b> puis <b>js/i18n.js</b> — '
        + 'c’est sa façon de t’autoriser à écrire. À faire une seule fois.<br><br>'
        + 'Seule ta strat est remplacée : rien d’autre dans ces fichiers n’est touché.',
        {titre:'Premier enregistrement', ok:'J’ai compris', danger:false});
      if(!ok) return;
      explique = true;
    }
    try{
      var h = await DF.poignee('data', 'js/data.js');
      if(!(await DF.permission(h))){ toast('Permission refusée — la strat n’a pas pu être sauvegardée.','err'); return; }
      var r = DF.remplace(await DF.lis(h), blocsData());
      if(r.absents.length){
        await DF.oublie('data');   // sinon on rejouerait indéfiniment sur le mauvais fichier
        toast('Ce fichier ne contient pas ta strat — on te le redemandera au prochain enregistrement.','err');
        return; }
      await DF.ecris(h, r.texte);

      var h2 = await DF.poignee('i18n', 'js/i18n.js');
      if(await DF.permission(h2)){
        var r2 = DF.remplace(await DF.lis(h2), [{nom:'TR', txt:SC.trConst('TR', TRAD)}]);
        if(r2.absents.length){ await DF.oublie('i18n');
          toast('Strat sauvegardée, mais la version anglaise n’a pas pu être écrite dans ce fichier.','err'); }
        else { await DF.ecris(h2, r2.texte);
               propre(); toast('Strat sauvegardée — le guide est à jour.','ok'); return; }
      }
      propre(); toast('Strat sauvegardée. La version anglaise n’a pas été enregistrée.','ok');
    }catch(e){ if(e.name!=='AbortError') toast('Échec de la sauvegarde : '+e.message,'err'); }
  }
  async function recharger(){
    if(dirty && !(await demande('Tes changements en cours ne sont <b>pas sauvegardés</b>. Recharger va les <b>perdre</b>.',
      {titre:'Repartir de la dernière sauvegarde', ok:'Recharger quand même'}))) return;
    location.reload();
  }

  /* ---------------- démarrage ---------------- */
  // Un onglet par chapitre, nommé par le contenu. Aucun chapitre nommé dans le
  // code : une strat à un seul chapitre n'affiche simplement pas la bascule.
  (function(){
    var host = $('ssFloor');
    if(FL.length < 2){ host.style.display = 'none'; return; }
    host.innerHTML = FL.map(function(f, i){
      return '<button type="button" data-i="'+i+'"'+(i===idx?' class="on"':'')+'>'
        + esc(f.fr || f.en || ('Chapitre '+(i+1))) + '</button>'; }).join('');
  })();
  $('ssFloor').addEventListener('click', function(e){
    var b = e.target.closest('button[data-i]'); if(!b) return;
    $('ssFloor').querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); });
    b.classList.add('on'); idx = +b.dataset.i; selP=null; buildTree(); editeur(); rendre();
  });
  $('ssSave').addEventListener('click', enregistrer);
  $('ssReload').addEventListener('click', recharger);
  $('ssVue').addEventListener('click', function(e){
    var b = e.target.closest('button[data-c]'); if(!b) return;
    vueComp = b.dataset.c; rendre(); });
  $('ssCompo').addEventListener('click', ouvrirCompo);
  $('ssCompoClose').addEventListener('click', fermerCompo);
  $('ssCompoTailles').addEventListener('click', function(e){
    var b = e.target.closest('button[data-t]'); if(b) tailleCompo(+b.dataset.t); });
  $('ssCompoGrid').addEventListener('click', function(e){
    var b = e.target.closest('button[data-act]'); if(!b) return;
    actionCompo(b.dataset.act, +b.dataset.i, +b.dataset.k); });
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
  // crochet de test, et ce que la coque de l'outil unifié (studio.js) demande :
  // les blocs à écrire, l'état « non enregistré », et sa modale de confirmation.
  window.__SS = {choisir:choisir, etat:function(){ return {idx:idx, selP:selP, dirty:dirty}; },
                 recharge:function(){ idx=0; selP=null; JEUX=(typeof BUFFS!=='undefined')?BUFFS:{};
                   CP=(typeof COMPO!=='undefined')?COMPO:CP; buildTree(); editeur(); rendre(); propre(); },
                 saisie:saisie,
                 blocs:blocsData, blocsTr:function(){ return [{nom:'TR', txt:SC.trConst('TR', TRAD)}]; },
                 sale:function(){ return dirty; }, propre:propre, demande:demande,
                 blocsData:blocsData, roles:ouvrirRoles, bascule:basculeRole,
                 compo:ouvrirCompo, actionCompo:actionCompo, taille:tailleCompo, barreJobs:barreJobs,
                 place:function(job){ CP.creneaux = S.compoCreneaux(CP).concat([[job]]); majCompo(); },
                 remplacant:function(i, job){ var c = S.compoCreneaux(CP); c[i].push(job); CP.creneaux = c; majCompo(); }};
})();
