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

  /* ---------------- la bibliothèque ----------------
     Ton travail vit dans le navigateur, pas dans le dépôt. Le dépôt devient
     une destination : « Enregistrer » y publie la strat ouverte.
     Charger une strat REMPLACE le contenu des globales — jamais leur
     référence, que les deux ateliers ont prise au démarrage. */
  var BI = window.BIBLIO;
  var G = {COMPO: window.COMPO || (typeof COMPO !== 'undefined' ? COMPO : {}),
           ROLE:  (typeof ROLE  !== 'undefined') ? ROLE  : {},
           BUFFS: (typeof BUFFS !== 'undefined') ? BUFFS : {},
           CARTES:(typeof CARTES!== 'undefined') ? CARTES: {},
           MOB:   (typeof MOB   !== 'undefined') ? MOB   : {},
           TR:    (typeof TR    !== 'undefined') ? TR    : {},
           FLOORS: FL};
  /* Ta strat existe à DEUX endroits : le fichier du dépôt, et l'espace de
     travail du navigateur. Tant que tu es seul à écrire, ils se suivent. Mais
     le fichier peut bouger sans l'atelier — un `git pull`, une correction à la
     main, un rechargement de page qui repart d'une version d'avant — et alors
     l'un écrasait l'autre en silence.

     `empreintePubliee` est l'empreinte du fichier tel qu'il était à la dernière
     publication. Au chargement, on la compare au fichier réel : identiques, le
     fichier n'a pas bougé et l'atelier reprend ton travail sans rien dire ;
     différentes, quelqu'un d'autre a écrit, et c'est TOI qui tranches. */
  var stratId = null, dernierEcrit = '', empreintePubliee = '', duFichier = '';
  // Ce que le fichier disait au chargement, gardé entier. Les globales, elles,
  // seront écrasées par la strat de la bibliothèque dans la seconde qui suit :
  // sans cette photo, « Repartir de js/data.js » n'aurait plus de fichier où
  // repartir.
  var stratDuFichier = null;

  function nomCourant(){
    var s = $('stStratSel');
    var o = s && s.querySelector('option[value="'+stratId+'"]');
    return o ? o.textContent : 'Sans titre';
  }
  function instantane(){
    // même raison que pour l'enregistrement : la dernière phrase tapée met un
    // court instant à entrer dans la strat, et on garderait celle d'avant
    if(SS && SS.vide) SS.vide();
    return BI.depuisGlobaux(G, nomCourant(), MS && MS.reglages ? MS.reglages() : null);
  }
  // Ce qui distingue deux versions d'une strat, c'est son contenu — ni son
  // identifiant, ni sa date, ni la trace de sa dernière publication. Sans ça,
  // la sauvegarde silencieuse réécrirait à chaque tour d'horloge, puisque la
  // date change toujours.
  function signature(s){ return JSON.stringify(Object.assign({}, s, {id:'', maj:0, fichier:''})); }

  /* L'empreinte SERT À COMPARER DEUX FICHIERS, et rien d'autre. Elle laisse donc
     de côté ce qui ne vient pas de `js/data.js` :

     · le nom — renommer une strat dans l'atelier ne veut pas dire que le fichier
       a changé ;
     · les traductions — elles vivent dans `js/i18n.js`, et l'atelier y ajoute au
       passage les mots de l'interface. Les compter ici ferait dire au fichier
       qu'il a bougé à chaque ouverture, et la question se poserait pour rien.

     Une question qui se pose à tort est pire que pas de question du tout : on
     apprend à répondre sans lire. */
  function empreinteFichier(s){
    /* Tout ce qui commence par « _ » est de l'échafaudage : l'atelier Carte
       accroche à chaque marqueur une copie de sa forme Konva (`_mk`), refaite
       à chaque rendu. Ça ne va jamais dans `data.js`, mais ça voyage avec les
       données — dix kilo-octets qui changent tout seuls, et le fichier aurait
       l'air d'avoir bougé à chaque ouverture. */
    return JSON.stringify(Object.assign({}, s, {id:'', maj:0, fichier:'', nom:'', tr:null}),
      function(cle, valeur){ return cle.charAt(0) === '_' ? undefined : valeur; });
  }
  // Ce que les globales disent EN CE MOMENT. Appelée avant d'avoir rien posé,
  // elle décrit le fichier tel qu'il vient d'être chargé.
  function empreinte(){
    return empreinteFichier(BI.depuisGlobaux(G, '', MS && MS.reglages ? MS.reglages() : null));
  }

  /* Sauvegarde silencieuse dans l'espace de travail. Rien à voir avec
     « Enregistrer », qui publie dans le dépôt.

     Le délai est court : c'est la fenêtre pendant laquelle un rechargement
     imprévu — un serveur de développement qui surveille les fichiers, par
     exemple — repartirait d'une version d'avant ta dernière phrase. */
  var tSauve = null;
  function sauveBientot(){ clearTimeout(tSauve); tSauve = setTimeout(sauve, 350); }
  // `publie` : on vient d'écrire le fichier, il dit donc exactement ceci.
  function sauve(publie){
    if(!stratId || !BI) return Promise.resolve();
    if(!jePeuxEcrire()){ enLecture(); return Promise.resolve(); }
    var s = instantane(); s.id = stratId;
    var j = signature(s);
    if(publie) empreintePubliee = empreinteFichier(s);
    else if(j === dernierEcrit) return Promise.resolve();  // rien n'a bougé
    s.fichier = empreintePubliee;
    dernierEcrit = j;
    return BI.ecris(s).then(reprise, panneEspace);
  }
  window.addEventListener('pagehide', function(){ clearTimeout(tSauve); sauve(); });
  document.addEventListener('visibilitychange', function(){ if(document.hidden){ clearTimeout(tSauve); sauve(); } });

  /* ---------------- quand l'espace de travail ne répond plus ----------------
     Toute erreur d'écriture était avalée : `BI.ecris(s).catch(function(){})`.
     Quota plein, navigation privée, IndexedDB bloqué — le lead continuait
     d'écrire une heure en croyant que son travail était gardé, et le
     rechargement le lui prenait sans que rien ne l'ait annoncé.

     Une panne muette est pire qu'une panne. On le dit UNE fois, et on laisse un
     état visible tant que ça ne repasse pas : le témoin « non enregistré »
     devient rouge et change de mot. */
  var etatEspace = '';                       // '' · 'panne' · 'lecture'
  function marque(etat, mot, pourquoi){
    etatEspace = etat;
    var el = $('stUnsaved'); if(!el) return;
    el.classList.toggle('panne',   etat === 'panne');
    el.classList.toggle('lecture', etat === 'lecture');
    el.classList.toggle('on', !!etat || (MS && MS.sale()) || (SS && SS.sale()));
    el.textContent = mot;
    el.title = pourquoi;
  }
  function panneEspace(){
    if(etatEspace === 'panne') return;        // on ne le répète pas à chaque frappe
    marque('panne', 'sauvegarde impossible',
      'Le navigateur refuse d’écrire dans son espace de travail — mémoire pleine, '
      + 'ou navigation privée. Ton travail n’est plus gardé : enregistre dans le projet.');
    toast('Ton travail n’est plus gardé par le navigateur. Enregistre dans le projet.','err');
  }
  function reprise(){
    if(etatEspace === 'panne'){
      marque('', 'non enregistré', 'Des changements ne sont pas encore sauvegardés');
      toast('L’espace de travail répond de nouveau.','ok');
    } else if(!etatEspace) marque('', 'non enregistré', 'Des changements ne sont pas encore sauvegardés');
  }

  /* ---------------- un seul onglet écrit ----------------
     Deux onglets de l'atelier gardaient chacun SA version dans la même entrée,
     toutes les fractions de seconde, sans se voir. Le dernier à écrire gagnait,
     et le travail de l'autre disparaissait — c'est ce qui a coûté une carte
     entière le 15 août 2026.

     Le premier onglet ouvert prend le stylo et le repose régulièrement pour
     dire qu'il vit encore. Les suivants n'écrivent pas : ils le disent, et un
     clic sur le témoin reprend la main — c'est un choix, pas un blocage. */
  var MOI = 'o' + Date.now() + Math.random().toString(36).slice(2, 7);
  var jeTiensLeStylo = true, jAttendsReponse = true;
  var CANAL = ('BroadcastChannel' in window) ? new BroadcastChannel('xi-studio') : null;
  if(CANAL){
    CANAL.onmessage = function(e){
      var m = e.data || {};
      // « qui écrit ? » — je ne réponds que si c'est moi, et que je suis vivant
      if(m.q === 'qui' && jeTiensLeStylo) CANAL.postMessage({q:'moi', id:MOI});
      // quelqu'un d'autre écrit déjà. Le plus ANCIEN garde le stylo : deux
      // onglets ouverts en même temps se répondraient mutuellement, et sans
      // cette comparaison ils se mettraient tous les deux en lecture.
      else if(m.q === 'moi' && jAttendsReponse && m.id < MOI){ jeTiensLeStylo = false; enLecture(); }
      // un onglet vient de reprendre la main : je la lui laisse
      else if(m.q === 'prend' && m.id !== MOI){ jeTiensLeStylo = false; enLecture(); }
    };
    CANAL.postMessage({q:'qui', id:MOI});
    setTimeout(function(){ jAttendsReponse = false; }, 600);
  }
  /* Pas de jeton posé quelque part : les onglets SE PARLENT. Un jeton daté
     obligeait à deviner quand son porteur est parti — et RECHARGER sa propre
     page suffisait à se bloquer soi-même, puisque l'ancienne page tenait encore
     l'écriture pour quelques secondes. Avec un serveur qui recharge à chaque
     enregistrement, c'était permanent. Une page rechargée redemande, personne
     ne répond, elle écrit : c'est exactement ce qu'on veut. */
  function jePeuxEcrire(){ return jeTiensLeStylo; }
  function prendLeStylo(){
    jeTiensLeStylo = true;
    if(CANAL) CANAL.postMessage({q:'prend', id:MOI});
  }
  function enLecture(){
    if(etatEspace === 'lecture') return;
    marque('lecture', 'un autre onglet écrit',
      'Un autre onglet de l’atelier tient l’écriture : ce que tu tapes ici n’est pas gardé. '
      + 'Clique pour reprendre la main — l’autre onglet passera en lecture.');
    toast('Un autre onglet de l’atelier est ouvert : c’est lui qui écrit.','err');
  }
  (function(){
    var el = $('stUnsaved'); if(!el) return;
    el.addEventListener('click', function(){
      if(etatEspace !== 'lecture') return;
      prendLeStylo();
      marque('', 'non enregistré', 'Des changements ne sont pas encore sauvegardés');
      toast('Cet onglet reprend l’écriture.','ok');
      sauve();
    });
  })();

  async function majListeStrats(){
    var host = $('stStratSel'); if(!host || !BI) return;
    var l = await BI.liste();
    host.innerHTML = l.map(function(s){
      return '<option value="'+S.escAttr(s.id)+'"'+(s.id===stratId?' selected':'')+'>'+S.esc(s.nom)+'</option>';
    }).join('')
      + '<option disabled>──────────</option>'
      + '<option value="__neuve__">＋ Nouvelle strat…</option>'
      + '<option value="__copie__">⧉ Dupliquer celle-ci</option>'
      + '<option value="__renom__">✎ Renommer celle-ci</option>'
      + (l.length > 1 ? '<option value="__suppr__">✕ Supprimer celle-ci</option>' : '')
      + '<option disabled>──────────</option>'
      + '<option value="__import__">⤓ Ouvrir un guide reçu…</option>'
      + '<option value="__fichier__">↺ Repartir de js/data.js…</option>';
    var n = l.filter(function(s){ return s.id === stratId; })[0];
    $('stStratInfo').textContent = n ? (n.chapitres + ' chap · ' + n.etapes + ' étapes') : '';
  }

  // Poser une strat dans les ateliers : on remplit les globales, puis chacun
  // se redessine. Ils n'ont pas à savoir qu'une bibliothèque existe.
  function poseStrat(s){
    var reg = BI.versGlobaux(s, G, S.resoudreCartes);
    stratId = s.id; BI.noteCourante(s.id);
    empreintePubliee = s.fichier || '';
    construitChapitres();
    if(MS && MS.recharge) MS.recharge(reg);
    dernierEcrit = signature(BI.depuisGlobaux(G, s.nom, reg));
    if(SS && SS.recharge) SS.recharge();
    majListeStrats();
  }
  async function ouvreStrat(id){
    if(id === stratId) return;
    await sauve();
    var s = await BI.lis(id);
    if(!s){ majListeStrats(); return; }
    poseStrat(s);
    toast('« ' + s.nom +' » ouverte.','ok');
  }

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
  // Reconstruit à chaque changement de strat : les chapitres ne sont pas
  // les mêmes d'une strat à l'autre.
  function construitChapitres(){
    var host = $('stChap');
    host.innerHTML = FL.length < 2 ? '' : FL.map(function(f, i){
      return '<button type="button" data-i="'+i+'"'+(i===0?' class="on"':'')+'>'
        + S.esc(f.fr || f.en || ('Chapitre '+(i+1))) + '</button>'; }).join('');
  }
  $('stChap').addEventListener('click', function(e){
    var b = e.target.closest('button[data-i]'); if(b) chapitre(+b.dataset.i); });
  construitChapitres();

  /* ---------------- les commandes de chaque atelier ---------------- */
  // On les DÉPLACE : un appendChild conserve les écouteurs déjà posés.
  function range(ids, cible){
    var host = $(cible);
    ids.forEach(function(id){ var el = $(id); if(el) host.appendChild(el); });
  }
  range(['carteBar','ctxbar','btnFit','btnExport'], 'stCtxMap');
  range(['ssCompo','ssRoles','stTexte'], 'stCtxStrat');
  // La boîte de dialogue de l'atelier Stratégie sert aussi à la coque
  // (renommer une strat, confirmer une suppression). Restée dans son panneau,
  // elle serait invisible dès qu'on est sur la carte : on la remonte.
  var mdl = $('ssModal'); if(mdl) document.querySelector('.st-app').appendChild(mdl);

  /* ---------------- état « non enregistré » ---------------- */
  // Chaque atelier tient le sien ; la coque en fait la somme, et marque
  // l'onglet concerné pour qu'on voie de quel côté ça a bougé.
  function majEtat(){
    var m = MS && MS.sale(), s = SS && SS.sale();
    $('stTabMap').classList.toggle('sale', !!m);
    $('stTabStrat').classList.toggle('sale', !!s);
    // une panne ou un autre onglet qui écrit reste affiché, même sans changement
    // en attente : c'est justement quand on croit que tout va bien qu'il faut le voir
    $('stUnsaved').classList.toggle('on', !!(m || s) || !!etatEspace);
    if(m || s) sauveBientot();     // l'espace de travail suit, en silence
  }
  setInterval(majEtat, 400);

  /* ---------------- créer, dupliquer, renommer, supprimer ---------------- */
  async function nouvelleStrat(){
    majListeStrats();
    var nom = (await saisie('Un event, un contenu, une variante — ce nom te sert à la retrouver.',
      {titre:'Nouvelle strat', valeur:'Nouvelle strat', ok:'Créer'}) || '').trim();
    if(!nom) return;
    await sauve();
    var s = BI.nouvelle(nom);
    await BI.ecris(s);
    poseStrat(s);
    toast('« ' + nom + ' » créée — elle t’attend, vide.','ok');
  }
  async function dupliqueStrat(){
    majListeStrats();
    var nom = (await saisie('La copie est indépendante : la modifier ne touche pas à l’originale.',
      {titre:'Dupliquer la strat', valeur:nomCourant() + ' (copie)', ok:'Dupliquer'}) || '').trim();
    if(!nom) return;
    await sauve();
    var s = BI.duplique(instantane(), nom);
    await BI.ecris(s);
    poseStrat(s);
    toast('Copie créée : « ' + nom + ' ».','ok');
  }
  async function renommeStrat(){
    var nom = (await saisie('Ce nom n’apparaît que dans ta bibliothèque.',
      {titre:'Renommer la strat', valeur:nomCourant(), ok:'Renommer'}) || '').trim();
    if(!nom) { majListeStrats(); return; }
    var s = instantane(); s.id = stratId; s.nom = nom;
    dernierEcrit = signature(s);
    await BI.ecris(s);
    await majListeStrats();
  }
  async function supprimeStrat(){
    var l = await BI.liste();
    if(l.length < 2){ toast('Il faut garder au moins une strat.','err'); majListeStrats(); return; }
    var ok = await demande('Supprimer <b>' + S.esc(nomCourant()) + '</b> de ta bibliothèque ?<br><br>'
      + 'Ce qui a déjà été publié dans le guide n’est pas touché.',
      {titre:'Supprimer la strat', ok:'Supprimer'});
    if(!ok){ majListeStrats(); return; }
    var mort = stratId;
    stratId = null;                          // plus de sauvegarde silencieuse dessus
    await BI.supprime(mort);
    var suite = l.filter(function(x){ return x.id !== mort; })[0];
    poseStrat(await BI.lis(suite.id));
    toast('Strat supprimée.','ok');
  }
  function saisie(msg, opts){
    return (SS && SS.saisie) ? SS.saisie(msg, opts) : Promise.resolve(null);
  }

  /* ---------------- partager : un fichier, deux métiers ----------------
     Le lecteur y voit le guide ; le Studio y retrouve la strat. Un seul
     fichier circule, donc personne ne se demande quelle version il a. */
  var EX = window.EXPORTHTML;
  async function exporte(){
    if(!EX){ toast('L’export n’est pas disponible ici.','err'); return; }
    await sauve();
    var s = instantane(); s.id = stratId;
    var b = $('stExport'), avant = b ? b.innerHTML : '';
    if(b){ b.disabled = true; }
    try{
      var perdues = [];
      var doc = await EX.fabrique(s, {base:'../',
        avance:function(m){ if(b) b.textContent = m; },
        manquantes:function(l){ perdues = l; }});
      var url = URL.createObjectURL(new Blob([doc], {type:'text/html'}));
      var a = document.createElement('a');
      a.href = url; a.download = EX.nomFichier(s);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      /* « tout est dedans » était faux dès qu'une image manquait, et c'est le
         destinataire qui le découvrait. Une vignette renommée dans img/mobs
         suffisait, ou un fond reçu d'un autre lead et jamais déposé. */
      var ko = Math.round(doc.length / 1024);
      if(perdues.length){
        toast('Fichier prêt — ' + ko + ' Ko, mais ' + perdues.length
            + (perdues.length > 1 ? ' images manquent' : ' image manque')
            + ' : ' + (perdues.length > 1 ? 'elles seront vides' : 'elle sera vide')
            + ' chez ceux qui l’ouvriront.', 'err');
        if(window.console) console.warn('images introuvables à l’export :', perdues);
      } else {
        toast('Fichier prêt — ' + ko + ' Ko, tout est dedans.','ok');
      }
    }catch(e){
      if(window.console) console.error(e);
      toast('Le fichier n’a pas pu être fabriqué — ton travail n’a pas bougé. Réessaie.','err');
    }finally{
      if(b){ b.disabled = false; b.innerHTML = avant; }
    }
  }

  async function importe(fichier){
    if(!EX || !fichier) return;
    var s = EX.extrait(await fichier.text());
    if(!s){
      toast('Ce fichier ne contient pas de strat — il faut un guide exporté d’ici.','err');
      return;
    }
    /* On regarde AVANT d'écrire. Un fichier dont les chapitres n'ont pas la
       forme attendue entrait quand même en bibliothèque, et c'est l'affichage
       qui tombait ensuite : plus de sélecteur de strats, et le témoin annonçait
       « le navigateur refuse d'écrire, mémoire pleine » — faux. Les strats du
       lead étaient toujours là, simplement plus atteignables. */
    if(!BI.lisible(s)){
      toast('Ce guide est abîmé : ses chapitres ne sont pas lisibles. '
          + 'Rien n’a été ajouté — demande le fichier à nouveau.','err');
      return;
    }
    // Deux entrées du même nom dans la liste seraient impossibles à départager :
    // on numérote à partir de la deuxième.
    var noms = (await BI.liste()).map(function(x){ return x.nom; });
    if(noms.indexOf(s.nom) >= 0){
      var base = s.nom + ' (importée', n = 1, essai;
      do { essai = base + (n > 1 ? ' ' + n : '') + ')'; n++; } while(noms.indexOf(essai) >= 0);
      s.nom = essai;
    }
    s.id = BI.id();
    await sauve();
    await BI.ecris(s);
    poseStrat(s);
    toast('« ' + s.nom + ' » ajoutée à ta bibliothèque.','ok');
  }
  (function(){
    var b = $('stExport'); if(b) b.addEventListener('click', exporte);
    var f = $('stFichier');
    if(f) f.addEventListener('change', function(){
      if(f.files[0]) importe(f.files[0]); });
  })();
  function choisirFichier(){ var f = $('stFichier'); if(f){ f.value = ''; f.click(); } }

  /* ---------------- le texte pour Discord ----------------
     Avant un run, le lead ne demande à personne d'ouvrir un lien : il colle
     le plan dans le salon, au moment où on le joue. */
  var TX = window.EXPORTTEXTE;
  function jeuxBuffs(){ return (typeof BUFFS !== 'undefined') ? BUFFS : {}; }
  function compo(){ return (typeof COMPO !== 'undefined') ? COMPO : null; }

  function remplitReglages(){
    var e = (SS && SS.etat) ? SS.etat() : {idx:0, selP:null};
    var f = FL[e.idx] || FL[0] || {};

    var por = $('stTxtPortee'), avant = por.value;
    var opts = [];
    if(e.selP != null && (f.phases || [])[e.selP]){
      var p = f.phases[e.selP];
      opts.push(['etape', 'L’étape ouverte — ' + S.esc(p.boss || p.title || ('n° ' + (e.selP + 1)))]);
    }
    opts.push(['chapitre', FL.length > 1
      ? 'Le chapitre — ' + S.esc(f.fr || f.en || '')
      : 'Toute la strat']);
    if(FL.length > 1) opts.push(['tout', 'Toute la strat — ' + FL.length + ' chapitres']);
    por.innerHTML = opts.map(function(o){
      return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    if(avant && por.querySelector('option[value="' + avant + '"]')) por.value = avant;

    // les façons de jouer : mêler les lignes du PLD et celles du DNC donnerait
    // des consignes qui se contredisent, et le lecteur n'a pas de bouton
    var vars = S.compoVariantes(compo()) || [];
    $('stTxtVarL').hidden = vars.length < 2;
    if(vars.length >= 2){
      var av = $('stTxtVar').value;
      $('stTxtVar').innerHTML = vars.map(function(v){
        return '<option value="' + S.escAttr(v.nom) + '">' + S.esc(v.nom) + '</option>'; }).join('');
      if(av && $('stTxtVar').querySelector('option[value="' + av + '"]')) $('stTxtVar').value = av;
    }

    var jb = $('stTxtJob'), aj = jb.value;
    jb.innerHTML = '<option value="">Tout le groupe</option>'
      + (S.compoJobs(compo()) || []).map(function(j){
          // le nom du job vient de la compo, donc d'une strat qu'on a pu recevoir
          return '<option value="' + S.escAttr(j) + '">Seulement ' + S.esc(j) + '</option>'; }).join('');
    if(aj) jb.value = aj;
  }

  function texteCourant(){
    var e = (SS && SS.etat) ? SS.etat() : {idx:0, selP:null};
    var o = {variante: $('stTxtVarL').hidden ? null : $('stTxtVar').value,
             job: $('stTxtJob').value || null,
             compo: compo()};
    var mise = {style: $('stTxtStyle').value};
    var jeux = jeuxBuffs(), por = $('stTxtPortee').value;
    var sections;
    if(por === 'etape') sections = TX.etape((FL[e.idx] || {}).phases[e.selP], o, jeux);
    else if(por === 'tout') sections = TX.strat(FL, o, jeux);
    else sections = TX.chapitre(FL[e.idx] || FL[0] || {}, o, jeux);
    return TX.messages(sections, mise);
  }

  /* L'aperçu d'un bloc ANSI, avec ses couleurs.
     Sans ça le panneau affiche « ESC[1;34mPLD ESC[0m » : c'est bien ce qui
     part dans le presse-papier, mais on ne peut rien en juger. On applique
     donc ici la palette de Discord — ce qui est montré est ce qui s'affichera
     là-bas, et le texte copié, lui, ne bouge pas. */
  var PALETTE = {30:'#4f545c', 31:'#dc322f', 32:'#859900', 33:'#b58900',
                 34:'#268bd2', 35:'#d33682', 36:'#2aa198', 37:'#e6edf7'};
  function ansiHtml(txt){
    var out = '', ouvert = 0;
    S.esc(txt).split(/\[([0-9;]*)m/).forEach(function(bout, i){
      if(i % 2 === 0){ out += bout; return; }
      var codes = bout.split(';').map(Number);
      if(codes.indexOf(0) >= 0 || !bout){
        while(ouvert > 0){ out += '</span>'; ouvert--; }
        return;
      }
      var gras = codes.indexOf(1) >= 0;
      var teinte = codes.filter(function(c){ return c >= 30 && c <= 37; })[0];
      out += '<span style="' + (gras ? 'font-weight:700;' : '')
           + (teinte ? 'color:' + PALETTE[teinte] : '') + '">';
      ouvert++;
    });
    while(ouvert > 0){ out += '</span>'; ouvert--; }
    return out;
  }

  function rendTexte(){
    /* « parts = [] » sur une panne faisait dire au panneau que l'étape ne
       contient aucune ligne : une AFFIRMATION SUR SON CONTENU, alors qu'on
       vient d'échouer à le mettre en forme. Le lead ferme le panneau en pensant
       que son étape est vide, va corriger une strat qui n'a rien, et ne signale
       jamais rien — la trace n'était même pas journalisée.
       Une panne et un vide ne se disent pas de la même façon. */
    var parts, panne = null;
    try{ parts = texteCourant(); }
    catch(err){ parts = []; panne = err; if(window.console) console.error(err); }
    var host = $('stTxtParts');
    if(panne){
      host.innerHTML = '<p class="st-vide">Le texte n’a pas pu être fabriqué pour ce choix. '
        + 'Change « Quoi » ou « Pour qui » ; si ça revient, recharge la page.</p>';
      $('stTxtInfo').textContent = '';
      $('stTxtTout').disabled = true;
      return;
    }
    if(!parts.length){
      host.innerHTML = '<p class="st-vide">Rien à coller ici — cette étape ne contient '
        + 'aucune ligne pour ce choix.</p>';
      $('stTxtInfo').textContent = '';
      $('stTxtTout').disabled = true;
      return;
    }
    $('stTxtTout').disabled = false;
    var couleurs = ($('stTxtStyle').value === 'couleurs');
    host.innerHTML = parts.map(function(t, i){
      return '<div class="st-part" data-i="' + i + '">'
        + '<div class="st-parthead"><b>' + (parts.length > 1 ? 'MESSAGE ' + (i + 1) : 'À COLLER')
        + '</b><span>' + TX.pese(t) + ' caractères</span>'
        + '<button type="button" class="st-btn" data-copie="' + i + '">Copier</button></div>'
        + '<pre>' + (couleurs ? ansiHtml(t) : S.esc(t)) + '</pre></div>';
    }).join('');
    host._parts = parts;
    var plusLong = parts.reduce(function(n, t){ return Math.max(n, TX.pese(t)); }, 0);
    $('stTxtInfo').textContent = (parts.length > 1
      ? parts.length + ' messages · envoie-les dans l’ordre'
      : 'un seul message')
      + ' · le plus long fait ' + plusLong + ' sur les 2000 permis';
  }

  // navigator.clipboard n'existe qu'en contexte sûr, et REFUSE aussi quand la
  // page n'a pas le focus. Un refus ne doit pas rester sans suite : on repasse
  // par la vieille méthode, qui elle part d'un clic et passe donc partout.
  function vieilleCopie(txt){
    return new Promise(function(res, rej){
      var z = document.createElement('textarea');
      z.value = txt;
      z.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(z);
      z.focus(); z.select();
      var ok = false;
      try{ ok = document.execCommand('copy'); }catch(e){}
      z.remove();
      ok ? res() : rej(new Error('copie refusée'));
    });
  }
  function copie(txt){
    if(navigator.clipboard && navigator.clipboard.writeText)
      return navigator.clipboard.writeText(txt).catch(function(){ return vieilleCopie(txt); });
    return vieilleCopie(txt);
  }
  function copié(quoi, n){ toast(quoi + ' copié — ' + n + ' caractères, colle dans Discord.','ok'); }

  (function(){
    var w = $('stTxtWrap'); if(!w || !TX) return;
    function ouvreTexte(){ remplitReglages(); rendTexte(); w.hidden = false; }
    function ferme(){ w.hidden = true; }
    $('stTexte').addEventListener('click', ouvreTexte);
    $('stTxtFermer').addEventListener('click', ferme);
    w.addEventListener('click', function(e){ if(e.target === w) ferme(); });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !w.hidden) ferme(); });
    ['stTxtPortee','stTxtVar','stTxtJob','stTxtStyle'].forEach(function(id){
      $(id).addEventListener('change', rendTexte); });
    $('stTxtParts').addEventListener('click', function(e){
      var b = e.target.closest('button[data-copie]'); if(!b) return;
      var t = ($('stTxtParts')._parts || [])[+b.dataset.copie];
      copie(t).then(function(){
        b.textContent = 'Copié'; setTimeout(function(){ b.textContent = 'Copier'; }, 1600);
        copié('Message ' + (+b.dataset.copie + 1), t.length);
      }).catch(function(){ toast('La copie a échoué — sélectionne le texte à la main.','err'); });
    });
    $('stTxtTout').addEventListener('click', function(){
      var t = ($('stTxtParts')._parts || []).join('\n\n');
      copie(t).then(function(){ copié('Tout', t.length); })
        .catch(function(){ toast('La copie a échoué — sélectionne le texte à la main.','err'); });
    });
  })();

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

  /* Le bouton doit répondre au clic. Enregistrer prend un aller-retour disque :
     sans rien à l'écran, on ne sait pas si le clic a porté, et on reclique. */
  var enCours = false;
  function etatSave(etat){
    var b = $('stSave'); if(!b) return;
    var l = b.querySelector('.st-lbl');
    b.classList.toggle('encours', etat === 'cours');
    b.classList.toggle('fait',    etat === 'fait');
    b.disabled = (etat === 'cours');
    // « Enregistrement… » debordait de la largeur figee du bouton et poussait
    // la barre : les deux libelles d'etat tiennent dans celle d'« Enregistrer ».
    if(l) l.textContent = etat === 'cours' ? 'En cours…'
                        : etat === 'fait'  ? 'Enregistré'
                        : 'Enregistrer';
    if(etat === 'fait'){ clearTimeout(etatSave._t);
      etatSave._t = setTimeout(function(){ etatSave(null); }, 1600); }
  }

  /* ---------------- écrire, puis vérifier ----------------
     Le navigateur VIDE le fichier avant d'y écrire (`createWritable`). Entre les
     deux, `js/data.js` ne contient rien. Si l'écriture s'arrête là — disque
     plein, permission retirée, onglet fermé — le fichier reste vide ou coupé, et
     c'est toute la strat qui part.

     On relit donc ce qu'on vient d'écrire. Si ce n'est pas ce qu'on voulait, on
     remet la version d'avant : on l'a en main, on venait de la lire. Le lead
     perd son dernier enregistrement, pas son fichier. */
  async function ecrisEtRelis(h, texte, avant, nom){
    try{
      await DF.ecris(h, texte);
      if(await DF.lis(h) === texte) return true;
    }catch(e){ /* on retombe sur la restauration */ }
    try{
      await DF.ecris(h, avant);
      toast('L’écriture de ' + nom + ' n’a pas abouti — le fichier a été remis comme il était.','err');
    }catch(e){
      toast('L’écriture de ' + nom + ' a échoué ET la version d’avant n’a pas pu être remise. '
          + 'Ne ferme pas l’atelier : ton travail y est encore.','err');
    }
    return false;
  }

  async function enregistrer(){
    if(enCours) return;                     // Ctrl+S repete ne relance pas l'ecriture
    if(!DF.dispo()){ toast('La sauvegarde directe demande Chrome ou Edge.','err'); return; }
    // On n'annonce la question que si elle va vraiment se poser. `connue`
    // n'ouvre aucun selecteur, donc ne consomme pas le geste. Sans ce test,
    // la modale revenait a chaque rechargement — et depuis qu'un dossier
    // suffit, elle annoncait a ceux qui avaient deja repondu une demande
    // qui n'arrivait jamais.
    var pret = (await DF.connue('data') && await DF.connue('i18n'))
            || await DF.connue('projet');
    if(!pret && !explique){
      var ok = await demande('Ta carte, ta strat et sa version anglaise vont être sauvegardées.<br><br>'
        + 'Le navigateur va te demander <b>le dossier du projet</b> — c’est sa façon de '
        + 't’autoriser à écrire dedans, et il ne le demandera qu’une fois. Les fichiers à '
        + 'mettre à jour, l’outil les y trouve tout seul.',
        {titre:'Premier enregistrement', ok:'Choisir le dossier', danger:false});
      if(!ok) return;
      explique = true;
    }
    enCours = true; etatSave('cours');
    try{
      var f = await DF.fichiersProjet();
      var h = f.data, h2 = f.i18n;
      $('stFile').textContent = h.name;
      if(!(await DF.permission(h))){ toast('Permission refusée — rien n’a été sauvegardé.','err'); return; }

      /* L'espace de travail d'abord, et à jour — avant d'écrire le fichier.

         Il se garde tout seul, mais une seconde après coup. Or certains
         serveurs de développement (Live Server, port 5500) rechargent la page
         DÈS QU'UN FICHIER BOUGE : écrire js/data.js déclenche le rechargement
         de l'atelier au moment même où on l'écrit. La page repart alors de la
         bibliothèque — qui n'a pas encore la dernière seconde de travail — et
         ce qu'on venait d'écrire réapparaît dans son état d'avant : un libellé
         revenu à son nom, ou au contraire un libellé qu'on vient d'effacer et
         qui revient. On force donc la mise à jour ici : au moment où le
         fichier change, la bibliothèque dit déjà la même chose que lui. */
      await sauve();

      // carte ET strat en UNE passe : le fichier n'est lu et réécrit qu'une fois
      var blocs = [].concat(MS ? MS.blocs() : [], SS ? SS.blocs() : []);
      var avant = await DF.lis(h);              // la version qu'on remplace
      var r = DF.remplace(avant, blocs);
      if(r.absents.length){
        /* Un bloc introuvable veut dire DEUX choses, et le même message les
           confondait — en accusant toujours le fichier.

           · un bloc d'étapes manque (PHASES_C…) : la strat a plus de chapitres
             que le fichier n'en connaît. Le fichier est le BON, il est juste
             en retard. Oublier la poignée ici n'aidait pas — pire, comme seule
             'data' était oubliée et pas 'projet', fichiersProjet retrouvait le
             même fichier sans rien redemander, et le lead rejouait le même
             message à l'infini sans jamais rien enregistrer ;
           · autre chose manque : là oui, on écrit probablement ailleurs.

           Dans les deux cas on NOMME ce qui manque. L'atelier Carte seul le
           faisait déjà ; la coque avait perdu l'information en unifiant. */
        var quoi = r.absents.join(', ');
        var quEtapes = r.absents.every(function(n){ return /^PHASES/.test(n); });
        if(quEtapes){
          toast('Ta strat a un chapitre que js/data.js ne connaît pas encore (' + quoi + '). '
              + 'Rien n\'a été enregistré : ajoute « const ' + r.absents[0] + '=[]; » au fichier, '
              + 'ou publie cette strat dans le projet d\'où elle vient.', 'err');
          return;
        }
        await DF.oublie('data');
        await DF.oublie('projet');
        toast('Ce fichier ne contient pas ta strat — il y manque ' + quoi + '. '
            + 'On te redemandera le dossier du projet.', 'err');
        return;
      }
      if(!(await ecrisEtRelis(h, r.texte, avant, 'js/data.js'))) return;
      if(MS) MS.propre();
      if(SS) SS.propre();
      // le fichier dit maintenant exactement ceci : c'est le point d'accord des
      // deux, et c'est à lui qu'on comparera le fichier à la prochaine ouverture
      await sauve(true);

      /* La version anglaise vit dans un autre fichier : elle suit, sans bloquer.
         Son propre try/catch, et c'est le point : DF.permission(h2) peut jeter
         (poignée périmée, fichier déplacé → NotFoundError). L'exception filait
         au catch général, qui annonçait « Échec de la sauvegarde » — alors que
         js/data.js venait d'être écrit ET relu avec succès. Le lead croyait
         avoir tout perdu et recliquait, voire rechargeait. */
      try{
        if(await DF.permission(h2)){
          var avant2 = await DF.lis(h2);
          var r2 = DF.remplace(avant2, SS ? SS.blocsTr() : []);
          if(r2.absents.length){ await DF.oublie('i18n');
            toast('Sauvegardé, mais la version anglaise n’a pas pu être écrite dans ce fichier.','err'); }
          else if(await ecrisEtRelis(h2, r2.texte, avant2, 'js/i18n.js')){
            toast('Carte et strat sauvegardées — le guide est à jour.','ok'); }
        } else toast('Sauvegardé. La version anglaise n’a pas été enregistrée.','ok');
      }catch(e2){
        if(window.console) console.error(e2);
        await DF.oublie('i18n');
        toast('Sauvegardé. La version anglaise n’a pas suivi — on te redemandera son fichier.','ok');
      }
      majEtat();
      etatSave('fait');
    }catch(e){
      if(window.console) console.error(e);
      if(e.message === 'DOSSIER_SANS_DATA')
        toast('Ce dossier n’est pas celui du projet — on n’y trouve pas js/data.js.','err');
      /* Le message brut du navigateur — « Failed to execute 'write' on
         'FileSystemWritableFileStream' » — ne dit ni ce qui a été perdu ni quoi
         faire. Il part en console, où il sert ; le lead lit une phrase. */
      else if(e.name !== 'AbortError')
        toast('La sauvegarde n’a pas abouti — ton travail est toujours dans l’atelier. '
            + 'Réessaie ; si ça recommence, ferme les autres onglets de l’atelier.','err');
    }finally{
      enCours = false;
      if(!$('stSave').classList.contains('fait')) etatSave(null);
    }
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
  // La bibliothèque d'abord : au tout premier lancement elle est vide, et on
  // y verse ce que data.js contient — le travail existant ne se perd pas et
  // devient la première entrée.
  async function ouvreBibliotheque(){
    if(!BI) return;
    BI.persiste();
    // TANT QUE les globales n'ont pas été remplacées, elles décrivent le FICHIER.
    // C'est le seul moment de la vie de la page où on peut le prendre en photo.
    duFichier = empreinte();
    var regFichier = MS && MS.reglages ? MS.reglages() : null;
    stratDuFichier = BI.depuisGlobaux(G, (typeof NOM !== 'undefined' && NOM) ? NOM : 'Ma strat', regFichier);
    var l = await BI.liste();
    if(!l.length){
      var reg = regFichier;
      var s = BI.depuisGlobaux(G, (typeof NOM !== 'undefined' && NOM) ? NOM : 'Ma strat', reg);
      // ce que le fichier dit aujourd'hui EST ce qu'on garde : les deux partent d'accord
      s.fichier = duFichier;
      await BI.ecris(s);
      stratId = s.id; BI.noteCourante(s.id);
      dernierEcrit = signature(s); empreintePubliee = s.fichier;
    } else {
      var vise = BI.courante();
      var choix = l.filter(function(x){ return x.id === vise; })[0] || l[0];
      var s2 = await BI.lis(choix.id);
      if(!s2){ stratId = null; await majListeStrats(); return; }
      if(s2.fichier && s2.fichier !== duFichier) s2 = await tranche(s2, duFichier);
      poseStrat(s2);
    }
    await majListeStrats();
  }

  /* Le fichier a changé depuis la dernière publication de cette strat. On ne
     choisit pas à sa place : les deux versions sont du travail, et rien ne dit
     laquelle compte. Quoi qu'il réponde, on note le fichier comme vu — la
     question ne revient pas à chaque ouverture. */
  async function tranche(gardee, duFichier){
    var prendLeFichier = await demande(
        '<b>js/data.js a changé depuis ta dernière publication.</b><br><br>'
      + 'Ça arrive quand le fichier a été modifié en dehors de l’atelier — une '
      + 'récupération depuis GitHub, une correction à la main, ou une autre '
      + 'machine.<br><br>'
      + 'Ton travail en cours dans l’atelier et le contenu du fichier ne disent '
      + 'plus la même chose. Lequel garde-t-on ?',
      {titre:'Deux versions de « ' + S.esc(gardee.nom) + ' »',
       ok:'Repartir du fichier', annule:'Garder mon travail', danger:false});
    if(!prendLeFichier){
      gardee.fichier = duFichier;                 // vu, et écarté : on n'y revient pas
      await BI.ecris(gardee);
      toast('Ton travail est gardé — le fichier sera écrasé au prochain enregistrement.','ok');
      return gardee;
    }
    var neuve = BI.depuisGlobaux(G, gardee.nom, MS && MS.reglages ? MS.reglages() : null);
    neuve.id = gardee.id; neuve.fichier = duFichier;
    await BI.ecris(neuve);
    toast('Repartie de js/data.js.','ok');
    return neuve;
  }

  /* La question du conflit ne se pose qu'une fois — c'est voulu, elle serait
     insupportable à chaque ouverture. Mais « Garder mon travail » fermait la
     porte : plus aucun moyen de revenir au fichier. Cette commande la rouvre,
     à n'importe quel moment.

     Elle repart de js/data.js TEL QUE CETTE PAGE L'A CHARGÉ. Si le fichier a
     bougé depuis — un `git pull` pendant que l'atelier était ouvert — il faut
     recharger d'abord, sinon on repart d'une photo périmée. */
  async function repartDuFichier(){
    if(!BI || !stratId || !stratDuFichier) return;
    var s = await BI.lis(stratId); if(!s) return;
    if(!(await demande(
        'On remplace « <b>' + S.esc(s.nom) + '</b> » par ce que <b>js/data.js</b> '
      + 'contient.<br><br>'
      + 'Tout ce que tu as écrit dans l’atelier depuis ta dernière publication '
      + 'sera <b>perdu</b>.<br><br>'
      + 'Le fichier est lu tel que cette page l’a chargé : si tu viens de le '
      + 'modifier ailleurs, recharge d’abord.',
      {titre:'Repartir de js/data.js', ok:'Repartir du fichier', danger:true}))) return;
    var neuve = BI.copie ? BI.copie(stratDuFichier) : JSON.parse(JSON.stringify(stratDuFichier));
    neuve.id = s.id; neuve.nom = s.nom; neuve.fichier = duFichier;
    await BI.ecris(neuve);
    poseStrat(neuve);
    dernierEcrit = signature(neuve); empreintePubliee = neuve.fichier;
    await majListeStrats();
    toast('Repartie de js/data.js.','ok');
  }

  /* Reprendre là où on en était.

     Enregistrer peut faire recharger la page — Live Server et consorts le font
     dès qu'un fichier bouge, et c'est justement le fichier qu'on vient
     d'écrire. On revenait alors à l'écran d'accueil, l'étape refermée : on
     sauvegardait son travail et on perdait sa place.

     L'étape se lit AVANT de poser le chapitre : changer de chapitre referme
     l'étape ouverte, et l'effacerait avant qu'on ait pu la relire. */
  function restaure(){
    var depart = 'map', etape = null;
    try{ var m = localStorage.getItem('studio_atelier'); if(m==='map'||m==='strat') depart = m; }catch(e){}
    try{ var e0 = localStorage.getItem('studio_etape'); if(e0) etape = +e0; }catch(e){}
    try{ var c = +localStorage.getItem('studio_chapitre'); if(c > 0 && c < FL.length) chapitre(c); }catch(e){}
    // `choisir` écarte lui-même un rang qui ne désigne plus d'étape
    if(etape != null && SS && SS.choisir) SS.choisir(etape);
    ouvre(depart);
    if(DF.connue) DF.connue('data').then(function(h){ if(h) $('stFile').textContent = h.name; });
    majEtat();
  }
  $('stStratSel').addEventListener('change', function(e){
    var v = e.target.value;
    if(v === '__neuve__') return nouvelleStrat();
    if(v === '__copie__') return dupliqueStrat();
    if(v === '__renom__') return renommeStrat();
    if(v === '__suppr__') return supprimeStrat();
    if(v === '__import__'){ majListeStrats(); return choisirFichier(); }
    if(v === '__fichier__'){ majListeStrats(); return repartDuFichier(); }
    ouvreStrat(v);
  });
  // les ateliers démarrent sur DOMContentLoaded : on passe juste après
  /* Le .catch(restaure) rattrapait TOUT sans rien dire. Si indexedDB.open
     échoue au chargement — navigation privée, stockage bloqué, base corrompue —
     l'atelier s'ouvrait quand même : témoin gris, sélecteur de strats vide,
     bouton Enregistrer actif, et sauve() qui sortait en première ligne à chaque
     frappe parce que stratId restait null. Le lead travaillait une heure, et le
     rechargement prenait tout.
     panneEspace() existait déjà pour dire exactement ça — il ne couvrait que
     l'échec d'une écriture APRÈS un démarrage réussi, soit le seul chemin où
     la panne se voyait de toute façon. */
  function demarre(){
    ouvreBibliotheque().then(restaure).catch(function(e){
      if(window.console) console.error(e);
      panneEspace();
      restaure();
    });
  }
  if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded', function(){ setTimeout(demarre, 0); });
  else setTimeout(demarre, 0);

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

  window.__STUDIO = {ouvre:ouvre, chapitre:chapitre, enregistrer:enregistrer, actif:function(){ return actif; },
                     instantane:instantane,
                     // crochets de test : publier sans disque, les deux empreintes,
                     // et l'écriture vérifiée, qu'on ne peut pas mettre en échec autrement
                     publieFictif:function(){ return sauve(true); },
                     ecrisEtRelis:ecrisEtRelis,
                     empreintes:function(){ return {fichier:duFichier, publiee:empreintePubliee}; }};
})();
