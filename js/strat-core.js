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
  var escJs = function(v){ return String(v==null?'':v)
    .replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r/g,'').replace(/\n/g,'\\n'); };
  var q = function(v){ return "'"+escJs(v)+"'"; };

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

  /* ---------------- UNE ÉTAPE ENTIÈRE <-> UN SEUL TEXTE ----------------
     Le run se pense en P1 P2 P3 P4, pas en arborescence. Tout le contenu d'une
     étape tient donc dans une page qu'on lit de haut en bas, dans l'ordre du
     guide, au lieu de douze endroits où cliquer.

       ## farm  Nom du bloc            bloc de farm
       ## boss  Nom du bloc            bloc de boss
       ## farm  Nom  [MIDBOSS]         étiquette au lieu de FARM
       ## farm  Nom  [sans portrait]   pas de vignette en en-tête
       ~ résumé du bloc                la ligne grise sous le titre
       # Titre de rubrique  [tank]     rubrique + son thème
       ~ remarque                      l'italique sous le titre de rubrique
       # Titre  [img:Fomor]            portrait de mob dans la rubrique
       PLD  action                     les lignes, comme partout ailleurs
     ------------------------------------------------------------------ */
  var THEMES = {'':'neutre', tank:'tank', buff:'buffs', dd:'dégâts', heal:'soin',
                rules:'règles', 'rules proc':'procs', mb:'magic burst'};
  var THEME_INV = (function(){ var o={}; for(var k in THEMES) o[THEMES[k]] = k; return o; })();

  function phaseToText(ph){
    var out = [];
    ((ph && ph.cards) || []).forEach(function(c, i){
      if(i) out.push('');
      var mods = [];
      if(c.klabel) mods.push('[' + c.klabel + ']');
      if(c.noHeadImg) mods.push('[sans portrait]');
      out.push('## ' + (c.kind === 'boss' ? 'boss' : 'farm') + '  ' + (c.name || '')
        + (mods.length ? '  ' + mods.join(' ') : ''));
      if(c.tag) out.push('~ ' + c.tag);
      (c.groups || []).forEach(function(g){
        out.push('');
        var gm = [];
        if(g.cls) gm.push('[' + (THEMES[g.cls] !== undefined ? THEMES[g.cls] : g.cls) + ']');
        if(g.img) gm.push('[img:' + g.img + ']');
        out.push('# ' + (g.label || '') + (gm.length ? '  ' + gm.join(' ') : ''));
        if(g.note) out.push('~ ' + g.note);
        var t = linesToText(g.lines || []);
        if(t) out.push(t);
      });
    });
    return out.join('\n');
  }
  var RE_MOD = /\[([^\]]+)\]/g;
  function textToPhase(txt, base){
    var ph = base || {};
    var cards = [], carte = null, groupe = null, tampon = [];
    function videTampon(){
      if(groupe && tampon.length) groupe.lines = parseLines(tampon.join('\n'));
      tampon = [];
    }
    String(txt == null ? '' : txt).split('\n').forEach(function(brut){
      var l = brut.replace(/\s+$/, ''), m;

      if((m = l.match(/^##\s+(\S+)\s*(.*)$/))){          // ---- bloc farm / boss ----
        videTampon(); groupe = null;
        var reste = m[2], mods = [], klabel = null, sansImg = false;
        reste = reste.replace(RE_MOD, function(_, v){ mods.push(v.trim()); return ''; }).replace(/\s+$/, '');
        mods.forEach(function(v){ if(/^sans portrait$/i.test(v)) sansImg = true; else klabel = v; });
        carte = {kind: (/^boss$/i.test(m[1]) ? 'boss' : 'pack'), name: reste.trim(), tag: '', groups: []};
        if(klabel) carte.klabel = klabel;
        if(sansImg) carte.noHeadImg = true;
        cards.push(carte);
        return;
      }
      if((m = l.match(/^#\s+(.*)$/))){                    // ---- rubrique ----
        videTampon();
        if(!carte){ carte = {kind:'pack', name:'', tag:'', groups:[]}; cards.push(carte); }
        var t = m[1], gm = [], cls = '', img = null;
        t = t.replace(RE_MOD, function(_, v){ gm.push(v.trim()); return ''; }).replace(/\s+$/, '');
        gm.forEach(function(v){
          var mi = v.match(/^img\s*:\s*(.+)$/i);
          if(mi){ img = mi[1].trim(); return; }
          cls = (THEME_INV[v] !== undefined) ? THEME_INV[v] : v;
        });
        groupe = {label: t.trim(), cls: cls, lines: []};
        if(img) groupe.img = img;
        carte.groups.push(groupe);
        return;
      }
      if((m = l.match(/^~\s*(.*)$/))){                    // ---- résumé / remarque ----
        videTampon();
        if(groupe){ if(m[1].trim()) groupe.note = m[1].trim(); }
        else if(carte) carte.tag = m[1].trim();
        return;
      }
      if(l.trim()) tampon.push(l); else videTampon();
    });
    videTampon();
    ph.cards = cards;
    return ph;
  }

  /* ---------------- SÉRIALISATION data.js ---------------- */
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
    if(g.img) s += ',img:'+q(g.img);
    if(g.note) s += ',note:'+q(g.note);
    s += ',lines:[\n';
    s += (g.lines||[]).map(function(l){ return lnConst(l, ind+'  '); }).join(',\n');
    s += '\n'+ind+']}';
    return s;
  }
  function cardConst(c, ind){
    var s = ind+'{kind:'+q(c.kind);
    if(c.klabel) s += ',klabel:'+q(c.klabel);
    s += ',name:'+q(c.name)+',tag:'+q(c.tag||'');
    if(c.noHeadImg) s += ',noHeadImg:true';
    s += ',groups:[\n';
    s += (c.groups||[]).map(function(g){ return grpConst(g, ind+'  '); }).join(',\n');
    s += '\n'+ind+']}';
    return s;
  }
  // registre = {NOM: tableau} des constantes de buffs, pour réécrire « buffs:BUFFS_P1 »
  // comme une RÉFÉRENCE et non comme une copie aplatie.
  function nomDuBuff(arr, registre){
    if(!arr || !registre) return null;
    for(var k in registre) if(registre[k] === arr) return k;
    return null;
  }
  function phaseConst(p, ind, registre){
    var s = ind+'{n:'+p.n;
    if(p.sector) s += ',sector:'+q(p.sector);
    if(p.boss) s += ',boss:'+q(p.boss);
    if(p.soon) s += ',soon:true';
    if(p.map!=null) s += ',map:'+q(p.map);
    s += ',title:'+q(p.title||'');
    if(p.route!=null) s += ',route:'+q(p.route);
    var nb = nomDuBuff(p.buffs, registre);
    if(nb) s += ',buffs:'+nb;
    else if(p.buffs && p.buffs.length) s += ',buffs:[\n'+p.buffs.map(function(l){return lnConst(l, ind+'  ');}).join(',\n')+'\n'+ind+']';
    if(p.soon && !(p.cards||[]).length) return s+'}';
    s += ',cards:[\n';
    s += (p.cards||[]).map(function(c){ return cardConst(c, ind+'  '); }).join(',\n');
    s += '\n'+ind+']}';
    return s;
  }
  function phasesConst(nom, arr, registre){
    return 'const '+nom+'=[\n'
      + (arr||[]).map(function(p){ return phaseConst(p, ' ', registre); }).join(',\n')
      + '\n];';
  }
  function buffsConst(nom, arr){
    return 'const '+nom+'=[\n'
      + (arr||[]).map(function(l){ return lnConst(l, '  '); }).join(',\n')
      + '\n];';
  }
  // TR : une entrée par ligne, ordre d'insertion conservé (les ajouts vont à la fin)
  function trConst(nom, dico){
    var cles = Object.keys(dico||{});
    return 'const '+nom+'={\n'
      + cles.map(function(k){ return ' '+q(k)+':'+q(dico[k]); }).join(',\n')
      + '\n};';
  }

  /* ---------------- CHAÎNES À TRADUIRE ---------------- */
  // Tout ce que le guide passe par tr() : titres, routes, tags, labels, notes,
  // conditions et textes de ligne. Sert à lister ce qui manque dans i18n.js.
  function collecteTextes(phases){
    var out = [];
    var add = function(v){ if(typeof v==='string' && v.trim()) out.push(v); };
    (phases||[]).forEach(function(p){
      add(p.title); add(p.route);
      (p.buffs||[]).forEach(ligne);
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
  function manquantes(phases, dico){
    return collecteTextes(phases).filter(function(v){ return !dico || dico[v]===undefined; });
  }

  global.STRATCORE = {
    parseLines: parseLines, linesToText: linesToText,
    phaseToText: phaseToText, textToPhase: textToPhase, THEMES: THEMES,
    phasesConst: phasesConst, buffsConst: buffsConst, trConst: trConst,
    collecteTextes: collecteTextes, manquantes: manquantes
  };
})(typeof window!=='undefined'?window:this);
