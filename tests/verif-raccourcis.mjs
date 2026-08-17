/* Un raccourci n'appartient qu'a l'atelier qu'on a sous les yeux.

   Les deux ateliers vivent dans la meme page et ecoutaient tous les deux le
   clavier de la fenetre. Un Ctrl+Z tape dans la Strategie defaisait donc AUSSI
   le dernier geste de la carte — hors de vue, sans un mot.

   Ce n'est pas une gene : defaire, cote carte, REMPLACE les calques du chapitre
   courant (marqueurs, traces, textes), et l'enregistrement les grave dans
   data.js. C'est comme ca que la carte du sous-sol a perdu ses cinq boss et
   s'est retrouvee avec ceux du rez-de-chaussee. */
import {puppeteer, carteDessinee} from './navigateur.mjs';
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
await p.waitForFunction(()=>window.__MS && window.__SS && window.__STUDIO,{timeout:9000});
await carteDessinee(p);

const ctrlZ = async () => {
  await p.evaluate(()=>{ document.activeElement?.blur?.(); document.body.focus(); });
  await p.keyboard.down('Control'); await p.keyboard.press('z'); await p.keyboard.up('Control');
  await new Promise(r=>setTimeout(r,500));
};

console.log('\n— depuis l\'onglet Strategie, la carte ne bouge pas —');

await p.click('#stTabStrat');
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>document.querySelector('#ssTree .ss-step')?.click());
await new Promise(r=>setTimeout(r,400));

// deux gestes du cote CARTE, pour avoir quelque chose a defaire
const pose = await p.evaluate(()=>{
  const f = FLOORS[0];
  f.bosses[0].x = 42.42; window.__MS.blocs();
  f.bosses[0].x = 43.43; window.__MS.blocs();
  return {x:f.bosses[0].x, onglet:window.__STUDIO.actif()};
});
dit('on est bien dans la Strategie', pose.onglet==='strat', pose.onglet);

await ctrlZ();
const apres = await p.evaluate(()=>FLOORS[0].bosses[0].x);
dit('Ctrl+Z n\'a pas defait un geste de la carte', apres===pose.x,
    'le marqueur est passe de '+pose.x+' a '+apres);

console.log('\n— et depuis l\'onglet Carte, la strat ne bouge pas —');

await p.click('#stTabMap');
await new Promise(r=>setTimeout(r,500));
const strat = await p.evaluate(()=>{
  // une modif du cote STRAT, entree dans son historique
  const ph = (FLOORS[0].phases||[])[0];
  const c = (ph.cards||[])[0];
  const avant = JSON.stringify(c);
  return {avant, onglet:window.__STUDIO.actif()};
});
dit('on est bien sur la Carte', strat.onglet==='map', strat.onglet);

await ctrlZ();
const stratApres = await p.evaluate(()=>JSON.stringify((FLOORS[0].phases[0].cards||[])[0]));
dit('Ctrl+Z n\'a pas defait un geste de la strat', stratApres===strat.avant);

dit('rien n\'a casse', bruit.length===0, bruit.slice(0,3).join('\n       '));
await b.close();
console.log(ko ? '\nUn raccourci traverse encore vers l\'atelier d\'a cote.'
               : '\nChaque atelier ne repond qu\'a ce qu\'on tape chez lui.');
process.exit(ko ? 1 : 0);
