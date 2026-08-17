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
  const visibles = () => [...document.querySelectorAll('.grp')].filter(avec)
    .filter(g => getComputedStyle(g).display !== 'none').length;
  const avant = visibles();

  /* On CHOISIT le job au lieu de le coder en dur. L'ancien repli
     « [data-j="GEO"] || [data-j] » mentait dans les deux sens : si GEO quittait
     la compo on prenait le premier job venu, et s'il parlait dans toutes les
     rubriques l'assertion rougissait SANS qu'aucune panne existe — un rouge au
     hasard piloté par le contenu de js/data.js, dans un projet qui est déjà
     passé de six à quatre tests en parallèle pour en tuer.
     On prend donc un job dont on a VÉRIFIÉ qu'il ne parle pas partout. */
  const rubriques = [...document.querySelectorAll('.grp')].filter(avec);
  const jobsDe = g => new Set([...g.querySelectorAll('.line')]
    .flatMap(l => (l.dataset.r || '').split(' ').filter(Boolean)));
  const candidats = [...document.querySelectorAll('#jobs .jobchip[data-j]')].map(b => b.dataset.j);
  const utilisable = candidats.find(j =>
    rubriques.some(g => { const s = jobsDe(g); return !s.has(j) && !s.has('ALL'); }));

  const solo = document.getElementById('soloToggle');
  if (!utilisable || !solo) return {avant, apres:avant, job:utilisable || null,
                                    candidats:candidats.length, possible:false};

  document.querySelector('#jobs .jobchip[data-j="' + utilisable + '"]').click();
  solo.click();
  await new Promise(r => setTimeout(r, 900));
  return {avant, apres:visibles(), job:utilisable, candidats:candidats.length, possible:true};
});
if (!filtre.possible) {
  /* Pas un échec : la strat du dépôt ne permet simplement pas ce contrôle
     aujourd'hui. On le DIT, au lieu de rougir ou de mesurer le vide. */
  console.log('  --   aucun job de la compo n\'est absent d\'au moins une rubrique — '
            + 'ce contrôle ne s\'applique pas à cette strat (' + filtre.candidats + ' jobs)');
} else {
  dit('filtrer sur ' + filtre.job + ' cache bien des rubriques',
      filtre.apres < filtre.avant,
      filtre.apres + ' rubriques visibles contre ' + filtre.avant + ' avant');
}

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));
await b.close();
const ko = bilan();
console.log(ko ? '\nUn bloc sans ligne se perd encore entre l\'atelier et le guide.'
               : '\nCe qu\'on ecrit sans ligne se lit aussi dans le guide.');
process.exit(ko ? 1 : 0);
