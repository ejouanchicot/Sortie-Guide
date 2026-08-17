/* ============================================================
   export-html.js — une strat dans un seul fichier
   ------------------------------------------------------------
   Le guide vit sur GitHub Pages : parfait pour ton linkshell, inutile
   pour le lead d'à côté qui veut juste TA strat. Il lui faut quelque
   chose qu'on envoie sur Discord et qui s'ouvre.

   Ce module produit UN fichier .html autonome :
     · le vrai guide — le même moteur, la même feuille de style, le
       même rendu ; pas un aperçu, pas un PDF ;
     · qui marche hors ligne et depuis un double-clic : polices,
       images et code sont dedans ;
     · et qui est AUSSI le fichier de sauvegarde. La strat y est
       déposée telle quelle, dans un bloc identifiable : le Studio
       sait la relire et la remettre dans ta bibliothèque.

   Un seul fichier fait donc les deux métiers — on partage la lecture
   et on transmet la source du même geste. Personne n'a à se demander
   quelle version il a reçue.

   Ne dépend de rien d'autre que fetch. Expose window.EXPORTHTML.
   ============================================================ */
(function(global){
  "use strict";

  var MARQUE = 'ffxi-strat-studio';   // l'id du bloc de sauvegarde
  var M = global.MINIFIE || null;
  var S = global.SORTIE;              // le socle : seul à savoir où vit une icône
  // Le fichier partagé n'est pas relu, il est exécuté : commentaires et
  // indentation n'y servent à personne. Le contenu, lui, ne bouge pas.
  function compacte(t, quoi){ return M ? M[quoi](t) : t; }

  /* ---------------- lire les morceaux du site ----------------
     Le Studio est servi depuis /tools/, donc tout se demande en
     remontant d'un cran. Chaque fichier n'est lu qu'une fois : la carte
     du rez-de-chaussée et celle du sous-sol partagent des vignettes. */
  function lecteur(base){
    var vu = {};
    function texte(p){
      if(!vu[p]) vu[p] = fetch(base + p).then(function(r){
        if(!r.ok) throw new Error(p + ' — ' + r.status);
        return r.text(); });
      return vu[p];
    }
    function donnees(p){
      if(!vu['@'+p]) vu['@'+p] = fetch(base + p).then(function(r){
        if(!r.ok) throw new Error(p + ' — ' + r.status);
        return r.blob();
      }).then(function(bl){
        // On impose le type d'après l'extension : tous les serveurs ne savent
        // pas nommer le WebP, et un fichier annoncé « octet-stream » n'est
        // plus une image une fois recopié dans la page.
        return enDataURI(bl.type === TYPES[ext(p)] ? bl
                         : new Blob([bl], {type: TYPES[ext(p)] || bl.type}));
      });
      return vu['@'+p];
    }
    return {texte:texte, donnees:donnees};
  }
  function ext(p){ var m = /\.([a-z0-9]+)$/i.exec(p); return m ? m[1].toLowerCase() : ''; }
  var TYPES = {webp:'image/webp', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
               gif:'image/gif', svg:'image/svg+xml', avif:'image/avif', woff2:'font/woff2'};
  function enDataURI(blob){
    return new Promise(function(res, rej){
      var f = new FileReader();
      f.onload = function(){ res(f.result); };
      f.onerror = function(){ rej(f.error); };
      f.readAsDataURL(blob);
    });
  }

  /* ---------------- les données de la strat ----------------
     Le guide lit des constantes ; JSON en est déjà du JavaScript valide,
     et c'est la seule écriture qui ne puisse pas trahir le contenu. La
     mise en forme de data.js sert à Eric quand il relit le fichier —
     ici personne ne relit, on exécute. */
  function bloc(nom, v){ return 'const ' + nom + '=' + JSON.stringify(v) + ';\n'; }
  function donneesJs(s){
    // les étapes redescendent dans leur chapitre : PHASES ne désigne
    // rien en dehors du fichier d'origine
    var chapitres = (s.chapitres || []).map(function(c){
      var o = {}; Object.keys(c).forEach(function(k){
        if(k !== 'phases') o[k] = c[k]; });
      o.phases = c.phases || [];
      return o;
    });
    return bloc('NOM', s.nom || '')
         + bloc('COMPO', s.compo || {})
         + bloc('ROLE', s.role || {})
         + bloc('MOB', s.mob || {})
         + bloc('MOBSCALE', (typeof s.mobScale === 'number') ? s.mobScale : 1)
         + bloc('LBLMARGIN', (typeof s.lblMargin === 'number') ? s.lblMargin : 6)
         + bloc('BUFFS', s.buffs || {})
         + bloc('CARTES', s.cartes || {})
         + bloc('FLOORS', chapitres)
         + bloc('TR', s.tr || {});
  }

  /* ---------------- écrire du JS dans du HTML ----------------
     Un analyseur HTML ferme un <script> au premier « </script » qu'il
     croise, même au milieu d'une chaîne. Une strat qui parle de balises
     casserait donc la page entière. */
  function sur(js){ return String(js).replace(/<\/(script)/gi, '<\\/$1'); }

  /* ---------------- les images ----------------
     Elles sont nommées par des chemins relatifs à la racine, aussi bien
     dans les données (vignettes de mobs, fonds de carte) que dans la
     page. On les remplace toutes par leur contenu. */
  function cheminsImages(textes){
    var vus = {}, out = [];
    textes.forEach(function(t){
      // le sous-dossier compte : depuis le rangement, une vignette vit dans
      // img/mobs/ et un fond dans img/cartes/. Sans lui, le motif ne trouvait
      // plus RIEN et l'export partait avec des images vides.
      var m, re = /img\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:webp|png|jpe?g|svg|gif|avif)/g;
      while((m = re.exec(t))){ if(!vus[m[0]]){ vus[m[0]] = 1; out.push(m[0]); } }
    });
    return out;
  }
  /* Les icônes posées sur la carte comptent parmi les images, mais elles ne
     se laissent pas trouver comme les autres : les cartes retiennent le CODE
     du dessin (« PLD »), pas son chemin. Il faut donc les demander au socle.
     Sans ça, un job ou un repère arrivait chez le groupe en carré de couleur —
     son masque cherchait une image restée sur le site, et le fichier qu'on
     s'échange n'a aucun dossier autour de lui. */
  function codesIcones(cartes){
    var vus = {}, out = [];
    Object.keys(cartes || {}).forEach(function(nom){
      ((cartes[nom] || {}).icones || []).forEach(function(i){
        var c = i && i.ico;
        if(c && !vus[c] && S.icoSrc(c)){ vus[c] = 1; out.push(c); }
      });
    });
    return out;
  }
  /* Poser un bloc juste avant la fermeture du corps de page.
     Deux pièges, tous deux vécus, et une seule parade :
     · `replace` traite son second argument comme un PATRON, même quand le
       premier est une chaîne — « $& » y vaut le texte trouvé, « $' » tout ce
       qui suit. Ce qu'on colle ici étant la strat entière, écrire « 100$& »
       dans une ligne réinjectait « </body> » au milieu du fichier partagé.
       Il gardait sa taille normale, s'annonçait « tout est dedans », et
       n'affichait plus une seule carte ;
     · une strat peut contenir « </body> » dans son texte. On vise donc le
       DERNIER, celui de la page, jamais le premier venu. */
  function avantFinDuCorps(doc, bloc){
    var i = doc.lastIndexOf('</body>');
    return i < 0 ? doc + bloc : doc.slice(0, i) + bloc + doc.slice(i);
  }
  function remplaceTout(txt, table){
    // du plus long au plus court : « img/map.webp » ne doit pas être
    // remplacé à l'intérieur de « img/map-basement.webp »
    Object.keys(table).sort(function(a, b){ return b.length - a.length; })
      .forEach(function(p){ txt = txt.split(p).join(table[p]); });
    return txt;
  }

  /* ---------------- l'assemblage ---------------- */
  async function fabrique(strat, opts){
    opts = opts || {};
    var base = opts.base || '../';
    var L = lecteur(base);
    var dit = opts.avance || function(){};

    dit('Lecture du guide…');
    var html = await L.texte('index.html');
    var css  = await L.texte('css/style.css');
    var poli = await L.texte('css/fonts.css');
    var code = [];
    for(var i = 0; i < FICHIERS_JS.length; i++){
      code.push(await L.texte(FICHIERS_JS[i]));
    }

    dit('Polices…');
    // fonts.css est dans css/, ses url() remontent d'un cran
    var polices = {};
    var mp, rep = /url\(['"]?\.\.\/(fonts\/[A-Za-z0-9._-]+\.woff2)['"]?\)/g;
    while((mp = rep.exec(poli))) polices[mp[1]] = 1;
    var nomsP = Object.keys(polices);
    for(var j = 0; j < nomsP.length; j++) polices[nomsP[j]] = await L.donnees(nomsP[j]);
    poli = poli.replace(rep, function(_, f){ return "url('" + polices[f] + "')"; });

    var data = donneesJs(strat);

    dit('Images…');
    var chemins = cheminsImages([data, html]);
    var images = {}, absentes = [];
    for(var k = 0; k < chemins.length; k++){
      dit('Images… ' + (k + 1) + '/' + chemins.length);
      try{ images[chemins[k]] = await L.donnees(chemins[k]); }
      /* Une vignette manquante ne doit pas faire tomber l'export — un fichier
         partagé vaut mieux qu'un export qui échoue. Mais le SILENCE, lui, ne
         valait rien : on annonçait « tout est dedans » et c'est le destinataire
         qui découvrait les cases vides, sans que personne sache d'où ça venait.
         On les compte, et l'appelant le dit. */
      catch(e){ absentes.push(chemins[k]); }
    }
    // Les icônes ne se remplacent pas dans le texte comme les autres images :
    // la carte retient le CODE du dessin et son chemin naît à l'exécution.
    // On les remet donc au socle, sous leur code.
    var codes = codesIcones(strat.cartes), icones = {};
    for(var q = 0; q < codes.length; q++){
      dit('Icônes… ' + (q + 1) + '/' + codes.length);
      try{ icones[codes[q]] = await L.donnees(S.icoSrc(codes[q])); }
      catch(e){ absentes.push(S.icoSrc(codes[q])); }
    }
    // opts.manquantes plutôt qu'un retour composé : fabrique() rend une chaîne,
    // et un seul appelant existe. Même forme que opts.avance.
    if(absentes.length && opts.manquantes) opts.manquantes(absentes);

    dit('Assemblage…');
    var doc = html
      // les feuilles et le code deviennent le contenu de la page
      .replace(/<link rel="preload"[^>]*>\s*/g, '')
      /* Les feuilles passent par une FONCTION de remplacement, jamais par une
         chaîne : dans une chaîne de remplacement, « $& » vaut le texte trouvé
         et « $' » tout ce qui suit. Une seule de ces séquences quelque part
         dans le CSS suffisait à recoller la page au milieu d'elle-même. */
      .replace(/<link rel="stylesheet" href="css\/fonts\.css">/,
               function(){ return '<style>' + compacte(poli, 'css') + '</style>'; })
      .replace(/<link rel="stylesheet" href="css\/style\.css">/,
               function(){ return '<style>' + compacte(css, 'css') + '</style>'; })
      .replace(/<link rel="icon"[^>]*>\s*/g, '')
      // Le hors-ligne du site n'a pas de sens ici : un fichier qu'on s'échange
      // n'a pas de sw.js à côté de lui, et il est déjà entièrement sur le
      // disque de celui qui l'ouvre.
      .replace(/<script id="sw-guide">[\s\S]*?<\/script>\s*/g, '')
      // l'aperçu social pointe vers le site : un fichier qu'on s'échange
      // n'a pas d'adresse, la balise ne veut plus rien dire
      .replace(/<meta property="og:[^>]*>\s*/g, '')
      .replace(/<meta name="twitter:[^>]*>\s*/g, '')
      // Même raison pour la marque de l'en-tête : sur le site elle ouvre
      // l'atelier, ici le chemin ne mène nulle part. L'image reste — elle est
      // embarquée comme les autres — mais elle cesse d'être une porte.
      .replace(/<a class="bmark"[^>]*>([\s\S]*?)<\/a>/,
               '<span class="bmark">$1</span>');

    /* Les icônes se posent JUSTE APRÈS le socle : c'est lui qui les garde, et
       le moteur du guide, qui vient ensuite, doit déjà les y trouver. */
    var embarque = Object.keys(icones).length
      ? '<script>SORTIE.icoEmbarque(' + sur(JSON.stringify(icones)) + ')</script>' : '';
    var scripts = '<script>' + sur(data) + '</script>'
      + code.map(function(c, i){
          return '<script>' + sur(compacte(c, 'js')) + '</script>' + (i === 0 ? embarque : '');
        }).join('');
    doc = doc.replace(/<script src="js\/[^"]*"><\/script>\s*/g, '');
    doc = avantFinDuCorps(doc, scripts);
    doc = remplaceTout(doc, images);

    // La sauvegarde vient APRÈS le remplacement des images, et c'est capital :
    // elle nomme les mêmes fichiers, et se serait donc vu coller une seconde
    // copie de chaque image — la moitié du poids du fichier. Elle doit garder
    // les CHEMINS de toute façon : le Studio qui la relit a les vraies images,
    // et une strat réimportée n'a rien à faire de 1,3 Mo d'images en doublon.
    doc = avantFinDuCorps(doc, sauvegarde(strat));

    // Le HTML en dernier : les <script> déjà compactés sont mis de côté par
    // le compacteur, qui ne touche jamais à leur contenu.
    return compacte(doc, 'html');
  }
  var FICHIERS_JS = ['js/sortie-map-core.js', 'js/strat-render.js', 'js/app.js'];

  /* ---------------- la moitié « fichier de sauvegarde » ----------------
     Un <script type="application/json"> n'est pas exécuté et n'est pas
     affiché : le lecteur ne le voit jamais, le Studio le retrouve par
     son identifiant. */
  function sauvegarde(s){
    var copie = JSON.parse(JSON.stringify(s));
    copie.format = MARQUE + '/1';
    return '<script type="application/json" id="' + MARQUE + '">\n'
      + sur(JSON.stringify(copie)) + '\n</script>\n';
  }

  // Relire un export. On passe par un analyseur plutôt que par une
  // expression : le bloc contient du HTML échappé, et seul un analyseur
  // le rend exactement comme il a été écrit.
  function extrait(html){
    try{
      var d = new DOMParser().parseFromString(html, 'text/html');
      var el = d.getElementById(MARQUE);
      if(!el) return null;
      var s = JSON.parse(el.textContent);
      return (s && s.chapitres) ? s : null;
    }catch(e){ return null; }
  }

  // Un nom de fichier qu'on retrouve dans un dossier de téléchargements.
  function nomFichier(s){
    var n = String((s && s.nom) || 'strat');
    if(n.normalize) n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // sans accents
    n = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (n || 'strat') + '.html';
  }

  global.EXPORTHTML = {fabrique:fabrique, extrait:extrait,
                       nomFichier:nomFichier, MARQUE:MARQUE};
})(typeof window!=='undefined'?window:this);
