/* ============================================================
   biblio.js — la bibliothèque de strats
   ------------------------------------------------------------
   Jusqu'ici, ton travail ÉTAIT le dépôt : une seule strat, dans
   js/data.js. Pour en tenir plusieurs — un event, un autre event,
   celle qu'on prépare — il faut un espace de travail qui vive
   ailleurs que dans le fichier publié.

   Cet espace, c'est le navigateur (IndexedDB). Tes strats y sont
   au chargement, sans rien ouvrir. Le dépôt devient une
   DESTINATION : « Enregistrer » publie la strat courante dans
   js/data.js, et le site la sert.

   Une strat est un objet autonome et sérialisable :
     {id, nom, maj, compo, role, buffs, cartes, chapitres}
   Les chapitres portent leurs étapes en clair — plus de renvoi à
   une constante PHASES, qui n'aurait aucun sens hors du fichier.

   Aucune dépendance. Expose window.BIBLIO.
   ============================================================ */
(function(global){
  "use strict";

  var BASE = 'strat-studio', MAGASIN = 'strats', CLE_COURANTE = 'studio_strat_courante';

  /* ---------------- le magasin ---------------- */
  function idb(fn){
    return new Promise(function(res, rej){
      var r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = function(){
        var db = r.result;
        if(!db.objectStoreNames.contains(MAGASIN)) db.createObjectStore(MAGASIN, {keyPath:'id'});
      };
      r.onerror = function(){ rej(r.error); };
      r.onsuccess = function(){ try{ fn(r.result, res, rej); }catch(e){ rej(e); } };
    });
  }
  function tout(){ return idb(function(db, res, rej){
    var t = db.transaction(MAGASIN,'readonly').objectStore(MAGASIN).getAll();
    t.onsuccess = function(){ res(t.result || []); }; t.onerror = function(){ rej(t.error); }; }); }
  function lis(id){ return idb(function(db, res, rej){
    var t = db.transaction(MAGASIN,'readonly').objectStore(MAGASIN).get(id);
    t.onsuccess = function(){ res(t.result || null); }; t.onerror = function(){ rej(t.error); }; }); }
  function ecris(s){ s.maj = Date.now(); return idb(function(db, res, rej){
    var t = db.transaction(MAGASIN,'readwrite').objectStore(MAGASIN).put(s);
    t.onsuccess = function(){ res(s); }; t.onerror = function(){ rej(t.error); }; }); }
  function supprime(id){ return idb(function(db, res, rej){
    var t = db.transaction(MAGASIN,'readwrite').objectStore(MAGASIN).delete(id);
    t.onsuccess = function(){ res(); }; t.onerror = function(){ rej(t.error); }; }); }

  // La liste, la plus récemment touchée d'abord — sans les contenus, qui
  // peuvent peser : on ne les lit qu'à l'ouverture.
  function liste(){
    return tout().then(function(a){
      return a.map(function(s){ return {id:s.id, nom:s.nom, maj:s.maj,
        chapitres:(s.chapitres||[]).length,
        etapes:(s.chapitres||[]).reduce(function(n,c){ return n + (c.phases||[]).length; }, 0)}; })
        .sort(function(x,y){ return (y.maj||0) - (x.maj||0); });
    });
  }

  /* ---------------- copie profonde ----------------
     Une strat sort de la bibliothèque détachée de tout : sans ça, deux
     onglets ouverts sur la même strat se marcheraient dessus, et
     « dupliquer » partagerait ses tableaux avec l'original. */
  /* Rien de ce qui commence par « _ » n'appartient à la strat : l'atelier Carte
     accroche à chaque marqueur sa forme Konva (`_mk`), et à chaque tracé les
     poignées qu'on y traîne (`_pts`). Tout se refait au rendu — `_pts` se relit
     depuis `points`, `_mk` se redessine — et rien de tout ça ne va jamais dans
     `data.js`.

     Sérialisé, `_mk` pesait le QUART de ce qu'on écrivait en bibliothèque, et on
     y écrit toute la strat à chaque silence dans la frappe. C'est aussi ce que
     l'empreinte de comparaison laisse déjà de côté, pour la même raison. */
  function copie(o){
    return JSON.parse(JSON.stringify(o, function(cle, valeur){
      return cle.charAt(0) === '_' ? undefined : valeur; }));
  }

  function id(){
    return 'st-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- globaux <-> strat ----------------
     Les ateliers travaillent sur les globales de data.js. Charger une autre
     strat, c'est donc REMPLACER LEUR CONTENU — jamais les réaffecter : les
     deux ateliers en gardent des références prises au démarrage. */
  function depuisGlobaux(g, nom, reglages){
    reglages = reglages || {};
    return {
      id: id(), nom: nom || 'Sans titre', maj: Date.now(),
      compo: copie(g.COMPO || {}),
      role:  copie(g.ROLE  || {}),
      buffs: copie(g.BUFFS || {}),
      cartes: copie(g.CARTES || {}),
      // les vignettes des mobs et les traductions font partie de la strat :
      // sans elles, un guide exporté n'a ni images ni version anglaise
      mob: copie(g.MOB || {}),
      tr:  copie(g.TR  || {}),
      // deux nombres, donc impossibles à faire voyager par les globales
      // (`const`) : l'atelier Carte les donne et les reprend
      mobScale:   (typeof reglages.mobScale   === 'number') ? reglages.mobScale   : nombre(g, 'MOBSCALE', 1),
      lblMargin:  (typeof reglages.labelMargin === 'number') ? reglages.labelMargin : nombre(g, 'LBLMARGIN', 6),
      // les étapes descendent DANS le chapitre : hors du fichier, « PHASES »
      // ne désigne rien
      chapitres: (g.FLOORS || []).map(function(f){
        return {id:f.id, fr:f.fr, en:f.en, sub:f.sub, carte:f.carte,
                introFr:f.introFr, introEn:f.introEn,
                phasesNom:f.phasesNom, phases: copie(f.phases || [])};
      })
    };
  }

  function nombre(g, nom, def){ var v = g[nom]; return (typeof v === 'number') ? v : def; }
  function videObjet(o){ Object.keys(o).forEach(function(k){ delete o[k]; }); }
  function remplit(o, src){ if(!o) return; videObjet(o); Object.keys(src||{}).forEach(function(k){ o[k] = src[k]; }); }

  // `g` porte les globales ; `resoudre` rebranche les chapitres sur leurs cartes.
  // Rend les deux réglages numériques, que l'appelant doit reporter lui-même.
  /* ---------------- les chemins d'images d'avant le rangement ----------------
     `img/` etait un dossier a plat : 24 vignettes, 6 fonds de carte et les
     icones de l'application, tout melange. Les vignettes vivent maintenant dans
     `img/mobs/` et les fonds dans `img/cartes/`.

     Mais une strat gardee en bibliotheque, ou un fichier recu ecrit avant le
     rangement, retient le chemin TEL QUEL. Sans cette reprise, sa carte
     s'ouvrait sans son fond et ses creatures sans vignette — sans un mot, parce
     que le chargeur d'image avale l'erreur. On la fait donc a l'ENTREE, une
     fois, et elle reste : c'est le prix d'avoir range.
     Un chemin deja range ne correspond a rien ici et passe intact. */
  function repriseChemin(p){
    if(typeof p !== 'string') return p;
    return p.replace(/^img\/(mob-[^/]+)$/, 'img/mobs/$1')
            .replace(/^img\/(map[^/]*)$/,  'img/cartes/$1');
  }
  function repriseImages(c){
    if(!c) return c;
    if(c.mob) Object.keys(c.mob).forEach(function(k){ c.mob[k] = repriseChemin(c.mob[k]); });
    Object.keys(c.cartes || {}).forEach(function(k){
      var ca = c.cartes[k]; if(!ca) return;
      if(ca.fond) ca.fond = repriseChemin(ca.fond);
      (ca.zones || []).forEach(function(z){ if(z && z.map) z.map = repriseChemin(z.map); });
      // une image posee comme forme garde aussi son chemin
      (ca.shapes || []).forEach(function(sh){ if(sh && sh.src) sh.src = repriseChemin(sh.src); });
    });
    (c.chapitres || []).forEach(function(ch){
      if(ch && ch.map) ch.map = repriseChemin(ch.map);
      (ch && ch.zones || []).forEach(function(z){ if(z && z.map) z.map = repriseChemin(z.map); });
    });
    return c;
  }

  /* ---------------- ce qu'une strat gardée trop tôt ne sait pas ----------------
     Une carte dit maintenant quelles créatures on y rencontre. Une strat gardée
     en bibliothèque AVANT ça n'a pas ce roster — et rouvrir cette strat vidait
     les cartes du sien, puis l'enregistrement l'effaçait du fichier.

     Sans un mot, en plus : une carte sans roster propose simplement tout ce que
     MOB connaît, donc rien ne se voyait à l'écran. Il n'y a qu'au moment où on
     relit `data.js` qu'on s'apercevait que le contenu avait disparu.

     Ce que la strat gardée ne dit pas, la carte livrée le sait encore : on le
     lui reprend, une fois, à l'ouverture. Comme pour les chemins d'images. */
  function repriseRoster(cartes, livrees){
    Object.keys(cartes || {}).forEach(function(nom){
      var c = cartes[nom], l = (livrees || {})[nom];
      if(c && !c.roster && l && l.roster) c.roster = copie(l.roster);
    });
    return cartes;
  }

  function versGlobaux(s, g, resoudre){
    var c = repriseImages(copie(s));
    remplit(g.COMPO, c.compo);
    remplit(g.ROLE,  c.role);
    remplit(g.BUFFS, c.buffs);
    remplit(g.CARTES, repriseRoster(c.cartes, g.CARTES));
    remplit(g.MOB,   c.mob);
    // les mots de l'interface d'abord, ceux de la strat par-dessus : une strat
    // neuve n'arrive donc jamais avec un guide anglais amputé de ses libellés
    remplit(g.TR,    Object.assign({}, TR_INTERFACE, c.tr));
    g.FLOORS.length = 0;
    (c.chapitres || []).forEach(function(ch){ g.FLOORS.push(ch); });
    if(resoudre) resoudre(g.FLOORS, g.CARTES);
    return {mobScale: (typeof c.mobScale === 'number') ? c.mobScale : 1,
            labelMargin: (typeof c.lblMargin === 'number') ? c.lblMargin : 6};
  }

  /* ---------------- les mots de l'interface ----------------
     Ceux-là ne viennent pas de la strat mais du guide lui-même. Ils sont
     traduits une fois pour toutes ; sans eux, une strat écrite de zéro
     s'afficherait en anglais avec des libellés restés en français. */
  var TR_INTERFACE = {
    "Vue d'ensemble du run":"Run overview",
    "cliquer sur la carte pour agrandir":"click the map to zoom",
    "Trajet":"Route",
    "Pack de mobs":"Mob pack",
    "Déplacement :":"Route:",
    "Tous":"All",
    "N'afficher que mon rôle":"Show only my role",
    "Carte à venir":"Map coming soon",
    "on la placera avec l'éditeur":"we'll place it with the editor",
    "SECTEUR":"SECTOR",
    "à venir":"coming soon",
    "Pas encore fait — on le prépare plus tard.":"Not done yet — coming later.",
    "Étage":"Floor"
  };

  /* ---------------- créer, dupliquer ---------------- */
  // Une strat neuve n'est pas vide de sens : un chapitre, une carte, une
  // compo de six. Devant un écran totalement vide, on ne sait pas quoi faire.
  function nouvelle(nom){
    var carte = 'Carte principale';
    return {
      id: id(), nom: nom || 'Nouvelle strat', maj: Date.now(),
      compo: {taille:6, creneaux:[]},
      role: {"PLD":"tank","RUN":"tank","WHM":"heal","RDM":"heal","SCH":"heal","SMN":"heal",
             "BRD":"buff","COR":"buff","GEO":"buff",
             "WAR":"dd","MNK":"dd","THF":"dd","BLM":"dd","DRK":"dd","BST":"dd","RNG":"dd",
             "SAM":"dd","NIN":"dd","DRG":"dd","BLU":"dd","PUP":"dd","DNC":"dd","ALL":"all"},
      buffs: {},
      mob: {},
      tr: copie(TR_INTERFACE),
      mobScale: 1, lblMargin: 6,
      cartes: (function(){ var o = {}; o[carte] = {fond:'', trace:'', depart:null, departNom:'',
        bosses:[], packs:[], mids:[], routes:[], texts:[], shapes:[], zones:[]}; return o; })(),
      chapitres: [{id:'ch1', fr:'Chapitre 1', en:'Chapter 1', carte:carte,
                   introFr:'', introEn:'', phasesNom:'PHASES', phases:[]}]
    };
  }
  function duplique(s, nom){
    var d = copie(s);
    d.id = id();
    d.nom = nom || (s.nom + ' (copie)');
    d.maj = Date.now();
    return d;
  }

  /* ---------------- laquelle est ouverte ---------------- */
  function courante(){ try{ return localStorage.getItem(CLE_COURANTE); }catch(e){ return null; } }
  function noteCourante(id){ try{ localStorage.setItem(CLE_COURANTE, id); }catch(e){} }

  // Le navigateur peut vider le stockage d'un site quand la machine manque
  // de place. On demande la persistance : c'est un espace de travail, pas
  // un cache. (Silencieux si le navigateur ne sait pas.)
  function persiste(){
    try{ if(navigator.storage && navigator.storage.persist) return navigator.storage.persist(); }catch(e){}
    return Promise.resolve(false);
  }

  global.BIBLIO = {
    liste:liste, lis:lis, ecris:ecris, supprime:supprime,
    depuisGlobaux:depuisGlobaux, versGlobaux:versGlobaux,
    nouvelle:nouvelle, duplique:duplique, copie:copie, id:id,
    courante:courante, noteCourante:noteCourante, persiste:persiste,
    // la reprise des chemins d'avant le rangement de img/ — utile a qui relit
    // une strat d'ailleurs (un export recu, par exemple)
    repriseImages:repriseImages, repriseChemin:repriseChemin
  };
})(typeof window!=='undefined'?window:this);
