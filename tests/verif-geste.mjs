/* ============================================================
   verif-geste.mjs — deux selecteurs, deux gestes
   ------------------------------------------------------------
   Un navigateur n'ouvre un selecteur — de fichier comme de dossier —
   que sur un vrai geste de l'utilisateur, et chaque selecteur CONSOMME
   ce geste. L'evenement « change » d'un champ de fichier n'en produit
   pas un nouveau : apres le choix de l'image, il ne reste plus rien
   pour demander le dossier. D'ou « SecurityError: Must be handling a
   user gesture ».

   Ce test rejoue exactement ca : un faux showDirectoryPicker qui
   REFUSE quand il n'y a pas de geste, comme le vrai. Le parcours doit
   passer quand meme — parce qu'il demande le dossier depuis son propre
   bouton, avant d'ouvrir le selecteur de fichier.
   ============================================================ */
import {puppeteer} from './navigateur.mjs';
import fs from 'fs';
import path from 'path';
import os from 'os';

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'img-'));
const chemin = path.join(dossier, 'fond.png');
fs.writeFileSync(chemin, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'));

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
await p.setViewport({width:1600, height:950});
const bruit = []; p.on('pageerror', e => bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('carteSel'), {timeout:8000});

// un selecteur de dossier qui se comporte comme le vrai : il exige un geste
await p.evaluate(() => {
  window.__t = {appels:[], ecrit:null};
  const ecrits = {};
  window.showDirectoryPicker = async () => {
    const geste = navigator.userActivation ? navigator.userActivation.isActive : true;
    window.__t.appels.push({geste});
    if(!geste){
      const e = new Error("Failed to execute 'showDirectoryPicker' on 'Window': "
        + 'Must be handling a user gesture to show a file picker.');
      e.name = 'SecurityError'; throw e;
    }
    return {
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      getFileHandle: async (nom, opt) => {
        if(!(nom in ecrits) && !(opt && opt.create)) throw new Error('introuvable');
        return {name:nom, createWritable: async () => ({
          write: async d => { ecrits[nom] = d.size; window.__t.ecrit = nom; },
          close: async () => {} })};
      }
    };
  };
  // l'ordre reel des selecteurs, pour le lire ensuite
  const vrai = window.IMPORTIMAGE.prepare;
  window.IMPORTIMAGE.prepare = function(f){ window.__t.conversion = true; return vrai.call(this, f); };
});

console.log('\n— le premier import : deux etapes —');
// on entre par le menu, comme un utilisateur (un vrai clic, donc un geste)
await p.evaluate(() => {
  const s = document.getElementById('carteSel');
  s.value = '__fond__'; s.dispatchEvent(new Event('change'));
});
await p.waitForSelector('#modal', {visible:true, timeout:4000}).catch(() => {});
const d1 = await p.evaluate(() => {
  const m = document.getElementById('modal');
  return {visible:!!m && m.checkVisibility(),
          texte:(m?.textContent || '').replace(/\s+/g, ' ').trim()};
});
dit('il explique d\'abord ou l\'image sera rangee',
    d1.visible && /dossier .?img/i.test(d1.texte), JSON.stringify(d1).slice(0,160));

// le clic sur le bouton EST le geste qui autorise le selecteur de dossier
const chooser = p.waitForFileChooser({timeout:6000});
await p.evaluate(() => [...document.querySelectorAll('#modal button')]
  .find(x => /dossier/i.test(x.textContent))?.click());
await p.waitForFunction(() => window.__t.appels.length > 0, {timeout:4000});
const ap = await p.evaluate(() => window.__t.appels);
dit('le selecteur de dossier est demande avec un geste valide',
    ap.length === 1 && ap[0].geste !== false, JSON.stringify(ap));

// puis une seconde etape, et son propre bouton, pour l'image
await p.waitForFunction(() => {
  const m = document.getElementById('modal');
  return m && m.checkVisibility() && /image/i.test(m.textContent); }, {timeout:4000}).catch(() => {});
const d2 = await p.evaluate(() => (document.getElementById('modal')?.textContent || '').slice(0, 90));
dit('puis il demande l\'image, dans une seconde etape', /image/i.test(d2), d2);

await p.evaluate(() => [...document.querySelectorAll('#modal button')]
  .find(x => /image/i.test(x.textContent))?.click());
const fc = await chooser;
await fc.accept([chemin]);

await p.waitForFunction(() => window.__t.ecrit, {timeout:8000}).catch(() => {});
const fin = await p.evaluate(() => ({
  ecrit:window.__t.ecrit, appels:window.__t.appels.length,
  fond:CARTES[FLOORS[0].carte].fond, sale:window.__MS.sale()}));
dit('l\'image est ecrite dans le dossier', !!fin.ecrit, String(fin.ecrit));
dit('la carte pointe sur le nouveau fichier', /^img\/cartes\/map-/.test(fin.fond || ''), fin.fond);
dit('et la strat est marquee non enregistree', fin.sale === true, String(fin.sale));
dit('aucun appel n\'a echoue faute de geste',
    !(await p.evaluate(() => window.__t.appels.some(a => a.geste === false))));

console.log('\n— les fois suivantes : un seul geste —');
// la poignee est memorisee ; le parcours doit aller droit au selecteur de fichier
const chooser2 = p.waitForFileChooser({timeout:6000});
await p.evaluate(() => {
  window.__t.appels.length = 0;
  const s = document.getElementById('carteSel');
  s.value = '__fond__'; s.dispatchEvent(new Event('change'));
});
const ok2 = await chooser2.then(() => true).catch(() => false);
dit('le selecteur de fichier s\'ouvre directement', ok2);
dit('sans redemander le dossier',
    (await p.evaluate(() => window.__t.appels.length)) === 0);

dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
fs.rmSync(dossier, {recursive:true, force:true});
console.log(ko ? `\n${ko} probleme(s).`
                : '\nDeux gestes la premiere fois, un seul ensuite.');
process.exit(ko ? 1 : 0);
