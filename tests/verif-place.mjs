/* Enregistrer ne doit pas faire perdre sa place.

   Certains serveurs de developpement rechargent la page des qu'un fichier
   bouge — et le fichier qui bouge, c'est celui qu'on vient d'ecrire. On
   revenait alors a l'ecran d'accueil : l'etape qu'on redigeait refermee, et la
   carte recadree sur l'etage entier alors qu'on travaillait zoome dans un coin.

   On sauvegardait son travail et on perdait sa place. */
import {puppeteer, carteDessinee} from './navigateur.mjs';
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.setViewport({width:1500, height:950});
const ouvre = async () => {
  await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>window.__MS && window.__SS && window.__STUDIO,{timeout:9000});
  await carteDessinee(p);
};

await ouvre();

console.log('\n— l\'étape qu\'on écrivait est encore ouverte —');
// on ouvre l'atelier Stratégie et une étape — pas la première, pour que le
// test ne puisse pas passer par hasard
await p.click('#stTabStrat');
await new Promise(r=>setTimeout(r,400));
const vise = await p.evaluate(()=>{
  const pas = document.querySelectorAll('#ssTree .ss-step');
  const i = pas.length > 1 ? 1 : 0;
  pas[i].click();
  return {i, combien:pas.length};
});
await new Promise(r=>setTimeout(r,600));
const avant = await p.evaluate(()=>window.__SS.etat());
dit('une étape est bien ouverte', avant.selP != null, JSON.stringify(avant));

await ouvre();
const apres = await p.evaluate(()=>window.__SS.etat());
dit('elle est encore ouverte après un rechargement', apres.selP === avant.selP,
    'avant : ' + JSON.stringify(avant) + ' · après : ' + JSON.stringify(apres));
dit('et on est revenu dans l\'atelier Stratégie',
    (await p.evaluate(()=>window.__STUDIO.actif())) === 'strat');

console.log('\n— et la carte garde son cadrage —');
await p.click('#stTabMap');
await new Promise(r=>setTimeout(r,800));
// un vrai coup de molette sur la carte, comme un lead qui zoome pour placer
const boite = await p.evaluate(()=>{ const r = document.getElementById('stage').getBoundingClientRect();
  return {x:r.left + r.width/2, y:r.top + r.height/2}; });
await p.mouse.move(boite.x, boite.y);
for(let i=0;i<6;i++){ await p.mouse.wheel({deltaY:-120}); await new Promise(r=>setTimeout(r,80)); }
await new Promise(r=>setTimeout(r,800));
const zoom = await p.evaluate(()=>{ const st = Konva.stages[0];
  return {s:st.scaleX(), x:st.x(), y:st.y()}; });
dit('la molette a bien zoomé', zoom.s > 1, JSON.stringify(zoom));

await ouvre();
await p.click('#stTabMap');
await carteDessinee(p);
const revu = await p.evaluate(()=>{ const st = Konva.stages[0];
  return {s:st.scaleX(), x:st.x(), y:st.y()}; });
dit('le zoom est retrouvé', Math.abs(revu.s - zoom.s) < 0.01,
    'avant ' + zoom.s + ' · après ' + revu.s);
dit('et le cadrage aussi',
    Math.abs(revu.x - zoom.x) < 2 && Math.abs(revu.y - zoom.y) < 2,
    JSON.stringify(zoom) + ' → ' + JSON.stringify(revu));

dit('rien n\'a cassé', bruit.length===0, bruit.slice(0,3).join('\n       '));
await b.close();
console.log(ko ? '\nOn perd encore sa place en enregistrant.'
               : '\nOn reprend là où on en était.');
process.exit(ko ? 1 : 0);
