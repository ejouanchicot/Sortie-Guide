/* ============================================================
   export-texte.js — la strat en texte, pour Discord
   ------------------------------------------------------------
   Avant un run, le lead ne demande à personne d'ouvrir un lien : il
   colle le plan dans le salon, étape par étape, au moment où on la
   joue. Un guide, si bien fait soit-il, n'est pas là au bon endroit.

   ── CE QUE DISCORD SAIT FAIRE ────────────────────────────────
   Presque une page. On s'en sert, au lieu de tout mettre en gras :

     # ## ###        trois niveaux de titre (pas de #### chez eux)
     -# …           petit texte gris, sous un titre ou une ligne
     **gras**  *italique*  ***les deux***
     __souligné__   et __**souligné gras**__
     ~~barré~~      ||caché||
     `code`         ```bloc```
     > citation     >>> citation à partir d'ici
     - liste        1. liste numérotée, imbriquées par 2 espaces

   La hiérarchie du guide s'y transpose entière :
     chapitre → #      étape → ##      carte (farm/boss) → ###
     rubrique → __**gras souligné**__  note → -#
     trajet → > citation               action → - liste
     job → `code`                      élément → **gras**

   L'émoji est réservé à ce qui alerte. Le reste se dit avec la mise
   en forme : une consigne qui crie en émojis ne se lit plus.

   ── LES 2000 CARACTÈRES ──────────────────────────────────────
   Sans Nitro, un message fait 2000 caractères MISE EN FORME
   COMPRISE : les ` autour d'un job, les ** d'un titre, les codes de
   couleur d'un bloc ANSI et le compteur de fin comptent tous.

   Et on ne coupe pas n'importe où. Le texte n'est pas produit comme
   une chaîne qu'on redécouperait ensuite : il est décrit en SECTIONS
   (un titre, ses lignes), et c'est sur cette structure que la coupe
   se fait :
     1. entre deux sections — jamais dans une catégorie ;
     2. si une section est trop longue à elle seule, on la coupe
        entre deux de ses lignes ET ON REPREND SON TITRE, suivi de
        « (suite) » ;
     3. une ligne à elle seule trop longue est coupée à une
        respiration du texte — jamais au milieu d'un mot.

   ── DEUX MISES EN FORME ──────────────────────────────────────
   « Titres » se sert du balisage ci-dessus : c'est la plus lisible,
   elle marche partout. « Couleurs » enferme tout dans un bloc ANSI,
   le seul endroit où Discord accepte de la couleur : on y retrouve
   le rôle de chaque job comme dans le guide, au prix des titres et
   des listes, qui ne se mettent pas en forme dans un bloc de code.

   Ne dépend que de window.SORTIE. Expose window.EXPORTTEXTE.
   ============================================================ */
