/* ============================================================
   verif-entete.mjs — la barre du guide se replie quand on lit
   ------------------------------------------------------------
   La barre du haut portait quatre rangées, tout le temps : 215 px
   sur un téléphone, 25 % de l'écran gelés pour des boutons qu'on
   touche une fois en arrivant. Elle ne garde plus, dès qu'on
   descend, que le sommaire des étapes — le seul qui serve en run —
   et revient entière au premier geste vers le haut.

   Ce qu'on mesure ici, c'est le GESTE, pas la classe CSS :
   descendre, remonter, et regarder ce que la barre fait ensuite.

   ⚠ Le défaut qui a coûté le plus cher ne se voit qu'en remontant.
   La barre vit dans le flux : en se rouvrant elle pousse la strat
   vers le bas, et le navigateur rattrape le défilement pour garder
   la ligne lue sous les yeux. Ce rattrapage ressemble trait pour
   trait à un geste vers le bas — la barre se refermait, la strat
   remontait, et ça repartait. Elle clignotait à chaque remontée.
   D'où la dernière mesure : on la regarde ENCORE, 700 ms plus tard.
   ============================================================ */
import {puppeteer, GUIDE, rapport, attend} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});

// un vrai défilement, par crans, image par image — un saut d'un seul bond
// ne produit pas le rattrapage du navigateur, et laisserait passer le pire
const glisse = (p, de, a, pas) => p.evaluate(async (de, a, pas) => {
  for (let y = de; (pas > 0 ? y <= a : y >= a); y += pas) {
    window.scrollTo({top: y, behavior: 'instant'});
    await new Promise(r => requestAnimationFrame(r));
  }
}, de, a, pas);

const etat = p => p.evaluate(() => {
  const ba = document.querySelector('.bars');
  const vu = s => { const e = document.querySelector(s);
                    return e ? Math.round(e.getBoundingClientRect().height) : 0; };
  /* Une rangée repliée garde sa hauteur à elle : c'est la BOÎTE au-dessus qui
     se ferme et la rogne. On mesure donc le repli, pas ce qu'il contient. */
  return {haut: Math.round(ba.getBoundingClientRect().height),
          replie: ba.classList.contains('replie'),
          repli: vu('.barfold'),
          etapes: vu('#nav'), chapitre: vu('#floor'), roles: vu('#jobs'),
          stickh: parseFloat(getComputedStyle(document.documentElement)
                  .getPropertyValue('--stickh')) || 0,
          ecran: innerHeight};
});

for (const [quoi, w, h, part] of [['un écran de bureau', 1500, 900, 0.10],
                                  ['un téléphone',        390, 844, 0.15]]) {
  const p = await b.newPage();
  const bruit = [];
  p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
  await p.setViewport({width:w, height:h, isMobile:w < 600, hasTouch:w < 600});
  await p.goto(GUIDE, {waitUntil:'networkidle0'});
  await p.evaluate(() => { localStorage.removeItem('sortie_floor');
                           localStorage.removeItem('sortie_zone'); });
  await p.goto(GUIDE, {waitUntil:'networkidle0'});
  await p.waitForSelector('.phase', {timeout:15000});
  await attend(p, () => getComputedStyle(document.documentElement)
               .getPropertyValue('--stickh').trim() !== '', 'la hauteur mesurée', 9000);

  console.log('\n— ' + quoi + ' · ' + w + '×' + h + ' —');
  const ouverte = await etat(p);
  dit('en arrivant, tout est là', !ouverte.replie && ouverte.chapitre > 0
      && ouverte.etapes > 0 && ouverte.roles > 0,
      JSON.stringify(ouverte));

  await glisse(p, 0, 1800, 60);
  await attend(p, () => document.querySelector('.bars').classList.contains('replie'),
               'la barre se replie quand on descend', 6000);
  await new Promise(r => setTimeout(r, 500));            // le repli dure 300 ms
  const lit = await etat(p);
  /* Sur un écran de bureau il reste le sommaire ET le chapitre, qui tiennent
     sur la même ligne ; sur téléphone, où chaque rangée coûte une ligne
     entière, le chapitre s'en va aussi. Dans les deux cas la comp et le rôle
     sont refermés. */
  dit('en lisant, elle ne garde que le sommaire',
      lit.etapes > 0 && lit.repli === 0 && (w >= 900 || lit.chapitre <= 4),
      JSON.stringify(lit));
  dit('  et elle laisse la strat tranquille',
      lit.haut / lit.ecran <= part,
      Math.round(lit.haut) + ' px sur ' + lit.ecran + ' — '
      + Math.round(lit.haut / lit.ecran * 100) + ' %, on en accepte '
      + Math.round(part * 100) + ' %');
  /* La hauteur retenue sert à ne pas glisser une étape SOUS la barre quand on
     la rejoint par un bouton : elle doit suivre le repli, pas rester sur la
     hauteur d'avant. */
  dit('  et la hauteur retenue a suivi', Math.abs(lit.stickh - lit.haut) < 2,
      lit.stickh + ' px retenus pour ' + lit.haut + ' px de barre');

  await glisse(p, 1800, 1560, -60);
  await attend(p, () => !document.querySelector('.bars').classList.contains('replie'),
               'la barre revient quand on remonte', 6000);
  await new Promise(r => setTimeout(r, 500));
  const revenue = await etat(p);
  dit('au premier geste vers le haut, elle revient entière',
      !revenue.replie && revenue.roles > 0, JSON.stringify(revenue));

  // et elle RESTE ouverte : c'est ici que le clignotement se voyait
  await new Promise(r => setTimeout(r, 700));
  const apres = await etat(p);
  dit('  et elle ne clignote pas',
      !apres.replie && apres.haut === revenue.haut,
      'elle est repassée à ' + JSON.stringify(apres));

  /* Au clavier il n'y a pas de molette : sans ce rattrapage, la rangée
     repliée serait hors d'atteinte pour qui navigue au Tab. */
  await glisse(p, 1560, 1900, 60);
  await attend(p, () => document.querySelector('.bars').classList.contains('replie'),
               'la barre repliée avant le test au clavier', 6000);
  await p.evaluate(() => document.getElementById('jobAll').focus());
  await new Promise(r => setTimeout(r, 450));
  const clavier = await etat(p);
  dit('le focus rouvre la rangée repliée', !clavier.replie && clavier.roles > 0,
      JSON.stringify(clavier));

  dit('rien ne casse', bruit.length === 0, bruit.slice(0, 2).join('\n       '));
  await p.close();
}

