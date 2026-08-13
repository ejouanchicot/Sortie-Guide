/* ============================================================
   minifie.js — compacter le code d'un fichier partagé
   ------------------------------------------------------------
   Les fichiers du projet sont commentés à l'excès, exprès : ils
   expliquent POURQUOI, et c'est ce qui permet d'y revenir dans six
   mois. Mais un guide exporté n'est pas relu — il est exécuté. Tout
   ce qui s'adresse à un humain y pèse pour rien.

   Aucun outil de compilation ici : le site n'en a pas, et en ajouter
   un pour ça serait payer très cher un gain modeste. Ces trois
   fonctions suffisent, à condition de ne PAS travailler à l'aveugle.

   ── LE PIÈGE DES EXPRESSIONS RÉGULIÈRES ─────────────────────
   Un compacteur naïf cherche « // » et coupe. Il détruit alors
   « http://… » dans une chaîne, et le « // » d'une classe de
   caractères dans une expression régulière. On PARCOURT donc le code caractère par caractère en
   sachant à tout moment où l'on est : dans une chaîne, dans un
   gabarit, dans une expression régulière, dans un commentaire.

   ── LE PIÈGE DU POINT-VIRGULE IMPLICITE ─────────────────────
   JavaScript termine une instruction en fin de ligne quand il le
   peut. Recoller deux lignes change donc le sens du programme. On ne
   les recolle QUE lorsque c'est démontrable : la ligne d'avant se
   termine par un signe qui appelle une suite, ou celle d'après
   commence par un signe qui ne peut pas ouvrir une instruction.
   Dans le doute, on garde le saut de ligne — il coûte un octet.

   Expose window.MINIFIE.
   ============================================================ */
(function(global){
  "use strict";

  /* ---------------- JavaScript ---------------- */
  // Un « / » ouvre une expression régulière quand ce qui précède ne peut pas
  // être la fin d'une valeur : après « ( » ou « = » c'est une regex, après
  // « ) » ou un nom c'est une division.
  function avantRegex(sortie){
    var i = sortie.length - 1;
    while(i >= 0 && /\s/.test(sortie[i])) i--;
    if(i < 0) return true;
    var c = sortie[i];
    if('([{,;:=!&|?+-*%~^<>'.indexOf(c) >= 0) return true;
    if(c === ')' || c === ']') return false;          // (a+b)/2, t[0]/2
    // un mot-clé peut précéder une regex : return /x/, typeof /x/…
    var mot = /([A-Za-z_$][\w$]*)$/.exec(sortie.slice(0, i + 1));
    return !!(mot && /^(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/.test(mot[1]));
  }

  function sansCommentaires(src){
    var out = '', i = 0, n = src.length;
    while(i < n){
      var c = src[i], d = src[i + 1];
      // chaîne : on la recopie telle quelle, échappements compris
      if(c === '"' || c === "'" || c === '`'){
        var fin = c; out += c; i++;
        while(i < n){
          if(src[i] === '\\'){ out += src[i] + (src[i + 1] || ''); i += 2; continue; }
          out += src[i];
          if(src[i] === fin){ i++; break; }
          i++;
        }
        continue;
      }
      if(c === '/' && d === '/'){ while(i < n && src[i] !== '\n') i++; continue; }
      if(c === '/' && d === '*'){
        i += 2; while(i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2; continue;
      }
      if(c === '/' && avantRegex(out)){
        out += c; i++;
        var classe = false;
        while(i < n){
          if(src[i] === '\\'){ out += src[i] + (src[i + 1] || ''); i += 2; continue; }
          if(src[i] === '[') classe = true;
          else if(src[i] === ']') classe = false;
          out += src[i];
          if(src[i] === '/' && !classe){ i++; break; }
          if(src[i] === '\n'){ i++; break; }        // pas une regex, en fait
          i++;
        }
        while(i < n && /[a-z]/.test(src[i])){ out += src[i]; i++; }   // gimsuy
        continue;
      }
      out += c; i++;
    }
    return out;
  }

  // Peut-on souder ces deux lignes sans changer le programme ?
  // le « / » d'une classe de caracteres doit etre echappe, sinon il ferme
  // l'expression : c'est le piege que ce fichier est cense eviter
  var APPELLE_SUITE = /[({\[,;:=+\-*\/%&|^!?<>~]$|\b(?:return|typeof|new|in|of|case|do|else|void|delete|instanceof|await|yield)$/;
  var NE_COMMENCE_PAS = /^[)\]}.,;:=?&|*\/+<>%^]/;
  function soude(a, b){
    if(!a || !b) return false;
    if(/^(\+\+|--)/.test(b)) return false;            // a\n++b n'est pas a++b
    if(APPELLE_SUITE.test(a)) return true;
    if(NE_COMMENCE_PAS.test(b)) return true;
    return false;
  }

  function js(src){
    var lignes = sansCommentaires(src).split('\n')
      .map(function(l){ return l.replace(/[ \t]+/g, ' ').trim(); })
      .filter(Boolean);
    var out = '';
    lignes.forEach(function(l){
      if(!out){ out = l; return; }
      out += soude(out, l) ? '' : '\n';
      out += l;
    });
    return out;
  }

  /* ---------------- CSS ----------------
     Pas de point-virgule implicite ici : on peut tout mettre sur une ligne.
     Seules les chaînes (une url(), une content:) sont préservées. */
  function css(src){
    var out = '', i = 0, n = src.length;
    while(i < n){
      var c = src[i];
      if(c === '"' || c === "'"){
        var fin = c; out += c; i++;
        while(i < n){
          if(src[i] === '\\'){ out += src[i] + (src[i + 1] || ''); i += 2; continue; }
          out += src[i];
          if(src[i] === fin){ i++; break; }
          i++;
        }
        continue;
      }
      if(c === '/' && src[i + 1] === '*'){
        i += 2; while(i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2; continue;
      }
      out += c; i++;
    }
    return out
      .replace(/\s+/g, ' ')
      .replace(/\s*([{};:,>~+])\s*/g, '$1')
      // « a:not(b) » et « 1px 2px » gardent leur sens ; on ne touche qu'au
      // point-virgule qui précède une accolade fermante
      .replace(/;}/g, '}')
      .replace(/ ?!important/g, '!important')
      .trim();
  }

  /* ---------------- HTML ----------------
     On ne touche à rien à l'intérieur d'un <script>, d'un <style>, d'un
     <pre> ou d'un <textarea> : l'espace y est du contenu. */
  var INTOUCHABLE = /<(script|style|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi;
  function html(src){
    // Le repere qui met un script de cote doit etre introuvable dans un
    // document : un simple numero se serait confondu avec les chiffres du
    // texte. Un caractere nul n'existe pas dans du HTML.
    var MARQUE = '\u0000';
    var gardes = [];
    var s = String(src).replace(INTOUCHABLE, function(m){
      gardes.push(m); return MARQUE + (gardes.length - 1) + MARQUE;
    });
    s = s.replace(/<!--(?!\[if)[\s\S]*?-->/g, '')   // les commentaires conditionnels restent
         .replace(/[ \t\r\n]+/g, ' ')
         .replace(/>\s+</g, '><')
         .trim();
    return s.replace(new RegExp(MARQUE + '(\\d+)' + MARQUE, 'g'),
                     function(_, i){ return gardes[+i]; });
  }

  global.MINIFIE = {js:js, css:css, html:html, sansCommentaires:sansCommentaires};
})(typeof window!=='undefined'?window:this);
