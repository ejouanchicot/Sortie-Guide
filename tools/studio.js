/* ============================================================
   studio.js — la coque : deux ateliers, un seul plan de travail
   ------------------------------------------------------------
   Carte et Stratégie décrivent le même contenu : le même chapitre,
   le même fichier, le même « non enregistré ». Les garder sur deux
   pages obligeait à sauvegarder deux fois et à se souvenir de quel
   côté on avait travaillé.

   Aucun des deux ateliers n'a été retouché pour ça. La coque :
     · DÉPLACE leurs commandes dans l'en-tête commun (appendChild
       garde les écouteurs, donc leur code continue de marcher) ;
     · pilote leur sélecteur de chapitre resté caché ;
     · remplace leurs deux « Enregistrer » par un seul, qui écrit
       carte et strat en UNE passe sur le fichier.

   Chargé APRÈS map-studio.js et strat-studio.js.
   ============================================================ */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var DF = window.DATAFILE, S = window.SORTIE;
  var MS = window.__MS || null;      // atelier carte
  var SS = window.__SS || null;      // atelier stratégie
  var FL = (typeof FLOORS !== 'undefined') ? FLOORS : [];

  /* ---------------- onglets ---------------- */
  var actif = 'map';
  function ouvre(nom){
    actif = nom;
    $('stPaneMap').hidden   = (nom !== 'map');
    $('stPaneStrat').hidden = (nom !== 'strat');
    $('stCtxMap').hidden    = (nom !== 'map');
    $('stCtxStrat').hidden  = (nom !== 'strat');
    [['map','stTabMap'],['strat','stTabStrat']].forEach(function(p){
      var b = $(p[1]);
      b.classList.toggle('on', p[0] === nom);
      b.setAttribute('aria-selected', p[0] === nom ? 'true' : 'false');
    });
    // Une scène Konva mesurée pendant qu'elle est masquée fait 0 × 0, et
    // « Ajuster » ne la répare pas : il ne change que le zoom, pas la taille
    // de la scène. L'atelier, lui, la re-mesure sur un redimensionnement de
    // fenêtre — on le lui signale donc en montrant le panneau.
    if(nom === 'map') setTimeout(function(){
      if(!document.querySelector('#stage canvas')) return;   // pas encore démarré
      window.dispatchEvent(new Event('resize'));
    }, 0);
    try{ localStorage.setItem('studio_atelier', nom); }catch(e){}
  }
  $('stTabs').addEventListener('click', function(e){
    var b = e.target.closest('button[data-pane]'); if(b) ouvre(b.dataset.pane);
  });

  /* ---------------- chapitre, commun aux deux ---------------- */
  // Les deux ateliers gardent leur propre sélecteur, caché avec leur barre :
  // on le pilote au lieu de le remplacer, donc leur code ne change pas.
  function chapitre(i){
    [['floorSeg', 'button[data-i="'+i+'"]'], ['ssFloor', 'button[data-i="'+i+'"]']].forEach(function(p){
      var host = $(p[0]); if(!host) return;
      var b = host.querySelector(p[1]); if(b) b.click();
    });
    $('stChap').querySelectorAll('button').forEach(function(x){
      x.classList.toggle('on', +x.dataset.i === i); });
    try{ localStorage.setItem('studio_chapitre', i); }catch(e){}
  }
  (function(){
    var host = $('stChap');
    if(FL.length < 2) return;              // une strat d'un seul tenant : rien à choisir
    host.innerHTML = FL.map(function(f, i){
      return '<button type="button" data-i="'+i+'"'+(i===0?' class="on"':'')+'>'
        + S.esc(f.fr || f.en || ('Chapitre '+(i+1))) + '</button>'; }).join('');
    host.addEventListener('click', function(e){
      var b = e.target.closest('button[data-i]'); if(b) chapitre(+b.dataset.i); });
  })();

  /* ---------------- les commandes de chaque atelier ---------------- */
  // On les DÉPLACE : un appendChild conserve les écouteurs déjà posés.
  function range(ids, cible){
    var host = $(cible);
    ids.forEach(function(id){ var el = $(id); if(el) host.appendChild(el); });
  }
  range(['carteBar','ctxbar','btnFit','btnExport'], 'stCtxMap');
  range(['ssCompo','ssRoles'], 'stCtxStrat');

  /* ---------------- état « non enregistré » ---------------- */
  // Chaque atelier tient le sien ; la coque en fait la somme, et marque
  // l'onglet concerné pour qu'on voie de quel côté ça a bougé.
  function majEtat(){
    var m = MS && MS.sale(), s = SS && SS.sale();
    $('stTabMap').classList.toggle('sale', !!m);
    $('stTabStrat').classList.toggle('sale', !!s);
    $('stUnsaved').classList.toggle('on', !!(m || s));
  }
  setInterval(majEtat, 400);

  /* ---------------- une seule sauvegarde ---------------- */
  var explique = false;
  function toast(msg, cls){
    // on emprunte celui de l'atelier visible : chacun a le sien, déjà stylé
    var t = (actif === 'map') ? $('toast') : $('ssToast');
    if(!t) return;
    t.textContent = msg; t.className = cls || ''; t.style.opacity = '1';
    clearTimeout(t._t); t._t = setTimeout(function(){ t.style.opacity = '0'; }, 2800);
  }
  function demande(msg, opts){
    return (SS && SS.demande) ? SS.demande(msg, opts) : Promise.resolve(true);
  }

  async function enregistrer(){
    if(!DF.dispo()){ toast('La sauvegarde directe demande Chrome ou Edge.','err'); return; }
    if(!explique){
      var ok = await demande('Ta carte, ta strat et sa version anglaise vont être sauvegardées.<br><br>'
        + 'Le navigateur va te demander de désigner deux fichiers, <b>js/data.js</b> puis '
        + '<b>js/i18n.js</b> — c’est sa façon de t’autoriser à écrire. À faire une seule fois.',
        {titre:'Premier enregistrement', ok:'J’ai compris', danger:false});
      if(!ok) return;
      explique = true;
    }
    try{
      var h = await DF.poignee('data', 'js/data.js');
      $('stFile').textContent = h.name;
      if(!(await DF.permission(h))){ toast('Permission refusée — rien n’a été sauvegardé.','err'); return; }

      // carte ET strat en UNE passe : le fichier n'est lu et réécrit qu'une fois
      var blocs = [].concat(MS ? MS.blocs() : [], SS ? SS.blocs() : []);
      var r = DF.remplace(await DF.lis(h), blocs);
      if(r.absents.length){
        await DF.oublie('data');
        toast('Ce fichier ne contient pas ta strat — on te le redemandera.','err');
        return;
      }
      await DF.ecris(h, r.texte);
      if(MS) MS.propre();
      if(SS) SS.propre();

      // la version anglaise vit dans un autre fichier : elle suit, sans bloquer
      var h2 = await DF.poignee('i18n', 'js/i18n.js');
      if(await DF.permission(h2)){
        var r2 = DF.remplace(await DF.lis(h2), SS ? SS.blocsTr() : []);
        if(r2.absents.length){ await DF.oublie('i18n');
          toast('Sauvegardé, mais la version anglaise n’a pas pu être écrite dans ce fichier.','err'); }
        else { await DF.ecris(h2, r2.texte);
               toast('Carte et strat sauvegardées — le guide est à jour.','ok'); }
      } else toast('Sauvegardé. La version anglaise n’a pas été enregistrée.','ok');
      majEtat();
    }catch(e){ if(e.name !== 'AbortError') toast('Échec de la sauvegarde : '+e.message,'err'); }
  }

  async function recharger(){
    var sale = (MS && MS.sale()) || (SS && SS.sale());
    if(sale && !(await demande('Tes changements en cours ne sont <b>pas sauvegardés</b>. '
      + 'Recharger va les <b>perdre</b>.', {titre:'Repartir de la dernière sauvegarde', ok:'Recharger quand même'}))) return;
    location.reload();
  }

  $('stSave').addEventListener('click', enregistrer);
  $('stReload').addEventListener('click', recharger);
  window.addEventListener('keydown', function(e){
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); enregistrer(); }
  });

  /* ---------------- démarrage ----------------
     APRÈS le démarrage des deux ateliers, pas avant. La coque s'exécute au
     parsing : y rejouer l'onglet et le chapitre mémorisés revenait à masquer
     le panneau de la carte avant que Konva ne se mesure — la scène naissait
     à 0 × 0 et il fallait recharger pour la voir. */
  function restaure(){
    var depart = 'map';
    try{ var m = localStorage.getItem('studio_atelier'); if(m==='map'||m==='strat') depart = m; }catch(e){}
    try{ var c = +localStorage.getItem('studio_chapitre'); if(c > 0 && c < FL.length) chapitre(c); }catch(e){}
    ouvre(depart);
    if(DF.connue) DF.connue('data').then(function(h){ if(h) $('stFile').textContent = h.name; });
    majEtat();
  }
  // les ateliers démarrent sur DOMContentLoaded : on passe juste après
  if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded', function(){ setTimeout(restaure, 0); });
  else setTimeout(restaure, 0);

  /* ---------------- installable, et hors ligne ----------------
     Pas de boutique, pas de signature, pas d'abonnement : le navigateur
     sait installer une page. Elle prend alors son icône, sa fenêtre, et
     s'ouvre sans connexion. Le service worker ne fait QUE le hors-ligne.  */
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('../sw.js', {scope:'../'}).catch(function(){});
    });
  }
  /* Proposer d'installer n'a de sens que dans un ONGLET de navigateur.
     On teste donc `display-mode: browser` plutôt que d'énumérer les modes
     « app » : standalone, minimal-ui, fullscreen, barre intégrée… la liste
     s'allonge avec les navigateurs, alors qu'« onglet » est un seul état.
     Et une fois l'app installée, on s'en souvient : certains navigateurs
     reproposent l'installation dans leur propre fenêtre d'app. */
  var MEM_INSTALLE = 'studio_installe';
  function dejaInstalle(){ try{ return localStorage.getItem(MEM_INSTALLE) === '1'; }catch(e){ return false; } }
  function noteInstalle(){ try{ localStorage.setItem(MEM_INSTALLE, '1'); }catch(e){} }
  function estOnglet(){
    if(navigator.standalone === true) return false;              // iOS, écran d'accueil
    var m = window.matchMedia('(display-mode: browser)');
    return m.media !== 'not all' ? m.matches : true;             // navigateur trop vieux : on suppose l'onglet
  }
  function peutProposer(){ return estOnglet() && !dejaInstalle(); }
  function majBoutonInstall(){
    var b = $('stInstall'); if(!b) return;
    if(!peutProposer()) b.hidden = true;
  }
  if(!estOnglet()) noteInstalle();     // on tourne dans l'app : c'est qu'elle est installée
  majBoutonInstall();

  var invite = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); invite = e;
    // Le navigateur ne propose PAS d'installer une app déjà installée : cet
    // événement vaut donc preuve du contraire. S'il arrive dans un onglet,
    // c'est qu'elle a été désinstallée — on oublie ce qu'on croyait savoir.
    if(estOnglet()){ try{ localStorage.removeItem(MEM_INSTALLE); }catch(er){} }
    var b = $('stInstall'); if(b && peutProposer()) b.hidden = false;
  });
  // le mode peut changer pendant que la page est ouverte
  var mqApp = window.matchMedia('(display-mode: browser)');
  if(mqApp.addEventListener) mqApp.addEventListener('change', function(){
    if(!estOnglet()) noteInstalle();
    majBoutonInstall();
  });
  var bi = $('stInstall');
  if(bi) bi.addEventListener('click', async function(){
    if(!invite) return;
    invite.prompt();
    var r = await invite.userChoice;
    invite = null; bi.hidden = true;
    if(r && r.outcome === 'accepted'){ noteInstalle(); toast('Installé — tu peux l’ouvrir depuis ton bureau.','ok'); }
  });
  window.addEventListener('appinstalled', function(){ noteInstalle(); majBoutonInstall(); });

  window.__STUDIO = {ouvre:ouvre, chapitre:chapitre, enregistrer:enregistrer, actif:function(){ return actif; }};
})();
