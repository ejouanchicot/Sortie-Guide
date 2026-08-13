/* ============================================================
   verif-enregistrer.mjs — le geste d'enregistrer, vu du lead
   ------------------------------------------------------------
   Deux reproches, tous deux justes :

   1. Le bouton ne repondait pas. Enregistrer prend un aller-retour
      disque ; sans rien a l'ecran on ne sait pas si le clic a porte,
      alors on reclique.
   2. La premiere sauvegarde demandait de designer DEUX fichiers,
      js/data.js puis js/i18n.js. Un lead veut enregistrer sa strat,
      pas piloter une arborescence — ces noms ne le regardent pas.

   Le navigateur n'accorde pas l'ecriture sans un geste : la question
   ne peut pas disparaitre. Elle peut ne se poser QU'UNE fois, et
   porter sur le dossier du projet, qui se reconnait.

   Les selecteurs natifs ne s'ouvrent pas dans un navigateur pilote :
   on les remplace par un faux EN MEMOIRE, qui les compte. Tout le
   reste — permission, lecture, remplacement bloc a bloc, ecriture —
   s'execute pour de vrai.
   ============================================================ */
import {puppeteer, STUDIO, RACINE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];

// le vrai contenu des deux fichiers : sans lui le remplacement bloc a bloc
// echouerait, et on testerait le message d'erreur au lieu du geste
const src = {
  'data.js': await (await fetch(RACINE + '/js/data.js')).text(),
  'i18n.js': await (await fetch(RACINE + '/js/i18n.js')).text()
};

async function page(opts) {
  opts = opts || {};
  const p = await b.newPage();
  p.on('pageerror', e => bruit.push(String(e)));
  await p.setViewport({width:1600, height:950});
  await p.evaluateOnNewDocument(o => {
    window.__vus = {fichier:0, dossier:0};
    window.__ecrit = {};
    window.__suite = [];
    const fichier = (nom, texte) => ({
      kind:'file', name:nom,
      queryPermission:async()=>'granted', requestPermission:async()=>'granted',
      getFile:async()=>({text:async()=>texte}),
      createWritable:async()=>({
        // en LISTE autant qu'en table : deux ecritures du meme fichier ne
        // laissent qu'une entree dans __ecrit, et passeraient inapercues
        write:async t => { await new Promise(r=>setTimeout(r, o.lenteur||0));
                           window.__ecrit[nom] = t; window.__suite.push(nom); },
        close:async()=>{} })
    });
    window.showOpenFilePicker = async () => {
      window.__vus.fichier++; return [fichier('data.js', window.__src['data.js'])]; };
    window.showDirectoryPicker = async () => {
      window.__vus.dossier++;
      if (o.mauvais) return {kind:'directory', name:'Téléchargements',
        getDirectoryHandle: async () => { throw new Error('absent'); },
        getFileHandle: async () => { throw new Error('absent'); }};
      const permis = {queryPermission:async()=>'granted', requestPermission:async()=>'granted'};
      const js  = Object.assign({kind:'directory', name:'js'}, permis,
        {getFileHandle: async n => fichier(n, window.__src[n] || '')});
      const img = Object.assign({kind:'directory', name:'img'}, permis,
        {getFileHandle: async n => fichier(n, '')});
      return Object.assign({kind:'directory', name:'Sortie-Guide'}, permis, {
        getDirectoryHandle: async n => { if(n==='js') return js;
                                         if(n==='img') return img;
                                         throw new Error('absent'); },
        getFileHandle: async n => fichier(n, window.__src[n] || '')});
    };
  }, opts);
  await p.goto(STUDIO, {waitUntil:'networkidle0'});
  await p.waitForFunction(() => document.getElementById('stStratSel')?.options.length > 3,
                          {timeout:9000});
  await p.evaluate(s => { window.__src = s; }, src);
  return p;
}

const etat = p => p.evaluate(() => {
  const el = document.getElementById('stSave');
  const r = el.getBoundingClientRect();
  const voisin = document.getElementById('stReload').getBoundingClientRect();
  return {mot: el.querySelector('.st-lbl')?.textContent,
          cours: el.classList.contains('encours'), fait: el.classList.contains('fait'),
          inactif: el.disabled,
          // la geometrie, pour verifier que changer de libelle ne pousse rien
          boite: [r.width, r.height, r.left, voisin.left].map(v => Math.round(v * 10) / 10)};
});
// ce qui se VOIT : la modale reste dans le DOM une fois fermee
const modaleVisible = p => p.evaluate(() =>
  [...document.querySelectorAll('button')]
    .filter(x => /Choisir le dossier/.test(x.textContent))
    .some(x => { const r = x.getBoundingClientRect();
                 return r.width > 0 && r.height > 0 && x.offsetParent !== null; }));
