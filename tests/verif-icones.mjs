/* ============================================================
   verif-icones.mjs — poser un job ou un repere sur la carte
   ------------------------------------------------------------
   Le kit d'icones (22 jobs + 13 marqueurs) n'etait qu'un dossier
   sur le disque. Il devient un type de marqueur a part entiere :
   une palette pour le poser, une pastille cerclee de couleur pour
   le dessiner, une ligne dans data.js pour le garder, et le meme
   jeton dans le guide.

   Ce qui compte ici :
   · l'image est NEUTRE — c'est l'anneau qui porte la couleur, donc
     un seul jeu sert pour les 35 icones ;
   · a la pose, l'anneau prend le role du job, lu dans ROLE — la
     carte et la strat parlent la meme couleur pour le meme job ;
   · l'atelier et le guide dessinent le MEME jeton ;
   · le poids reste tenable : l'outil doit s'ouvrir hors ligne.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const GUIDE = STUDIO.replace(/tools\/studio\.html.*$/, 'index.html');
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1500, height:950});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.SORTIE && window.Konva && window.__MS, {timeout:9000});

/* ---------------- le socle ---------------- */
console.log('\n— le kit, tel que le socle le connait —');
const socle = await p.evaluate(() => ({
  jobs: SORTIE.ICO_JOBS.length,
  marqueurs: SORTIE.ICO_MARQUEURS.length,
  srcJob: SORTIE.icoSrc('PLD'),
  srcMarq: SORTIE.icoSrc('DANGER'),
  srcInconnu: SORTIE.icoSrc('NIMPORTEQUOI'),
  nomMarq: SORTIE.icoNom('CHEST'),
  // la couleur par defaut vient de ROLE, pas d'une seconde table
  cPLD: SORTIE.icoCouleur('PLD', ROLE),
  cCOR: SORTIE.icoCouleur('COR', ROLE),
  cRDM: SORTIE.icoCouleur('RDM', ROLE),
  cMNK: SORTIE.icoCouleur('MNK', ROLE),
  cDanger: SORTIE.icoCouleur('DANGER', ROLE),
  cGroupe: SORTIE.icoCouleur('GROUP', ROLE),
  RH: SORTIE.ROLE_HEX
}));
dit('les 22 jobs', socle.jobs === 22, String(socle.jobs));
dit('les 13 marqueurs', socle.marqueurs === 13, String(socle.marqueurs));
dit('un job pointe son image', socle.srcJob === 'xi-studio-icons/jobs/PLD.png', socle.srcJob);
dit('un marqueur aussi', socle.srcMarq === 'xi-studio-icons/markers/DANGER.png', socle.srcMarq);
dit('un nom inconnu ne pointe rien', socle.srcInconnu === '', JSON.stringify(socle.srcInconnu));
dit('un marqueur a un nom lisible', socle.nomMarq === 'Coffre', socle.nomMarq);

console.log('\n— l\'anneau prend le role du job, lu dans ROLE —');
dit('PLD → tank', socle.cPLD === socle.RH.tank, socle.cPLD);
dit('COR → buffs', socle.cCOR === socle.RH.buff, socle.cCOR);
dit('RDM → soin', socle.cRDM === socle.RH.heal, socle.cRDM);
dit('MNK → degats', socle.cMNK === socle.RH.dd, socle.cMNK);
dit('un marqueur de danger part en rouge', socle.cDanger === socle.RH.dd, socle.cDanger);
dit('un marqueur neutre reste neutre', socle.cGroupe === socle.RH.all, socle.cGroupe);

/* ---------------- les fichiers ---------------- */
console.log('\n— les 35 fichiers repondent, et restent legers —');
const fichiers = await p.evaluate(async () => {
  const tout = SORTIE.ICO_JOBS.concat(SORTIE.ICO_MARQUEURS);
  const manquants = [], lourds = [];
  for (const n of tout) {
    const r = await fetch('../' + SORTIE.icoSrc(n));
    if (!r.ok) { manquants.push(n + ' ' + r.status); continue; }
    const t = (await r.blob()).size;
    if (t > 80 * 1024) lourds.push(n + ' ' + Math.round(t / 1024) + ' Ko');
  }
  return {manquants, lourds, n: tout.length};
});
dit('les 35 sont la', fichiers.n === 35 && fichiers.manquants.length === 0,
    fichiers.n + ' icones · ' + JSON.stringify(fichiers.manquants));
/* Le poids compte : la palette les charge toutes d'un coup, et l'outil doit
   s'ouvrir hors ligne. Les originaux faisaient 1254x1254 pour un jeton affiche
   a 40 px — 5,8 Mo pour treize dessins. */
dit('aucune ne depasse 80 Ko', fichiers.lourds.length === 0, JSON.stringify(fichiers.lourds));

/* ---------------- poser une icone dans l'atelier ---------------- */
console.log('\n— on la pose sur la carte —');
const pose = await p.evaluate(() => {
  const f = FLOORS[0];
  const avant = (f.icones || []).length;
  (f.icones = f.icones || []).push({ico:'PLD', x:44.4, y:33.3, c:SORTIE.icoCouleur('PLD', ROLE)});
  return {avant, apres: f.icones.length};
});
dit('elle rejoint le tableau de la carte', pose.apres === pose.avant + 1,
    pose.avant + ' → ' + pose.apres);

// on redessine l'etage : le vrai chemin, celui d'une carte rouverte
await p.evaluate(() => window.__MS.recharge());
await new Promise(r => setTimeout(r, 1800));

