/* ============================================================
   verif-contraste.mjs — les pastilles se lisent dans les deux thèmes
   ------------------------------------------------------------
   Un lead lit son téléphone dehors, en plein run. Le guide a deux
   thèmes, et une famille de repères y est peinte SUR UNE COULEUR DE
   CONTENU — le numéro de l'étape sur la couleur de son élément, le
   badge d'un rôle sur la couleur du job, le chapitre choisi sur
   l'accent. C'est cette famille-là qui casse, et elle a cassé deux
   fois :

   · l'encre était blanche EN DUR. En thème sombre les couleurs
     d'élément sont claires : le numéro d'une phase de feu tenait 2,41
     contre 1, celui d'une phase sans élément 2,26, et sur une phase de
     lumière c'était blanc sur blanc ;
   · éclaircir une couleur d'élément pour la détacher de son cadre l'a
     rapprochée du blanc posé dessus. Une même couleur sert des deux
     côtés : la corriger d'un côté la dégrade de l'autre.

   Le jeton --badge-ink tranche : encre sombre quand la pastille est
   claire, encre blanche quand elle est sombre. Ce test vérifie que
   CHAQUE membre de la famille le suit, dans les deux thèmes.

   Il ne lit pas la feuille de style et ne photographie pas la page :
   il demande au navigateur les couleurs RÉSOLUES de l'élément lui-même
   — var() et color-mix compris — et n'a donc besoin ni de deviner un
   fond hérité ni de démêler un pixel adouci d'un coin arrondi. Les deux
   mesures qui ont précédé se sont trompées, chacune de façon crédible :
   remonter la chaîne des parents tombait sur le dégradé d'ambiance du
   fond, et chercher l'encre dans les pixels prenait le fond de page vu
   par un coin arrondi pour une lettre.
   ============================================================ */
import {puppeteer, GUIDE, rapport} from './navigateur.mjs';

/* Chaque repère est peint sur SA propre couleur — c'est ce qui les réunit.
   Les états « choisi » n'existent qu'après le geste qui les produit : on le
   fait, plutôt que de coller la classe à la main. Coller la classe aurait
   mesuré une puce que le guide ne fabrique peut-être plus comme ça. */
const REPERES = [
  ['le numéro de l\'étape',        '.tlnode',                null],
  ['le numéro d\'un repère',       '.ovnum',                 null],
  ['la pastille d\'un segment',    '.segpill',               null],
  ['le badge de rôle d\'une ligne','.line .role',            null],
  ['le chapitre choisi',           '.floorchip.on',          null],
  ['le secteur choisi',            '.zonetab.on',            null],
  ['une place de compo choisie',   '.compchip.on',           '.compchip'],
  ['une pastille de job choisie',  '.jobrow .jobchip.on',    '.jobrow .jobchip[data-j]'],
  ['la pastille « Tous »',         '#jobAll.on',             '#jobAll'],
  ['l\'étape choisie',             '#nav .chip.navactive',   '#nav .chip']
];

const MESURE = (reperes) => {
  const lum = (r,g,b) => {
    const f = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
  };
  // getComputedStyle rend les color-mix en color(srgb …) : les deux formes
  // doivent être lues, sinon la moitié des jetons du guide échappe au calcul.
  const lis = s => {
    if(!s) return null;
    let m = /rgba?\(([^)]+)\)/.exec(s);
    if(m){ const v = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
           if(v.length > 3 && v[3] === 0) return null;   // transparent
           return [v[0], v[1], v[2]]; }
    m = /color\(srgb ([^)]+)\)/.exec(s);
    if(m){ const v = m[1].split(/[\s\/]+/).filter(Boolean).map(Number);
           if(v.length > 3 && v[3] === 0) return null;
           return [v[0]*255, v[1]*255, v[2]*255]; }
    return null;
  };
  const stops = s => {
    if(!s || s === 'none') return [];
    const out = [], re = /(rgba?\([^)]+\)|color\(srgb[^)]+\))/g;
    let m; while((m = re.exec(s))){ const c = lis(m[1]); if(c) out.push(c); }
    return out;
  };
  const ratio = (a, b) => {
    const la = lum(...a), lb = lum(...b);
    return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);
  };

  return [reperes].map(([nom, sel]) => {
    const el = document.querySelector(sel);
    if(!el) return {nom, sel, absent:true};
    const cs = getComputedStyle(el);
    const encre = lis(cs.color);
    // le fond de l'élément LUI-MÊME : uni, ou les bornes de son dégradé
    const fonds = stops(cs.backgroundImage);
    const uni = lis(cs.backgroundColor);
    if(uni) fonds.push(uni);
    if(!encre || !fonds.length) return {nom, sel, sansFond:true};
    let pire = Infinity, ou = null;
    fonds.forEach(f => { const r = ratio(encre, f); if(r < pire){ pire = r; ou = f; } });
    const px = parseFloat(cs.fontSize), gras = parseInt(cs.fontWeight, 10) >= 700;
    return {nom, sel, c: Math.round(pire*100)/100,
            seuil: (px >= 24 || (px >= 18.66 && gras)) ? 3 : 4.5,
            encre: encre.map(Math.round).join(','), fond: ou.map(Math.round).join(',')};
  });
};

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
await p.setViewport({width:1500, height:1000});
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await p.waitForSelector('.card', {timeout:15000});