const repondreModale = p => p.evaluate(() =>
  [...document.querySelectorAll('button')]
    .find(x => /Choisir le dossier/.test(x.textContent))?.click());

/* ---------------- 1. la premiere fois ---------------- */
console.log('\n— la premiere sauvegarde —');
let p = await page({lenteur:500});
const auRepos = await etat(p);
dit('au repos, le bouton dit « Enregistrer »', auRepos.mot === 'Enregistrer');

p.evaluate(() => document.getElementById('stSave').click());
await new Promise(r => setTimeout(r, 350));
dit('on explique d\'abord ce qui va etre demande', await modaleVisible(p));
await repondreModale(p);

await new Promise(r => setTimeout(r, 250));
const pendant = await etat(p);
dit('pendant l\'ecriture, le bouton le dit', pendant.mot === 'En cours…', pendant.mot);
dit('et devient inactif, pour ne pas partir deux fois', pendant.inactif === true);
dit('son icone tourne', pendant.cours === true);
// Un bouton qui s'elargit pousse toute la barre du haut : c'etait 39 px, et
// tout ce qui se trouve a sa gauche sautait a chaque enregistrement.
dit('il n\'a pas change de taille ni bouge ses voisins',
    JSON.stringify(pendant.boite) === JSON.stringify(auRepos.boite),
    'repos ' + JSON.stringify(auRepos.boite) + ' · pendant ' + JSON.stringify(pendant.boite));

// un second clic pendant l'ecriture ne doit rien relancer
await p.evaluate(() => document.getElementById('stSave').click());
await new Promise(r => setTimeout(r, 1400));

const apres = await etat(p);
dit('une fois fini, il annonce que c\'est fait', apres.mot === 'Enregistré', apres.mot);
dit('et le montre', apres.fait === true);
dit('sans avoir bouge non plus',
    JSON.stringify(apres.boite) === JSON.stringify(auRepos.boite),
    'repos ' + JSON.stringify(auRepos.boite) + ' · apres ' + JSON.stringify(apres.boite));

const vus = await p.evaluate(() => window.__vus);
dit('une seule question posee, et c\'est un DOSSIER',
    vus.dossier === 1 && vus.fichier === 0, JSON.stringify(vus));
dit('les deux fichiers sont ecrits, d\'un seul choix',
    JSON.stringify(Object.keys(await p.evaluate(() => window.__ecrit)).sort())
      === '["data.js","i18n.js"]',
    JSON.stringify(await p.evaluate(() => Object.keys(window.__ecrit))));
// ce qui est ecrit doit etre le fichier ENTIER remplace bloc a bloc, pas un bout
dit('et ils gardent tout ce qui n\'etait pas a changer',
    await p.evaluate(() => window.__ecrit['data.js'].includes('const CARTES=')
                        && window.__ecrit['data.js'].length > 10000));

await new Promise(r => setTimeout(r, 1500));
dit('puis le bouton revient au repos tout seul', (await etat(p)).mot === 'Enregistrer');

/* ---------------- 2. toutes les fois d'apres ---------------- */
console.log('\n— les fois suivantes —');
await p.evaluate(() => { window.__vus = {fichier:0, dossier:0}; window.__ecrit = {}; });
await p.evaluate(() => document.getElementById('stSave').click());
await new Promise(r => setTimeout(r, 400));
dit('on ne rexplique rien', (await modaleVisible(p)) === false);
await new Promise(r => setTimeout(r, 1600));
dit('et on ne redemande rien',
    JSON.stringify(await p.evaluate(() => window.__vus)) === '{"fichier":0,"dossier":0}',
    JSON.stringify(await p.evaluate(() => window.__vus)));
dit('la sauvegarde se fait quand meme',
    (await p.evaluate(() => Object.keys(window.__ecrit))).length === 2);

