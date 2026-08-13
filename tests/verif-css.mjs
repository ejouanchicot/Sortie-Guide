/* ============================================================
   verif-css.mjs — les couleurs arrivent-elles jusqu'a l'ecran ?
   ------------------------------------------------------------
   Un jeton absent ne fait pas d'erreur : « background:var(--s1) »
   sans --s1 rend la declaration invalide, et l'element retombe sur
   transparent. Aucune console ne le signale. C'est exactement ce
   qui est arrive au menu des cartes, blanc pendant des semaines,
   parce que le generateur de map-studio.confine.css avait perdu une ligne
   de declarations.

   On verifie donc deux choses, du plus general au plus visible :
     1. tout jeton utilise dans une feuille y est defini ;
     2. rien de ce qui doit etre sombre ne rend clair.
   ============================================================ */
import {puppeteer} from './navigateur.mjs';

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
await p.setViewport({width:1600, height:950});
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('carteSel'), {timeout:8000});

/* Un controle global « tout var() a une definition » ne marche pas ici : le
   projet pose beaucoup de jetons a l'execution, element par element (--ac par
   carte, --pc par etape), et sur cette page-ci les elements concernes
   n'existent pas tous. Il criait donc au loup vingt fois.

   Ce qui a casse est plus precis, et se verifie sans ambiguite : la feuille
   confinee est GENEREE, et elle avait perdu des declarations en route. On
   exige donc que tout jeton declare par la source arrive jusqu'au panneau. */
