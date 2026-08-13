// Le panneau « Texte pour Discord » : on l'ouvre, on choisit, on copie.
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const ctx = b.defaultBrowserContext();
await ctx.overridePermissions('http://localhost:8137', ['clipboard-read','clipboard-write']);
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
await p.waitForFunction(()=>document.getElementById('stStratSel')?.options.length>3,{timeout:8000});

// le bouton vit dans la barre de l'atelier Strategie : on y va d'abord
await p.click('#stTabStrat');
const b0 = await p.evaluate(()=>{ const x=document.getElementById('stTexte');
  return {ou:x?.parentElement?.id, visible:!!x?.checkVisibility(), texte:x?.textContent.trim()}; });
dit('le bouton est dans la barre de l\'atelier Strategie',
    b0.ou==='stCtxStrat' && b0.visible && /Texte/.test(b0.texte||''), JSON.stringify(b0));

// il ne doit PAS trainer quand on est sur la carte
await p.click('#stTabMap');
const cache = await p.evaluate(()=>!document.getElementById('stTexte').checkVisibility());
dit('il disparait avec l\'atelier', cache);
await p.click('#stTabStrat');

// on ouvre une etape, puis le panneau
await p.evaluate(()=>document.querySelector('#ssTree .ss-step')?.click());
await p.click('#stTexte');
await p.waitForSelector('#stTxtWrap .st-part pre', {visible:true, timeout:5000});

const e = await p.evaluate(()=>({
  portees:[...document.getElementById('stTxtPortee').options].map(o=>o.value),
  premiere:document.getElementById('stTxtPortee').value,
  varVisible:!document.getElementById('stTxtVarL').hidden,
  vars:[...document.getElementById('stTxtVar').options].map(o=>o.value),
  jobs:[...document.getElementById('stTxtJob').options].length,
  parts:document.querySelectorAll('#stTxtParts .st-part').length,
  info:document.getElementById('stTxtInfo').textContent,
  debut:document.querySelector('#stTxtParts pre').textContent.slice(0,30)
}));
dit('les trois portees sont proposees', e.portees.join(',')==='etape,chapitre,tout', JSON.stringify(e.portees));
dit('il ouvre sur l\'etape choisie', e.premiere==='etape' && /^## /.test(e.debut), JSON.stringify(e));
dit('les facons de jouer sont proposees', e.varVisible && e.vars.length===2, JSON.stringify(e.vars));
dit('on peut viser un seul job', e.jobs>4, e.jobs+' entrees');
dit('le compte des caracteres est annonce', /2000/.test(e.info), e.info);

// changer de portee recalcule
await p.select('#stTxtPortee','tout');
await p.waitForFunction(()=>/^# /.test(document.querySelector('#stTxtParts pre')?.textContent||''),{timeout:4000}).catch(()=>{});
const t2 = await p.evaluate(()=>({parts:document.querySelectorAll('#stTxtParts .st-part').length,
  debut:document.querySelector('#stTxtParts pre').textContent.slice(0,20),
  info:document.getElementById('stTxtInfo').textContent}));
dit('toute la strat donne plusieurs messages', t2.parts>1, JSON.stringify(t2));
dit('chacun est annonce comme message n', await p.evaluate(()=>
  /MESSAGE 1/.test(document.querySelector('.st-parthead b').textContent)));

// copier
await p.evaluate(()=>document.querySelector('#stTxtParts button[data-copie="0"]').click());
await new Promise(r=>setTimeout(r,400));
await p.bringToFront();
const presse = await p.evaluate(async ()=>{ try{ return await navigator.clipboard.readText(); }catch(e){ return 'ERR:'+e.message; } });
const btn = await p.evaluate(()=>document.querySelector('#stTxtParts button[data-copie="0"]').textContent);
console.log('       bouton apres clic :', btn);
dit('le presse-papier contient bien le message', presse.length>50 && /^# /.test(presse),
    JSON.stringify(presse.slice(0,40)));
// Le presse-papier de Windows rend chaque saut de ligne sur DEUX caracteres.
// Un champ de saisie les ramene normalement a un seul, mais le verifier ici
// est impossible : Chrome refuse execCommand('paste'). Plutot que de parier
// sur la facon dont Discord compte, le decoupage prend le cas defavorable —
// on mesure donc le presse-papier tel quel, CR compris.
console.log('       presse-papier, retours chariot compris : ' + presse.length);
dit('il tient dans la limite meme en comptant les CR',
    presse.length <= 2000, presse.length + '');

// fermer
await p.keyboard.press('Escape');
dit('Echap ferme le panneau', await p.evaluate(()=>document.getElementById('stTxtWrap').hidden));
dit('rien ne casse', bruit.length===0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko?`\n${ko} probleme(s).`:'\nLe panneau fait ce qu\'il annonce.');
process.exit(ko?1:0);