const dessin = await p.evaluate(() => {
  const st = Konva.stages[0];
  const g = Array.from(st.find('.pin')).find(n => n._meta && n._meta.kind === 'ico');
  if (!g) return null;
  const disc = g._disc, im = g._ico;
  return {anneau: disc && disc.stroke(),
          aUneImage: !!im, largeurImage: im ? Math.round(im.width()) : 0,
          diametre: disc ? Math.round(disc.radius() * 2) : 0,
          aUnLabel: !!g._lbl};
});
dit('l\'atelier la dessine', !!dessin, JSON.stringify(dessin));
dit('avec l\'anneau a la couleur du role',
    !!dessin && String(dessin.anneau).toLowerCase() === socle.RH.tank.toLowerCase(),
    dessin && dessin.anneau);
dit('et la silhouette par-dessus', !!dessin && dessin.aUneImage && dessin.largeurImage > 0,
    dessin && (dessin.largeurImage + 'px dans une pastille de ' + dessin.diametre + 'px'));
dit('la silhouette tient dans la pastille',
    !!dessin && dessin.largeurImage < dessin.diametre,
    dessin && (dessin.largeurImage + ' < ' + dessin.diametre));

console.log('\n— elle a son calque, et son compte —');
const calque = await p.evaluate(() => {
  const l = [...document.querySelectorAll('.lay')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
  return l.filter(t => /Ic/i.test(t));
});
dit('« Icônes » apparait dans les calques', calque.length === 1, JSON.stringify(calque));

console.log('\n— et la palette sait la proposer —');
const palette = await p.evaluate(() => {
  const b = [...document.querySelectorAll('.tool')].find(x => x.dataset.tool === 'pin');
  if (b) b.click();
  const cats = [...document.querySelectorAll('#ar_cat button')].map(x => x.dataset.pc);
  const bJob = document.querySelector('#ar_cat button[data-pc="marq"]');
  if (bJob) bJob.click();
  const noms = [...document.querySelectorAll('#ar_grid .palbtn')].map(x => x.textContent.trim());
  const apercu = document.querySelector('#ar_grid .palbtn .icoprev');
  return {cats, noms, masque: apercu ? getComputedStyle(apercu).webkitMaskImage || getComputedStyle(apercu).maskImage : ''};
});
dit('deux categories de plus : Jobs et Marqueurs',
    palette.cats.indexOf('job') >= 0 && palette.cats.indexOf('marq') >= 0,
    JSON.stringify(palette.cats));
dit('les 13 marqueurs y sont, sous leur nom francais',
    palette.noms.length === 13 && palette.noms.indexOf('Coffre') >= 0,
    palette.noms.length + ' · ' + JSON.stringify(palette.noms.slice(0, 4)));
dit('leur apercu passe par un masque, donc il se colore',
    /GROUP\.png|DANGER\.png|markers/.test(palette.masque || ''), palette.masque);

/* ---------------- ce qui s'enregistre ---------------- */
console.log('\n— ce que data.js retient —');
const ecrit = await p.evaluate(() => SORTIE.cartesConst('CARTES', CARTES));
const ligne = (ecrit.match(/\{ico:[^}]*\}/) || ['(rien)'])[0];
dit('la carte porte un tableau d\'icones', /icones:\[/.test(ecrit), '');
dit('l\'icone posee y est, avec sa couleur',
    /\{ico:'PLD', c:'#4c9df0', x:44\.4,y:33\.3\}/.test(ecrit), ligne);
dit('et rien d\'inutile n\'est ecrit avec', !/name:/.test(ligne), ligne);

/* ---------------- le guide dessine le meme jeton ---------------- */
console.log('\n— et le groupe la voit dans le guide —');
const pg = await b.newPage();
const bruitG = [];
pg.on('pageerror', e => bruitG.push(String(e)));
await pg.setViewport({width:1400, height:1000});
await pg.goto(GUIDE, {waitUntil:'networkidle0'});
await pg.waitForFunction(() => window.SORTIE && typeof renderFloor === 'function', {timeout:9000});
const vu = await pg.evaluate(() => {
  const f = FLOORS[0];
  (f.icones = f.icones || []).push({ico:'PLD', x:44.4, y:33.3, c:'#4c9df0', label:'ici le PLD tank'});
  renderFloor(f);
  const el = document.querySelector('.poi.ico');
  if (!el) return null;
  const img = el.querySelector('.icoimg'), st = img && getComputedStyle(img);
  return {anneau: getComputedStyle(el).getPropertyValue('--pc').trim(),
          gauche: el.style.left, haut: el.style.top,
          masque: st ? (st.maskImage || st.webkitMaskImage) : '',
          fond: st ? st.backgroundColor : '',
          label: (el.querySelector('.plabel') || {}).textContent};
});
dit('le guide la dessine', !!vu, JSON.stringify(vu));
dit('a la place ou on l\'a posee', !!vu && vu.gauche === '44.4%' && vu.haut === '33.3%',
    vu && (vu.gauche + ' / ' + vu.haut));
dit('avec le meme anneau que l\'atelier', !!vu && vu.anneau === '#4c9df0', vu && vu.anneau);
dit('la silhouette passe par un masque, pas par une image',
    !!vu && /PLD\.png/.test(vu.masque || ''), vu && vu.masque);
dit('donc c\'est la page qui la colore',
    !!vu && /234,\s*243,\s*255|255,\s*255,\s*255/.test(vu.fond || ''), vu && vu.fond);
dit('et son label se lit', !!vu && /ici le PLD tank/.test(vu.label || ''), vu && vu.label);

dit('rien ne casse', bruit.length === 0 && bruitG.length === 0,
    bruit.concat(bruitG).slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nUn job, un repere : on le pose, il s\'enregistre, le groupe le voit.');
process.exit(ko ? 1 : 0);
