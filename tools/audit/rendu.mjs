/* ============================================================
   rendu.mjs — la page tient-elle debout ?
   ------------------------------------------------------------
   Les quatre questions qu'on se pose après CHAQUE retouche du
   contenu, et qu'on finissait par réécrire à la main à chaque fois :

     · une marque se lit-elle à l'écran ? « [c:or]… » qui sort en
       toutes lettres est la panne la plus fréquente du guide.
     · la console crie-t-elle ?
     · quelque chose déborde-t-il, du téléphone au grand écran ?
     · et dans les deux thèmes ?

   Un seul navigateur pour tout ça, une vingtaine de secondes. À
   lancer après toute modif de js/data.js, avant la suite de tests.

     node tools/audit/rendu.mjs            les deux étages + l'atelier
     node tools/audit/rendu.mjs --guide    juste le guide, plus rapide

   Sortie 0 si tout va bien, 1 sinon.
   ============================================================ */
import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {join, dirname} from 'path';
import {puppeteer} from '../../tests/navigateur.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const PORT = 8137;
const SEUL_GUIDE = process.argv.includes('--guide');
const MARQUE = /\[\/?(b|i|c:|c\]|t:|t\])/;

async function debout(){
  try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 1200);
    const r = await fetch(`http://localhost:${PORT}/index.html`, {signal:c.signal});
    clearTimeout(t); return r.ok; } catch(e){ return false; }
}
let serveur = null;
if(!(await debout())){
  serveur = spawn(process.execPath, [join(RACINE, 'tests', 'serveur.mjs')],
                  {cwd: RACINE, stdio: 'ignore'});
  for(let i = 0; i < 25 && !(await debout()); i++) await new Promise(r => setTimeout(r, 200));
  if(!(await debout())){ console.log('Le serveur ne répond pas.'); serveur.kill(); process.exit(1); }
}

const soucis = [];
const dit = (t, ok, d) => { console.log((ok ? '  ok   ' : '  KO   ') + t + (ok || !d ? '' : '\n         ' + d));
  if(!ok) soucis.push(t); };

const nav = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await nav.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e).slice(0, 140)));
p.on('console', m => { if(m.type() === 'error') bruit.push('console: ' + m.text().slice(0, 140)); });

/* ---- ce qui se lit à l'écran, étage par étage et thème par thème ---- */
const zones = SEUL_GUIDE ? [['le guide', false]] : [['le rez', false], ['le sous-sol', true]];
for(const [nom, sousSol] of zones){
  await p.setViewport({width:1400, height:1400});
  await p.goto(`http://localhost:${PORT}/index.html`, {waitUntil:'networkidle0'});
  await new Promise(r => setTimeout(r, 1300));
  if(sousSol){
    await p.evaluate(() => { const e = [...document.querySelectorAll('button,a,[role=tab],.tab,.et')]
      .find(x => /sous-sol/i.test(x.textContent)); if(e) e.click(); });
    await new Promise(r => setTimeout(r, 1700));
  }
  console.log('\n— ' + nom + ' —');
  for(const theme of ['dark', 'light']){
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await new Promise(r => setTimeout(r, 250));
    const sales = await p.evaluate((reSrc) => {
      const re = new RegExp(reSrc); const out = [];
      document.querySelectorAll('*').forEach(e => { if(e.children.length) return;
        const t = (e.textContent || '').trim(); if(re.test(t)) out.push(t.slice(0, 60)); });
      return [...new Set(out)];
    }, MARQUE.source);
    dit('aucune marque ne se lit — thème ' + (theme === 'dark' ? 'sombre' : 'clair'),
        !sales.length, sales.join(' | '));
  }
  for(const large of [1500, 900, 420]){
    await p.setViewport({width:large, height:1200});
    await new Promise(r => setTimeout(r, 350));
    const deborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    dit('rien ne déborde à ' + large + ' px', !deborde);
  }
}

/* ---- l'atelier : sa prévisualisation rend la même strat ---- */
if(!SEUL_GUIDE){
  console.log('\n— la prévisualisation de l\'atelier —');
  await p.setViewport({width:1500, height:1200});
  await p.goto(`http://localhost:${PORT}/tools/studio.html`, {waitUntil:'networkidle0'});
  await p.waitForFunction(() => window.__STUDIO, {timeout:12000}).catch(() => {});
  await new Promise(r => setTimeout(r, 2200));
  const sales = await p.evaluate((reSrc) => {
    const z = document.getElementById('ssPreview'); if(!z) return ['(pas de prévisualisation)'];
    const re = new RegExp(reSrc); const out = [];
    z.querySelectorAll('*').forEach(e => { if(e.children.length) return;
      const t = (e.textContent || '').trim(); if(re.test(t)) out.push(t.slice(0, 60)); });
    return [...new Set(out)];
  }, MARQUE.source);
  dit('aucune marque dans la prévisualisation', !sales.length, sales.join(' | '));
}

console.log('\n— la console —');
dit('rien ne casse', !bruit.length, bruit.slice(0, 4).join('\n         '));

await nav.close();
if(serveur) serveur.kill();
console.log('\n' + '═'.repeat(52));
console.log(soucis.length ? '\x1b[31m' + soucis.length + ' problème(s) à l\'écran.\x1b[0m'
                          : '\x1b[32mLa page tient debout partout.\x1b[0m');
process.exit(soucis.length ? 1 : 0);
