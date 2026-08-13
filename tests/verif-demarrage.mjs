/* ============================================================
   verif-demarrage.mjs — la carte, telle qu'elle s'ouvre
   ------------------------------------------------------------
   Au lancement, l'atelier portait chaque boss EN DOUBLE. Changer
   de carte et revenir remettait tout d'aplomb — ce qui rendait le
   defaut facile a prendre pour une lubie.

   La cause : rendEtage est asynchrone (il attend le fond, puis
   chaque vignette de mob) et reaffecte les groupes Konva au debut.
   Au demarrage, DEUX rendus partaient — celui de boot, et celui de
   la coque qui recharge la strat de la bibliotheque. Le premier
   continuait de deposer ses marqueurs dans les groupes du second.

   C'est une COURSE : elle ne se voyait pas a tous les coups. Un
   seul demarrage ne prouve donc rien, on en fait plusieurs.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const TOURS = 4;
const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];

// Ce que la carte porte vraiment, releve sur la scene Konva — pas sur ce que
// le code croit avoir dessine.
const releve = p => p.evaluate(() => {
  const noms = Konva.stages[0].find('.pin')
    .map(g => (g._meta && g._meta.o && g._meta.o.name) || '?');
  const compte = {}; noms.forEach(n => compte[n] = (compte[n] || 0) + 1);
  const carte = document.getElementById('carteSel').value;
  const c = (typeof CARTES !== 'undefined' ? CARTES : {})[carte] || {};
  const dus = [...(c.bosses||[]), ...(c.mids||[]), ...(c.packs||[])].map(o => o.name);
  return {carte, poses: noms.length, dus: dus.length,
          double: Object.entries(compte).filter(([, n]) => n > 1).map(([n, k]) => n + '×' + k),
          etrangers: [...new Set(noms.filter(n => !dus.includes(n)))]};
});

console.log(`\n— ${TOURS} demarrages d'affilee —`);
let doubles = 0, faux = 0, dernier = null;
for(let i = 1; i <= TOURS; i++){
  const p = await b.newPage();
  p.on('pageerror', e => bruit.push(String(e)));
  await p.setViewport({width:1600, height:950});
  await p.goto(STUDIO, {waitUntil:'networkidle0'});
  await p.waitForFunction(() => window.Konva && Konva.stages.length
                             && Konva.stages[0].find('.pin').length > 0, {timeout:9000});
  // laisser le temps au second rendu de faire des degats s'il en fait
  await new Promise(r => setTimeout(r, 1500));
  const r = await releve(p);
  dernier = r;
  if(r.double.length) doubles++;
  if(r.poses !== r.dus) faux++;
  console.log(`       ${i}. ${r.poses} marqueurs pour ${r.dus} attendus`
    + (r.double.length ? ' — EN DOUBLE : ' + r.double.join(' ') : ''));
  if(i === TOURS){
    // le contournement d'Eric : changer de carte et revenir. Il doit donner
    // le meme resultat que le demarrage, sinon c'est qu'il repare quelque chose.
    const autre = await p.evaluate(() => {
      const s = document.getElementById('carteSel');
      return [...s.options].map(o => o.value)
        .find(v => v && !v.startsWith('__') && v !== s.value) || null;
    });
    if(autre){
      const dep = r.carte;
      for(const v of [autre, dep]){
        await p.evaluate(x => { const s = document.getElementById('carteSel');
          s.value = x; s.dispatchEvent(new Event('change')); }, v);
        await new Promise(t => setTimeout(t, 1100));
      }
      const ar = await releve(p);
      dit('changer de carte et revenir ne change rien',
          ar.poses === r.poses && ar.double.length === 0,
          `demarrage ${r.poses} / aller-retour ${ar.poses}`);
    }
  }
  await p.close();
}

dit(`aucun marqueur en double, sur ${TOURS} demarrages`, doubles === 0,
    doubles + ' demarrage(s) en double');
dit('le compte est exactement celui de la carte', faux === 0,
    faux + ' demarrage(s) hors compte — dernier : ' + JSON.stringify(dernier));
dit('et aucun marqueur venu d\'ailleurs', (dernier.etrangers || []).length === 0,
    JSON.stringify(dernier.etrangers));
dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLa carte s\'ouvre juste, sans avoir a changer de carte pour la remettre droite.');
process.exit(ko ? 1 : 0);
