/* Le chemin complet de l'import, jusqu'a l'ecriture du fichier.
   Le selecteur de dossier est natif : aucun test ne peut l'ouvrir. On le
   remplace par un faux dossier en memoire, ce qui laisse tout le reste — la
   permission, la creation du fichier, l'ecriture, l'ecrasement — s'executer
   pour de vrai. */
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
await p.setViewport({width:1600, height:950});
const bruit = []; p.on('pageerror', e => bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('carteSel'), {timeout:8000});

// ---- 1. le clic demande-t-il vraiment un fichier ? ----
const attente = p.waitForFileChooser({timeout:5000}).then(() => true).catch(() => false);
await p.evaluate(() => {
  const s = document.getElementById('carteSel');
  s.value = '__fond__'; s.dispatchEvent(new Event('change'));
});
dit('l\'entree de menu ouvre bien un selecteur de fichier', await attente);

// ---- 2. le depot, avec un faux dossier ----
const r = await p.evaluate(async () => {
  const ecrits = {};
  const faussaire = {
    _perm:'granted',
    queryPermission: async () => faussaire._perm,
    requestPermission: async () => faussaire._perm,
    getFileHandle: async (nom, opt) => {
      if(!(nom in ecrits) && !(opt && opt.create)) throw new Error('introuvable');
      return {name:nom, createWritable: async () => ({
        write: async d => { ecrits[nom] = d.size; },
        close: async () => {} })};
    }
  };
  window.showDirectoryPicker = async () => faussaire;

  // une capture plausible
  const c = document.createElement('canvas');
  c.width = 2000; c.height = 1500;
  const g = c.getContext('2d');
  g.fillStyle = '#d9c9a3'; g.fillRect(0, 0, 2000, 1500);
  for(let i = 0; i < 300; i++){
    g.fillStyle = 'hsl(' + (i * 11 % 360) + ',45%,50%)';
    g.fillRect((i * 91) % 2000, (i * 53) % 1500, 60, 40);
  }
  const png = await new Promise(res => c.toBlob(res, 'image/png'));
  const prete = await window.IMPORTIMAGE.prepare(
    new File([png], 'sheol.png', {type:'image/png'}));

  const nom = window.IMPORTIMAGE.nomDeFichier('Sheol C · étage 2');
  const II = window.IMPORTIMAGE;
  const acc = await II.acces();
  const un = await II.depose(acc.dossier, prete, nom, {confirme: async () => true});
  const deux = await II.depose(acc.dossier, prete, nom, {confirme: async () => true});
  const trois = await II.depose(acc.dossier, prete, nom, {confirme: async () => false});

  // et si la permission est refusee
  faussaire._perm = 'denied';
  const refus = await II.acces();

  // et si l'utilisateur ferme le selecteur : ce n'est pas une panne
  window.showDirectoryPicker = async () => {
    const e = new Error('The user aborted a request.'); e.name = 'AbortError'; throw e; };
  const vives = await II.acces();          // la poignee memorisee court-circuite
  await window.DATAFILE.oublie('img');
  const ferme = await II.acces();

  return {nom, acces:acc.ou, un:un.ou, deux:deux.ou, trois:trois.ou,
          refus:refus.ou, pourquoi:refus.pourquoi, ferme:ferme.ou,
          ecrits, poids:prete.apres.poids, dims:prete.w + '×' + prete.h};
});

console.log('\n— le depot dans le dossier —');
dit('le dossier est obtenu avant toute conversion', r.acces === 'ok', r.acces);
dit('le fichier est cree la premiere fois', r.un === 'ajoute', r.un);
dit('la deuxieme fois c\'est un remplacement annonce', r.deux === 'remplace', r.deux);
dit('et refuser le remplacement n\'ecrit rien', r.trois === 'annule', r.trois);
// Un refus et une annulation ne se disent pas de la meme facon : l'outil
// annoncait « sans acces au dossier » quand l'utilisateur avait simplement
// ferme le selecteur — ou quand le geste avait expire.
dit('sans permission, on le dit ET on l\'explique',
    r.refus === 'refuse' && /permission/i.test(r.pourquoi || ''),
    r.refus + ' / ' + r.pourquoi);
dit('fermer le selecteur n\'est PAS une panne', r.ferme === 'annule', r.ferme);
dit('l\'image ecrite a bien le poids converti',
    r.ecrits[r.nom] === r.poids, JSON.stringify(r.ecrits) + ' vs ' + r.poids);
console.log('       ' + r.nom + ' · ' + r.dims + ' · ' + Math.round(r.poids/1024) + ' Ko');

dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));
await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nLe chemin complet fonctionne, jusqu\'a l\'ecriture.');
process.exit(ko ? 1 : 0);
