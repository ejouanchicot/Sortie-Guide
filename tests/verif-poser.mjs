/* ============================================================
   verif-poser.mjs — poser un marqueur : le geste
   ------------------------------------------------------------
   Trois choses, mesurees sur la vraie carte :

   1. On GLISSE le marqueur de la barre vers l'endroit voulu.
      Armer puis viser obligeait a tenir en tete ce qui etait arme,
      et un clic distrait posait un deuxieme marqueur.

   2. Une fois pose, on repasse en Selection avec CE marqueur
      selectionne : c'est presque toujours pour l'ajuster tout de
      suite. L'outil restait arme.

   3. Il arrive NU — ni etiquette, ni pastille numerotee. Un boss
      pose arrivait avec « 5 » collee dessus et son nom en dur,
      par-dessus ce qu'on visait. Les deux se rallument d'une case.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1500, height:950});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.__MS && window.Konva && window.SORTIE, {timeout:9000});

// outil Marqueur, categorie Marqueurs
await p.evaluate(() => document.querySelector('.tool[data-tool="pin"]').click());
await p.waitForSelector('#ar_grid .palbtn', {timeout:5000});
await p.evaluate(() => document.querySelector('#ar_cat button[data-pc="marq"]').click());
await new Promise(r => setTimeout(r, 500));

console.log('\n— la barre se glisse —');
const gliss = await p.evaluate(() => {
  const b = document.querySelector('#ar_grid .palbtn');
  return {draggable: b.getAttribute('draggable'), nom: b.textContent.trim()};
});
dit('chaque marqueur de la barre est glissable', gliss.draggable === 'true',
    gliss.nom + ' · draggable=' + gliss.draggable);

/* Le vrai geste : dragstart sur le bouton, drop sur la carte. Puppeteer ne
   simule pas le glisser natif du systeme, on rejoue donc les evenements que
   le navigateur enverrait — c'est le meme code qui les recoit. */
const depot = await p.evaluate(async () => {
  const btn = [...document.querySelectorAll('#ar_grid .palbtn')]
    .find(x => x.textContent.trim() === 'Danger');
  const cnv = Konva.stages[0].container();
  const dt = new DataTransfer();
  btn.dispatchEvent(new DragEvent('dragstart', {bubbles:true, dataTransfer:dt}));
  // on lache au centre de la carte
  const r = cnv.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  cnv.dispatchEvent(new DragEvent('dragover', {bubbles:true, cancelable:true, dataTransfer:dt, clientX:cx, clientY:cy}));
  cnv.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:dt, clientX:cx, clientY:cy}));
  btn.dispatchEvent(new DragEvent('dragend', {bubbles:true, dataTransfer:dt}));
  /* Poser un marqueur, c'est TROIS choses : il entre dans les données, l'outil
     revient sur Sélection, la barre de pose se referme et il est sélectionné.
     Attendre seulement la première coupait trop tôt — les trois assertions qui
     suivent tombaient. On attend l'état complet. */
  for(let i=0;i<120;i++){
    const pose = (FLOORS[0].icones||[]).length > 0;
    const anneau = Konva.stages[0].find('.selring').length > 0;
    if(pose && anneau) break;
    await new Promise(r=>setTimeout(r,25));
  }
  const f = FLOORS[0], ic = (f.icones || []);
  return {n: ic.length, dernier: ic[ic.length - 1] || null};
});
dit('lacher sur la carte pose le marqueur', depot.n >= 1 && depot.dernier
    && depot.dernier.ico === 'DANGER', JSON.stringify(depot.dernier));
dit('a l\'endroit ou on l\'a lache', !!depot.dernier
    && depot.dernier.x > 20 && depot.dernier.x < 80
    && depot.dernier.y > 20 && depot.dernier.y < 80,
    depot.dernier && (depot.dernier.x + ' / ' + depot.dernier.y));

console.log('\n— et on repasse aussitot en Selection —');
const apres = await p.evaluate(() => {
  const sel = document.querySelector('.tool[data-tool="select"]');
  const barre = document.getElementById('armbar');
  const st = Konva.stages[0];
  const anneaux = st.find('.selring').length;
  return {outil: sel && sel.classList.contains('on'),
          barreOuverte: !!(barre && barre.classList.contains('on')),
          selectionne: anneaux > 0,
          panneau: !!document.getElementById('mappanel')};
});
dit('l\'outil Selection est repris', apres.outil === true, String(apres.outil));
dit('la barre de pose s\'est refermee', apres.barreOuverte === false, String(apres.barreOuverte));
dit('le marqueur pose est selectionne', apres.selectionne, String(apres.selectionne));
dit('sa carte de reglages est ouverte', apres.panneau, String(apres.panneau));

