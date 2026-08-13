/* ============================================================
   verif-marque.mjs — ce que voit quelqu'un qui n'a pas ouvert la page
   ------------------------------------------------------------
   Un guide se partage sur Discord. Avant d'etre lu, il est vu :
   un onglet, et un encart d'apercu. Ces deux-la ne se testent
   jamais en travaillant, parce qu'on regarde toujours la page
   deja ouverte — et ils avaient justement pris du retard, le
   guide s'annoncant encore sous un nom que l'outil n'utilise
   plus nulle part ailleurs.

   Piege a garder en tete : Discord ne lit QUE le HTML, jamais le
   JavaScript. Le <title> ecrit en dur et celui que pose app.js
   sont donc deux choses differentes, qui doivent se rejoindre.
   ============================================================ */
import {puppeteer, GUIDE, STUDIO, RACINE, rapport} from './navigateur.mjs';

const OUTIL = 'FFXI Strat Studio';
const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];

const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1400, height:900});

// Le HTML seul, sans JavaScript : c'est exactement ce que Discord recupere.
await p.setJavaScriptEnabled(false);
await p.goto(GUIDE, {waitUntil:'domcontentloaded'});
const nu = await p.evaluate(() => {
  const m = n => (document.querySelector(`meta[property="${n}"],meta[name="${n}"]`) || {}).content || null;
  return {titre: document.title, site: m('og:site_name'), og: m('og:title'),
          image: m('og:image'), desc: m('og:description'),
          theme: m('theme-color'), type: m('og:type')};
});

console.log('\n— l\'apercu Discord (HTML seul, sans JavaScript) —');
dit('l\'outil se nomme dans og:site_name', nu.site === OUTIL, nu.site);
dit('og:title annonce le contenu, pas l\'outil',
    !!nu.og && !nu.og.includes(OUTIL), nu.og);
dit('le titre en dur nomme le contenu ET l\'outil',
    nu.titre.includes(OUTIL) && nu.titre.indexOf(OUTIL) > 0, nu.titre);
dit('une description est proposee', !!nu.desc && nu.desc.length > 30);
dit('l\'apercu est declare comme une vraie page', nu.type === 'website', nu.type);

// une image d'apercu qui renvoie 404 laisse un encart vide sur Discord
const img = nu.image ? await fetch(nu.image.replace(/^https?:\/\/[^/]+\/[^/]+/, RACINE)) : null;
dit('l\'image d\'apercu existe vraiment', !!img && img.ok,
    nu.image + (img ? ' → ' + img.status : ' (absente)'));

/* ---------------- la page ouverte, JavaScript compris ---------------- */
await p.setJavaScriptEnabled(true);
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('gTitre')?.textContent.trim().length > 1,
                        {timeout:8000});

const vu = await p.evaluate(() => {
  const a = document.querySelector('.bmark'), img = a && a.querySelector('img');
  const h1 = document.getElementById('gTitre');
  const ra = a && a.getBoundingClientRect(), rh = h1 && h1.getBoundingClientRect();
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  return {titre: document.title, nom: h1 && h1.textContent.trim(),
          marque: !!a, lien: a && a.getAttribute('href'),
          nomme: a && (a.getAttribute('title') || '') + (a.getAttribute('aria-label') || ''),
          chargee: img ? (img.complete && img.naturalWidth > 0) : false,
          largeur: ra ? Math.round(ra.width) : 0,
          chevauche: (ra && rh) ? ra.right > rh.left + 1 : null,
          deborde: document.documentElement.scrollWidth > window.innerWidth + 1,
          bg};
});

console.log('\n— l\'onglet, une fois la page ouverte —');
// app.js REECRIT le titre : s'il oublie l'outil, seul Discord resterait a jour
dit('le titre pose par le code nomme aussi l\'outil', vu.titre.includes(OUTIL), vu.titre);
dit('il commence par le nom de la strat', vu.titre.startsWith(vu.nom),
    `« ${vu.titre} » pour la strat « ${vu.nom} »`);

console.log('\n— la marque dans l\'en-tete —');
dit('elle est la', vu.marque);
dit('son image se charge', vu.chargee);
dit('elle mene a l\'atelier', vu.lien === 'tools/studio.html', vu.lien);
dit('elle se nomme pour qui n\'y voit rien', /atelier/i.test(vu.nomme || ''), vu.nomme);
dit('elle ne mange pas le titre de la strat', vu.chevauche === false);
dit('la page ne deborde pas en largeur', vu.deborde === false);
// la barre du navigateur se teinte de theme-color : si elle jure avec le fond,
// la jointure se voit en haut de l'ecran sur mobile
dit('la couleur de barre est bien celle du fond', nu.theme === vu.bg,
    `theme-color ${nu.theme} / --bg ${vu.bg}`);

// et le lien ne doit pas tomber dans le vide
const atelier = await fetch(RACINE + '/tools/studio.html');
dit('l\'atelier repond au bout du lien', atelier.ok, 'HTTP ' + atelier.status);

console.log('\n— en clair, et sur un telephone —');
for (const [nom, theme, larg] of [['theme clair', 'light', 1400], ['telephone', 'dark', 390]]) {
  const q = await b.newPage();
  q.on('pageerror', e => bruit.push(String(e)));
  await q.setViewport({width:larg, height:900});
  await q.evaluateOnNewDocument(t => { try { localStorage.setItem('sortie_theme', t); } catch(e){} }, theme);
  await q.goto(GUIDE, {waitUntil:'networkidle0'});
  await new Promise(r => setTimeout(r, 500));
  const r = await q.evaluate(() => {
    const a = document.querySelector('.bmark'), h1 = document.getElementById('gTitre');
    const ra = a && a.getBoundingClientRect(), rh = h1 && h1.getBoundingClientRect();
    return {visible: !!ra && ra.width > 0 && getComputedStyle(a).visibility !== 'hidden',
            large: ra ? Math.round(ra.width) : 0,
            chevauche: (ra && rh) ? ra.right > rh.left + 1 : null,
            deborde: document.documentElement.scrollWidth > window.innerWidth + 1};
  });
  dit(`${nom} : la marque reste visible et a sa place`,
      r.visible && r.chevauche === false && !r.deborde,
      `${r.large}px, chevauche=${r.chevauche}, deborde=${r.deborde}`);
  await q.close();
}

console.log('\n— les deux pages parlent du meme outil —');
const s = await b.newPage();
s.on('pageerror', e => bruit.push(String(e)));
await s.goto(STUDIO, {waitUntil:'networkidle0'});
const cote = await s.evaluate(() => document.title);
dit('l\'atelier porte le meme nom que celui que le guide annonce',
    cote.includes(OUTIL.replace('FFXI ', '')) || cote.includes(OUTIL),
    `atelier : « ${cote} »`);

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLe guide s\'annonce sous le bon nom, dans l\'onglet comme sur Discord.');
process.exit(ko ? 1 : 0);
