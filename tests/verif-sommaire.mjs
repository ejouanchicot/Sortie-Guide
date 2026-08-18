/* ============================================================
   verif-sommaire.mjs — la rangée des étapes, en haut du guide
   ------------------------------------------------------------
   Le guide a toujours eu son sommaire — « Phases », entre les
   chapitres et la compo — et personne ne l'a jamais vu. Une ligne
   le masquait dès que le chapitre avait des secteurs, c'est-à-dire
   dans les deux chapitres de Sortie. Un lead qui voulait relire
   Leshonn remontait la page à la main.

   Ce qu'on regarde ici, c'est ce qui est À L'ÉCRAN : que la rangée
   soit là, qu'elle nomme les étapes du chapitre ouvert, et surtout
   qu'un bouton AMÈNE VRAIMENT à son étape — y compris depuis la
   vue d'un seul secteur, où l'étape visée n'est pas dans la page
   et où le lien seul ne faisait rien du tout.
   ============================================================ */
import {puppeteer, GUIDE, rapport, attend} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
await p.setViewport({width:1500, height:900});

// on arrive comme quelqu'un qui ouvre le lien pour la première fois :
// ni chapitre ni secteur mémorisés
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await p.evaluate(() => { localStorage.removeItem('sortie_floor');
                         localStorage.removeItem('sortie_zone'); });
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await p.waitForSelector('.phase', {timeout:15000});

console.log('\n— le sommaire du rez-de-chaussée —');
const vu = await p.evaluate(() => {
  const nav = document.getElementById('nav');
  const chips = [...nav.querySelectorAll('.chip')];
  return {visible: getComputedStyle(nav).display !== 'none' && !!nav.offsetHeight,
          libelles: chips.map(c => c.textContent.trim()),
          cibles: chips.map(c => c.getAttribute('href')),
          attendu: FLOORS[0].phases.map(x => x.n)};
});
dit('la rangée est à l\'écran', vu.visible, 'elle est encore masquée');
dit('elle porte une pastille par étape',
    vu.libelles.length === vu.attendu.length,
    vu.libelles.length + ' pastilles pour ' + vu.attendu.length + ' étapes');
dit('chacune s\'annonce « Phase N »',
    vu.attendu.every((n, i) => (vu.libelles[i] || '').startsWith('Phase ' + n)),
    JSON.stringify(vu.libelles));
dit('et nomme son boss',
    /Degei$/.test(vu.libelles[0] || ''), vu.libelles[0]);

/* Le geste, pas le lien : une ancre qui existe ne prouve pas que l'étape
   arrive SOUS la barre collée. C'est le défaut que --stickh corrige, et la
   rangée qu'on vient d'afficher change justement sa hauteur. */
console.log('\n— cliquer « Phase 3 » descend à Leshonn —');
await p.evaluate(() => document.querySelector('#nav .chip[data-n="3"]').click());
/* On attend que le défilement S'ARRÊTE, pas qu'une durée passe : il est doux,
   et une pause fixe ment dès que quatre navigateurs tournent de front — c'est
   la règle de toute la suite. Deux images de suite au même endroit : il est
   arrivé. */
await attend(p, () => {
  const y = Math.round(window.scrollY), avant = window.__yPrec;
  window.__yPrec = y;
  return y > 100 && avant === y && !!document.getElementById('phase3');
}, 'le défilement jusqu\'à l\'étape 3', 12000);
const pose = await p.evaluate(() => {
  const e = document.getElementById('phase3');
  const st = parseFloat(getComputedStyle(document.documentElement)
             .getPropertyValue('--stickh')) || 0;
  return {top: e.getBoundingClientRect().top, stick: st, ecran: innerHeight};
});
dit('l\'étape n\'est pas passée sous la barre',
    pose.top >= pose.stick - 1 && pose.top < pose.ecran,
    'elle est à ' + Math.round(pose.top) + ' px du haut, la barre en tient '
    + Math.round(pose.stick));

/* La vue par secteur ne montre QU'UNE étape. Le sommaire, lui, les liste
   toutes : c'est là qu'il sert le plus, et c'est là qu'un lien nu ne mène
   nulle part. */
console.log('\n— depuis un seul secteur, le sommaire ramène l\'étape —');
await p.evaluate(() => document.querySelector('.zonetab[data-z="0"]').click());
await p.waitForSelector('.phase', {timeout:9000});
const seul = await p.evaluate(() => ({
  etapes: document.querySelectorAll('.phase').length,
  pastilles: document.querySelectorAll('#nav .chip').length
}));
dit('la page ne montre qu\'une étape', seul.etapes === 1, seul.etapes + ' étapes');
dit('le sommaire les liste quand même toutes', seul.pastilles === 4,
    seul.pastilles + ' pastilles');

await p.evaluate(() => document.querySelector('#nav .chip[data-n="3"]').click());
await attend(p, () => !!document.getElementById('phase3'),
             'l\'étape 3 ramenée à l\'écran', 12000);
const revenu = await p.evaluate(() => ({
  ok: !!document.getElementById('phase3'),
  onglet: (document.querySelector('.zonetab.on') || {}).textContent
}));
dit('l\'étape 3 est bien là', revenu.ok, 'le clic n\'a rien ramené');
dit('et le secteur a suivi', String(revenu.onglet).trim() === '3',
    'onglet actif : ' + revenu.onglet);

/* Aminon partage le secteur E avec Dhartok : aucun onglet ne le contient.
   Une étape sans secteur à elle doit rouvrir le chapitre entier, sinon le
   sommaire du sous-sol a un bouton mort. */
console.log('\n— le sous-sol, et son étape sans secteur —');
await p.evaluate(() => document.querySelector('.floorchip[data-f="bottom"]').click());
// le secteur retenu suit le lead d'un chapitre a l'autre : on n'attend pas
// une etape precise, mais que le sommaire du sous-sol soit en place
await p.waitForFunction(() => document.querySelectorAll('#nav .chip').length === 5,
                        {timeout:9000});
const bas = await p.evaluate(() => [...document.querySelectorAll('#nav .chip')]
  .map(c => c.textContent.trim()));
dit('le sommaire suit le chapitre', bas.length === 5, bas.length + ' pastilles');
dit('la dernière est « Phase 5 »', /^Phase 5/.test(bas[4] || ''), bas[4]);

await p.evaluate(() => document.querySelector('#nav .chip[data-n="5"]').click());
await attend(p, () => !!document.getElementById('bphase5'),
             'l\'étape 5 du sous-sol', 12000);
const aminon = await p.evaluate(() => {
  const e = document.getElementById('bphase5');
  const r = e.getBoundingClientRect();
  return {la: true, dedans: r.top < innerHeight && r.bottom > 0};
});
dit('« Phase 5 » amène Aminon à l\'écran', aminon.la && aminon.dedans,
    'l\'étape existe mais reste hors champ');

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 2).join('\n       '));
await b.close();
process.exit(bilan() ? 1 : 0);
