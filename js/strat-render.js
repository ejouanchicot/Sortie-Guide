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
     ROLE  map job -> rôle               (data.js)
     base  préfixe des chemins d'image   (guide : '', outils : '../')

   `base` existe parce que les chemins de data.js sont relatifs à la
   racine ; sans lui, une page de tools/ demande tools/img/… et
   n'affiche que des vignettes cassées.

   Expose window.STRATR. Chargé APRÈS sortie-map-core.js.
   ============================================================ */
(function(global){
  "use strict";
  var esc = global.SORTIE.esc;
  var H = {tr:function(s){return s;}, MOB:{}, ELC:{}, ROLE:{}, base:''};
  function img(nom){ return esc(H.base + H.MOB[nom]); }

  var RCOL = {dd:"var(--r-dd)", buff:"var(--r-buff)", heal:"var(--r-heal)", tank:"var(--r-tank)", all:"var(--r-all)"};
  // Couleur du badge d'un job. Quand le job tient PLUSIEURS rôles (COR buffe
  // et DPS), c'est la rubrique qui tranche : le même COR est jaune sous
  // « Buff · farm » et rouge sous « DD · on spam ». Hors rubrique typée, on
  // retombe sur son rôle principal.
  function jcol(j, cls){
    var rs = global.SORTIE.rolesDuJob(H.ROLE, j);
    if(cls && rs.length > 1){
      var t = String(cls).split(/\s+/);
      for(var i=0; i<t.length; i++) if(rs.indexOf(t[i]) >= 0) return RCOL[t[i]];
    }
    return RCOL[rs[0]] || RCOL.all;
  }

  // ---- colorisation des noms d'élément dans le texte ----
  var ELS = [["WATER|Water|Eau","water"],["THUNDER|Thunder|Foudre","thunder"],["FIRE|Fire|Feu","fire"],
             ["WIND|Wind|Vent","wind"],["EARTH|Earth|Terre","earth"],["ICE|Ice|Glace","ice"],
             ["LIGHT|Light|Lumière","light"],["DARK|Darkness|Dark|Ténèbres","dark"]];
  function colorize(s){
    s = esc(s);
    ELS.forEach(function(e){ s = s.replace(new RegExp("\\b("+e[0]+")\\b","g"), '<span class="el '+e[1]+'">$1</span>'); });
    return s.replace(/→/g, '<span style="color:var(--dim)">→</span>');
  }
  function roleChip(r, cls){ return '<span class="role" style="--jc:'+jcol(r, cls)+'">'+esc(r)+'</span>'; }

  // ---- une ligne d'action ----
  function lineHtml(l, g){
    var roles = (l.r || ["ALL"]);
    var cls = g && g.cls;
    var chips = roles.map(function(r){ return roleChip(r, cls); }).join("");
    var isProc = g && /\bproc\b/.test(g.cls||"") && typeof l.t === "string" && /→/.test(l.t);
    var body;
    if(isProc){
      var parts = l.t.split("→");
      body = '<span class="pcja">'+esc(parts[0].trim())+'</span><span class="pcsep">›</span><span class="pcel">'+colorize(parts[1].trim())+'</span>';
    }
    else if(Array.isArray(l.t)){ body = '<ul class="acts">'+l.t.map(function(it){ return '<li>'+colorize(H.tr(it))+'</li>'; }).join("")+'</ul>'; }
    else { body = colorize(H.tr(l.t)); }
    return '<div class="line'+(l.warn?' warn':'')+(isProc?' proc':'')+(Array.isArray(l.t)?' stack':'')+'" data-r="'+roles.join(" ")+'"'+(l.comp?' data-comp="'+l.comp+'"':'')+'>'
      +'<span class="roles" style="display:flex;gap:3px;flex:none">'+chips+'</span>'
      +'<span class="txt">'+body+(l.cond?' <span class="cond">'+esc(H.tr(l.cond))+'</span>':'')+'</span></div>';
  }
  // plusieurs lignes du même job à la suite → un seul badge + liste à puces
  function runHtml(run, g){
    var roles = (run[0].r || ["ALL"]);
    var cls = g && g.cls;
    var chips = roles.map(function(r){ return roleChip(r, cls); }).join("");
    var comp = run[0].comp, lis = "";
    run.forEach(function(l){
      if(Array.isArray(l.t)){ l.t.forEach(function(it){ lis += '<li>'+colorize(H.tr(it))+'</li>'; }); }
      else { lis += '<li'+(l.warn?' class="warn"':'')+'>'+colorize(H.tr(l.t))+(l.cond?' <span class="cond">'+esc(H.tr(l.cond))+'</span>':'')+'</li>'; }
    });
    return '<div class="line stack" data-r="'+roles.join(" ")+'"'+(comp?' data-comp="'+comp+'"':'')+'>'
      +'<span class="roles" style="display:flex;gap:3px;flex:none">'+chips+'</span>'
      +'<span class="txt"><ul class="acts">'+lis+'</ul></span></div>';
  }
  function groupBody(g){
    if(/\bproc\b/.test(g.cls||"")) return (g.lines||[]).map(function(l){ return lineHtml(l, g); }).join("");
    var out = "", i = 0, L = g.lines || [];
    while(i < L.length){
      var key = (L[i].r||["ALL"]).join(" ")+"|"+(L[i].comp||"");
      var j = i+1;
      while(j < L.length && ((L[j].r||["ALL"]).join(" ")+"|"+(L[j].comp||"")) === key) j++;
      if(j-i > 1) out += runHtml(L.slice(i,j), g); else out += lineHtml(L[i], g);
      i = j;
    }
    return out;
  }

  // ---- une carte (farm ou boss) ----
  //   La vignette est trouvée en cherchant les clés de MOB dans le NOM de la carte,
  //   et la couleur d'accent vient du pack correspondant : la strat hérite des couleurs
  //   de la carte au lieu de les recopier.
  function cardHtml(c, p, f, bossByN){
    var packs = (f && f.packs) || [];
    var groups = "";
    (c.groups||[]).forEach(function(g){
      var gthumb = '';
      if(g.img && H.MOB[g.img]){
        var gpk = packs.find(function(x){ return x.name === g.img; });
        var gac = gpk ? H.ELC[gpk.el] : 'var(--r-buff)';
        gthumb = '<span class="gthumb" style="--ac:'+gac+'"><img src="'+img(g.img)+'" alt="'+esc(g.img)+'" loading="lazy" decoding="async"></span>';
      }
      var glabelHtml = '<div class="glabel '+(g.cls||"")+'">'+colorize(H.tr(g.label))+'</div>';
      var headHtml = g.img ? '<div class="ghead">'+gthumb+glabelHtml+'</div>' : glabelHtml;
      groups += '<div class="grp '+(g.cls||"")+(g.img?' hasimg':'')+'">'+headHtml
        +(g.note?'<div class="gnote">'+esc(H.tr(g.note))+'</div>':'')+groupBody(g)+'</div>';
    });
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
      + mks.map(function(k){ return '<span class="cthumb"><img src="'+img(k)+'" alt="'+esc(k)+'" loading="lazy" decoding="async"></span>'; }).join('')
      + '</span>' : '';
    return '<div class="card '+(c.kind==="boss"?"boss":"pack")+'" style="--ac:'+acc+'">'
      +'<div class="chead">'+thumbHtml
      +'<div class="chmeta"><div class="chtop"><span class="ckind '+c.kind+'">'+(c.kind==="boss"?"BOSS":(c.klabel||"FARM"))+'</span>'
      +'<span class="cname">'+esc(H.tr(c.name))+'</span></div>'
      +'<span class="ctag">'+colorize(H.tr(c.tag))+'</span></div></div>'
      +'<div class="cbody">'+groups+'</div></div>';
  }

  // ---- bloc des buffs de trajet ----
  function buffsHtml(buffs){
    if(!buffs || !buffs.length) return '';
    return '<div class="buffs"><span class="bhead">'+H.tr("Trajet · buffs de déplacement")+'</span>'
      + buffs.map(function(b){
          var roles = b.r || ['ALL'];
          return '<span class="bl'+(b.warn?' warn':'')+'" data-r="'+roles.join(' ')+'"'+(b.comp?' data-comp="'+b.comp+'"':'')+'>'
            + roleChip(roles[0], 'buff') + '<span>'
            + (Array.isArray(b.t) ? '<ul class="acts">'+b.t.map(function(it){ return '<li>'+colorize(H.tr(it))+'</li>'; }).join('')+'</ul>'
                                  : colorize(H.tr(b.t)))
            + '</span></span>';
        }).join('') + '</div>';
  }

  global.STRATR = {
    config: function(o){ for(var k in o) if(o[k] != null) H[k] = o[k]; },
    jcol: jcol, colorize: colorize, roleChip: roleChip,
    lineHtml: lineHtml, runHtml: runHtml, groupBody: groupBody,
    cardHtml: cardHtml, buffsHtml: buffsHtml
  };
})(typeof window!=='undefined'?window:this);
