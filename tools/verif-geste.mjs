/* Le navigateur n'ouvre un selecteur de dossier que dans la foulee d'un geste
   de l'utilisateur. On mesure donc le temps entre le choix du fichier et
   l'appel : convertir l'image avant, c'etait 200 a 800 ms de perdus, et Chrome
   refusait. */
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');
import fs from 'fs';
import path from 'path';
import os from 'os';

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

// une vraie image sur le disque, pour passer par le vrai selecteur de fichier
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'img-'));
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
const chemin = path.join(dossier, 'fond.png');
fs.writeFileSync(chemin, png);

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
await p.setViewport({width:1600, height:950});
const bruit = []; p.on('pageerror', e => bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('carteSel'), {timeout:8000});

// on remplace le selecteur de dossier par un temoin qui note QUAND on l'appelle
await p.evaluate(() => {
  window.__temoin = {};
  window.showDirectoryPicker = async () => {
    window.__temoin.appel = performance.now();
    window.__temoin.geste = navigator.userActivation
      ? navigator.userActivation.isActive : null;
    const ecrits = {};
    return {
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      getFileHandle: async (nom, opt) => {
        if(!(nom in ecrits) && !(opt && opt.create)) throw new Error('introuvable');
        return {name:nom, createWritable: async () => ({
          write: async d => { ecrits[nom] = d.size; window.__temoin.ecrit = nom; },
          close: async () => {} })};
      }
    };
  };
  // L'invariant qui compte : le dossier est demande AVANT que l'image ne soit
  // convertie. C'est ce qui garde le geste de l'utilisateur encore valide.
  const vrai = window.IMPORTIMAGE.prepare;
  window.IMPORTIMAGE.prepare = function(f){
    window.__temoin.conversion = performance.now();
    return vrai.call(this, f);
  };
});

const attente = p.waitForFileChooser({timeout:5000});
await p.evaluate(() => {
  const s = document.getElementById('carteSel');
  s.value = '__fond__'; s.dispatchEvent(new Event('change'));
});
const chooser = await attente;
await chooser.accept([chemin]);

await p.waitForFunction(() => window.__temoin.ecrit, {timeout:8000}).catch(() => {});
const t = await p.evaluate(() => window.__temoin);

console.log('\n— le geste de l\'utilisateur —');
dit('le selecteur de dossier a bien ete demande', typeof t.appel === 'number', JSON.stringify(t));
dit('il est demande AVANT la conversion de l\'image',
    typeof t.conversion === 'number' && t.appel < t.conversion,
    JSON.stringify({dossier:t.appel, conversion:t.conversion}));
if(typeof t.conversion === 'number')
  console.log('       la conversion suit ' + Math.round(t.conversion - t.appel)
    + ' ms plus tard — c\'est ce temps-la qu\'on perdait avant');
dit('et l\'image est ecrite ensuite', !!t.ecrit, String(t.ecrit));

const etat = await p.evaluate(() => ({
  fond:CARTES[FLOORS[0].carte].fond,
  sale:window.__MS.sale()}));
dit('la carte pointe sur le nouveau fichier', /^img\/map-/.test(etat.fond || ''), etat.fond);
dit('et la strat est marquee non enregistree', etat.sale === true, String(etat.sale));
dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
fs.rmSync(dossier, {recursive:true, force:true});
console.log(ko ? `\n${ko} probleme(s).` : '\nLe dossier est demande tant que le geste est frais.');
process.exit(ko ? 1 : 0);
