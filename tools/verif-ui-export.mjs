// Le geste reel : cliquer Partager, recuperer le fichier ; puis le rouvrir
// par le menu de la bibliotheque.
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');
import fs from 'fs'; import path from 'path'; import os from 'os';

let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };
const dl = fs.mkdtempSync(path.join(os.tmpdir(),'dl-'));
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
const cdp = await p.target().createCDPSession();
await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dl});

await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
await p.evaluate(()=>{ indexedDB.deleteDatabase('strat-studio');
                       localStorage.removeItem('studio_strat_courante'); });
await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
await p.waitForFunction(()=>document.getElementById('stStratSel')?.options.length>3,{timeout:8000});

const b0 = await p.evaluate(()=>{ const b=document.getElementById('stExport');
  return {existe:!!b, texte:b?.textContent.trim(), visible:b?.checkVisibility()}; });
dit('le bouton Partager est la et lisible', b0.existe && b0.visible && /Partager/.test(b0.texte||''), JSON.stringify(b0));

await p.click('#stExport');
await p.waitForFunction(()=>{ const t=document.getElementById('toast');
  return t && t.style.opacity==='1'; },{timeout:20000}).catch(()=>{});
const msg = await p.evaluate(()=>document.getElementById('toast')?.textContent);
dit('il annonce le resultat en clair', /Ko/.test(msg||''), String(msg));

await new Promise(r=>setTimeout(r,1500));
const fichiers = fs.readdirSync(dl).filter(f=>!f.endsWith('.crdownload'));
dit('un fichier est arrive', fichiers.length===1, fichiers.join(','));
dit('avec un nom qu\'on retrouve', /^[a-z0-9-]+\.html$/.test(fichiers[0]||''), fichiers[0]);
dit('le bouton a repris son etat', await p.evaluate(()=>{
  const b=document.getElementById('stExport');
  return !b.disabled && /Partager/.test(b.textContent); }));

// rouvrir par le menu
const entree = await p.evaluate(()=>[...document.getElementById('stStratSel').options]
  .find(o=>o.value==='__import__')?.textContent);
dit('le menu propose d\'ouvrir un guide recu', /guide re/i.test(entree||''), String(entree));

const chemin = path.join(dl, fichiers[0]);
await p.evaluate(()=>{ const s=document.getElementById('stStratSel');
  s.value='__import__'; s.dispatchEvent(new Event('change')); });
const champ = await p.$('#stFichier');
await champ.uploadFile(chemin);
await p.waitForFunction(()=>[...document.getElementById('stStratSel').options]
  .filter(o=>!o.value.startsWith('__')&&!o.disabled).length===2,{timeout:8000}).catch(()=>{});
const e = await p.evaluate(()=>({
  combien:[...document.getElementById('stStratSel').options].filter(o=>!o.value.startsWith('__')&&!o.disabled).length,
  ouverte:document.getElementById('stStratSel').selectedOptions[0]?.textContent,
  chap:FLOORS.length, bosses:(FLOORS[0].bosses||[]).length,
  noms:[...document.getElementById('stStratSel').options].filter(o=>!o.value.startsWith('__')&&!o.disabled).map(o=>o.textContent)}));
dit('la strat recue rejoint la bibliotheque et s\'ouvre', e.combien===2 && e.chap>=2 && e.bosses>0, JSON.stringify(e));
dit('son nom evite la collision', /import/i.test(e.ouverte||''), String(e.ouverte));
dit('rien ne casse', bruit.length===0, bruit.slice(0,3).join('\n       '));

await b.close(); fs.rmSync(dl,{recursive:true,force:true});
console.log(ko?`\n${ko} probleme(s).`:'\nLe geste complet fonctionne.');
process.exit(ko?1:0);
