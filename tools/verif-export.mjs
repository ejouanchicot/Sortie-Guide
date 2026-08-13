/* ============================================================
   verif-export.mjs — le fichier partage tient-il ses deux promesses ?
   ------------------------------------------------------------
   1. C'est le guide. On l'ouvre DEPUIS LE DISQUE, sans serveur, sans
      reseau : s'il manque une image ou une police, ca se voit ici.
   2. C'est le fichier de sauvegarde. Le Studio le rouvre et retrouve
      la strat entiere, y compris ce qui ne se lit pas a l'ecran.
   ============================================================ */
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');
import fs from 'fs';
import path from 'path';
import os from 'os';

const URL = 'http://localhost:8137/tools/studio.html';
let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox','--allow-file-access-from-files']});

/* ---------- 1. fabriquer ---------- */
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e)));
await p.goto(URL, {waitUntil:'networkidle0'});
await p.evaluate(() => { indexedDB.deleteDatabase('strat-studio');
                         localStorage.removeItem('studio_strat_courante'); });
await p.goto(URL, {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('stStratSel')?.options.length > 3, {timeout:8000});

console.log('\n— fabrication —');
const t0 = Date.now();
const doc = await p.evaluate(async () => {
  const s = window.BIBLIO.depuisGlobaux(
    {COMPO, ROLE, BUFFS, CARTES, MOB, TR, FLOORS}, 'Sortie · Nightfallens',
    window.__MS.reglages());
  return await window.EXPORTHTML.fabrique(s, {base:'../'});
});
const ko_ = Math.round(doc.length / 1024);
dit(`un seul fichier, ${ko_} Ko en ${Date.now()-t0} ms`, doc.length > 50000);
dit('plus rien a telecharger', !/(src|href)="(?!data:|#)[^"]*\.(js|css|webp|png|woff2)"/.test(doc),
    (doc.match(/(src|href)="(?!data:|#)[^"]*\.(js|css|webp|png|woff2)"/g) || []).slice(0,3).join(' '));
dit('les images sont dedans', (doc.match(/data:image\//g) || []).length > 20,
    (doc.match(/data:image\//g) || []).length + ' images');
dit('les polices aussi', (doc.match(/data:font\/woff2/g) || []).length >= 2,
    (doc.match(/data:[a-z\/+-]+/g) || []).slice(0,4).join(' '));
dit('rien ne pointe vers le site', !doc.includes('ejouanchicot.github.io'));

const f = path.join(dossier, 'sortie.html');
fs.writeFileSync(f, doc, 'utf8');

/* ---------- 2. c'est le guide ---------- */
console.log('\n— ouvert depuis le disque, reseau coupe —');
const g = await b.newPage();
const casses = [], erreurs = [];
g.on('pageerror', e => erreurs.push(String(e)));
g.on('requestfailed', r => casses.push(r.url().slice(0, 80)));
await g.setRequestInterception(true);
g.on('request', r => {
  // tout ce qui n'est pas le fichier lui-meme est un echec de l'export
  if(r.url().startsWith('file://') || r.url().startsWith('data:')) r.continue();
  else r.abort();
});
await g.goto('file:///' + f.replace(/\\/g, '/'), {waitUntil:'networkidle0'});

const vue = await g.evaluate(() => ({
  titre:document.getElementById('gTitre')?.textContent,
  sous:document.getElementById('gSous')?.textContent,
  cartes:document.querySelectorAll('.card').length,
  phases:document.querySelectorAll('#nav a').length,
  chapitres:document.querySelectorAll('#floor button').length,
  jobs:document.querySelectorAll('#jobs button').length,
  // une image qui n'a pas charge a une largeur naturelle de 0
  imgs:[...document.images].length,
  imgsKO:[...document.images].filter(i => !i.complete || i.naturalWidth === 0).length,
  police:getComputedStyle(document.querySelector('h1')).fontFamily,
  carteSVG:document.querySelectorAll('svg').length,
  fond:getComputedStyle(document.body).backgroundColor
}));
dit('le guide s\'affiche', vue.cartes > 0 && vue.phases > 0, JSON.stringify(vue));
dit('le titre vient de la strat', vue.titre === 'Sortie · Nightfallens', String(vue.titre));
dit('la composition est annoncee', /6 joueurs/.test(vue.sous || ''), String(vue.sous));
dit('les chapitres et les jobs sont la', vue.chapitres >= 2 && vue.jobs > 3, JSON.stringify(vue));
dit('toutes les images ont charge', vue.imgs > 0 && vue.imgsKO === 0, `${vue.imgsKO}/${vue.imgs} cassees`);
dit('la carte est dessinee', vue.carteSVG > 0, vue.carteSVG + ' svg');
dit('la mise en forme a suivi', vue.fond !== 'rgba(0, 0, 0, 0)', vue.fond);
dit('rien n\'est alle chercher le reseau', casses.length === 0, casses.slice(0,3).join('\n       '));
dit('aucune erreur a l\'ouverture', erreurs.length === 0, erreurs.slice(0,3).join('\n       '));

// et il reste interactif
await g.evaluate(() => document.querySelectorAll('#jobs button')[1]?.click());
const apres = await g.evaluate(() => document.querySelectorAll('.card').length);
dit('le filtre par job repond', apres > 0, String(apres));
await g.close();

/* ---------- 3. c'est le fichier de sauvegarde ---------- */
console.log('\n— relu par le Studio —');
const avant = await p.evaluate(() => ({
  chap:FLOORS.length,
  etapes:FLOORS.reduce((n,f)=>n+(f.phases||[]).length,0),
  bosses:(FLOORS[0].bosses||[]).length,
  mobs:Object.keys(MOB).length,
  trad:Object.keys(TR).length,
  echelle:window.__MS.reglages().mobScale
}));
const relu = await p.evaluate(html => {
  const s = window.EXPORTHTML.extrait(html);
  if(!s) return null;
  return {chap:s.chapitres.length,
          etapes:s.chapitres.reduce((n,c)=>n+(c.phases||[]).length,0),
          bosses:(s.cartes[s.chapitres[0].carte]?.bosses||[]).length,
          mobs:Object.keys(s.mob||{}).length,
          trad:Object.keys(s.tr||{}).length,
          echelle:s.mobScale,
          nom:s.nom};
}, doc);
dit('la strat est retrouvee', !!relu, 'bloc introuvable');
if(relu){
  dit('tous les chapitres et toutes les etapes', relu.chap===avant.chap && relu.etapes===avant.etapes,
      JSON.stringify({relu, avant}));
  dit('les points de la carte', relu.bosses===avant.bosses, `${relu.bosses} / ${avant.bosses}`);
  dit('les vignettes et les traductions', relu.mobs===avant.mobs && relu.trad>=avant.trad,
      JSON.stringify({relu, avant}));
  dit('l\'echelle des vignettes, que rien n\'affiche', relu.echelle===avant.echelle,
      `${relu.echelle} / ${avant.echelle}`);
}

// le tour complet : import -> bibliotheque -> ateliers
const tour = await p.evaluate(async html => {
  const s = window.EXPORTHTML.extrait(html);
  s.id = window.BIBLIO.id(); s.nom = 'Venue d\'ailleurs';
  await window.BIBLIO.ecris(s);
  const r = await window.BIBLIO.lis(s.id);
  return {ok:!!r, chap:(r?.chapitres||[]).length};
}, doc);
dit('elle entre dans la bibliotheque', tour.ok && tour.chap === avant.chap, JSON.stringify(tour));

// un fichier qui n'est pas un guest export doit etre refuse proprement
const refus = await p.evaluate(() =>
  window.EXPORTHTML.extrait('<html><body>bonjour</body></html>'));
dit('un fichier quelconque est refuse, pas avale', refus === null, JSON.stringify(refus));

dit('rien ne casse cote Studio', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
fs.rmSync(dossier, {recursive:true, force:true});
console.log(ko ? `\n${ko} probleme(s).` : '\nLe fichier partage tient ses deux promesses.');
process.exit(ko ? 1 : 0);