/* ---------------- 2 bis. ce que la sauvegarde offre au reste ---------------- */
console.log('\n— poser une image de fond, apres avoir enregistre —');
// img/ est DANS le dossier du projet : une fois celui-ci autorise, le navigateur
// etend l'autorisation a ses descendants. Il n'y a plus rien a demander.
await p.evaluate(() => { window.__vus = {fichier:0, dossier:0}; });
const img = await p.evaluate(async () => {
  const d = await IMPORTIMAGE.dossierPret();
  return {trouve: !!d, nom: d && d.name};
});
dit('le dossier img est deja accessible', img.trouve === true, JSON.stringify(img));
dit('il vient bien du projet', img.nom === 'img', String(img.nom));
dit('et personne n\'a rien redemande',
    JSON.stringify(await p.evaluate(() => window.__vus)) === '{"fichier":0,"dossier":0}',
    JSON.stringify(await p.evaluate(() => window.__vus)));

// et a l'ecran : l'entree de menu ne doit plus annoncer une autorisation a
// donner, puisqu'elle est deja la. Sans sauvegarde prealable elle le fait
// toujours — c'est ce que verifie verif-depot.
await p.evaluate(() => { const s = document.getElementById('carteSel');
  s.value = '__fond__'; s.dispatchEvent(new Event('change')); });
await new Promise(r => setTimeout(r, 700));
const annonce = await p.evaluate(() => {
  const m = document.getElementById('modal');
  return (m && m.checkVisibility()) ? m.textContent.replace(/\s+/g,' ').trim() : '';
});
dit('on ne propose plus de « choisir le dossier img »',
    !/choisir le dossier/i.test(annonce), annonce.slice(0, 80) || '(aucune boite)');
await p.close();

/* ---------------- 2 ter. un seul Ctrl+S, un seul enregistrement ---------------- */
console.log('\n— Ctrl+S ne doit declencher QU\'UNE ecriture —');
// Les deux ateliers gardent leur propre Ctrl+S, pour quand on les ouvre seuls.
// Sous la coque, ils s'effacent devant elle : sinon un seul appui lançait deux
// ecritures concurrentes sur data.js, chacune lisant le fichier avant que
// l'autre n'ecrive — la derniere arrivee effaçait les blocs de la premiere.
p = await page({});
dit('le bouton Enregistrer de l\'atelier Carte est masque par la coque',
    await p.evaluate(() => { const el = document.getElementById('btnSave');
      return !el || el.offsetParent === null; }));

p.evaluate(() => document.getElementById('stSave').click());
await new Promise(r => setTimeout(r, 350));
await repondreModale(p);
await new Promise(r => setTimeout(r, 1500));
// tout est autorise : on repart a zero et on tape le raccourci
await p.evaluate(() => { window.__vus = {fichier:0, dossier:0};
                         window.__ecrit = {}; window.__suite = []; });
await p.keyboard.down('Control'); await p.keyboard.press('s'); await p.keyboard.up('Control');
await new Promise(r => setTimeout(r, 2000));
dit('aucun second selecteur ne surgit',
    JSON.stringify(await p.evaluate(() => window.__vus)) === '{"fichier":0,"dossier":0}',
    JSON.stringify(await p.evaluate(() => window.__vus)));
const suite = await p.evaluate(() => window.__suite);
dit('data.js n\'est ecrit QU\'UNE fois',
    suite.filter(n => n === 'data.js').length === 1, JSON.stringify(suite));
dit('et la version anglaise aussi',
    suite.filter(n => n === 'i18n.js').length === 1, JSON.stringify(suite));
await p.close();

/* ---------------- 3. le mauvais dossier ---------------- */
console.log('\n— si on designe le mauvais dossier —');
p = await page({mauvais:true});
p.evaluate(() => document.getElementById('stSave').click());
await new Promise(r => setTimeout(r, 350));
await repondreModale(p);
await new Promise(r => setTimeout(r, 900));
const msg = await p.evaluate(() => {
  const t = document.querySelector('#stToast, .st-toast, #toast');
  return t ? t.textContent : '';
});
dit('on le dit, en nommant ce qu\'on cherchait', /dossier/i.test(msg) && /data\.js/.test(msg), msg);
dit('et rien n\'a ete ecrit',
    (await p.evaluate(() => Object.keys(window.__ecrit))).length === 0);
dit('le bouton est revenu au repos', (await etat(p)).mot === 'Enregistrer');

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nUne seule question, sur le dossier — et le bouton dit ce qu\'il fait.');
process.exit(ko ? 1 : 0);