/* On bascule par le BOUTON du guide, pas en posant l'attribut à la main.
   Posé à la main, le thème s'applique partout sauf sur les puces déjà
   dessinées : elles gardent l'encre de l'autre thème, et le test lit un
   rouge que personne ne verrait jamais. Le geste du lead, lui, repeint. */
const themes = [];
let manquants = 0;
for(const passe of [0, 1]){
  if(passe) { await p.click('#themeToggle'); await new Promise(r => setTimeout(r, 700)); }
  const t = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  themes.push(t);
  console.log('\n— thème ' + (t === 'light' ? 'clair' : 'sombre') + ' —');
  /* Un repère à la fois, son geste puis sa mesure. Grouper les gestes ne
     marche pas : choisir « Tous » défait le job qu'on venait de choisir, et
     « l'étape en cours » se marque au défilement, pas au clic. */
  const r = [];
  for(const rep of REPERES){
    if(rep[2]){
      await p.evaluate(g => document.querySelector(g)?.click(), rep[2]);
      // « l'étape en cours » se marque au défilement, pas au clic : on attend
      // que l'état existe, au lieu de mesurer avant qu'il soit posé
      await p.waitForSelector(rep[1], {timeout:5000}).catch(() => {});
    }
    /* On attend que la puce ait FINI de changer de couleur. Elle se remplit
       en fondu : mesurée en route, elle rendait encore la teinte de l'état
       au repos — le test lisait alors une pastille sans fond et se déclarait
       aveugle. Attendre un délai marchait à peu près ; attendre la fin de la
       transition est ce qu'on veut vraiment dire. */
    await p.evaluate(async s => {
      const e = document.querySelector(s); if(!e) return;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      // les TRANSITIONS seulement : le numéro d'étape porte une animation
      // sans fin, et l'attendre bloquait le test pour toujours
      const t = e.getAnimations().filter(a => a.constructor.name === 'CSSTransition');
      await Promise.race([Promise.all(t.map(a => a.finished.catch(() => {}))),
                          new Promise(r => setTimeout(r, 1500))]);
    }, rep[1]).catch(() => {});
    r.push((await p.evaluate(MESURE, rep))[0]);
  }
  r.forEach(o => {
    if(o.absent || o.sansFond){
      manquants++;
      console.log('  ??   ' + o.nom + ' — ' + (o.absent ? 'introuvable' : 'sans fond à lui')
                  + ' (' + o.sel + ')');
      return;
    }
    dit(o.nom + ' se lit — ' + o.c + ' contre 1', o.c >= o.seuil,
        'il en faut ' + o.seuil + ' · encre ' + o.encre + ' sur ' + o.fond);
  });
}
/* Un repère qui disparaît du guide n'est pas une bonne nouvelle : c'est ce
   test qui devient aveugle sans le dire. On le compte. */
dit('tous les repères ont été mesurés', manquants === 0, manquants + ' non mesuré(s)');
dit('les deux thèmes ont bien été vus', themes[0] !== themes[1], themes.join(' puis '));
dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s) : un repere ne se lit pas.`
               : '\nChaque pastille se lit, dans les deux themes.');
process.exit(ko ? 1 : 0);
