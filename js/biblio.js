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
  function copie(o){ return JSON.parse(JSON.stringify(o)); }

  function id(){
    return 'st-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- globaux <-> strat ----------------
     Les ateliers travaillent sur les globales de data.js. Charger une autre
     strat, c'est donc REMPLACER LEUR CONTENU — jamais les réaffecter : les
     deux ateliers en gardent des références prises au démarrage. */
  function depuisGlobaux(g, nom){
    return {
      id: id(), nom: nom || 'Sans titre', maj: Date.now(),
      compo: copie(g.COMPO || {}),
      role:  copie(g.ROLE  || {}),
      buffs: copie(g.BUFFS || {}),
      cartes: copie(g.CARTES || {}),
      // les étapes descendent DANS le chapitre : hors du fichier, « PHASES »
      // ne désigne rien
      chapitres: (g.FLOORS || []).map(function(f){
        return {id:f.id, fr:f.fr, en:f.en, sub:f.sub, carte:f.carte,
                introFr:f.introFr, introEn:f.introEn,
                phasesNom:f.phasesNom, phases: copie(f.phases || [])};
      })
    };
  }

  function videObjet(o){ Object.keys(o).forEach(function(k){ delete o[k]; }); }
  function remplit(o, src){ videObjet(o); Object.keys(src||{}).forEach(function(k){ o[k] = src[k]; }); }

  // `g` porte les globales ; `resoudre` rebranche les chapitres sur leurs cartes.
  function versGlobaux(s, g, resoudre){
    var c = copie(s);
    remplit(g.COMPO, c.compo);
    remplit(g.ROLE,  c.role);
    remplit(g.BUFFS, c.buffs);
    remplit(g.CARTES, c.cartes);
    g.FLOORS.length = 0;
    (c.chapitres || []).forEach(function(ch){ g.FLOORS.push(ch); });
    if(resoudre) resoudre(g.FLOORS, g.CARTES);
    return s.id;
  }

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
    courante:courante, noteCourante:noteCourante, persiste:persiste
  };
})(typeof window!=='undefined'?window:this);