console.log('\n— ce qu\'on pose arrive nu —');
const nu = await p.evaluate(async () => {
  const f = FLOORS[0];
  const avant = (f.bosses || []).length;
  // on passe par le meme chemin que la palette
  document.querySelector('.tool[data-tool="pin"]').click();
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('#ar_cat button[data-pc="boss"]').click();
  await new Promise(r => setTimeout(r, 300));
  const btn = document.querySelector('#ar_grid .palbtn');
  const nom = btn.dataset.name;
  const cnv = Konva.stages[0].container(), dt = new DataTransfer();
  btn.dispatchEvent(new DragEvent('dragstart', {bubbles:true, dataTransfer:dt}));
  const r = cnv.getBoundingClientRect();
  cnv.dispatchEvent(new DragEvent('dragover', {bubbles:true, cancelable:true, dataTransfer:dt,
    clientX:r.left + r.width * .4, clientY:r.top + r.height * .4}));
  cnv.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:dt,
    clientX:r.left + r.width * .4, clientY:r.top + r.height * .4}));
  await new Promise(r => setTimeout(r, 900));
  const bo = f.bosses[f.bosses.length - 1];
  return {avant, apres: f.bosses.length, nom,
          hl: bo && bo.hl, nx: bo && bo.nx, n: bo && bo.n,
          pastilles: Konva.stages[0].find('.marker').length};
});
dit('le boss est bien pose', nu.apres === nu.avant + 1, nu.avant + ' → ' + nu.apres);
dit('sans etiquette', nu.hl === 1, 'hl=' + JSON.stringify(nu.hl));
dit('et sans pastille numerotee', nu.nx == null, 'nx=' + JSON.stringify(nu.nx));
dit('mais il garde son numero, qui le relie a son etape', typeof nu.n === 'number',
    'n=' + JSON.stringify(nu.n));

console.log('\n— la pastille se rallume d\'une case —');
const bascule = await p.evaluate(async () => {
  const f = FLOORS[0], bo = f.bosses[f.bosses.length - 1];
  const c = document.getElementById('mp_num');
  if (!c) return {pasDeCase:true};
  c.checked = true; c.dispatchEvent(new Event('change', {bubbles:true}));
  await new Promise(r => setTimeout(r, 300));
  const allume = {nx: bo.nx, ny: bo.ny, marker: !!bo._mk};
  c.checked = false; c.dispatchEvent(new Event('change', {bubbles:true}));
  await new Promise(r => setTimeout(r, 300));
  return {allume, eteint: {nx: bo.nx, marker: !!bo._mk}};
});
dit('la case existe dans la carte de reglages du boss', !bascule.pasDeCase, JSON.stringify(bascule));
dit('cochee, la pastille apparait',
    !bascule.pasDeCase && typeof bascule.allume.nx === 'number' && bascule.allume.marker,
    JSON.stringify(bascule.allume));
dit('decochee, elle repart', !bascule.pasDeCase && bascule.eteint.nx == null && !bascule.eteint.marker,
    JSON.stringify(bascule.eteint));

console.log('\n— et data.js reste valide sans pastille —');
const ecrit = await p.evaluate(() => {
  const f = FLOORS[0], bo = f.bosses[f.bosses.length - 1];
  const t = SORTIE.bossesConst('B', [bo]);
  return {txt: t, nan: /NaN/.test(t), nx: /nx:/.test(t), relit: (() => {
    try { return Array.isArray(eval(t.replace(/^const B=/, '')) ) ; } catch(e){ return String(e); }
  })()};
});
dit('aucun NaN ne s\'ecrit', !ecrit.nan, ecrit.txt.split('\n')[1]);
dit('la pastille absente n\'est pas ecrite', !ecrit.nx, ecrit.txt.split('\n')[1]);
dit('et le fichier se relit', ecrit.relit === true, String(ecrit.relit));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nOn glisse, on lache, et on ajuste : le marqueur arrive nu et selectionne.');
process.exit(ko ? 1 : 0);
