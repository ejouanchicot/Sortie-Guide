/* ============================================================
   strat-core.js — SOCLE DE LA STRAT (texte <-> données <-> data.js)
   ------------------------------------------------------------
   Fonctions PURES, sans DOM : la syntaxe courte des lignes de strat,
   et la sérialisation des blocs PHASES / BUFFS_* / TR.

   Chargé par tools/strat-studio.html. PAS par le guide : celui-ci n'a
   besoin que de lire les données, pas de les réécrire.

   Dépend de window.SORTIE (escJs, esc). Expose window.STRATCORE.

   ── SYNTAXE D'UNE LIGNE ──────────────────────────────────────
     PLD  kite le boss
     PLD! sous 30 yalm : build l'aggro          ! = avertissement (ambre)
     COR,BRD  spam Savage Blade                 rôles séparés par des virgules
     DNC@DNC  Chocobo Jig                       @COMP = réservé à une comp
     BRD  Honor March  ?set anti-slow           ?… = condition (DEUX espaces devant)
     COR  Chaos Roll
     -    Samurai Roll                          - = action de plus sur la MÊME ligne

   Une ligne « - » se rattache à la précédente : c'est ce qui produit un
   seul badge de rôle suivi d'une liste à puces dans le guide.
   ============================================================ */
(function(global){
  "use strict";
  var S = global.SORTIE;
  // Guillemets doubles, comme data.js et i18n.js les écrivent déjà à la main.
  // Les apostrophes sont partout dans le contenu (« Bolter's », « qu'on ») : en
  // guillemets simples il fallait toutes les échapper, et chaque enregistrement
  // réécrivait des lignes identiques au contenu près — un git diff illisible.
  // JSON.stringify échappe " \ et les sauts de ligne, et laisse les accents et
  // le « · » tels quels : exactement la forme déjà en place dans les fichiers.
  var q = function(v){ return JSON.stringify(String(v==null?'':v).replace(/\r/g,'')); };

  /* ---------------- TEXTE -> LIGNES ---------------- */
  // Un code de rôle : 2 à 4 majuscules (MNK, BRD, PLD, ALL…). La liste s'arrête
  // au premier caractère qui n'est ni une majuscule ni une virgule.
  var RE_LIGNE = /^([A-Z]{2,4}(?:\s*,\s*[A-Z]{2,4})*)(!?)(?:@([A-Za-z]+))?\s+([\s\S]*)$/;
  var RE_SUITE = /^\s*-\s+(.*)$/;

  function parseLines(txt){
    var out = [];
    String(txt==null?'':txt).split('\n').forEach(function(brut){
      var ligne = brut.replace(/\s+$/,'');
      if(!ligne.trim()) return;

      // action supplémentaire rattachée à la ligne précédente
      var suite = ligne.match(RE_SUITE);
      if(suite){
        if(!out.length) return;                       // « - » orphelin : ignoré
        var prec = out[out.length-1], sup = decoupeCond(suite[1]);
        if(!Array.isArray(prec.t)) prec.t = [prec.t];
        prec.t.push(sup.texte);
        if(sup.cond && !prec.cond) prec.cond = sup.cond;
        return;
      }

      var m = ligne.match(RE_LIGNE);
      if(!m){                                          // pas de rôle écrit : on suppose ALL
        var seul = decoupeCond(ligne.trim());
        var l0 = {r:['ALL'], t:seul.texte};
        if(seul.cond) l0.cond = seul.cond;
        out.push(l0);
        return;
      }
      var reste = decoupeCond(m[4].trim());
      var l = {r: m[1].split(',').map(function(x){return x.trim();}).filter(Boolean), t: reste.texte};
      if(reste.cond) l.cond = reste.cond;
      if(m[2]) l.warn = 1;
      if(m[3]) l.comp = m[3].toUpperCase();
      out.push(l);
    });
    return out;
  }
  // « texte  ?condition » — le marqueur exige DEUX espaces avant le « ? ». Avec un seul,
  // « on proc ? oui mais pas sous 20% » se faisait couper en deux au milieu de la phrase.
  var RE_COND = /^([\s\S]*?)\s{2,}\?\s*([^?]*)$/;
  function decoupeCond(s){
    var m = s.match(RE_COND);
    if(!m) return {texte:s, cond:null};
    return {texte: m[1].replace(/\s+$/,''), cond: m[2].trim()};
  }

  /* ---------------- LIGNES -> TEXTE ---------------- */
  function linesToText(lines){
    return (lines||[]).map(function(l){
      var tete = (l.r||['ALL']).join(',') + (l.warn?'!':'') + (l.comp?'@'+l.comp:'');
      var actions = Array.isArray(l.t) ? l.t.slice() : [l.t];
      var premiere = tete + '  ' + actions[0] + (l.cond?'  ?'+l.cond:'');
      var suite = actions.slice(1).map(function(a){ return '-  ' + a; });
      return [premiere].concat(suite).join('\n');
    }).join('\n');
  }

  var THEMES = {'':'neutre', tank:'tank', buff:'buffs', dd:'dégâts', heal:'soin',
                rules:'règles', 'rules proc':'procs', mb:'magic burst'};
  var THEME_INV = (function(){ var o={}; for(var k in THEMES) o[THEMES[k]] = k; return o; })();

  /* ---------------- les BOÎTES ----------------
     Une rubrique tire sa couleur de son titre : écrire « PLD » en tête colore
     le bloc en bleu tank. Mais le titre s'affiche AUSSI — et la ligne juste en
     dessous porte déjà son badge PLD. On lisait donc « PLD » deux fois :

         PLD                 au lieu de     TANKBOX
         PLD : tank sur place                PLD : tank sur place

     Un mot en BOÎTE ne fait que la couleur. Il ne s'écrit nulle part à
     l'écran : seul le badge de la ligne reste. Le mot occupe la ligne
     entière — « TANKBOX du camp » reste un titre ordinaire. */
  var BOITES = {TANKBOX:'tank', HEALERBOX:'heal', HEALBOX:'heal', SOINBOX:'heal',
                BUFFBOX:'buff', DDBOX:'dd', MBBOX:'mb',
                REGLEBOX:'rules', RULEBOX:'rules', RULESBOX:'rules',
                PROCBOX:'rules proc', PROCSBOX:'rules proc'};
  // Ce qu'on RÉÉCRIT pour chaque couleur — un seul mot par couleur, les autres
  // restent acceptés à la lecture.
  var BOITE_INV = {tank:'TANKBOX', heal:'HEALERBOX', buff:'BUFFBOX', dd:'DDBOX',
                   mb:'MBBOX', rules:'REGLEBOX', 'rules proc':'PROCBOX'};

  /* ---------------- UN BLOC <-> UN TEXTE, SANS SYNTAXE ----------------
     On écrit comme on le dirait à quelqu'un :

         Règle
         ALL : NE PAS fermer de SC Light si Degei est Fire
         ALL : 1 proc suffit en général

         PLD
         PLD : +30 yalm = safe
         PLD : sous 30 yalm, build l'aggro

     Une ligne qui COMMENCE par un ou plusieurs jobs est une action ; toute
     autre ligne est un titre de rubrique. Le séparateur peut être « : »,
     « — », « - » ou simplement deux espaces.

     Le thème d'une rubrique (sa couleur) est DEVINÉ depuis son titre — « PLD »
     donne tank, « Buffs · COR » donne buffs, « Règle » donne règles. Il n'est
     écrit entre crochets que lorsque la devinette tomberait à côté, pour ne
     jamais modifier en silence une rubrique existante.

     Plusieurs actions d'affilée pour un même job : on INDENTE les suivantes.

         COR : Chaos Roll
               Samurai Roll

     Ce qui se lit comme une liste, et se rend comme une liste a puces.
     ------------------------------------------------------------------ */
  var JOBS_CONNUS = ['MNK','BRD','COR','GEO','RDM','PLD','DNC','WHM','WAR','RUN','SAM','NIN','THF','DRK','BLM','SMN','BLU','PUP','DRG','BST','RNG','SCH','GEO','ALL'];
  function estJob(t){ return JOBS_CONNUS.indexOf(t) >= 0; }
  // « PLD, COR : texte » · « PLD — texte » · « PLD  texte »
  var RE_NAT = /^([A-Za-z]{2,4}(?:\s*[,\/+]\s*[A-Za-z]{2,4})*)(!?)(?:\s*@\s*([A-Za-z]+))?\s*(?::|—|–|\s-\s|\s\s)\s*(.+)$/;

  function ligneNaturelle(l){
    var m = l.match(RE_NAT);
    if(!m) return null;
    var jobs = m[1].split(/[,\/+]/).map(function(x){ return x.trim().toUpperCase(); });
    if(!jobs.length || !jobs.every(estJob)) return null;
    return {jobs:jobs, warn:!!m[2], comp:m[3]?m[3].toUpperCase():null, reste:m[4].trim()};
  }
  // Une rubrique titrée d'un job prend la couleur de ce job. On lit la table
  // ROLE de data.js plutôt qu'une liste écrite ici : ajouter un job à FFXI
  // (ou changer le rôle d'un job) suffit, sans toucher au moteur.
  // `typeof ROLE` et pas `global.ROLE` : data.js déclare `const ROLE`, et un
  // const de premier niveau n'atterrit PAS sur window — il vit dans la portée
  // de script, visible par identifiant seulement.
  function roleDuJobEnTete(t){
    var m = String(t||'').match(/^\s*([A-Z]{2,3})\b/);
    var R = (typeof ROLE !== 'undefined') ? ROLE : {};
    return (m && R[m[1]]) ? S.roleDuJob(R, m[1]) : '';   // le rôle principal
  }
  // devine le thème d'une rubrique d'après son titre — l'ordre compte
  function themeDevine(titre){
    var t = String(titre||'');
    if(/magic burst|\bMB\b/i.test(t)) return 'mb';
    if(/\bproc/i.test(t) && /^proc|·\s*proc|contre par/i.test(t)) return 'rules proc';
    if(/r[èe]gle/i.test(t)) return 'rules';
    if(/buff/i.test(t)) return 'buff';
    var r = roleDuJobEnTete(t);
    if(r === 'tank' || r === 'heal' || r === 'buff' || r === 'dd') return r;
    if(/tank/i.test(t)) return 'tank';
    if(/soin|heal/i.test(t)) return 'heal';
    if(/^\s*DD\b|d[ée]g[âa]t|\bSC\b/i.test(t)) return 'dd';
    return '';
  }
  function blocToText(c){
    var out = [];
    (c.groups||[]).forEach(function(g, i){
      // La ligne vide est ce qui REFERME les boîtes : on ne l'écrit donc pas
      // devant une rubrique imbriquée, sinon la relecture la déboîterait.
      if(i && !(g.niv||0)) out.push('');
      var titre = g.label || '';
      // Une BOÎTE se réécrit avec son mot-clé, puis son titre en dessous s'il
      // en a un. Sans ça elle repartait en « ␣␣[tank] » — qui se relit bien,
      // mais ne se retape pas de mémoire.
      if(g.boite && BOITE_INV[g.cls]){
        out.push(BOITE_INV[g.cls]);
        if(titre || g.img) out.push(titre + (g.img ? '  [img:' + g.img + ']' : ''));
      }
      else if(!titre && !g.img && BOITE_INV[g.cls]){ out.push(BOITE_INV[g.cls]); }
      else {
      var extra = [];
      // thème écrit seulement si la devinette se tromperait
      if((g.cls||'') !== themeDevine(titre)) extra.push('[' + (THEMES[g.cls]!==undefined?THEMES[g.cls]:g.cls) + ']');
      if(g.img) extra.push('[img:' + g.img + ']');
      out.push(titre + (extra.length ? '  ' + extra.join(' ') : ''));
      }
      if(g.note) out.push('(' + g.note + ')');
      (g.lines||[]).forEach(function(l){
        var tete = (l.r||['ALL']).join(',') + (l.warn?'!':'') + (l.comp?'@'+l.comp:'') + ' : ';
        var actions = Array.isArray(l.t) ? l.t : [l.t];
        var creux = new Array(tete.length + 1).join(' ');
        actions.forEach(function(a, k){
          out.push((k === 0 ? tete : creux) + a + (k === 0 && l.cond ? '  ?' + l.cond : ''));
        });
      });
    });
    return out.join('\n');
  }
  var RE_CROCHET = /\[([^\]]+)\]/g;
  function textToBloc(txt, base){
    var c = base || {};
    var groups = [], g = null;
    function pousse(l){
      if(!g){ g = {label:'', cls:'', lines:[]}; groups.push(g); }
      g.lines.push(l);
    }
    // Une BOÎTE ouverte englobe ce qui suit — son titre compris — et se referme
    // au premier saut de ligne. Ailleurs, une ligne vide reste ce qu'elle a
    // toujours été : une respiration sans effet sur la lecture.
    // `pile` = les boîtes ouvertes, de la plus large à la plus étroite. Une
    // BOÎTE écrite sans avoir saute de ligne se pose DANS celle d'avant : le
    // magic burst appartient au bloc de dégâts qui le prépare, il ne vient pas
    // après. Un saut de ligne les referme toutes d'un coup.
    var enBoite = false, pile = 0;
    String(txt==null?'':txt).split('\n').forEach(function(brut){
      var ligne = brut.replace(/\s+$/,'');
      if(!ligne.trim()){ if(enBoite){ enBoite = false; pile = 0; g = null; } return; }
      // Un job écrit devant vaut badge, même en retrait. On tapait « ALL : »
      // devant une action indentée justement pour lui donner son badge, et
      // c'est le contraire qui arrivait : la ligne restait une puce, et le
      // « ALL : » y entrait comme du texte. Le job qu'on écrit décide, l'alinéa
      // ne décide que pour ce qui n'en porte pas.
      var nat = ligneNaturelle(ligne.trim());
      // ligne INDENTEE et sans job : action de plus pour le job du dessus
      if(!nat && /^\s/.test(ligne) && g && g.lines.length){
        var prec = g.lines[g.lines.length-1];
        if(!Array.isArray(prec.t)) prec.t = [prec.t];
        prec.t.push(ligne.trim());
        return;
      }
      if(nat){
        var d = decoupeCond(nat.reste);
        var l = {r:nat.jobs, t:d.texte};
        if(d.cond) l.cond = d.cond;
        if(nat.warn) l.warn = 1;
        if(nat.comp) l.comp = nat.comp;
        pousse(l);
        return;
      }
      var mp = ligne.trim().match(/^\((.*)\)$/);          // remarque de la rubrique
      if(mp && g){ if(mp[1].trim()) g.note = mp[1].trim(); return; }
      // une BOÎTE : elle ouvre un cadre coloré (voir plus haut)
      var mbx = BOITES[ligne.trim().toUpperCase()];
      if(mbx !== undefined){
        g = {label:'', cls:mbx, boite:1, lines:[]};
        if(enBoite) g.niv = ++pile;      // une boîte dans une boîte s'y emboîte
        groups.push(g); enBoite = true; return; }
      // sinon : titre de rubrique
      var t = ligne.trim(), cls = null, img = null;
      t = t.replace(RE_CROCHET, function(_, v){
        var mi = v.match(/^img\s*:\s*(.+)$/i);
        if(mi){ img = mi[1].trim(); return ''; }
        cls = (THEME_INV[v.trim()] !== undefined) ? THEME_INV[v.trim()] : v.trim();
        return '';
      }).replace(/\s+$/,'').trim();
      // Juste après une BOÎTE : ce titre est LE SIEN, il n'en ouvre pas une
      // autre. La couleur reste celle du mot-clé — c'est lui qui l'a choisie,
      // pas la devinette sur le titre.
      if(enBoite && g && !g.label && !g.lines.length){
        g.label = t; if(img) g.img = img; if(cls !== null) g.cls = cls;
        return;
      }
      // Une boîte ouverte ne se referme QU'À la ligne vide. Un titre écrit à la
      // suite d'une boîte qui a déjà son contenu tenait pour une rubrique de
      // plus, et sortait du cadre — on écrivait une ligne sous ses lignes, elle
      // atterrissait dehors. Il faut alors retaper le mot-clé pour la ramener
      // dedans, et l'ordre de frappe changeait le résultat. Ce titre est
      // désormais une sous-rubrique DE la boîte : elle reste ouverte.
      g = {label:t, cls:(cls===null ? themeDevine(t) : cls), lines:[]};
      if(img) g.img = img;
      if(enBoite) g.niv = pile + 1;   // dedans, sans creuser d'un cran de plus
      groups.push(g);
      if(!enBoite) pile = 0;
    });
    c.groups = groups;
    return c;
  }

  /* ---------------- SÉRIALISATION data.js ---------------- */
  // Un tableau vide s'écrit `[]`, pas `[` + ligne blanche + `]` : sinon chaque
  // enregistrement gonflait de deux lignes les cartes encore vides du sous-sol.
  function liste(items, ind, rendu){
    if(!items || !items.length) return '[]';
    return '[\n' + items.map(function(x){ return rendu(x, ind+'  '); }).join(',\n') + '\n' + ind + ']';
  }
  function lnConst(l, ind){
    var r = '['+(l.r||['ALL']).map(q).join(',')+']';
    var t = Array.isArray(l.t) ? '['+l.t.map(q).join(',')+']' : q(l.t);
    var opt = [];
    if(l.cond) opt.push('cond:'+q(l.cond));
    if(l.warn) opt.push('warn:1');
    if(l.comp) opt.push('comp:'+q(l.comp));
    return ind+'ln('+r+','+t+(opt.length?',{'+opt.join(',')+'}':'')+')';
  }
  function grpConst(g, ind){
    var s = ind+'{label:'+q(g.label);
    if(g.cls!=null) s += ',cls:'+q(g.cls);   // même vide : on ne modifie pas le fichier d'Eric sans raison
    if(g.boite) s += ',boite:1';             // encadrée, même quand elle a un titre
    if(g.niv) s += ',niv:'+g.niv;            // emboîtée dans la rubrique d'avant
    if(g.img) s += ',img:'+q(g.img);
    if(g.note) s += ',note:'+q(g.note);
    return s + ',lines:' + liste(g.lines, ind, lnConst) + '}';
  }
  function cardConst(c, ind){
    var s = ind+'{kind:'+q(c.kind);
    if(c.klabel) s += ',klabel:'+q(c.klabel);
    s += ',name:'+q(c.name)+',tag:'+q(c.tag||'');
    if(c.noHeadImg) s += ',noHeadImg:true';
    return s + ',groups:' + liste(c.groups, ind, grpConst) + '}';
  }
  // Une phase désigne son jeu de buffs par son NOM — le même nom que le guide
  // affiche en tête du bloc. Avant, elle pointait sur une constante
  // (« buffs:BUFFS_P1 ») dont le nom ne disait rien et n'était visible nulle
  // part, et le titre affiché était écrit en dur dans le moteur.
  function phaseConst(p, ind){
    var s = ind+'{n:'+p.n;
    if(p.sector) s += ',sector:'+q(p.sector);
    if(p.boss) s += ',boss:'+q(p.boss);
    if(p.soon) s += ',soon:true';
    if(p.map!=null) s += ',map:'+q(p.map);
    s += ',title:'+q(p.title||'');
    if(p.route!=null) s += ',route:'+q(p.route);
    if(p.buffs) s += ',buffs:'+q(p.buffs);
    if(p.soon && !(p.cards||[]).length) return s+'}';
    return s + ',cards:' + liste(p.cards, ind, cardConst) + '}';
  }
  // Indentation ZÉRO au premier niveau : c'est celle que PHASES a déjà dans
  // data.js. Avec un espace, chaque enregistrement redécalait les 170 lignes
  // de l'étage du haut pour rien.
  function phasesConst(nom, arr){
    return 'const '+nom+'=[\n'
      + (arr||[]).map(function(p){ return phaseConst(p, ''); }).join(',\n')
      + (arr && arr.length ? '\n' : '') + '];';
  }
  // BUFFS : un seul bloc, nom du jeu -> ses lignes. Le nom est du texte écrit
  // par l'auteur, affiché tel quel en tête du bloc dans le guide.
  function buffsConst(nom, dico){
    var cles = Object.keys(dico || {});
    if(!cles.length) return 'const '+nom+'={\n};';
    return 'const '+nom+'={\n'
      + cles.map(function(k){
          return ' '+q(k)+':[\n'
            + (dico[k]||[]).map(function(l){ return lnConst(l, '  '); }).join(',\n')
            + ((dico[k]||[]).length ? '\n' : '') + ' ]'; }).join(',\n')
      + '\n};';
  }
  // TR : une entrée par ligne, ordre d'insertion conservé (les ajouts vont à la fin)
  function trConst(nom, dico){
    var cles = Object.keys(dico||{});
    return 'const '+nom+'={\n'
      + cles.map(function(k){ return ' '+q(k)+':'+q(dico[k]); }).join(',\n')
      + '\n};';
  }

  // MOB : le nom d'un mob et sa vignette. Le bloc était groupé à la main par
  // section de run ; ce groupage ne se déduit d'aucune donnée, donc l'outil
  // ne pouvait que le détruire. Une entrée par ligne : l'ordre reste celui
  // d'insertion, et deux enregistrements de suite ne changent plus rien.
  function mobConst(nom, dico){
    var cles = Object.keys(dico||{});
    if(!cles.length) return 'const '+nom+'={\n};';
    return 'const '+nom+'={\n'
      + cles.map(function(k){ return ' '+q(k)+':'+q(dico[k]); }).join(',\n')
      + '\n};';
  }

  /* ---------------- CHAÎNES À TRADUIRE ---------------- */
  // Tout ce que le guide passe par tr() : titres, routes, tags, labels, notes,
  // conditions et textes de ligne. Sert à lister ce qui manque dans i18n.js.
  function collecteTextes(phases, buffs){
    var out = [];
    var add = function(v){ if(typeof v==='string' && v.trim()) out.push(v); };
    var vusBuffs = {};
    (phases||[]).forEach(function(p){
      add(p.title); add(p.route);
      // le nom du jeu de buffs est le titre affiché : il se traduit aussi
      if(p.buffs && !vusBuffs[p.buffs]){
        vusBuffs[p.buffs] = 1; add(p.buffs);
        ((buffs||{})[p.buffs] || []).forEach(ligne);
      }
      (p.cards||[]).forEach(function(c){
        add(c.name); add(c.tag);
        (c.groups||[]).forEach(function(g){
          add(g.label); add(g.note);
          (g.lines||[]).forEach(ligne);
        });
      });
    });
    function ligne(l){
      if(Array.isArray(l.t)) l.t.forEach(add); else add(l.t);
      add(l.cond);
    }
    // dédoublonne en gardant l'ordre d'apparition
    var vus = {}, uniq = [];
    out.forEach(function(v){ if(!vus[v]){ vus[v]=1; uniq.push(v); } });
    return uniq;
  }
  function manquantes(phases, dico, buffs){
    return collecteTextes(phases, buffs).filter(function(v){ return !dico || dico[v]===undefined; });
  }

  global.STRATCORE = {
    parseLines: parseLines, linesToText: linesToText,
    THEMES: THEMES,
    blocToText: blocToText, textToBloc: textToBloc, themeDevine: themeDevine, ligneNaturelle: ligneNaturelle,
    phasesConst: phasesConst, buffsConst: buffsConst, trConst: trConst, mobConst: mobConst,
    collecteTextes: collecteTextes, manquantes: manquantes
  };
})(typeof window!=='undefined'?window:this);
