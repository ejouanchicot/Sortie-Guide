/* ============================================================
   verif-export.mjs — le fichier partage tient-il ses deux promesses ?
   ------------------------------------------------------------
   1. C'est le guide. On l'ouvre DEPUIS LE DISQUE, sans serveur, sans
      reseau : s'il manque une image ou une police, ca se voit ici.
   2. C'est le fichier de sauvegarde. Le Studio le rouvre et retrouve
      la strat entiere, y compris ce qui ne se lit pas a l'ecran.
   ============================================================ */
import {puppeteer} from './navigateur.mjs';
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
/* Le seuil etait « > 50 000 », soit 49 Ko, sur un fichier qui en fait 1739 :
   un export tronque aux deux tiers passait sans broncher. On borne des deux
   cotes — assez gros pour porter le guide, ses images et ses polices ; pas au
   point d'avoir embarque deux fois les memes images, ce qui est arrive et que
   le commentaire de export-html.js raconte. */
dit(`un seul fichier, ${ko_} Ko en ${Date.now()-t0} ms`, ko_ > 900 && ko_ < 3000, ko_ + ' Ko');
dit('  il se termine bien', /<\/html>\s*$/.test(doc), doc.slice(-40).replace(/\n/g, ' '));
dit('plus rien a telecharger', !/(src|href)="(?!data:|#)[^"]*\.(js|css|webp|png|woff2)"/.test(doc),
    (doc.match(/(src|href)="(?!data:|#)[^"]*\.(js|css|webp|png|woff2)"/g) || []).slice(0,3).join(' '));
dit('les images sont dedans', (doc.match(/data:image\//g) || []).length > 20,
    (doc.match(/data:image\//g) || []).length + ' images');
dit('les polices aussi', (doc.match(/data:font\/woff2/g) || []).length >= 2,
    (doc.match(/data:[a-z\/+-]+/g) || []).slice(0,4).join(' '));
dit('rien ne pointe vers le site', !doc.includes('ejouanchicot.github.io'));
// La ligne du dessus ne regarde QUE les fichiers a telecharger, par leur
// extension. Un lien vers une autre page du site y echappait : il ne casse
// pas l'affichage, il ne se voit qu'en cliquant, et le fichier a deja fait
// le tour de Discord. Ici on refuse tout chemin qui suppose un site autour.
// On regarde le HTML seul : le code embarque FABRIQUE des href a l'execution
// (`href="'+esc(o.src)+'"`), ce ne sont pas des liens de la page.
const sansCode = doc.replace(/<script[\s\S]*?<\/script>/g, '');
const morts = (sansCode.match(/href="(?!data:|#|https?:|mailto:)[^"]+"/g) || []);
dit('aucun lien ne suppose le reste du site', morts.length === 0,
    [...new Set(morts)].slice(0, 3).join(' '));

// Chaque image ne doit y etre qu'UNE fois. Le bloc de sauvegarde nomme les
// memes fichiers : embarque avant le remplacement, il se voyait coller une
// seconde copie de chacune — la moitie du poids du fichier.
{
  const vus = {};
  (doc.match(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g) || []).forEach(u => {
    const cle = u.slice(0, 64);
    vus[cle] = (vus[cle] || 0) + 1;
  });
  const doubles = Object.values(vus).filter(n => n > 1).length;
  dit('aucune image embarquee deux fois', doubles === 0, doubles + ' en double');
  // le fichier de sauvegarde garde les CHEMINS : le Studio qui le relit a les
  // vraies images, et une strat reimportee n'a que faire de data: URI
  const sauv = (doc.match(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/) || [])[1] || '';
  dit('la sauvegarde garde les chemins, pas les images',
      !/data:image/.test(sauv) && /img\//.test(sauv),
      Math.round(sauv.length / 1024) + ' Ko');
}

// le code est compacte : ce fichier n'est pas relu, il est execute
{
  const scripts = doc.match(/<script>[\s\S]*?<\/script>/g) || [];
  const gros = scripts.join('');
  dit('le code est compacte', !/\n\s{2,}\S/.test(gros) && !/\/\*[\s\S]*?\*\//.test(gros),
      (gros.match(/\/\*[\s\S]{0,40}/) || [''])[0]);
  dit('les feuilles aussi', !/\/\*/.test((doc.match(/<style>[\s\S]*?<\/style>/g) || []).join('')));
}

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
// `networkidle0` ne dit rien du DECODAGE : sur une page qui ne fait aucune
// requete reseau, il est atteint alors que les images data: sont encore en
// train d'etre lues. On attend qu'elles aient toutes fini.
await g.waitForFunction(() => [...document.images].every(i => i.complete),
                        {timeout:15000}).catch(() => {});

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

/* ---------- « Mon rôle » fonctionne dans le fichier partage ----------
   L'assertion d'avant disait « apres > 0 » : vrai tant qu'il RESTE une carte,
   donc vrai aussi si le bouton ne faisait rien — et le « ?. » avalait meme
   l'absence du bouton. Elle ne pouvait pas rougir. C'etait pourtant la seule
   ligne du depot censee couvrir ce geste dans un export.

   Ce que le guide fait vraiment n'est PAS de masquer : le pied de page dit
   « clique ton job pour faire ressortir tes actions », et c'est exactement ca
   — les siennes passent en avant, les autres s'estompent. On mesure donc ce
   qui est promis, pas ce qu'on aurait pu croire. */
const avantF = await g.evaluate(() => {
  const b = [...document.querySelectorAll('#jobs .jobchip')].filter(x => x.dataset.j);
  return {boutons:b.length, job:b[0] && b[0].dataset.j,
          total:document.querySelectorAll('.line').length,
          jobsel:document.body.classList.contains('jobsel'),
          match:document.querySelectorAll('.line.match').length};
});
dit('le guide exporte a ses boutons de job', avantF.boutons > 1 && !!avantF.job,
    JSON.stringify(avantF));
dit('  et rien n\'est mis en avant au depart', !avantF.jobsel && avantF.match === 0,
    'jobsel=' + avantF.jobsel + ' match=' + avantF.match);

const apres = await g.evaluate(() => {
  const b = [...document.querySelectorAll('#jobs .jobchip')].filter(x => x.dataset.j)[0];
  b.click();
  const j = b.dataset.j;
  const lignes = [...document.querySelectorAll('.line')];
  const mis = lignes.filter(l => l.classList.contains('match'));
  const autres = lignes.filter(l => !l.classList.contains('match')
                                 && !(l.dataset.r || '').split(' ').includes('ALL'));
  const op = e => parseFloat(getComputedStyle(e).opacity);
  return {job:j, total:lignes.length, mis:mis.length,
          // une ligne mise en avant doit vraiment porter ce job
          etrangeres:mis.filter(l => !(l.dataset.r || '').split(' ').includes(j)).length,
          opMis:mis.length ? Math.min(...mis.map(op)) : null,
          opAutres:autres.length ? Math.max(...autres.map(op)) : null,
          bouton:b.classList.contains('on'),
          cartes:document.querySelectorAll('.card').length};
});
dit('cliquer un job met ses lignes en avant', apres.mis > 0 && apres.mis < apres.total,
    apres.mis + ' lignes sur ' + apres.total + ' pour ' + apres.job);
dit('  et ce sont bien les siennes', apres.etrangeres === 0,
    apres.etrangeres + ' ligne(s) sans ' + apres.job + ' dans data-r');
dit('  les autres s\'estompent pour de vrai', apres.opAutres !== null && apres.opAutres < 0.5,
    'opacite des autres : ' + apres.opAutres);
dit('  les siennes restent pleines', apres.opMis === 1, 'opacite des siennes : ' + apres.opMis);
dit('  le bouton montre qu\'il est choisi', apres.bouton);
dit('  et la page ne s\'est pas videe', apres.cartes > 0, apres.cartes + ' cartes');
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
