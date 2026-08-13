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
    // la scène Konva a été dimensionnée alors qu'elle était visible ; au retour
    // on la recadre, la fenêtre a pu changer entre-temps.
    // Seulement si elle a fini de démarrer : au tout premier appel, la coque
    // s'exécute AVANT le boot de l'atelier et il n'y a pas encore de scène.
    if(nom === 'map') setTimeout(function(){
      var f = $('btnFit');
      if(f && document.querySelector('#stage canvas')) f.click();
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
  range(['ctxbar','btnFit','btnExport'], 'stCtxMap');
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

  /* ---------------- démarrage ---------------- */
  var depart = 'map';
  try{ var m = localStorage.getItem('studio_atelier'); if(m==='map'||m==='strat') depart = m; }catch(e){}
  ouvre(depart);
  try{ var c = +localStorage.getItem('studio_chapitre'); if(c > 0 && c < FL.length) chapitre(c); }catch(e){}
  if(DF.connue) DF.connue('data').then(function(h){ if(h) $('stFile').textContent = h.name; });
  majEtat();

  window.__STUDIO = {ouvre:ouvre, chapitre:chapitre, enregistrer:enregistrer, actif:function(){ return actif; }};
})();