(function(global){
  "use strict";
  var S = global.SORTIE;
  var PLAFOND = 2000, COMPTEUR = 14;   // « \n-# 12/12 » au pire

  /* ============================================================
     1 · LA STRAT EN SECTIONS  (aucune mise en forme ici)
     ============================================================ */

  function exclu(o, j){
    return !!(o.variante && o.compo && S && S.jobExclu && j !== 'ALL'
              && S.jobExclu(o.compo, o.variante, j));
  }
  // Une ligne réservée à une autre façon de jouer n'a rien à faire dans le
  // message : on ne peut pas la barrer, et personne ne saura qu'elle ne le
  // concerne pas. Ça vaut pour la marque explicite (@PLD) COMME pour le job.
  function garde(l, o){
    if(!l) return false;
    if(l.comp && o.variante && l.comp !== o.variante) return false;
    var r = l.r || ['ALL'];
    if(!r.some(function(j){ return !exclu(o, j); })) return false;
    if(o.job && r.indexOf(o.job) < 0 && r.indexOf('ALL') < 0) return false;
    return true;
  }
  /* Discord n'a pas de couleur. Les marques « [c:or]…[/c] » posées dans une
     ligne y resteraient telles quelles, en plein milieu d'une consigne : on
     garde le texte, on jette la teinte. */
  function T(o, s){
    var t = (o.tr ? o.tr(s) : s) || '';
    return (global.STRATR && global.STRATR.sansMarques) ? global.STRATR.sansMarques(t) : t;
  }

  function action(l, o){
    var jobs = (l.r || ['ALL']).filter(function(j){ return !exclu(o, j); });
    var actions = Array.isArray(l.t) ? l.t.slice() : [l.t];
    return {jobs: jobs.length ? jobs : ['ALL'], warn: !!l.warn,
            actions: actions.map(function(a){ return T(o, a); }),
            cond: l.cond ? T(o, l.cond) : ''};
  }

  // L'intro d'un chapitre est écrite en HTML — c'est du contenu, pas du
  // balisage de page : on le retrouve, traduit dans les signes de Discord.
  function depuisHtml(h){
    return String(h || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*/gi, '\n')
      .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '*$2*')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
  }

  function sectionsCarte(c, o){
    var out = [];
    (c.groups || []).forEach(function(g){
      var lignes = (g.lines || []).filter(function(l){ return garde(l, o); });
      if(!lignes.length) return;
      out.push({kind:'bloc', titre:T(o, g.label), note:g.note ? T(o, g.note) : '',
                entrees: lignes.map(function(l){ return action(l, o); }),
                proc: /\bproc\b/.test(g.cls || '')});
    });
    if(!out.length) return out;
    // l'en-tête de la carte se colle à son premier bloc : seul, en bas d'un
    // message, il annoncerait quelque chose qui n'y est pas
    out[0].tete = {quoi: (c.kind === 'boss') ? 'BOSS' : (c.klabel || 'FARM'),
                   nom: T(o, c.name), tag: c.tag ? T(o, c.tag) : ''};
    return out;
  }

  function etape(p, o, jeux){
    o = o || {};
    var sous = [];
    if(p.title && p.title !== p.boss) sous.push({quoi:'titre', txt:T(o, p.title)});
    if(p.route) sous.push({quoi:'trajet', txt:T(o, p.route)});
    var out = [{kind:'etape', n:p.n, titre:T(o, p.boss || p.title || 'Étape'),
                sous:sous, entrees:[]}];

    // La préparation a des rubriques comme n'importe quel bloc. Son NOM titre
    // le premier morceau ; les rubriques qu'on y a écrites titrent les suivants.
    var jeu = p.buffs && jeux && jeux[p.buffs], prem = true;
    S.groupesBuffs(jeu).forEach(function(g){
      var bl = (g.lines || []).filter(function(l){ return garde(l, o); });
      if(!bl.length) return;
      out.push({kind:'bloc',
        titre: prem ? T(o, p.buffs) + (g.label ? ' · ' + T(o, g.label) : '') : T(o, g.label),
        note: g.note ? T(o, g.note) : '',
        entrees: bl.map(function(l){ return action(l, o); }),
        proc: /\bproc\b/.test(g.cls || '')});
      prem = false;
    });
    (p.cards || []).forEach(function(c){ out = out.concat(sectionsCarte(c, o)); });
    return out;
  }
  function chapitre(f, o, jeux){
    o = o || {};
    var intro = depuisHtml((o.lang === 'en') ? f.introEn : f.introFr);
    var out = [{kind:'chapitre', titre:T(o, f.fr || f.en || 'Chapitre'),
                sous: intro.map(function(x){ return {quoi:'intro', txt:x}; }),
                entrees:[]}];
    (f.phases || []).forEach(function(p){ out = out.concat(etape(p, o, jeux)); });
    return out;
  }
  function strat(chapitres, o, jeux){
    var out = [];
    (chapitres || []).forEach(function(f){ out = out.concat(chapitre(f, o, jeux)); });
    return out;
  }

  /* ============================================================
     2 · MISE EN FORME « TITRES »  (le balisage de Discord)
     ============================================================ */

  // Le guide colore les éléments ; sans couleur, on les met en gras — c'est
  // ce qui décide d'un skillchain, ça doit sauter aux yeux.
  // La même liste que le guide (strat-render.js) : sans les formes anglaises
  // capitalisées, « Degei est Fire / Wind / Thunder » passait sans relief.
  var ELEMENTS = new RegExp('\\b(' + [
    'WATER|Water|Eau', 'THUNDER|Thunder|Foudre', 'FIRE|Fire|Feu', 'WIND|Wind|Vent',
    'EARTH|Earth|Terre', 'ICE|Ice|Glace', 'LIGHT|Light|Lumière',
    'DARKNESS|Darkness|Dark|Ténèbres'
  ].join('|') + ')\\b', 'g');
  function relief(s){ return String(s || '').replace(ELEMENTS, '**$1**'); }
  function job(j){ return '`' + j + '`'; }

  var MD = {
    titre: function(s){
      if(s.kind === 'chapitre') return '# ' + s.titre;
      if(s.kind === 'etape')    return '## ' + (s.n ? s.n + ' · ' : '') + s.titre;
      // une rubrique n'est pas un titre de page : souligné gras, un cran
      // sous les trois niveaux de titre, qui restent à la structure du run
      return '__**' + s.titre + '**__';
    },
    // ce qui doit précéder le titre et rester collé à lui
    avant: function(s){
      if(!s.tete) return '';
      var t = s.tete;
      var l = ['### ' + (t.nom.toUpperCase().indexOf(t.quoi) === 0
                         ? t.nom : t.quoi + ' · ' + t.nom)];
      if(t.tag) l.push('-# ' + relief(t.tag));
      return l.join('\n');
    },
    sous: function(x){
      // le sous-titre d'une étape est une légende, pas un titre de carte :
      // en petit texte, il laisse ### aux cartes qui suivent
      if(x.quoi === 'titre')  return '-# ' + relief(x.txt);
      if(x.quoi === 'trajet') return '> ' + relief(x.txt);
      return '> ' + x.txt;                       // l'intro d'un chapitre
    },
    note: function(n){ return '-# ' + relief(n); },
    entree: function(e, s){
      var t = '- ' + (e.warn ? '⚠️ ' : '') + e.jobs.map(job).join(' ');
      // dans une liste de procs, « coup → élément » : le coup en code, la
      // parade en gras ; on lit la colonne de gauche d'un coup d'œil
      var un = e.actions[0];
      if(s && s.proc && /→/.test(un)){
        var m = un.split('→');
        t += ' `' + m[0].trim() + '` → **' + m[1].trim() + '**';
      } else {
        t += ' ' + (e.warn ? '**' + relief(un) + '**' : relief(un));
      }
      if(e.cond) t += ' *(' + e.cond + ')*';
      return [t].concat(e.actions.slice(1).map(function(a){
        return '  - ' + relief(a); })).join('\n');
    },
    enrobe: function(t){ return t; }
  };

  /* ============================================================
     3 · MISE EN FORME « COULEURS »  (bloc ANSI)
     ------------------------------------------------------------
     Le seul endroit où Discord accepte de la couleur. On y retrouve le rôle
     de chaque job, comme dans le guide. En échange, rien ne se met en forme
     dans un bloc de code : ni titre, ni liste, ni gras. On les remplace par
     des majuscules, des filets et de l'indentation.
     (iPhone n'affiche pas encore les couleurs : le texte y reste lisible,
     simplement en noir et blanc.)
     ============================================================ */
  // ESC [ style ; couleur m … ESC [ 0 m — la seule sequence que Discord
  // accepte. Elle coute une dizaine de caracteres par bout de texte, et ces
  // caracteres comptent dans les 2000 : le decoupage les voit, puisqu'il
  // mesure le texte deja mis en forme.
  var ESC = '\u001b';
  var A = function(c, t){ return ESC + '[' + c + 'm' + t + ESC + '[0m'; };
  var TEINTE = {tank:'1;34', heal:'1;32', buff:'1;35', dd:'1;31', all:'1;37'};
  function teinteJob(j){
    var R = (typeof ROLE !== 'undefined') ? ROLE : {};
    var r = (S && S.roleDuJob) ? S.roleDuJob(R, j) : 'all';
    return TEINTE[r] || TEINTE.all;
  }
  var ANSI = {
    titre: function(s){
      if(s.kind === 'chapitre') return A('1;36', '━━━ ' + s.titre.toUpperCase() + ' ━━━');
      if(s.kind === 'etape')    return A('1;36', '▌ ' + (s.n ? s.n + ' · ' : '') + s.titre);
      return A('1;37', s.titre);
    },
    avant: function(s){
      if(!s.tete) return '';
      var t = s.tete;
      var l = [A('1;33', (t.nom.toUpperCase().indexOf(t.quoi) === 0
                          ? t.nom : t.quoi + ' · ' + t.nom))];
      if(t.tag) l.push(A('0;30', '  ' + t.tag));
      return l.join('\n');
    },
    sous: function(x){
      if(x.quoi === 'titre')  return A('0;37', x.txt);
      return A('0;30', '  ' + x.txt);
    },
    note: function(n){ return A('0;30', '  ' + n); },
    entree: function(e){
      var badges = e.jobs.map(function(j){ return A(teinteJob(j), j); }).join(' ');
      var t = '  ' + (e.warn ? A('1;33', '! ') : '') + badges + '  ' + e.actions[0];
      if(e.cond) t += A('0;30', '  (' + e.cond + ')');
      return [t].concat(e.actions.slice(1).map(function(a){
        return '      · ' + a; })).join('\n');
    },
    // chaque message porte son propre bloc : Discord ne recolle pas deux
    // messages, une clôture manquante laisserait tout le reste en code
    enrobe: function(t){ return '```ansi\n' + t + '\n```'; },
    reserve: 12
  };

  var STYLES = {titres: MD, couleurs: ANSI};

  /* ---- une section, rendue ---- */
  function rend(s, F, suite){
    var t = F.titre(s) + (suite ? ' *(suite)*' : '');
    if(F === ANSI && suite) t = F.titre(s) + A('0;30', ' (suite)');
    var haut = [suite ? '' : F.avant(s), t].filter(Boolean).join('\n\n');
    var corps = (s.sous || []).map(F.sous)
      .concat(s.note ? [F.note(s.note)] : [])
      .concat((s.entrees || []).map(function(e){ return F.entree(e, s); }));
    return [haut].concat(corps).filter(Boolean).join('\n');
  }

  /* ============================================================
     4 · COUPER
     ============================================================ */

  // Dernier recours : couper une ligne à une respiration du texte, dans
  // l'ordre où on l'entendrait à l'oral ; jamais au milieu d'un mot.
  var RESPIRE = [' · ', '. ', ' — ', ' : ', ', ', ' '];
  function coupeLigne(txt, limite){
    var out = [];
    if(limite < 40) limite = 40;
    while(txt.length > limite){
      var pos = -1;
      for(var i = 0; i < RESPIRE.length && pos < 0; i++){
        pos = txt.lastIndexOf(RESPIRE[i], limite);
        if(pos < limite * 0.5) pos = -1;
        else pos += RESPIRE[i].length;
      }
      if(pos < 0) pos = limite;
      out.push(txt.slice(0, pos).replace(/\s+$/, ''));
      txt = txt.slice(pos);
    }
    if(txt) out.push(txt);
    return out;
  }

  // Combien de caracteres ce texte coutera-t-il ?
  // Le presse-papier de Windows rend chaque saut de ligne sur DEUX caracteres.
  // Un champ de saisie les ramene normalement a un seul — mais le savoir
  // demanderait de parier sur la facon dont Discord compte, et se tromper
  // ferait refuser le collage. On compte donc le cas defavorable : ainsi la
  // limite tient quelle que soit la reponse. Ca coute quelques lignes par
  // message, jamais un message de plus sur une strat de taille normale.
  function pese(t){ return t.length + (t.split('\n').length - 1); }

  function messages(sections, opts){
    opts = opts || {};
    var F = STYLES[opts.style] || MD;
    var limite = (opts.plafond || PLAFOND) - COMPTEUR - (F.reserve || 0);
    var out = [], cour = '';
    function pousse(){ if(cour.trim()) out.push(cour.trim()); cour = ''; }
    function ajoute(t){
      if(!t) return;
      if(cour && pese(cour + '\n\n' + t) > limite) pousse();
      cour = cour ? (cour + '\n\n' + t) : t;
    }
    (sections || []).forEach(function(s){
      var entier = rend(s, F, false);
      if(pese(entier) <= limite){ ajoute(entier); return; }

      var suite = false, lot = [], premier = true;
      var tete = function(){
        var vide = {kind:s.kind, n:s.n, titre:s.titre, tete: suite ? null : s.tete};
        return rend(vide, F, suite);
      };
      // s'il ne reste presque rien, on ferme : mieux vaut repartir au propre
      if(cour && limite - pese(cour) - 4 - pese(tete()) < 240) pousse();
      function place(){
        var deja = (premier && cour) ? pese(cour) + 4 : 0;
        return limite - deja - pese(tete()) - 2;
      }
      function sers(){
        if(!lot.length) return;
        var t = [tete()].concat(lot).join('\n');
        if(premier){ ajoute(t); pousse(); } else out.push(t);
        premier = false; lot = []; suite = true;
      }
      var lignes = (s.sous || []).map(F.sous)
        .concat(s.note ? [F.note(s.note)] : [])
        .concat((s.entrees || []).map(function(e){ return F.entree(e, s); }));
      lignes.forEach(function(e){
        var pris = lot.reduce(function(n, x){ return n + pese(x) + 2; }, 0);
        if(pese(e) > place() - pris && lot.length) sers();
        if(pese(e) > place()){
          coupeLigne(e, place()).forEach(function(bout){ lot = [bout]; sers(); });
          return;
        }
        lot.push(e);
      });
      sers();
    });
    pousse();

    out = out.map(function(t){ return F.enrobe(t); });
    if(out.length < 2) return out;
    // un compteur, HORS du bloc : dedans il s'afficherait tel quel
    return out.map(function(t, i){
      return t + '\n-# ' + (i + 1) + '/' + out.length; });
  }

  // Le texte d'un seul tenant — pour relire, ou pour un salon sans limite.
  function texte(sections, opts){
    var F = STYLES[(opts || {}).style] || MD;
    var t = (sections || []).map(function(s){ return rend(s, F, false); }).join('\n\n');
    return F.enrobe(t);
  }

  global.EXPORTTEXTE = {etape:etape, chapitre:chapitre, strat:strat,
                        messages:messages, texte:texte, pese:pese,
                        STYLES:['titres', 'couleurs'], PLAFOND:PLAFOND};
})(typeof window!=='undefined'?window:this);
