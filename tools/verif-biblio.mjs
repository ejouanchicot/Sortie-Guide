/* ============================================================
   verif-biblio.mjs — la bibliotheque tient-elle ?
   ------------------------------------------------------------
   Ce qu'on verifie, dans l'ordre ou un lead le vivrait :
     1. au premier lancement, le travail existant devient la
        premiere strat — rien ne se perd ;
     2. « nouvelle strat » donne une page blanche, pas un ecran mort ;
     3. revenir a la premiere la retrouve intacte ;
     4. les deux ateliers suivent le changement ;
     5. ce qu'on ecrit est encore la apres un rechargement.
   ============================================================ */
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');

const URL = 'http://localhost:8137/tools/studio.html';
let ko = 0;
const ok  = (t) => console.log('  ok   ' + t);
const nok = (t, d) => { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); };
const dit = (t, c, d) => c ? ok(t) : nok(t, d);

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e)));
p.on('console', m => { if(m.type()==='error') bruit.push(m.text()); });

// on part d'un navigateur vierge : c'est le cas qui compte
await p.goto(URL, {waitUntil:'networkidle0'});
await p.evaluate(async () => {
  indexedDB.deleteDatabase('strat-studio');
  localStorage.removeItem('studio_strat_courante');
});
await p.goto(URL, {waitUntil:'networkidle0'});
const pose = () => p.waitForFunction(
  () => document.getElementById('stStratSel')?.options.length > 3, {timeout:8000});
await pose();

console.log('\n— premier lancement —');
{
  const e = await p.evaluate(() => {
    const s = document.getElementById('stStratSel');
    return {noms:[...s.options].filter(o=>!o.value.startsWith('__')&&!o.disabled).map(o=>o.textContent),
            info:document.getElementById('stStratInfo').textContent,
            chapitres:FLOORS.length,
            etapes:FLOORS.reduce((n,f)=>n+(f.phases||[]).length,0),
            bosses:(FLOORS[0].bosses||[]).length};
  });
  dit('le travail existant devient la premiere strat', e.noms.length===1, JSON.stringify(e.noms));
  dit('les chapitres de data.js sont intacts', e.chapitres>=2 && e.etapes>0, `${e.chapitres} chap, ${e.etapes} etapes`);
  dit('la carte est encore branchee sur son chapitre', e.bosses>0, e.bosses+' bosses');
  dit('le sous-titre annonce le contenu', /chap/.test(e.info), e.info);
}

console.log('\n— nouvelle strat —');
{
  // la boite de dialogue de l'atelier Strategie, remontee dans la coque
  await p.select('#stStratSel', '__neuve__');
  await p.waitForSelector('#ssModal input', {visible:true, timeout:4000});
  // `offsetParent` ne vaut rien ici : la boite est en position fixed, il rend
  // null meme quand elle est a l'ecran. On regarde ce qui est vraiment rendu.
  const e0 = await p.evaluate(() => {
    const m = document.querySelector('#ssModal');
    const r = m.getBoundingClientRect();
    return {rendue:m.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}),
            aire:Math.round(r.width * r.height),
            dansLePanneau:!!m.closest('.st-pane'),
            atelier:document.getElementById('stTabMap').classList.contains('on') ? 'carte' : 'strat'};
  });
  dit('la boite s\'affiche meme depuis l\'atelier Carte',
      e0.rendue && e0.aire > 0 && !e0.dansLePanneau && e0.atelier === 'carte', JSON.stringify(e0));
  await p.evaluate(() => { const i=document.querySelector('#ssModal input'); i.value=''; });
  await p.type('#ssModal input', 'Odyssey Sheol C');
  await p.evaluate(() => [...document.querySelectorAll('#ssModal button')]
    .find(x=>/cr[ée]er/i.test(x.textContent))?.click());
  await p.waitForFunction(() => FLOORS.length === 1, {timeout:5000}).catch(()=>{});
  const e = await p.evaluate(() => ({
    noms:[...document.getElementById('stStratSel').options]
      .filter(o=>!o.value.startsWith('__')&&!o.disabled).map(o=>o.textContent),
    chapitres:FLOORS.length,
    etapes:FLOORS.reduce((n,f)=>n+(f.phases||[]).length,0),
    onglets:[...document.querySelectorAll('#stChap button')].map(x=>x.textContent),
    arbre:document.querySelectorAll('#ssTree [data-p]').length
  }));
  dit('elle rejoint la bibliotheque', e.noms.includes('Odyssey Sheol C'), JSON.stringify(e.noms));
  dit('elle demarre sur un chapitre vide', e.chapitres===1 && e.etapes===0, JSON.stringify(e));
  dit('le selecteur de chapitre suit', e.onglets.length===0, JSON.stringify(e.onglets));
  dit('l\'atelier Strategie s\'est vide', e.arbre===0, e.arbre+' etapes affichees');
}

