/* ============================================================
   data-file.js — ÉCRITURE DE js/data.js ET js/i18n.js
   ------------------------------------------------------------
   Les deux ateliers écrivent tous les deux dans les mêmes
   fichiers. Tant que chacun avait sa copie du mécanisme, un changement
   d'un côté pouvait corrompre ce que l'autre écrivait. Tout passe
   désormais par ici.

   Principe : on ne réécrit JAMAIS le fichier entier. On remplace bloc
   par bloc (`const NOM = […];`) et on laisse le reste — commentaires,
   contenu écrit à la main, ordre des déclarations — intact.

   Les poignées sont mémorisées dans IndexedDB et partagées entre les
   deux outils : on désigne le dossier du projet UNE fois, et les deux
   fichiers s'y trouvent tout seuls (voir `fichiersProjet`).

   Aucune dépendance. Chargé avant le script de l'outil.
   Expose window.DATAFILE.
   ============================================================ */
(function(){
  'use strict';

  var BASE = 'sortie-outils', MAGASIN = 'kv';

  /* ---------------- mémoire des poignées ---------------- */
  function idb(fn){
    return new Promise(function(res, rej){
      var r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore(MAGASIN); };
      r.onerror = function(){ rej(r.error); };
      r.onsuccess = function(){ try{ fn(r.result, res, rej); }catch(e){ rej(e); } };
    });
  }
  function lit(k){ return idb(function(db, res, rej){
    var t = db.transaction(MAGASIN,'readonly').objectStore(MAGASIN).get(k);
    t.onsuccess = function(){ res(t.result); }; t.onerror = function(){ rej(t.error); }; }); }
  function ecrit(k, v){ return idb(function(db, res, rej){
    var t = db.transaction(MAGASIN,'readwrite').objectStore(MAGASIN).put(v, k);
    t.onsuccess = function(){ res(); }; t.onerror = function(){ rej(t.error); }; }); }

  // cache mémoire : évite un aller-retour IndexedDB à chaque enregistrement
  var vives = {};

  /* ---------------- poignées de fichier ---------------- */

  // Le navigateur sait-il écrire sur le disque ? (Chrome/Edge oui, Firefox/Safari non)
  function dispo(){ return typeof window.showOpenFilePicker === 'function'; }

  // Rend la poignée mémorisée, sinon ouvre le sélecteur de fichier.
  // `cle` vaut 'data' ou 'i18n' ; `nom` est le libellé montré dans le sélecteur.
  async function poignee(cle, nom){
    if(vives[cle]) return vives[cle];
    try{ var m = await lit(cle); if(m){ vives[cle] = m; return m; } }catch(e){}
    var choix = await window.showOpenFilePicker({
      types:[{description: nom || 'JavaScript', accept:{'text/javascript':['.js']}}]});
    vives[cle] = choix[0];
    try{ await ecrit(cle, choix[0]); }catch(e){}
    return vives[cle];
  }

  // Poignée déjà accordée, ou null — n'ouvre JAMAIS le sélecteur.
  // Pour les actions qui n'ont de sens que sur un fichier déjà choisi (relire
  // le disque), où faire surgir un sélecteur serait incompréhensible.
  async function connue(cle){
    if(vives[cle]) return vives[cle];
    try{ var m = await lit(cle); if(m){ vives[cle] = m; return m; } }catch(e){}
    return null;
  }

  // Après un « ce n'est pas le bon fichier » : on repart du sélecteur au prochain coup.
  async function oublie(cle){
    delete vives[cle];
    try{ await ecrit(cle, null); }catch(e){}
  }

  // La permission d'écriture s'éteint entre deux sessions : on la redemande.
  async function permission(h){
    var o = {mode:'readwrite'};
    if((await h.queryPermission(o)) === 'granted') return true;
    return (await h.requestPermission(o)) === 'granted';
  }

  /* ---------------- poignée de dossier ----------------
     Une image de fond ne se met pas dans data.js : elle va dans img/, et le
     fichier n'y désigne qu'un chemin. Pour l'y déposer il faut la permission
     sur le DOSSIER, pas sur un fichier — c'est une autre autorisation, qu'on
     demande une seule fois et qu'on retient comme les autres. */
  function dispoDossier(){ return typeof window.showDirectoryPicker === 'function'; }

  async function dossier(cle){
    if(vives[cle]) return vives[cle];
    try{ var m = await lit(cle); if(m){ vives[cle] = m; return m; } }catch(e){}
    var d = await window.showDirectoryPicker({mode:'readwrite'});
    vives[cle] = d;
    try{ await ecrit(cle, d); }catch(e){}
    return d;
  }
  // Le nom est rendu, pas suppose : le navigateur peut refuser un caractere.
  async function deposeFichier(dir, nom, blob){
    var h = await dir.getFileHandle(nom, {create:true});
    var w = await h.createWritable();
    await w.write(blob);
    await w.close();
    return h.name;
  }
  async function existe(dir, nom){
    try{ await dir.getFileHandle(nom); return true; }catch(e){ return false; }
  }
  // Effacer pour de bon : aucune corbeille, le fichier part du disque.
  // L'appelant doit avoir demande, et compris ce qu'il demande.
  async function supprimeFichier(dir, nom){ await dir.removeEntry(nom); }

  /* ---------------- les deux fichiers, d'un seul geste ----------------
     Avant, enregistrer demandait DEUX fois : désigne js/data.js, puis désigne
     js/i18n.js. Deux questions, et sur des noms de fichiers qu'un lead n'a
     aucune raison de connaître — il veut enregistrer sa strat, pas piloter
     une arborescence.

     On demande le DOSSIER du projet, une fois, et on va y chercher les deux.
     Le navigateur n'accorde pas l'écriture sans un geste : la question ne peut
     pas disparaître, mais elle peut ne se poser qu'une fois et porter sur
     quelque chose qui se reconnaît.

     Les poignées déjà accordées avant ce changement restent valables — on ne
     redemande rien à ceux qui avaient déjà répondu. */
  async function fichiersProjet(){
    var d = await connue('data'), i = await connue('i18n');
    if(d && i) return {data:d, i18n:i};

    var dir = await dossier('projet');
    // On accepte la racine du projet comme le dossier js/ lui-même : se tromper
    // d'un cran est l'erreur la plus facile à faire, et la moins utile à punir.
    var js = dir;
    try{ js = await dir.getDirectoryHandle('js'); }catch(e){}
    var h, h2;
    try{
      h  = await js.getFileHandle('data.js');
      h2 = await js.getFileHandle('i18n.js');
    }catch(e){
      await oublie('projet');
      var err = new Error('DOSSIER_SANS_DATA'); err.dossier = dir.name; throw err;
    }
    vives.data = h; vives.i18n = h2;
    try{ await ecrit('data', h); await ecrit('i18n', h2); }catch(e){}
    return {data:h, i18n:h2};
  }

  /* Un sous-dossier du projet, sans rien redemander.
     Quand le dossier du projet est deja autorise, img/ en decoule : le
     navigateur etend l'autorisation aux descendants d'une poignee accordee.
     Poser une image de fond ne demande donc plus sa propre permission.
     Rend null si rien n'est connu — a l'appelant de decider s'il demande. */
  async function sousDossier(cle, nom){
    if(vives[cle]) return vives[cle];
    try{ var m = await lit(cle); if(m){ vives[cle] = m; return m; } }catch(e){}
    var p = await connue('projet');
    if(!p) return null;
    try{
      var d = await p.getDirectoryHandle(nom);
      vives[cle] = d;
      try{ await ecrit(cle, d); }catch(e){}
      return d;
    }catch(e){ return null; }
  }

  function lisTexte(h){ return h.getFile().then(function(f){ return f.text(); }); }
  async function ecrisTexte(h, texte){
    var w = await h.createWritable();
    await w.write(texte);
    await w.close();
  }

  /* ---------------- remplacement bloc par bloc ---------------- */

  // Deux formes de bloc, et deux seulement :
  //   scalaire — const MOBSCALE=1;
  //   littéral — const NOM=[ … \n]; ou const NOM={ … \n};
  // Le littéral exige son crochet fermant en début de ligne suivi de « ; » :
  // les crochets imbriqués sont indentés par les sérialiseurs, donc jamais
  // confondus avec la fin du bloc. Une regex non-gourmande sans cette ancre
  // s'arrêterait au premier « ]; » venu.
  function motif(b){
    return b.scalaire
      ? new RegExp('const ' + b.nom + '\\s*=\\s*[^;]*;')
      : new RegExp('const ' + b.nom + '\\s*=\\s*[\\[{][\\s\\S]*?\\n[\\]}];');
  }

  // Rend le texte modifié et la liste des blocs qu'on n'a PAS trouvés.
  // Un bloc absent n'est jamais ajouté : c'est le signe qu'on écrit dans le
  // mauvais fichier, et l'outil doit le dire plutôt que d'y coller du contenu.
  function remplace(texte, blocs){
    var absents = [];
    (blocs || []).forEach(function(b){
      var re = motif(b);
      if(!re.test(texte)){ absents.push(b.nom); return; }
      texte = texte.replace(re, function(){ return b.txt; });   // fonction : pas d'interprétation de $&
    });
    return {texte: texte, absents: absents};
  }

  window.DATAFILE = {
    dispo: dispo,
    poignee: poignee,
    connue: connue,
    oublie: oublie,
    permission: permission,
    lis: lisTexte,
    ecris: ecrisTexte,
    remplace: remplace,
    dispoDossier: dispoDossier,
    dossier: dossier,
    fichiersProjet: fichiersProjet,
    sousDossier: sousDossier,
    deposeFichier: deposeFichier,
    supprimeFichier: supprimeFichier,
    existe: existe
  };
})();
