/* ============================================================
   import-image.js — poser une image de fond sur une carte
   ------------------------------------------------------------
   Jusqu'ici il fallait TAPER un chemin (« img/map-e.webp ») et
   s'être débrouillé pour que le fichier soit déjà dans le projet.
   Autant dire que personne d'autre qu'Eric ne pouvait créer une
   carte.

   Ici on prend l'image telle qu'elle sort de l'écran de jeu ou d'un
   site de cartes, et on s'occupe du reste :

     · redimensionnée si elle dépasse — 1600 px de côté suffisent
       largement, la scène en fait 1024 et personne ne zoome ×4 ;
     · convertie en WebP, comme tout le reste du dossier img/ : un
       PNG de capture pèse dix fois plus pour le même rendu ;
     · déposée dans img/ sous un nom déduit de celui de la carte,
       et c'est ce CHEMIN que la strat retient.

   Le chemin, pas l'image. Une image glissée dans les données les
   ferait grossir de plusieurs centaines de kilo-octets à chaque
   carte, dans un fichier qu'on lit et qu'on versionne à la main.

   Le navigateur ne sait écrire dans un dossier que sur Chrome et
   Edge. Ailleurs, on rend le fichier converti en téléchargement avec
   le nom qu'il doit porter : le geste reste faisable, il demande un
   glisser-déposer de plus.

   Dépend de window.DATAFILE. Expose window.IMPORTIMAGE.
   ============================================================ */
(function(global){
  "use strict";
  var DF = global.DATAFILE;
  var COTE_MAX = 1600, QUALITE = 0.9;

  /* ---------------- un nom de fichier lisible ----------------
     Il finit dans un dépôt git et dans une URL : ni accents, ni espaces,
     ni majuscules. Il vient du nom de la carte pour qu'on retrouve l'un
     depuis l'autre six mois plus tard. */
  function nomDeFichier(nomCarte){
    var n = String(nomCarte || 'carte');
    if(n.normalize) n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // sans accents
    n = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return 'map-' + (n || 'carte') + '.webp';
  }

  function chargeImage(blob){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function(){ URL.revokeObjectURL(url); res(im); };
      im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('image illisible')); };
      im.src = url;
    });
  }

  // Redimensionne et convertit. Rend le blob ET de quoi le raconter.
  async function prepare(fichier){
    var im = await chargeImage(fichier);
    var w = im.naturalWidth, h = im.naturalHeight;
    if(!w || !h) throw new Error('image vide');
    var k = Math.min(1, COTE_MAX / Math.max(w, h));
    var cw = Math.round(w * k), ch = Math.round(h * k);

    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, 0, cw, ch);

    var blob = await new Promise(function(res){
      c.toBlob(res, 'image/webp', QUALITE); });
    if(!blob) throw new Error('conversion impossible');
    return {blob:blob, w:cw, h:ch, avant:{w:w, h:h, poids:fichier.size},
            apres:{poids:blob.size}};
  }

  /* ---------------- obtenir le dossier ----------------
     ⚠ À APPELER EN PREMIER, avant toute autre attente.

     Le navigateur n'ouvre un sélecteur de dossier que dans la foulée d'un
     geste de l'utilisateur, et cette autorisation s'éteint en quelques
     secondes. En demandant le dossier APRÈS avoir converti l'image, on
     arrivait les mains vides : Chrome refusait, et l'outil annonçait
     « sans accès au dossier » alors que personne n'avait rien refusé.

     Rend ce qui s'est passé, pas un booléen : annuler et échouer ne se
     disent pas de la même façon. */
  async function acces(){
    if(!DF || !DF.dispoDossier()) return {ou:'telechargement'};
    var dir;
    try{ dir = await DF.dossier('img'); }
    catch(e){
      // l'utilisateur a ferme le selecteur : ce n'est pas une panne
      if(e && (e.name === 'AbortError' || /abort/i.test(e.message || '')))
        return {ou:'annule'};
      return {ou:'refuse', pourquoi:(e && (e.name + ' — ' + e.message)) || 'inconnu'};
    }
    try{
      if(!(await DF.permission(dir)))
        return {ou:'refuse', pourquoi:'permission d’écriture non accordée'};
    }catch(e){
      if(e && e.name === 'AbortError') return {ou:'annule'};
      return {ou:'refuse', pourquoi:(e && (e.name + ' — ' + e.message)) || 'inconnu'};
    }
    return {ou:'ok', dossier:dir};
  }

  /* ---------------- écrire le fichier ---------------- */
  async function depose(dir, prete, nomFichier, opts){
    opts = opts || {};
    var deja = await DF.existe(dir, nomFichier);
    if(deja && opts.confirme && !(await opts.confirme(nomFichier))) return {ou:'annule'};
    try{ await DF.deposeFichier(dir, nomFichier, prete.blob); }
    catch(e){
      // la poignee memorisee peut ne plus valoir : dossier deplace, renomme…
      if(DF.oublie) await DF.oublie('img');
      return {ou:'refuse', pourquoi:(e && (e.name + ' — ' + e.message)) || 'inconnu'};
    }
    return {ou: deja ? 'remplace' : 'ajoute'};
  }

  // Sans accès au dossier : on rend le fichier converti, prêt à glisser.
  function telecharge(prete, nomFichier){
    var url = URL.createObjectURL(prete.blob);
    var a = document.createElement('a');
    a.href = url; a.download = nomFichier;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  function ko(n){ return Math.round(n / 1024) + ' Ko'; }

  global.IMPORTIMAGE = {acces:acces, prepare:prepare, depose:depose,
                        telecharge:telecharge, nomDeFichier:nomDeFichier,
                        ko:ko, COTE_MAX:COTE_MAX};
})(typeof window!=='undefined'?window:this);
