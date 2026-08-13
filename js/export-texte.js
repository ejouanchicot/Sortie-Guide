/* ============================================================
   export-texte.js — la strat en texte, pour Discord
   ------------------------------------------------------------
   Avant un run, le lead ne demande à personne d'ouvrir un lien : il
   colle le plan dans le salon, étape par étape, au moment où on la
   joue. Un guide, si bien fait soit-il, n'est pas là au bon endroit.

   Ce module rend la strat en Markdown Discord : gras, listes,
   citations, et le nom des jobs en `code` — la seule mise en forme
   qui les fasse ressortir sans couleur.

   ── LES 2000 CARACTÈRES ──────────────────────────────────────
   Sans Nitro, un message fait 2000 caractères MISE EN FORME
   COMPRISE : les ` autour d'un job, les ** d'un titre et le
   compteur de fin comptent. On taille donc à 2000 moins la place
   du compteur, jamais à 2000.

   Et on ne coupe pas n'importe où. Le texte n'est pas produit comme
   une chaîne qu'on redécouperait ensuite — il est produit en
   SECTIONS (un titre, ses lignes), et c'est sur cette structure que
   la coupe se fait :

     1. entre deux sections — jamais dans une catégorie ;
     2. si une section est trop longue à elle seule, on la coupe
        entre deux de ses lignes ET ON REPREND SON TITRE, suivi de
        « (suite) » : le lecteur sait toujours de quel bloc il lit
        la suite ;
     3. une ligne à elle seule trop longue est coupée à une
        respiration du texte (« · », un point, un tiret) — jamais
        au milieu d'un mot.

   Une action et ses sous-actions restent ensemble : elles forment
   une seule entrée, indivisible.

   On écrit pour UNE façon de jouer : mêler les lignes du PLD et
   celles du DNC dans un même message donne des consignes qui se
   contredisent, et le lecteur n'a pas de bouton pour filtrer.

   Ne dépend que de window.SORTIE. Expose window.EXPORTTEXTE.
   ============================================================ */
