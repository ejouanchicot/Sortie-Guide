/* ============================================================
   verif-calques.mjs — un interrupteur par type de marqueur
   ------------------------------------------------------------
   « Marqueurs » regroupait boss, mid-boss, packs et depart sous un
   seul oeil : impossible de ne regarder que les boss pendant qu'on
   place un trace. Chacun a le sien, et le groupe reste la pour tout
   eteindre d'un coup.
   ============================================================ */
import {puppeteer} from './navigateur.mjs';

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
await p.setViewport({width:1600, height:950});
const bruit = []; p.on('pageerror', e => bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.querySelectorAll('#layers .lay').length > 3, {timeout:8000});

const lignes = () => p.evaluate(() => [...document.querySelectorAll('#layers .lay')]
  .map(e => ({nom:e.children[1].textContent, n:e.children[2].textContent,
              sous:e.classList.contains('sub'), eteint:e.classList.contains('off')})));

console.log('\n— la liste —');
const l0 = await lignes();
console.log(l0.map(x => '       ' + (x.sous ? '  ' : '') + x.nom.padEnd(18) + x.n).join('\n'));
dit('les types de marqueurs ont leur ligne',
    ['Boss','Mid-boss','Packs'].every(n => l0.some(x => x.nom === n && x.sous)),
    JSON.stringify(l0.map(x => x.nom)));
dit('ils sont en retrait sous « Marqueurs »',
    l0[0].nom === 'Marqueurs' && !l0[0].sous && l0[1].sous);
dit('le groupe compte la somme de ses types',
    +l0[0].n === l0.filter(x => x.sous).reduce((s, x) => s + (+x.n), 0),
    l0[0].n + ' vs ' + l0.filter(x => x.sous).map(x => x.n).join('+'));
dit('un type sans element n\'encombre pas la liste',
    !l0.some(x => x.sous && +x.n === 0), JSON.stringify(l0.filter(x => x.sous)));
// Le piege : les pastilles numerotees des boss portent kind:'marker'. Les
// prendre pour le depart affichait « Depart 4 » sur une carte qui n'a qu'un S.
dit('le depart n\'est compte qu\'une fois',
    l0.find(x => /D.part/.test(x.nom))?.n === '1',
    JSON.stringify(l0.filter(x => x.sous)));
dit('les numeros d\'ordre ont leur propre ligne',
    l0.some(x => /Num.ros/.test(x.nom) && x.sous));

console.log('\n— eteindre un seul type —');
const avant = await p.evaluate(() => {
  const c = {};
  document.querySelector('#stage canvas');
  return c; });
const clic = (nom) => p.evaluate(n => [...document.querySelectorAll('#layers .lay')]
  .find(e => e.children[1].textContent === n)?.click(), nom);

await clic('Boss');
const e1 = await p.evaluate(() => {
  const vus = {};
  // on interroge la scene, pas la liste : c'est ce que l'oeil voit qui compte
  window.__ms_grp = window.__ms_grp || null;
  const st = Konva.stages[0];
  st.find('Group').forEach(g => { if(g._meta && g._meta.kind){
    vus[g._meta.kind] = vus[g._meta.kind] || {visibles:0, total:0};
    vus[g._meta.kind].total++; if(g.visible()) vus[g._meta.kind].visibles++; } });
  return vus; });
dit('les boss disparaissent de la carte',
    e1.boss && e1.boss.visibles === 0, JSON.stringify(e1));
dit('les autres types restent',
    (!e1.pack || e1.pack.visibles === e1.pack.total)
    && (!e1.mid || e1.mid.visibles === e1.mid.total), JSON.stringify(e1));
const l1 = await lignes();
dit('la ligne « Boss » est marquee eteinte',
    l1.find(x => x.nom === 'Boss')?.eteint === true);
dit('le groupe reste allume', l1[0].eteint === false);

console.log('\n— le groupe eteint tout —');
await clic('Marqueurs');
const l2 = await lignes();
dit('tous les types s\'eteignent', l2.filter(x => x.sous).every(x => x.eteint));
const cache = await p.evaluate(() => {
  const st = Konva.stages[0];
  return st.find('Group').filter(g => g._meta && g._meta.kind && g.visible()).length; });
dit('plus aucun marqueur n\'est visible', cache === 0, cache + ' encore visibles');

await clic('Marqueurs');
const l3 = await lignes();
dit('et il rallume tout', l3.filter(x => x.sous).every(x => !x.eteint) && !l3[0].eteint);

console.log('\n— rallumer un type rallume le groupe —');
await clic('Marqueurs');                       // tout eteint
await clic('Packs');                           // un seul rallume
const l4 = await lignes();
dit('le groupe se rallume avec lui',
    l4[0].eteint === false && l4.find(x => x.nom === 'Packs')?.eteint === false,
    JSON.stringify(l4.slice(0, 4)));
dit('et les autres restent eteints',
    l4.filter(x => x.sous && x.nom !== 'Packs').every(x => x.eteint));

dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nChaque type de marqueur s\'eteint tout seul.');
process.exit(ko ? 1 : 0);