console.log('\n— les jetons du panneau Carte —');
const source = await (await fetch('http://localhost:8137/tools/map-studio.css')).text();
const attendus = [...new Set([...source.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(m => m[1]))];
const manquants = await p.evaluate(noms => {
  const el = document.getElementById('stCtxMap');   // porte la classe .ms
  const c = getComputedStyle(el);
  return noms.filter(n => !c.getPropertyValue(n).trim());
}, attendus);
dit(`les ${attendus.length} jetons de la source arrivent au panneau`, manquants.length === 0,
    manquants.join(', '));

console.log('\n— les jetons des feuilles —');
const jetons = await p.evaluate(() => {
  const utilises = new Map();     // nom -> [feuilles qui s'en servent]
  const definis = new Set();
  for(const sh of document.styleSheets){
    let regles;
    try{ regles = [...sh.cssRules]; }catch(e){ continue; }
    const nom = (sh.href || '').split('/').pop() || 'inline';
    // Depuis que le CSS accepte l'imbrication, TOUTE regle possede un
    // `cssRules` — vide le plus souvent. Sauter des qu'il existe revenait a
    // ne visiter que les @media : 38 regles sur 868.
    const parcours = rs => { for(const r of rs){
      if(r.style){
        for(const prop of r.style){ if(prop.startsWith('--')) definis.add(prop); }
        let m; const re = /var\((--[a-zA-Z0-9-]+)/g;
        while((m = re.exec(r.cssText))){
          if(!utilises.has(m[1])) utilises.set(m[1], new Set());
          utilises.get(m[1]).add(nom);
        }
      }
      if(r.cssRules && r.cssRules.length) parcours([...r.cssRules]);
    }};
    parcours(regles);
  }
  // Beaucoup de jetons ne sont pas declares dans une feuille mais poses
  // element par element depuis le code — un accent par carte, une couleur par
  // etape. Ils comptent comme definis : ce qu'on traque, c'est le jeton que
  // PERSONNE ne definit.
  document.querySelectorAll('[style]').forEach(e => {
    for(const prop of e.style){ if(prop.startsWith('--')) definis.add(prop); }
  });
  return {utilises:[...utilises].map(([k, v]) => [k, [...v]]), definis:[...definis]};
});
const def = new Set(jetons.definis);
const orphelins = jetons.utilises.filter(([k]) => !def.has(k));
// Ceux-la sont poses a l'execution sur des elements que cette page n'affiche
// pas : on les compte, on ne s'en alarme pas. Le chiffre reste sous les yeux —
// s'il double d'un coup, c'est qu'une feuille a perdu quelque chose.
console.log(`       ${jetons.utilises.length} jetons utilises, ${def.size} definis dans les feuilles`);
console.log(`       ${orphelins.length} poses a l'execution : ` + orphelins.map(([k]) => k).join(' '));
dit('aucune feuille n\'a perdu ses jetons de base',
    ['--bg','--s1','--s2','--s3','--s4','--line','--tx','--cyan','--accent']
      .every(k => def.has(k)),
    ['--bg','--s1','--s2','--s3','--s4','--line','--tx','--cyan','--accent']
      .filter(k => !def.has(k)).join(', '));

// Et surtout : ils resolvent VRAIMENT sur les elements de la page. Un jeton
// peut etre defini sous un selecteur qui ne couvre pas l'element qui l'emploie.
console.log('\n— ce qui doit etre sombre l\'est —');
const clairs = await p.evaluate(() => {
  const clair = c => {
    const m = /rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/.exec(c || '');
    if(!m) return false;
    if(m[4] !== undefined && +m[4] < 0.5) return false;       // transparent : pas notre affaire
    return (+m[1] + +m[2] + +m[3]) / 3 > 140;                 // clair sur fond sombre
  };
  const out = [];
  document.querySelectorAll('select, option, .st-btn, .tbtn, .st-tab').forEach(e => {
    const c = getComputedStyle(e);
    if(clair(c.backgroundColor) && !e.classList.contains('on') && !e.classList.contains('primary'))
      out.push((e.tagName + '#' + (e.id || '') + '.' + (e.className || '')).slice(0, 60)
               + ' → ' + c.backgroundColor);
  });
  return out;
});
dit('aucun champ ni bouton ne rend clair', clairs.length === 0, clairs.slice(0,6).join('\n       '));

// le cas precis qui a casse : le menu des cartes et sa liste deroulante
const menus = await p.evaluate(() => {
  const q = id => { const e = document.getElementById(id); if(!e) return null;
    const o = e.options && e.options[0];
    return {champ:getComputedStyle(e).backgroundColor,
            liste:o ? getComputedStyle(o).backgroundColor : '(vide)'}; };
  return {carte:q('carteSel'), strat:q('stStratSel')};
});
const opaque = c => /^rgb\(/.test(c || '');
dit('le menu des cartes a un fond opaque', opaque(menus.carte?.champ), JSON.stringify(menus.carte));
dit('sa liste deroulante aussi', opaque(menus.carte?.liste), JSON.stringify(menus.carte));
dit('celle des strats aussi', opaque(menus.strat?.liste), JSON.stringify(menus.strat));

// la feuille confinee doit dire la MEME chose que sa source
console.log('\n— la feuille confinee vaut sa source —');
const p2 = await b.newPage();
await p2.setViewport({width:1600, height:950});
await p2.goto('http://localhost:8137/tools/map-studio.html', {waitUntil:'networkidle0'});
await p2.waitForFunction(() => document.getElementById('carteSel'), {timeout:8000});
const lire = async (page) => page.evaluate(() => {
  const e = document.getElementById('carteSel'), c = getComputedStyle(e);
  return {fond:c.backgroundColor, texte:c.color,
          s1:c.getPropertyValue('--s1').trim(), s4:c.getPropertyValue('--s4').trim(),
          bg:c.getPropertyValue('--bg').trim()};
});
const [a, z] = [await lire(p), await lire(p2)];
dit('memes jetons des deux cotes',
    a.s1 === z.s1 && a.s4 === z.s4 && a.bg === z.bg, JSON.stringify({unifie:a, seul:z}));
dit('meme rendu du menu des cartes', a.fond === z.fond && a.texte === z.texte,
    JSON.stringify({unifie:a, seul:z}));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nLes couleurs arrivent jusqu\'a l\'ecran.');
process.exit(ko ? 1 : 0);