(function(global){
  "use strict";
  var S = global.SORTIE;
  var PLAFOND = 2000, COMPTEUR = 14;   // « \n-# 12/12 » au pire
  var LIMITE = PLAFOND - COMPTEUR;

  /* ---------------- ce qu'on garde ----------------
     Une ligne réservée à une autre façon de jouer n'a rien à faire dans le
     message : on ne peut pas la barrer, et personne ne saura qu'elle ne le
     concerne pas. Ça vaut pour la marque explicite (@PLD) COMME pour le job
     lui-même — sous la comp PLD, une consigne au DNC n'a pas de destinataire. */
  function exclu(o, j){
    return !!(o.variante && o.compo && S && S.jobExclu && j !== 'ALL'
              && S.jobExclu(o.compo, o.variante, j));
  }
  function garde(l, o){
    if(!l) return false;
    if(l.comp && o.variante && l.comp !== o.variante) return false;
    var r = l.r || ['ALL'];
    if(!r.some(function(j){ return !exclu(o, j); })) return false;
    if(o.job && r.indexOf(o.job) < 0 && r.indexOf('ALL') < 0) return false;
    return true;
  }
  function T(o, s){ return (o.tr ? o.tr(s) : s) || ''; }

  /* ---------------- une entrée ----------------
     Le badge de rôle devient du `code` : c'est ce que Discord a de plus proche
     d'une pastille, et ça survit au copier-coller. Une action et ses
     sous-actions ne font qu'une entrée — les séparer perdrait le badge. */
  function entree(l, o){
    var jobs = (l.r || ['ALL']).filter(function(j){ return !exclu(o, j); });
    var r = (jobs.length ? jobs : ['ALL']).map(function(j){ return '`' + j + '`'; }).join(' ');
    var actions = Array.isArray(l.t) ? l.t.slice() : [l.t];
    var tete = '- ' + (l.warn ? '⚠️ ' : '') + r + ' ' + T(o, actions[0]);
    if(l.cond) tete += ' *(' + T(o, l.cond) + ')*';
    return [tete].concat(actions.slice(1).map(function(a){
      return '  - ' + T(o, a); })).join('\n');
  }

  // avant : ce qui doit rester collé au titre (l'en-tête d'une carte devant
  // son premier bloc) ; titre : ce qu'on répète si la section est coupée.
  function section(avant, titre, entrees){
    return {avant: avant || '', titre: titre || '', entrees: entrees || []};
  }
  function rend(s, suite){
    var t = s.titre + (suite && s.titre ? ' *(suite)*' : '');
    var haut = [s.avant, t].filter(Boolean).join('\n\n');
    return [haut].concat(s.entrees).filter(Boolean).join('\n');
  }

  /* ---------------- la strat en sections ---------------- */
  function sectionsCarte(c, o){
    var out = [];
    (c.groups || []).forEach(function(g){
      var lignes = (g.lines || []).filter(function(l){ return garde(l, o); });
      if(!lignes.length) return;
      var titre = '**' + T(o, g.label) + '**';
      if(g.note) titre += '\n-# ' + T(o, g.note);   // -# = petit texte, chez Discord
      out.push(section('', titre, lignes.map(function(l){ return entree(l, o); })));
    });
    if(!out.length) return out;
    // l'en-tête de la carte se colle à son premier bloc : seul, en bas d'un
    // message, il annoncerait quelque chose qui n'y est pas
    var quoi = (c.kind === 'boss') ? 'BOSS' : (c.klabel || 'FARM');
    var nom = T(o, c.name);
    var tete = '### ' + (nom.toUpperCase().indexOf(quoi) === 0 ? nom : quoi + ' · ' + nom);
    if(c.tag) tete += '\n' + T(o, c.tag);
    out[0].avant = tete;
    return out;
  }

  function etape(p, o, jeux){
    o = o || {};
    var out = [];
    var hautes = [];
    if(p.title && p.title !== p.boss) hautes.push('**' + T(o, p.title) + '**');
    if(p.route) hautes.push('> ' + T(o, p.route));
    out.push(section('', '## ' + (p.n ? p.n + ' · ' : '')
      + T(o, p.boss || p.title || 'Étape'), hautes));

    var jeu = p.buffs && jeux && jeux[p.buffs];
    if(jeu){
      var bl = jeu.filter(function(l){ return garde(l, o); });
      if(bl.length) out.push(section('', '**' + T(o, p.buffs) + '**',
        bl.map(function(l){ return entree(l, o); })));
    }
    (p.cards || []).forEach(function(c){
      out = out.concat(sectionsCarte(c, o)); });
    return out;
  }
  function chapitre(f, o, jeux){
    o = o || {};
    var out = [section('', '# ' + T(o, f.fr || f.en || 'Chapitre'), [])];
    (f.phases || []).forEach(function(p){ out = out.concat(etape(p, o, jeux)); });
    return out;
  }
  function strat(chapitres, o, jeux){
    var out = [];
    (chapitres || []).forEach(function(f){ out = out.concat(chapitre(f, o, jeux)); });
    return out;
  }

  /* ---------------- couper une ligne trop longue ----------------
     Dernier recours. On coupe à une respiration du texte, dans l'ordre où on
     l'entendrait à l'oral ; jamais au milieu d'un mot. */
  var RESPIRE = [' · ', '. ', ' — ', ' : ', ', ', ' '];
  function coupeLigne(txt, limite){
    var out = [];
    while(txt.length > limite){
      var pos = -1;
      for(var i = 0; i < RESPIRE.length && pos < 0; i++){
        pos = txt.lastIndexOf(RESPIRE[i], limite);
        if(pos < limite * 0.5) pos = -1;         // trop tôt : ça ferait des miettes
        else pos += RESPIRE[i].length;
      }
      if(pos < 0) pos = limite;                  // mot unique interminable
      out.push(txt.slice(0, pos).replace(/\s+$/, ''));
      txt = txt.slice(pos);
    }
    if(txt) out.push(txt);
    return out;
  }

  /* ---------------- les messages ----------------
     On remplit tant que ça rentre, on coupe aux frontières. Une section trop
     longue à elle seule est coupée entre deux de ses entrées, et son titre est
     repris : on ne perd jamais de vue dans quel bloc on est. */
  function messages(sections, limite){
    limite = limite || LIMITE;
    var out = [], cour = '';
    function pousse(){ if(cour.trim()) out.push(cour.trim()); cour = ''; }
    function ajoute(t){
      if(!t) return;
      if(cour && (cour + '\n\n' + t).length > limite) pousse();
      cour = cour ? (cour + '\n\n' + t) : t;
    }
    (sections || []).forEach(function(s){
      var entier = rend(s, false);
      if(entier.length <= limite){ ajoute(entier); return; }

      // trop longue : on la sert par morceaux, titre repris à chaque fois.
      // Le premier morceau tient compte de ce qui attend déjà dans le message
      // en cours — sinon un simple titre d'étape partirait seul, et un message
      // qui ne contient qu'un titre n'apprend rien à personne.
      var suite = false, lot = [], premier = true;
      var tete = function(){ return rend({avant: suite ? '' : s.avant,
                                          titre: s.titre, entrees: []}, suite); };
      // s'il ne reste presque rien, on ferme : mieux vaut repartir au propre
      if(cour && limite - cour.length - 2 - rend(s, false).split('\n')[0].length < 240) pousse();
      function place(){
        var deja = (premier && cour) ? cour.length + 2 : 0;
        return limite - deja - tete().length - 1;
      }
      function sers(){
        if(!lot.length) return;
        var t = [tete()].concat(lot).join('\n');
        if(premier){ ajoute(t); pousse(); } else out.push(t);
        premier = false; lot = []; suite = true;
      }
      s.entrees.forEach(function(e){
        var pris = lot.reduce(function(n, x){ return n + x.length + 1; }, 0);
        if(e.length > place() - pris && lot.length) sers();
        if(e.length > place()){                  // une seule entrée déborde
          coupeLigne(e, place()).forEach(function(bout){ lot = [bout]; sers(); });
          return;
        }
        lot.push(e);
      });
      sers();
    });
    pousse();

    if(out.length < 2) return out;
    // un compteur : on les envoie dans l'ordre, et le lecteur le voit
    return out.map(function(t, i){
      return t + '\n-# ' + (i + 1) + '/' + out.length; });
  }

  // Le texte d'un seul tenant — pour relire, ou pour un salon sans limite.
  function texte(sections){
    return (sections || []).map(function(s){ return rend(s, false); }).join('\n\n');
  }

  global.EXPORTTEXTE = {etape:etape, chapitre:chapitre, strat:strat,
                        messages:messages, texte:texte,
                        LIMITE:LIMITE, PLAFOND:PLAFOND};
})(typeof window!=='undefined'?window:this);
