/* ============================================================
   verif-portraits.mjs — chaque etape montre-t-elle SON boss ?
   ------------------------------------------------------------
   Une carte de strat « boss » ne porte pas d'image a elle : elle
   va chercher, sur la carte du chapitre, le marqueur qui porte le
   MEME NUMERO d'ordre, et lui emprunte son portrait et sa couleur.

   C'est econome — un seul endroit ou changer une creature — mais
   ca rend la strat dependante de la carte a laquelle son chapitre
   est rattache. Le jour ou le rez-de-chaussee s'est retrouve
   rattache a la carte du sous-sol, chaque etape est allee chercher
   le marqueur du meme numero sur l'autre carte :

       Degei (1)   -> Dhartok      Leshonn (3) -> Aita
       Skomora (2) -> Triboulex    Ghatjot (4) -> Gartell

   Rien ne cassait, aucune erreur en console : la strat affichait
   simplement les quatre mauvais boss, avec aplomb.

   Ce qu'on ne verifie PAS : que deux chapitres aient des cartes
   differentes. Les partager est prevu et affiche par l'outil. Ce
   qui compte, c'est qu'une etape montre bien SON boss.
   ============================================================ */
import {puppeteer, GUIDE, STUDIO, rapport, carteDessinee} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1300, height:1000});
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.querySelectorAll('.card.boss').length > 0, {timeout:9000});

// Les etages tels que le guide les propose, pour ne pas en oublier un
const etages = await p.evaluate(() => [...document.querySelectorAll('.floorrow button')]
  .map(b => b.textContent.trim()));

for(const nom of etages){
  await p.evaluate(n => [...document.querySelectorAll('.floorrow button')]
    .find(b => b.textContent.trim() === n)?.click(), nom);
  /* Le GUIDE, pas l'atelier : pas de crochet __MS ici. L'étage est en place
     quand son bouton est allumé et que les cartes sont dessinées. */
  await p.waitForFunction(n => {
    const b = [...document.querySelectorAll('.floorrow button')]
      .find(x => x.textContent.trim() === n);
    return !!b && b.classList.contains('on')
        && document.querySelectorAll('.card').length > 0;
  }, {timeout:15000}, nom);

  const r = await p.evaluate(() => {
    // Quel etage est affiche ? Rien ne le marque sur le document : on le lit
    // sur le bouton actif. Se tromper ici ferait comparer un etage a l'autre —
    // et le test annoncerait deux fois le meme, sans que rien ne cloche.
    const actif = document.querySelector('.floorrow button.on')?.textContent || '';
    const f = FLOORS.find(x => actif.indexOf(x.fr) >= 0 || actif.indexOf(x.en) >= 0)
           || FLOORS[0];
    const attendu = {};
    (f.phases||[]).forEach(ph => { if(ph.boss) attendu[ph.n] = ph.boss; });
    // ce que l'ECRAN montre
    const vus = [...document.querySelectorAll('.card.boss')].map(c => {
      const im = c.querySelector('.cthumb img');
      const src = im ? im.getAttribute('src') : '';
      const nom = (c.querySelector('.cname')?.textContent || '').trim();
      return {nom, fichier: src.replace(/^.*mob-/, '').replace(/\.webp$/, '')};
    });
    return {carte: f.carte, etage: f.fr, attendu, vus,
            marqueurs: (f.bosses||[]).map(x => x.n + ':' + x.name)};
  });

  console.log(`\n— ${r.etage} · carte « ${r.carte} » —`);
  r.vus.forEach(v => console.log(`       ${v.nom.padEnd(20)} montre  ${v.fichier}`));

  // Le nom du boss doit se retrouver dans le fichier de son portrait.
  // On compare sans accent ni casse : « Aita » nomme le fichier mob-aita.
  const nu = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const faux = r.vus.filter(v => {
    const boss = v.nom.replace(/^.*·\s*/, '').trim();
    return v.fichier && nu(v.fichier) !== nu(boss);
  });
  dit(`${r.etage} : chaque etape montre bien son boss`, faux.length === 0,
      faux.map(v => v.nom + ' montre ' + v.fichier).join(' · '));
  dit(`${r.etage} : chaque etape a un portrait`,
      r.vus.every(v => !!v.fichier), r.vus.filter(v => !v.fichier).map(v => v.nom).join(' · '));
  // et le lien avec la carte : le marqueur n doit porter le nom de l'etape n
  const decale = Object.entries(r.attendu).filter(([n, boss]) =>
    !r.marqueurs.some(m => nu(m) === nu(n + ':' + boss)));
  dit(`${r.etage} : les numeros de la carte suivent ceux de la strat`,
      decale.length === 0,
      'attendu ' + JSON.stringify(r.attendu) + ' · carte ' + JSON.stringify(r.marqueurs));
}

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

/* ---------- et dans l'atelier : une carte reste a son chapitre ----------
   Le menu CARTE reaffectait la carte du chapitre courant. Deux selecteurs
   voisins, deux gestes tres differents : aller voir le sous-sol par ce
   menu-la rattachait le chapitre du haut a la carte du bas, definitivement.
   Choisir une carte, c'est maintenant ALLER LA VOIR. */
console.log('\n— choisir une carte y va, sans rien rattacher —');
const s = await b.newPage();
s.on('pageerror', e => bruit.push(String(e)));
await s.setViewport({width:1680, height:1000});
await s.goto(STUDIO, {waitUntil:'networkidle0'});
await s.waitForFunction(() => document.getElementById('carteSel')?.options.length > 1, {timeout:9000});
await carteDessinee(s);

const liens = () => s.evaluate(() => FLOORS.map(f => f.fr + '→' + f.carte).join(' · '));
const etageVu = () => s.evaluate(() =>
  document.querySelector('#floorSeg button.on')?.textContent.trim());
const avant = await liens();
const auDepart = await etageVu();
const autre = await s.evaluate(() => [...document.getElementById('carteSel').options]
  .map(o => o.value).find(v => v && !v.startsWith('__') && v !== FLOORS[0].carte));

await s.evaluate(x => { const el = document.getElementById('carteSel');
  el.value = x; el.dispatchEvent(new Event('change')); }, autre);
await carteDessinee(s);

dit('aucun chapitre n\'a change de carte', (await liens()) === avant,
    'avant ' + avant + ' · apres ' + (await liens()));
dit('on est parti la voir, sur son propre chapitre',
    (await etageVu()) !== auDepart, 'toujours sur ' + (await etageVu()));
dit('et c\'est bien le chapitre qui l\'utilise',
    await s.evaluate(x => FLOORS[FLOORS.findIndex(f =>
      document.querySelector('#floorSeg button.on').textContent.trim().indexOf(f.fr) >= 0)]
      ?.carte === x, autre));
dit('aucune boite n\'a eu besoin de s\'ouvrir',
    await s.evaluate(() => { const m = document.getElementById('modal');
      return !m || !m.checkVisibility(); }));

dit('rien ne casse dans l\'atelier non plus', bruit.length === 0,
    bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nChaque etape montre le boss qu\'elle annonce.');
process.exit(ko ? 1 : 0);