console.log('\n— on y ecrit, puis on revient —');
{
  await p.evaluate(() => {
    FLOORS[0].phases.push({nom:'Ouverture', mob:'', lignes:[{job:'PLD', txt:'Pull'}]});
    window.__SS.recharge();
    // on salit pour declencher la sauvegarde silencieuse
    document.getElementById('stTabStrat').click();
  });
  await p.evaluate(() => window.__SS && window.__SS.bascule && 0);
  await new Promise(r => setTimeout(r, 2200));   // au-dela du delai d'ecriture

  const idOdy = await p.evaluate(() => document.getElementById('stStratSel').value);
  const premier = await p.evaluate(() => [...document.getElementById('stStratSel').options]
    .filter(o=>!o.value.startsWith('__')&&!o.disabled).find(o=>o.value!==document.getElementById('stStratSel').value)?.value);
  await p.select('#stStratSel', premier);
  await p.waitForFunction(() => FLOORS.length >= 2, {timeout:5000});
  const a = await p.evaluate(() => ({chap:FLOORS.length, bosses:(FLOORS[0].bosses||[]).length,
                                     onglets:document.querySelectorAll('#stChap button').length}));
  dit('la strat d\'origine revient entiere', a.chap>=2 && a.bosses>0, JSON.stringify(a));
  dit('le selecteur de chapitre est reconstruit', a.onglets>=2, a.onglets+' onglets');

  await p.select('#stStratSel', idOdy);
  await p.waitForFunction(() => FLOORS.length === 1, {timeout:5000});
  const c = await p.evaluate(() => ({etapes:FLOORS[0].phases.length,
                                     nom:FLOORS[0].phases[0]?.nom}));
  dit('ce qu\'on avait ecrit est toujours la', c.etapes===1 && c.nom==='Ouverture', JSON.stringify(c));
}

console.log('\n— apres un rechargement complet —');
{
  await p.reload({waitUntil:'networkidle0'});
  await pose();
  const e = await p.evaluate(() => ({
    ouverte:document.getElementById('stStratSel').selectedOptions[0]?.textContent,
    etapes:FLOORS[0]?.phases?.length,
    combien:[...document.getElementById('stStratSel').options]
      .filter(o=>!o.value.startsWith('__')&&!o.disabled).length
  }));
  dit('les deux strats sont la', e.combien===2, e.combien+'');
  dit('on rouvre sur celle qu\'on quittait', e.ouverte==='Odyssey Sheol C', String(e.ouverte));
  dit('avec son contenu', e.etapes===1, String(e.etapes));
}

console.log('\n— dupliquer, puis supprimer —');
{
  await p.select('#stStratSel', '__copie__');
  await p.waitForSelector('#ssModal input', {visible:true, timeout:4000});
  await p.evaluate(() => { document.querySelector('#ssModal input').value=''; });
  await p.type('#ssModal input', 'Sheol C — plan B');
  await p.evaluate(() => [...document.querySelectorAll('#ssModal button')]
    .find(x=>/dupliquer/i.test(x.textContent))?.click());
  await p.waitForFunction(() => [...document.getElementById('stStratSel').options]
    .some(o=>o.textContent==='Sheol C — plan B'), {timeout:5000}).catch(()=>{});
  let e = await p.evaluate(() => ({
    combien:[...document.getElementById('stStratSel').options]
      .filter(o=>!o.value.startsWith('__')&&!o.disabled).length,
    ouverte:document.getElementById('stStratSel').selectedOptions[0]?.textContent,
    etapes:FLOORS[0]?.phases?.length}));
  dit('la copie existe et s\'ouvre', e.combien===3 && e.ouverte==='Sheol C — plan B', JSON.stringify(e));
  dit('elle a bien le contenu de l\'originale', e.etapes===1, String(e.etapes));

  await p.select('#stStratSel', '__suppr__');
  await p.waitForSelector('#ssModal', {visible:true, timeout:4000});
  await p.evaluate(() => [...document.querySelectorAll('#ssModal button')]
    .find(x=>/supprimer/i.test(x.textContent))?.click());
  await p.waitForFunction(() => [...document.getElementById('stStratSel').options]
    .filter(o=>!o.value.startsWith('__')&&!o.disabled).length===2, {timeout:5000}).catch(()=>{});
  e = await p.evaluate(() => ({
    combien:[...document.getElementById('stStratSel').options]
      .filter(o=>!o.value.startsWith('__')&&!o.disabled).length,
    ouverte:document.getElementById('stStratSel').selectedOptions[0]?.textContent}));
  dit('elle disparait et une autre prend la main', e.combien===2 && !!e.ouverte, JSON.stringify(e));
}

console.log('\n— la console —');
const vrai = bruit.filter(t => !/favicon|manifest|sw\.js|ServiceWorker/i.test(t));
dit('rien ne casse en fond', vrai.length===0, vrai.slice(0,4).join('\n       '));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nLa bibliotheque tient.');
process.exit(ko ? 1 : 0);
