/* Enregistrer juste apres avoir tape ne doit rien laisser derriere.

   Le champ d'un bloc attend un court silence avant de relire ce qu'on y ecrit :
   sans ca, chaque lettre redessinerait la strat entiere. Mais ce delai
   appartient a la SAISIE. Ctrl+S enchaine sur le dernier mot tombe toujours
   dedans, et le bloc revenait a l'ecran ampute de sa derniere phrase. */
import {puppeteer} from './navigateur.mjs';
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
await p.waitForFunction(()=>document.getElementById('stStratSel')?.options.length>3,{timeout:8000});

// l'atelier Strategie, sur une etape qui a deja un bloc a remplir
await p.click('#stTabStrat');
await p.evaluate(()=>document.querySelector('#ssTree .ss-step')?.click());
await p.waitForSelector('#ssBlocs .ss-btxt', {timeout:5000});

console.log('\n— enregistrer sur le dernier mot tape —');

const a = await p.evaluate(()=>{
  const ta = [...document.querySelectorAll('#ssBlocs .ss-btxt')].pop();
  ta.focus();
  ta.value = ta.value + '\nALL  la derniere phrase tapee';
  ta.dispatchEvent(new Event('input', {bubbles:true}));
  // pas une milliseconde d'attente : c'est exactement Ctrl+S sur la frappe
  return {pose: JSON.stringify(FLOORS).includes('la derniere phrase tapee'),
          ecrit: window.__SS.blocs().map(x=>x.txt).join('\n').includes('la derniere phrase tapee')};
});
dit('la strat prend un instant a encaisser la frappe', !a.pose,
    'le delai de saisie a disparu — ce test ne prouve plus rien');
dit('mais ce qu\'on enregistre part avec elle', a.ecrit);

console.log('\n— quitter le champ vaut le silence qu\'on attendait —');

const c = await p.evaluate(()=>{
  const ta = [...document.querySelectorAll('#ssBlocs .ss-btxt')].pop();
  ta.focus();
  ta.value = ta.value + '\nALL  posee en quittant le champ';
  ta.dispatchEvent(new Event('input', {bubbles:true}));
  const avant = JSON.stringify(FLOORS).includes('posee en quittant le champ');
  ta.blur();
  return {avant, apres: JSON.stringify(FLOORS).includes('posee en quittant le champ')};
});
dit('avant de quitter, elle attend encore', !c.avant);
dit('en quittant, elle est posee', c.apres);

console.log('\n— et ce qu\'on garde dans la bibliotheque ne recule pas non plus —');

const d = await p.evaluate(()=>{
  const ta = [...document.querySelectorAll('#ssBlocs .ss-btxt')].pop();
  ta.focus();
  ta.value = ta.value + '\nALL  gardee dans la bibliotheque';
  ta.dispatchEvent(new Event('input', {bubbles:true}));
  return JSON.stringify(window.__STUDIO.instantane()).includes('gardee dans la bibliotheque');
});
dit('l\'instantane emporte la derniere phrase', d);

dit('rien n\'a casse', bruit.length===0, bruit.join('\n'));
await b.close();
console.log(ko ? '\nCe qu\'on tape en dernier se perd encore.'
               : '\nLe dernier mot tape part avec l\'enregistrement.');
process.exit(ko ? 1 : 0);