/* Un saut déclenché par un bouton n'est pas un geste du lead : si la barre
   change de hauteur pendant qu'elle nous emmène, l'étape visée arrive de
   travers. On regarde donc l'état AVANT et APRÈS le saut. */
console.log('\n— sauter par le sommaire ne fait pas bouger la barre —');
{
  const p = await b.newPage();
  const bruit = [];
  p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
  await p.setViewport({width:1500, height:900});
  await p.goto(GUIDE, {waitUntil:'networkidle0'});
  await p.evaluate(() => { localStorage.removeItem('sortie_floor');
                           localStorage.removeItem('sortie_zone'); });
  await p.goto(GUIDE, {waitUntil:'networkidle0'});
  await p.waitForSelector('.phase', {timeout:15000});
  await glisse(p, 0, 1800, 60);                       // on lit : la barre est repliée
  await attend(p, () => document.querySelector('.bars').classList.contains('replie'),
               'la barre repliée', 6000);
  const avant = await etat(p);
  const depart = await p.evaluate(() => window.scrollY);
  await p.evaluate(() => document.querySelector('#nav .chip[data-n="4"]').click());
  /* Parti ET arrivé : le défilement est doux, il ne commence qu'à l'image
     suivante. Sans le « parti », deux mesures identiques prises avant le
     départ passaient pour une arrivée. */
  await attend(p, (d) => {
    const y = Math.round(window.scrollY), pre = window.__yPrec;
    window.__yPrec = y;
    return Math.abs(y - d) > 50 && pre === y && !!document.getElementById('phase4');
  }, 'le saut jusqu\'à l\'étape 4', 12000, depart);
  const apres = await etat(p);
  dit('elle reste repliée pendant le saut', apres.replie === avant.replie,
      'avant ' + avant.replie + ', après ' + apres.replie);
  const pose = await p.evaluate(() => {
    const e = document.getElementById('phase4');
    const st = parseFloat(getComputedStyle(document.documentElement)
               .getPropertyValue('--stickh')) || 0;
    return {top: e.getBoundingClientRect().top, stick: st, ecran: innerHeight};
  });
  dit('  et l\'étape visée n\'arrive pas sous elle',
      pose.top >= pose.stick - 1 && pose.top < pose.ecran,
      'elle est à ' + Math.round(pose.top) + ' px du haut, la barre en tient '
      + Math.round(pose.stick));
  dit('rien ne casse', bruit.length === 0, bruit.slice(0, 2).join('\n       '));
  await p.close();
}

await b.close();
console.log('\nLa barre s\'efface pour lire et revient pour naviguer.');
process.exit(bilan() ? 1 : 0);
