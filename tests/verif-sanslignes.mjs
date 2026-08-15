/* Un bloc qui porte son contenu dans son TITRE doit s'afficher dans le guide.

   Le guide masque tout bloc dont les lignes sont filtrees : « Mon role » sur le
   PLD ne doit pas laisser derriere lui une rubrique vide. Mais la regle valait
   pour TOUT bloc sans ligne visible — y compris ceux qui n'en ont aucune a
   filtrer.

   Or un TP move s'ecrit avec son nom en titre et ses effets en remarque, sans
   une seule ligne. Les douze TP moves de Botulus et Dhartok etaient donc
   ecrits dans data.js, affiches dans l'atelier… et invisibles dans le guide,
   c'est-a-dire a l'endroit meme ou on les lit.

   Ce qui compte ici, et les deux ensemble :
   · un bloc sans ligne se montre, s'il a quelque chose a dire ;
   · un bloc AVEC des lignes, toutes filtrees, disparait comme avant. */
import {puppeteer, GUIDE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1400, height:1000});
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await new Promise(r => setTimeout(r, 1300));

// le sous-sol, la ou vivent les TP moves
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /sous-sol|basement/i.test(x.textContent));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 2000));

console.log('\n— un TP move n\'a pas de ligne, et se lit quand meme —');
const vus = await p.evaluate(() => [...document.querySelectorAll('.grp')]
  .filter(g => !(g.querySelectorAll('.line').length))
  .filter(g => (g.querySelector('.glabel') || {}).textContent)
  .map(g => ({nom: g.querySelector('.glabel').textContent.trim(),
              affiche: getComputedStyle(g).display !== 'none',
              note: !!g.querySelector('.gnote')})));
dit('le guide en contient', vus.length >= 5, vus.length + ' bloc(s) sans ligne');
dit('et ils sont tous visibles', vus.length > 0 && vus.every(v => v.affiche),
    JSON.stringify(vus.filter(v => !v.affiche)));
dit('chacun garde ses effets sous son nom', vus.length > 0 && vus.every(v => v.note),
    JSON.stringify(vus.filter(v => !v.note).map(v => v.nom)));

console.log('\n— mais un bloc dont les lignes sont filtrees disparait toujours —');
const filtre = await p.evaluate(async () => {
  // on repasse au rez-de-chaussee, ou les rubriques portent de vraies lignes
  const b = [...document.querySelectorAll('button')].find(x => /rez-de-chauss|top floor/i.test(x.textContent));
  if (b) b.click();
  await new Promise(r => setTimeout(r, 1200));
  const avec = g => g.querySelectorAll('.line').length > 0;
  const avant = [...document.querySelectorAll('.grp')].filter(avec)
    .filter(g => getComputedStyle(g).display !== 'none').length;
  // « Mon role » en Solo sur un job qui ne parle presque nulle part
  // un job de la compo, pris tel quel : il ne parle pas dans toutes les rubriques
  const j = document.querySelector('[data-j="GEO"]') || document.querySelector('[data-j]');
  const solo = document.getElementById('soloToggle');
  if (j) j.click();
  if (solo) solo.click();
  await new Promise(r => setTimeout(r, 900));
  const apres = [...document.querySelectorAll('.grp')].filter(avec)
    .filter(g => getComputedStyle(g).display !== 'none').length;
  return {avant, apres, filtreTrouve: !!j && !!solo};
});
if (!filtre.filtreTrouve) {
  dit('le filtre « Mon role » est atteignable', false, 'aucun bouton de job');
} else {
  dit('filtrer sur un job cache bien des rubriques',
      filtre.apres < filtre.avant, JSON.stringify(filtre));
}

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));
await b.close();
const ko = bilan();
console.log(ko ? '\nUn bloc sans ligne se perd encore entre l\'atelier et le guide.'
               : '\nCe qu\'on ecrit sans ligne se lit aussi dans le guide.');
process.exit(ko ? 1 : 0);
