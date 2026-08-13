/* ============================================================
   data-file.js — ÉCRITURE DE js/data.js ET js/i18n.js
   ------------------------------------------------------------
   Map Studio et Strat Studio écrivent tous les deux dans les mêmes
   fichiers. Tant que chacun avait sa copie du mécanisme, un changement
   d'un côté pouvait corrompre ce que l'autre écrivait. Tout passe
   désormais par ici.

   Principe : on ne réécrit JAMAIS le fichier entier. On remplace bloc
   par bloc (`const NOM = […];`) et on laisse le reste — commentaires,
   contenu écrit à la main, ordre des déclarations — intact.

   La poignée de fichier est mémorisée dans IndexedDB, partagée entre
   les deux outils : on choisit data.js une seule fois pour les deux.

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
    remplace: remplace
  };
})();
