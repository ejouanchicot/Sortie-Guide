/* ============================================================
   verif-chapitres.mjs — l'atelier suit la strat qu'on ouvre
   ------------------------------------------------------------
   Les chapitres appartiennent à la STRAT : deux ici, cinq dans la
   suivante, et pas les mêmes noms. Chacun des deux ateliers garde
   sa propre rangée de chapitres, cachée avec sa barre, et la coque
   la pilote au lieu de la remplacer.

   Ces rangées étaient construites UNE FOIS, au chargement de la
   page. Ouvrir une strat à trois chapitres laissait donc les deux
   boutons de la précédente : la coque cherchait « le bouton 2 », ne
   trouvait rien, et n'appelait jamais le changement d'étage. Mesuré
   sur une strat à trois chapitres — l'en-tête affichait
   « Chapitre C », le sélecteur de carte montrait celle du A, les
   boss dessinés étaient ceux du A, et tout ce qu'on posait partait
   dans le A. Rien ne le disait.

   Si la strat de départ n'a qu'un seul chapitre, la rangée est même
   masquée : le changement de chapitre était mort tout court.
   ============================================================ */
import {puppeteer, STUDIO, carteDessinee, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
await p.setViewport({width:1500, height:1000});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.evaluate(() => { indexedDB.deleteDatabase('strat-studio');
                         localStorage.removeItem('studio_strat_courante'); });
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.__MS && window.BIBLIO, {timeout:9000});
await carteDessinee(p);

const depart = await p.evaluate(() => FLOORS.length);
dit('la strat de départ a bien ses chapitres', depart >= 2, depart + ' chapitre(s)');

/* Une strat à TROIS chapitres, dont le dernier sur une autre carte : c'est ce
   qui rend le défaut visible — si la carte ne change pas, on le voit. */
const id = await p.evaluate(async () => {
  const s = window.BIBLIO.depuisGlobaux(
    {COMPO, ROLE, BUFFS, CARTES, MOB, TR, FLOORS}, 'Trois chapitres',
    window.__MS.reglages());
  const c0 = s.chapitres[0], c1 = s.chapitres[1] || c0;
  const autre = Object.keys(s.cartes)[1] || c0.carte;
  s.chapitres = [
    Object.assign({}, c0, {id:'a', fr:'Chapitre A', en:'A'}),
    Object.assign({}, c1, {id:'b', fr:'Chapitre B', en:'B'}),
    Object.assign({}, c0, {id:'c', fr:'Chapitre C', en:'C', carte:autre})
  ];
  s.id = window.BIBLIO.id();
  await window.BIBLIO.ecris(s);
  window.BIBLIO.noteCourante(s.id);
  return s.id;
});
// on rouvre l'atelier sur elle, comme le lead qui revient au travail
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.__MS && FLOORS.length === 3, {timeout:12000});
await carteDessinee(p);

console.log('\n— les trois rangées de chapitres suivent la strat ouverte —');
const vu = await p.evaluate(() => {
  const noms = h => [...document.querySelectorAll('#' + h + ' button')]
    .map(x => x.textContent.trim());
  return {coque: noms('stChap'), carte: noms('floorSeg'), strat: noms('ssFloor'),
          attendu: FLOORS.map(f => f.fr)};
});
['coque', 'carte', 'strat'].forEach(q =>
  dit('la rangée « ' + q + ' » nomme les trois chapitres',
      vu[q].join('|') === vu.attendu.join('|'),
      JSON.stringify(vu[q]) + ' au lieu de ' + JSON.stringify(vu.attendu)));

/* Et le geste lui-même : on clique le troisième dans la barre du haut, et on
   regarde CE QUE MONTRE LA CARTE — pas ce que dit le bouton. C'est l'écart
   entre les deux qui faisait éditer le mauvais chapitre. */
console.log('\n— et cliquer le troisième amène vraiment sa carte —');
await p.evaluate(() => document.querySelector('#stChap button[data-i="2"]')?.click());
await new Promise(r => setTimeout(r, 900));
await carteDessinee(p);
const apres = await p.evaluate(() => ({
  enTete: document.querySelector('#stChap button.on')?.textContent.trim(),
  affichee: document.getElementById('carteSel')?.value,
  attendue: FLOORS[2] && FLOORS[2].carte,
  dessine: (window.Konva && Konva.stages[0] ? Konva.stages[0].find('.pin').length : 0)
}));
dit('l\'en-tête annonce le troisième chapitre', apres.enTete === 'Chapitre C', String(apres.enTete));
dit('  et la carte affichée est la sienne', apres.affichee === apres.attendue,
    'affichée « ' + apres.affichee + ' » pour « ' + apres.attendue + ' »');
dit('  avec des marqueurs dessus', apres.dessine > 0, apres.dessine + ' marqueur(s)');
dit('rien ne casse', bruit.length === 0, bruit.slice(0, 2).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s) : on peut editer un chapitre en croyant en editer un autre.`
               : '\nL\'atelier montre bien le chapitre qu\'il annonce.');
process.exit(ko ? 1 : 0);
