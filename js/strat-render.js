/* ============================================================
   strat-render.js — RENDU HTML D'UNE CARTE DE STRAT
   ------------------------------------------------------------
   Extrait de app.js pour que le guide ET l'outil d'écriture
   (tools/strat-studio.html) produisent EXACTEMENT le même balisage :
   un aperçu qui approxime le rendu ne sert à rien pour écrire.

   Ne dépend que de window.SORTIE (esc) et de cinq crochets que
   l'hôte renseigne via STRATR.config() :
     tr    fonction de traduction        (guide : tr, outil : identité)
     MOB   map nom de mob -> image       (data.js)
     ELC   map élément -> couleur CSS    (SORTIE.EL_VAR)
     ROLE  map job -> rôle unique        (data.js)
     base  préfixe des chemins d'image   (guide : '', outils : '../')

   `base` existe parce que les chemins de data.js sont relatifs à la
   racine ; sans lui, une page de tools/ demande tools/img/… et
   n'affiche que des vignettes cassées.

   Expose window.STRATR. Chargé APRÈS sortie-map-core.js.
   ============================================================ */
(function(global){
  "use strict";
  var esc = global.SORTIE.esc;
  // dans un attribut, esc() ne suffit pas : il laisse passer le guillemet
  var escAttr = global.SORTIE.escAttr;
  var couleurSure = global.SORTIE.couleurSure;
  var H = {tr:function(s){return s;}, MOB:{}, ELC:{}, ROLE:{}, base:''};
  function img(nom){ return esc(H.base + H.MOB[nom]); }

  var RCOL = {dd:"var(--r-dd)", buff:"var(--r-buff)", heal:"var(--r-heal)", tank:"var(--r-tank)", all:"var(--r-all)"};
  // Couleur du badge : le rôle du job dans CETTE strat, un seul.
  function jcol(j){ return RCOL[global.SORTIE.roleDuJob(H.ROLE, j)] || RCOL.all; }

  // ---- colorisation des noms d'élément dans le texte ----
  var ELS = [["WATER|Water|Eau","water"],["THUNDER|Thunder|Foudre","thunder"],["FIRE|Fire|Feu","fire"],
             ["WIND|Wind|Vent","wind"],["EARTH|Earth|Terre","earth"],["ICE|Ice|Glace","ice"],
             ["LIGHT|Light|Lumière","light"],["DARK|Darkness|Dark|Ténèbres","dark"]];
  function colorize(s){
    s = esc(s);
    ELS.forEach(function(e){ s = s.replace(new RegExp("\\b("+e[0]+")\\b","g"), '<span class="el '+e[1]+'">$1</span>'); });
    return s.replace(/→/g, '<span style="color:var(--dim)">→</span>');
  }
  function roleChip(r){ return '<span class="role" style="--jc:'+jcol(r)+'">'+esc(r)+'</span>'; }

  /* ---- l'en-tête du guide ----
     Elle était écrite en dur dans index.html, et une deuxième fois en anglais
     dans app.js : « SORTIE · Run · 4 phases · fixes MNK BRD… ». Un guide
     d'Odyssey aurait donc annoncé la composition de Sortie.

     Elle se déduit de la composition : un créneau à un seul job est un poste
     fixe, un créneau qui en propose plusieurs est un flex. C'est la même
     lecture que partout ailleurs dans l'outil. */
  function jobChip(j){ return '<span class="jc" style="color:'+jcol(j)+'">'+esc(j)+'</span>'; }
  function entete(nom, compo, lang){
    var en = (lang === 'en');
    var cr = (compo && compo.creneaux) || [];
    var fixes = cr.filter(function(c){ return c.length === 1; });
    var flex  = cr.filter(function(c){ return c.length > 1; });
    var bouts = [];
    var n = (compo && compo.taille) || cr.length;
    if(n) bouts.push(n + (en ? ' players' : ' joueurs'));
    // Les flex se rattachent aux fixes par un « + » : ils complètent la même
    // composition, ils ne sont pas une information de plus.
    if(fixes.length || flex.length){
      var c = fixes.length ? (en ? 'fixed ' : 'fixes ')
        + fixes.map(function(x){ return jobChip(x[0]); }).join('') : '';
      var f = flex.map(function(x){
        return '1 flex (' + x.map(jobChip).join(en ? ' or ' : ' ou ') + ')'; }).join(' + ');
      bouts.push(c && f ? (c + ' + ' + f) : (c || f));
    }
    return {titre: esc(nom || (en ? 'Strategy' : 'Stratégie')),
            sous: bouts.join(' · ')};
  }

  // ---- une ligne d'action ----
  function lineHtml(l, g){
    var roles = (l.r || ["ALL"]);
    var chips = roles.map(roleChip).join("");
    var isProc = g && /\bproc\b/.test(g.cls||"") && typeof l.t === "string" && /→/.test(l.t);
    var body;
    if(isProc){
      var parts = l.t.split("→");
      body = '<span class="pcja">'+esc(parts[0].trim())+'</span><span class="pcsep">›</span><span class="pcel">'+colorize(parts[1].trim())+'</span>';
    }
    else if(Array.isArray(l.t)){ body = '<ul class="acts">'+l.t.map(function(it){ return '<li>'+colorize(H.tr(it))+'</li>'; }).join("")+'</ul>'; }
    else { body = colorize(H.tr(l.t)); }
    // roles et comp viennent de la strat, donc d'un fichier qu'on a pu RECEVOIR :
    // dans un attribut, c'est escAttr — sinon un guillemet en sort et pose un
    // gestionnaire d'evenement. Cette ligne sert au guide comme a l'atelier.
    return '<div class="line'+(l.warn?' warn':'')+(isProc?' proc':'')+(Array.isArray(l.t)?' stack':'')+'" data-r="'+escAttr(roles.join(" "))+'"'+(l.comp?' data-comp="'+escAttr(l.comp)+'"':'')+'>'
      +'<span class="roles" style="display:flex;gap:3px;flex:none">'+chips+'</span>'
      +'<span class="txt">'+body+(l.cond?' <span class="cond">'+esc(H.tr(l.cond))+'</span>':'')+'</span></div>';
  }
  /* Une ligne écrite = un badge. Deux lignes du même job à la suite étaient
     réunies sous un seul badge, et devenaient des puces : on écrivait
     « ALL : … » sous un autre « ALL : … », et la ligne repartait en puce, sans
     badge, sans rien pour dire qu'on n'en voulait pas. Le badge du job est ce
     qui se lit en diagonale pendant un run — il ne se déduit pas.
     La liste à puces reste demandée à la main, en indentant les actions
     sous une même ligne : c'est là qu'elle veut dire quelque chose. */
  function groupBody(g){
    return (g.lines||[]).map(function(l){ return lineHtml(l, g); }).join("");
  }

  /* ---- les rubriques d'un bloc ----
     Un seul dessin pour TOUS les blocs — une carte de farm, un boss, une
     préparation. Une BOÎTE se referme sur une ligne vide et un job écrit vaut
     badge : c'est la même règle partout, parce que c'est le même code.
     La préparation avait le sien, et ses lignes n'y connaissaient ni boîte ni
     rubrique — on écrivait TANKBOX dedans, il ne se passait rien. */
  function groupsHtml(liste, packs){
    packs = packs || [];
    /* Les rubriques arrivent a plat, chacune avec sa profondeur (`niv`). Une
       BOÎTE ecrite dans une autre s'y emboîte vraiment : le magic burst tient
       DANS le bloc de degats qui le prepare, il ne vient pas apres. On remonte
       donc l'arbre avant de dessiner. */
    function enArbre(liste){
      var racine = [], pile = [];
      (liste||[]).forEach(function(g){
        var n = Math.min(g.niv || 0, pile.length);   // pas de saut de niveau
        pile.length = n;
        var noeud = {g:g, enfants:[]};
        (n ? pile[n-1].enfants : racine).push(noeud);
        pile.push(noeud);
      });
      return racine;
    }
    function rendGrp(noeud){
      var g = noeud.g;
      var gthumb = '';
      if(g.img && H.MOB[g.img]){
        var gpk = packs.find(function(x){ return x.name === g.img; });
        var gac = gpk ? H.ELC[gpk.el] : 'var(--r-buff)';
        gthumb = '<span class="gthumb" style="--ac:'+couleurSure(gac,'var(--r-buff)')+'"><img src="'+escAttr(img(g.img))+'" alt="'+escAttr(g.img)+'" loading="lazy" decoding="async"></span>';
      }
      // Pas de titre = pas de ligne de titre. Sans ce test, une rubrique en
      // BOÎTE (colorée mais muette) laissait sa pastille toute seule au-dessus
      // du vide, et 10 px de marge sous elle.
      var glabelHtml = (g.label || g.img)
        ? '<div class="glabel '+(g.cls||"")+'">'+colorize(H.tr(g.label))+'</div>' : '';
      var headHtml = g.img ? '<div class="ghead">'+gthumb+glabelHtml+'</div>' : glabelHtml;
      // Une rubrique colorée SANS titre a été demandée en BOÎTE : elle doit en
      // être une, sur un farm comme sur un boss. Le cadre teinté n'existait que
      // sur les cartes boss — écrire TANKBOX dans un farm ne donnait donc rien
      // du tout, puisque la couleur ne vivait que dans le titre qu'on venait
      // justement de retirer.
      // Encadrée soit parce qu'un mot-clé l'a demandé (et elle peut alors
      // porter un titre), soit parce qu'elle est colorée et muette.
      var boite = (g.boite || (!g.label && !g.img && (g.cls||''))) ? ' boite' : '';
      return '<div class="grp '+(g.cls||"")+(g.img?' hasimg':'')+boite
        +(noeud.enfants.length?' aimbrique':'')+'">'+headHtml
        +(g.note?'<div class="gnote">'+esc(H.tr(g.note))+'</div>':'')+groupBody(g)
        +noeud.enfants.map(rendGrp).join('')+'</div>';
    }
    return enArbre(liste).map(rendGrp).join('');
  }

  // ---- une carte (farm ou boss) ----
  //   La vignette est trouvée en cherchant les clés de MOB dans le NOM de la carte,
  //   et la couleur d'accent vient du pack correspondant : la strat hérite des couleurs
  //   de la carte au lieu de les recopier.
  function cardHtml(c, p, f, bossByN){
    var packs = (f && f.packs) || [];
    var groups = groupsHtml(c.groups, packs);
    var mks = [], acc = 'var(--r-buff)';
    if(c.kind === "boss"){ var bb = bossByN && bossByN[p.n]; if(bb){ mks = [bb.name]; acc = H.ELC[bb.el]; } }
    else {
      var nm = H.tr(c.name)+" "+c.name;
      mks = Object.keys(H.MOB).filter(function(k){ return nm.indexOf(k) >= 0; });
      var pk = packs.find(function(x){ return mks.indexOf(x.name) >= 0; });
      if(pk) acc = H.ELC[pk.el];
    }
    if(c.noHeadImg) mks = [];
    var thumbHtml = mks.length ? '<span class="cthumbs'+(mks.length>1?' multi':'')+'">'
      + mks.map(function(k){ return '<span class="cthumb"><img src="'+escAttr(img(k))+'" alt="'+escAttr(k)+'" loading="lazy" decoding="async"></span>'; }).join('')
      + '</span>' : '';
    return '<div class="card '+(c.kind==="boss"?"boss":"pack")+'" style="--ac:'+couleurSure(acc,'var(--r-buff)')+'">'
      +'<div class="chead">'+thumbHtml
      +'<div class="chmeta"><div class="chtop"><span class="ckind '+(c.kind==="boss"?"boss":"pack")+'">'+(c.kind==="boss"?"BOSS":esc(c.klabel||"FARM"))+'</span>'
      +'<span class="cname">'+esc(H.tr(c.name))+'</span></div>'
      +'<span class="ctag">'+colorize(H.tr(c.tag))+'</span></div></div>'
      +'<div class="cbody">'+groups+'</div></div>';
  }

  // ---- bloc de préparation posé en tête d'une étape ----
  // Le titre vient du NOM du jeu de buffs, écrit par l'auteur. Il était écrit
  // en dur ici (« Trajet · buffs de déplacement »), ce qui ne voulait rien dire
  // hors d'un run où l'on se déplace entre les boss.
  function buffsHtml(nom, buffs){
    var groupes = global.SORTIE.groupesBuffs(buffs);
    if(!groupes.length) return '';
    return '<div class="buffs"><span class="bhead">'+esc(H.tr(nom || ''))+'</span>'
      + groupsHtml(groupes) + '</div>';
  }

  global.STRATR = {
    config: function(o){ for(var k in o) if(o[k] != null) H[k] = o[k]; },
    jcol: jcol, colorize: colorize, roleChip: roleChip, entete: entete,
    lineHtml: lineHtml, groupBody: groupBody, groupsHtml: groupsHtml,
    cardHtml: cardHtml, buffsHtml: buffsHtml
  };
})(typeof window!=='undefined'?window:this);
