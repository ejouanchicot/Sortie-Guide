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
  /* ---- la couleur qu'on pose soi-même ----
     Les noms d'élément se colorent tout seuls, mais un lead veut souvent
     détacher autre chose : le nom d'un TP move devant sa description, un mot
     qui doit sauter aux yeux. Il l'écrit « [c:or]Chymous Reek[/c] », depuis la
     barre d'outils, et jamais en HTML : une strat peut être REÇUE, et du HTML
     dans une ligne serait du code étranger qui s'exécute chez celui qui l'ouvre.
     La marque est posée APRÈS l'échappement, donc rien ne passe qu'elle.

     Les noms renvoient aux jetons du thème : la même strat reste lisible en
     clair comme en sombre. Une teinte libre reste possible, passée au filtre. */
  /* Sept teintes de thème, plus les huit ÉLÉMENTS. Un sort porte un élément, et
     c'est une donnée du jeu, pas un goût : « Honor March » est Thunder, point.
     L'écrire `[c:thunder]Honor March[/c]` dit donc ce que la ligne veut dire, au
     lieu de choisir une couleur au hasard — et ce sont exactement les teintes
     que le guide pose déjà tout seul sur les noms d'élément dans le texte. */
  var COULEURS = {or:'--r-buff', bleu:'--r-tank', rouge:'--r-dd', vert:'--r-heal',
                  violet:'--violet', gris:'--dim', blanc:'--txt',
                  fire:'--e-fire', ice:'--e-ice', wind:'--e-wind', earth:'--e-earth',
                  thunder:'--e-thunder', water:'--e-water', light:'--e-light',
                  dark:'--e-dark'};
  // Deux tailles, et pas un nombre : une strat reçue ne fera pas un titre de
  // 90 px au milieu d'une ligne, et l'écart reste le même partout.
  var TAILLES = {petit:'.86em', grand:'1.18em'};
  /* ---- lire les marques, pas les remplacer ----
     Un remplacement par famille — les couleurs, puis les tailles, puis le gras —
     marche tant que les marques ne s'emboîtent pas dans le désordre. Il suffit
     d'un « [c:or]A [c:bleu]B[/c] C[/c] » pour que la première fermeture ferme la
     mauvaise ouverture, et la ligne sort en morceaux.

     On PARCOURT donc la ligne, une pile d'ouvertures à la main. On y gagne tous
     les cas d'un coup : deux marques de la même famille l'une dans l'autre, un
     croisement, une fermeture orpheline, une ouverture qu'on a oublié de
     refermer. Le balisage produit est toujours refermé dans l'ordre — il ne
     peut pas casser la page qui l'affiche. */
  var RE_MARQUE = /\[(b|i|c:(?:[a-zA-Zé]+|#[0-9a-fA-F]{3,8})|t:[a-zé]+)\]|\[\/(b|i|c|t)\]/g;
  function teinte(nom){
    var jeton = COULEURS[String(nom).toLowerCase()];
    return jeton ? 'var(' + jeton + ')' : couleurSure(nom, 'var(--txt)');
  }
  function famille(m){ return m.length > 1 ? m.charAt(0) : m; }   // « c:or » → « c »
  function ouverture(m, f){
    if(f === 'b') return '<b>';
    if(f === 'i') return '<i>';
    var v = m.slice(2);
    /* On pose AUSSI `--gras` : dans une ligne, le <b> est peint plus clair que
       le texte autour pour ressortir, et sa couleur propre écrasait celle de la
       marque. La variable le laisse suivre la teinte quand il y en a une. */
    if(f === 'c'){ var t = teinte(v); return '<span style="color:' + t + ';--gras:' + t + '">'; }
    var px = TAILLES[v.toLowerCase()];
    return px ? '<span style="font-size:' + px + '">' : '<span>';
  }
  function fermeture(f){ return f === 'b' ? '</b>' : f === 'i' ? '</i>' : '</span>'; }

  function marques(s){
    var re = new RegExp(RE_MARQUE.source, 'g');
    var out = '', pile = [], vu = 0, m;
    while((m = re.exec(s)) !== null){
      out += s.slice(vu, m.index);
      vu = re.lastIndex;
      if(m[1]){                                   // une ouverture
        var f = famille(m[1]);
        out += ouverture(m[1], f);
        pile.push(f);
      } else {                                    // une fermeture
        var i = pile.lastIndexOf(m[2]);
        // rien d'ouvert de cette famille : ce n'est pas une marque, c'est du texte
        if(i < 0){ out += m[0]; continue; }
        // on referme aussi ce qui a été ouvert depuis, sinon le balisage se croise
        while(pile.length > i) out += fermeture(pile.pop());
      }
    }
    out += s.slice(vu);
    while(pile.length) out += fermeture(pile.pop());   // ouvertures restées en l'air
    return out;
  }

  function colorize(s){
    s = esc(s);
    ELS.forEach(function(e){ s = s.replace(new RegExp("\\b("+e[0]+")\\b","g"), '<span class="el '+e[1]+'">$1</span>'); });
    s = s.replace(/→/g, '<span style="color:var(--dim)">→</span>');
    return marques(s);
  }
  /* Le même texte, débarrassé de ses marques : pour Discord, qui n'a ni couleur
     ni taille, et partout où on compte des caractères. Ce qui n'est pas une
     marque bien formée reste tel quel — c'est du texte, et il compte. */
  function sansMarques(s){
    return String(s == null ? '' : s).replace(new RegExp(RE_MARQUE.source, 'g'), '');
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
  /* Dans une boîte à procs, la flèche sépare l'action de son effet. Mais elle ne
     se cherche pas au hasard dans la ligne : une flèche ÉCRITE À L'INTÉRIEUR
     d'une marque couperait celle-ci en deux, et la ligne sortirait avec une
     ouverture d'un côté et sa fermeture de l'autre. On ne coupe donc que sur une
     flèche posée hors de toute marque. */
  function couperFleche(s){
    var re = new RegExp(RE_MARQUE.source + '|→', 'g'), prof = 0, m;
    while((m = re.exec(s)) !== null){
      if(m[0] === '→'){ if(prof === 0) return m.index; }
      else if(m[1]) prof++;
      else if(prof > 0) prof--;
    }
    return -1;
  }
  function lineHtml(l, g){
    var roles = (l.r || ["ALL"]);
    var chips = roles.map(roleChip).join("");
    var coupe = (g && /\bproc\b/.test(g.cls||"") && typeof l.t === "string") ? couperFleche(l.t) : -1;
    var isProc = coupe >= 0;
    var body;
    if(isProc){
      /* L'action était seulement échappée : ce qu'on y mettait en forme sortait
         en toutes lettres — « [b][c:or]Cesspool[/c][/b] » écrit tel quel devant
         son effet. Elle passe par les marques comme le reste de la strat. Pas
         par la colorisation des éléments, en revanche : c'est un NOM d'attaque,
         et « Icy Grasp » n'y désigne pas la glace. */
      body = '<span class="pcja">'+marques(esc(l.t.slice(0, coupe).trim()))+'</span>'
           + '<span class="pcsep">›</span>'
           + '<span class="pcel">'+colorize(l.t.slice(coupe + 1).trim())+'</span>';
    }
    else if(Array.isArray(l.t)){ body = '<ul class="acts">'+l.t.map(function(it){ return '<li>'+colorize(H.tr(it))+'</li>'; }).join("")+'</ul>'; }
    else { body = colorize(H.tr(l.t)); }
    // roles et comp viennent de la strat, donc d'un fichier qu'on a pu RECEVOIR :
    // dans un attribut, c'est escAttr — sinon un guillemet en sort et pose un
    // gestionnaire d'evenement. Cette ligne sert au guide comme a l'atelier.
    return '<div class="line'+(l.warn?' warn':'')+(isProc?' proc':'')+(Array.isArray(l.t)?' stack':'')+'" data-r="'+escAttr(roles.join(" "))+'"'+(l.comp?' data-comp="'+escAttr(l.comp)+'"':'')+'>'
      +'<span class="roles" style="display:flex;gap:3px;flex:none">'+chips+'</span>'
      // la condition est du texte de strat, pas une étiquette : ce qu'on y met
      // en forme s'affichait avec ses crochets, en plein milieu d'une boîte
      +'<span class="txt">'+body+(l.cond?' <span class="cond">'+colorize(H.tr(l.cond))+'</span>':'')+'</span></div>';
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
      /* Une rubrique qui n'est QUE son titre et sa remarque — le nom d'un TP
         move et ses effets — n'a pas besoin de l'air d'une rubrique qui porte
         des lignes. Sept d'entre elles dans une boîte à procs en faisaient un
         mur, alors qu'elles se lisent d'un coup d'œil. */
      var serre = (!(g.lines||[]).length && (g.label || g.note)) ? ' seultitre' : '';
      return '<div class="grp '+(g.cls||"")+(g.img?' hasimg':'')+boite+serre
        +(noeud.enfants.length?' aimbrique':'')+'">'+headHtml
        // la remarque se met en forme comme le reste : c'est là qu'on écrit les
        // effets d'un TP move, sous son nom
        +(g.note?'<div class="gnote">'+colorize(H.tr(g.note))+'</div>':'')+groupBody(g)
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
    jcol: jcol, colorize: colorize, sansMarques: sansMarques, roleChip: roleChip, entete: entete,
    lineHtml: lineHtml, groupBody: groupBody, groupsHtml: groupsHtml,
    cardHtml: cardHtml, buffsHtml: buffsHtml
  };
})(typeof window!=='undefined'?window:this);
