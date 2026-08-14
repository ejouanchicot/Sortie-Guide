/* ============================================================
   verif-icones.mjs — poser un job ou un repere sur la carte
   ------------------------------------------------------------
   Le kit d'icones (22 jobs + 13 marqueurs) n'etait qu'un dossier
   sur le disque. Il devient un type de marqueur a part entiere :
   une palette pour le poser, un AUTOCOLLANT pour le dessiner, une
   ligne dans data.js pour le garder, et le meme jeton dans le guide.

   Ce qui compte ici :
   · l'image est NEUTRE — la couleur vient du jeton, donc un seul jeu
     sert pour les 35 icones ;
   · a la pose, le dessin prend le role du job, lu dans ROLE — la
     carte et la strat parlent la meme couleur pour le meme job ;
   · le contour se mesure en PART du jeton et non en pixels : sinon
     le meme marqueur sort epais sur un telephone et fin sur un grand
     ecran, et la carte change de tete selon qui la lit ;
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
  cStun: SORTIE.icoCouleur('STUN', ROLE),
  cSkull: SORTIE.icoCouleur('SKULL', ROLE),
  cInconnu: SORTIE.icoCouleur('NIMPORTEQUOI', ROLE),
  // chaque marqueur a SA couleur, et deux marqueurs qui disent des choses
  // differentes ne doivent pas se ressembler
  toutes: SORTIE.ICO_MARQUEURS.map(n => SORTIE.icoCouleur(n, ROLE)),
  RH: SORTIE.ROLE_HEX
}));
dit('les 22 jobs', socle.jobs === 22, String(socle.jobs));
dit('les 13 marqueurs', socle.marqueurs === 13, String(socle.marqueurs));
dit('un job pointe son image', socle.srcJob === 'xi-studio-icons/jobs/PLD.png', socle.srcJob);
dit('un marqueur aussi', socle.srcMarq === 'xi-studio-icons/markers/DANGER.png', socle.srcMarq);
dit('un nom inconnu ne pointe rien', socle.srcInconnu === '', JSON.stringify(socle.srcInconnu));
dit('un marqueur a un nom lisible', socle.nomMarq === 'Coffre', socle.nomMarq);

console.log('\n— le dessin prend le role du job, lu dans ROLE —');
dit('PLD → tank', socle.cPLD === socle.RH.tank, socle.cPLD);
dit('COR → buffs', socle.cCOR === socle.RH.buff, socle.cCOR);
dit('RDM → soin', socle.cRDM === socle.RH.heal, socle.cRDM);
dit('MNK → degats', socle.cMNK === socle.RH.dd, socle.cMNK);
/* Un marqueur ne joue AUCUN role : il dit une consigne, et il a sa couleur
   propre. Les faire passer par les cinq couleurs de role donnait des reperes
   gris et un stun couleur « buff », que personne ne reconnaissait. */
console.log('\n— et un marqueur, la sienne —');
dit('le danger part en rouge', socle.cDanger === '#f2564d', socle.cDanger);
dit('l\'eclair du stun est jaune', socle.cStun === '#ffd93b', socle.cStun);
dit('le groupe est blanc', socle.cGroupe === '#ffffff', socle.cGroupe);
dit('la tete de mort aussi', socle.cSkull === '#ffffff', socle.cSkull);
dit('les 13 en ont une', socle.toutes.every(c => /^#[0-9a-f]{6}$/i.test(c)),
    socle.toutes.join(' '));
/* Quelques couleurs se repetent, et c'est voulu : le danger et l'attaque
   parlent tous deux du combat, le groupe / le kite / la tete de mort ne
   designent aucun role. Ce qui compte, c'est qu'aucune ne soit le gris neutre
   d'avant, et que la carte reste lisible. */
dit('aucun marqueur ne reste gris',
    socle.toutes.every(c => c.toLowerCase() !== socle.RH.all.toLowerCase()),
    socle.toutes.join(' '));
dit('et la carte garde assez de teintes',
    new Set(socle.toutes).size >= 8,
    new Set(socle.toutes).size + ' teintes pour ' + socle.toutes.length + ' marqueurs');
dit('un nom inconnu retombe sur le neutre', socle.cInconnu === socle.RH.all, socle.cInconnu);

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
  const im = g._ico;
  if (!im) return {aUneImage:false};
  // l'autocollant est compose sur une toile : c'est la preuve qu'il porte deja
  // son contour, au lieu d'etre la silhouette brute posee dans un disque
  const src = im.image();
  const c = document.createElement('canvas'), n = src.width;
  c.width = n; c.height = n;
  const gg = c.getContext('2d'); gg.drawImage(src, 0, 0);
  // on compte ce qu'on trouve : il faut du BLEU (le dessin, un PLD tank) et le
  // NOIR du contour. L'un sans l'autre, ce n'est pas un autocollant.
  const d = gg.getImageData(0, 0, n, n).data;
  let role = 0, contour = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 40) contour++;
    else if (d[i + 2] > d[i] + 40) role++;
  }
  return {aUneImage: true, surToile: src instanceof HTMLCanvasElement,
          largeur: Math.round(im.width()), jeton: Math.round(g._iw),
          ombre: im.shadowOpacity() > 0 && im.shadowBlur() > 0, role, contour};
});
dit('l\'atelier la dessine', !!dessin && dessin.aUneImage, JSON.stringify(dessin));
dit('en composant un autocollant, pas en posant l\'image brute',
    !!dessin && dessin.surToile, dessin && String(dessin.surToile));
dit('qui occupe tout le jeton, contour compris',
    !!dessin && dessin.largeur === dessin.jeton,
    dessin && (dessin.largeur + ' contre ' + dessin.jeton));
dit('et se pose avec son ombre', !!dessin && dessin.ombre, dessin && String(dessin.ombre));
dit('le dessin porte la couleur du role', !!dessin && dessin.role > 500,
    dessin && (dessin.role + ' pixels a la couleur du role'));
dit('et un contour l\'entoure', !!dessin && dessin.contour > 500,
    dessin && (dessin.contour + ' pixels de contour'));

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
  // ce que la barre montre doit etre ce qui se posera : couleur ET contour
  const btn = n => [...document.querySelectorAll('#ar_grid .palbtn')]
    .find(x => x.dataset.name === n);
  const vue = n => {
    const b = btn(n), c = b && b.querySelector('.icocolle'), i = b && b.querySelector('.icoprev');
    return c && i ? {pc: getComputedStyle(i).backgroundColor,
                     bord: getComputedStyle(c).filter} : null;
  };
  return {cats, noms,
          masque: apercu ? getComputedStyle(apercu).webkitMaskImage || getComputedStyle(apercu).maskImage : '',
          stun: vue('STUN'), danger: vue('DANGER')};
});
dit('deux categories de plus : Jobs et Marqueurs',
    palette.cats.indexOf('job') >= 0 && palette.cats.indexOf('marq') >= 0,
    JSON.stringify(palette.cats));
dit('les 13 marqueurs y sont, sous leur nom francais',
    palette.noms.length === 13 && palette.noms.indexOf('Coffre') >= 0,
    palette.noms.length + ' · ' + JSON.stringify(palette.noms.slice(0, 4)));
dit('leur apercu passe par un masque, donc il se colore',
    /GROUP\.png|DANGER\.png|markers/.test(palette.masque || ''), palette.masque);
/* La barre montre le marqueur TEL QU'IL SERA POSE. Choisir sur une silhouette
   blanche revenait a choisir a l'aveugle, puis a decouvrir la vraie couleur
   une fois le marqueur sur la carte. */
dit('la barre montre la couleur qu\'aura le marqueur',
    /255,\s*217,\s*59/.test(palette.stun?.pc || '') && /242,\s*86,\s*77/.test(palette.danger?.pc || ''),
    JSON.stringify([palette.stun?.pc, palette.danger?.pc]));
dit('et son contour avec',
    /icobord-noir/.test(palette.stun?.bord || ''), palette.stun?.bord);

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
  const colle = el.querySelector('.icocolle');
  const bord = document.getElementById(SORTIE.icoFiltreId(SORTIE.ICO_CONTOUR_DEF));
  const morph = bord && bord.querySelector('feMorphology');
  return {couleur: getComputedStyle(el).getPropertyValue('--pc').trim(),
          gauche: el.style.left, haut: el.style.top,
          masque: st ? (st.maskImage || st.webkitMaskImage) : '',
          fond: st ? st.backgroundColor : '',
          filtre: colle ? getComputedStyle(colle).filter : '',
          // le contour vit dans la page, et son rayon se compte en part du jeton
          aLeFiltre: !!bord, enPart: bord ? bord.getAttribute('primitiveUnits') : '',
          rayon: morph ? morph.getAttribute('radius') : '',
          label: (el.querySelector('.plabel') || {}).textContent};
});
dit('le guide la dessine', !!vu, JSON.stringify(vu));
dit('a la place ou on l\'a posee', !!vu && vu.gauche === '44.4%' && vu.haut === '33.3%',
    vu && (vu.gauche + ' / ' + vu.haut));
dit('avec la meme couleur que l\'atelier', !!vu && vu.couleur === '#4c9df0', vu && vu.couleur);
dit('la silhouette passe par un masque, pas par une image',
    !!vu && /PLD\.png/.test(vu.masque || ''), vu && vu.masque);
dit('donc c\'est la page qui la colore, a la couleur du role',
    !!vu && /76,\s*157,\s*240/.test(vu.fond || ''), vu && vu.fond);
dit('le contour est pose dans la page', !!vu && vu.aLeFiltre, vu && String(vu.aLeFiltre));
dit('et s\'y mesure en part du jeton, pas en pixels',
    !!vu && vu.enPart === 'objectBoundingBox' && parseFloat(vu.rayon) < 1,
    vu && (vu.enPart + ' · rayon ' + vu.rayon));
dit('l\'autocollant le porte, avec son ombre',
    !!vu && /icobord/.test(vu.filtre || '') && /drop-shadow/.test(vu.filtre || ''), vu && vu.filtre);
dit('et son label se lit', !!vu && /ici le PLD tank/.test(vu.label || ''), vu && vu.label);

/* ---------------- la taille ----------------
   Elle vivait dans chaque moteur : 5,5 % dans l'atelier, 7 % dans le guide.
   La carte changeait donc de tete entre ce qu'on dessine et ce que le groupe
   lit. Elle est maintenant tenue par le socle, comme celle des boss. */
console.log('\n— la taille, tenue par le socle —');
const T = await p.evaluate(() => ({
  ico: SORTIE.POI_SIZE.ico, mid: SORTIE.POI_SIZE.mid,
  part: SORTIE.ICO_PART, bord: SORTIE.ICO_BORD,
  defaut: SORTIE.icoT({}), pose: SORTIE.icoT({t:1.8}), zero: SORTIE.icoT({t:0}),
  bornes: SORTIE.ICO_T
}));
dit('le socle porte une taille pour les icones', typeof T.ico === 'number', String(T.ico));
dit('elle vaut le double de celle d\'un mid-boss', Math.abs(T.ico - T.mid * 2) < 1e-9,
    T.ico + ' contre ' + T.mid);
/* Au-dela d'un septieme, le contour cesse d'entourer les emblemes de job et se
   met a boucher leurs ajours : une hache de WAR devient une tache blanche. */
dit('le contour reste sous le seuil ou il boucherait les emblemes',
    T.bord > 0 && T.bord <= 0.08, String(T.bord));
dit('et le dessin garde le reste du jeton', Math.abs(T.part - (1 - 2 * T.bord)) < 1e-9,
    T.part + ' de dessin, ' + T.bord + ' de contour de chaque cote');
dit('sans reglage, le facteur vaut 1', T.defaut === 1, String(T.defaut));
dit('une valeur absurde retombe sur 1', T.zero === 1, String(T.zero));
dit('le curseur va de la moitie au triple', T.bornes.min === 0.5 && T.bornes.max === 3,
    JSON.stringify(T.bornes));

console.log('\n— l\'atelier et le guide la lisent pareil —');
const mesures = await p.evaluate(async () => {
  const f = FLOORS[0];
  f.icones = [{ico:'PLD', x:30, y:30, c:'#4c9df0'},
              {ico:'PLD', x:60, y:30, c:'#4c9df0', t:2}];
  window.__MS.recharge();
  await new Promise(r => setTimeout(r, 1700));
  const st = Konva.stages[0];
  const g = Array.from(st.find('.pin')).filter(n => n._meta && n._meta.kind === 'ico');
  return g.map(n => ({d: Math.round(n._iw), img: Math.round(n._ico.width()),
                      flou: Math.round(n._ico.shadowBlur() * 10) / 10}));
});
dit('l\'atelier dessine deux icones', mesures.length === 2, JSON.stringify(mesures));
dit('celle a ×2 fait le double de l\'autre',
    mesures.length === 2 && Math.abs(mesures[1].d - mesures[0].d * 2) <= 2,
    JSON.stringify(mesures));
dit('son autocollant suit le jeton',
    mesures.length === 2 && Math.abs(mesures[1].img - mesures[0].img * 2) <= 2,
    JSON.stringify(mesures));
dit('et son ombre grandit avec lui',
    mesures.length === 2 && Math.abs(mesures[1].flou - mesures[0].flou * 2) <= 0.5,
    JSON.stringify(mesures.map(m => m.flou)));

const guideT = await pg.evaluate(() => {
  const f = FLOORS[0];
  f.icones = [{ico:'PLD', x:30, y:30, c:'#4c9df0'},
              {ico:'PLD', x:60, y:30, c:'#4c9df0', t:2}];
  renderFloor(f);
  const e = [...document.querySelectorAll('.poi.ico')];
  return e.map(x => Math.round(x.getBoundingClientRect().width));
});
dit('le guide aussi', guideT.length === 2, JSON.stringify(guideT));
dit('et sa ×2 fait bien le double',
    guideT.length === 2 && Math.abs(guideT[1] - guideT[0] * 2) <= 2, JSON.stringify(guideT));

/* ---------------- le contour, noir ou blanc ----------------
   Le fond de Sortie est beige clair : le noir y detache mieux, c'est donc lui
   par defaut. Mais une salle sombre ou un fond importe changent la donne, et
   c'est le lead qui voit sa carte. */
console.log('\n— le contour se choisit, par icone —');
const B = await p.evaluate(async () => {
  const nuances = Object.keys(SORTIE.ICO_CONTOURS);
  const f = FLOORS[0];
  f.icones = [{ico:'DANGER', x:30, y:70, c:'#f2564d'},
              {ico:'DANGER', x:60, y:70, c:'#f2564d', b:'blanc'}];
  window.__MS.recharge();
  await new Promise(r => setTimeout(r, 1700));
  // ce que l'atelier a reellement peint autour du dessin
  const st = Konva.stages[0];
  const bords = Array.from(st.find('.pin'))
    .filter(n => n._meta && n._meta.kind === 'ico')
    .map(n => {
      const src = n._ico.image(), c = document.createElement('canvas');
      c.width = c.height = src.width;
      const gg = c.getContext('2d'); gg.drawImage(src, 0, 0);
      const d = gg.getImageData(0, 0, src.width, src.height).data;
      let clair = 0, sombre = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        if (d[i] > 230 && d[i + 1] > 230 && d[i + 2] > 230) clair++;
        else if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 40) sombre++;
      }
      return {clair, sombre};
    });
  return {nuances, defaut: SORTIE.ICO_CONTOUR_DEF,
          sansReglage: SORTIE.icoBord({}), regle: SORTIE.icoBord({b:'blanc'}),
          absurde: SORTIE.icoBord({b:'turquoise'}), bords};
});
dit('deux contours, pas plus', B.nuances.length === 2 && B.nuances.indexOf('noir') >= 0
    && B.nuances.indexOf('blanc') >= 0, JSON.stringify(B.nuances));
dit('sans reglage, le contour est noir', B.sansReglage === 'noir' && B.defaut === 'noir',
    B.sansReglage);
dit('on peut le passer en blanc', B.regle === 'blanc', B.regle);
dit('une valeur inconnue retombe sur le defaut', B.absurde === 'noir', B.absurde);
dit('l\'atelier peint bien du noir autour de la premiere',
    B.bords.length === 2 && B.bords[0].sombre > 500 && B.bords[0].clair < 200,
    JSON.stringify(B.bords[0]));
dit('et du blanc autour de la seconde',
    B.bords.length === 2 && B.bords[1].clair > 500 && B.bords[1].sombre < 200,
    JSON.stringify(B.bords[1]));

const guideB = await pg.evaluate(() => {
  const f = FLOORS[0];
  f.icones = [{ico:'DANGER', x:30, y:70, c:'#f2564d'},
              {ico:'DANGER', x:60, y:70, c:'#f2564d', b:'blanc'}];
  renderFloor(f);
  const filtres = [...document.querySelectorAll('filter[id^="icobord-"]')]
    .map(x => x.id + ':' + x.querySelector('feFlood').getAttribute('flood-color'));
  const portes = [...document.querySelectorAll('.poi.ico')]
    .map(e => getComputedStyle(e).getPropertyValue('--bordf').trim());
  return {filtres, portes};
});
dit('le guide pose les deux contours', guideB.filtres.length === 2,
    JSON.stringify(guideB.filtres));
dit('et chaque icone prend le sien',
    /icobord-noir/.test(guideB.portes[0] || '') && /icobord-blanc/.test(guideB.portes[1] || ''),
    JSON.stringify(guideB.portes));

console.log('\n— ce que la taille et le contour laissent dans data.js —');
const ecritT = await p.evaluate(() => SORTIE.iconesConst('I',
  [{ico:'PLD', c:'#4c9df0', x:1, y:2}, {ico:'DANGER', c:'#f2564d', x:3, y:4, t:1.75, b:'blanc'}]));
dit('une taille ordinaire ne s\'ecrit pas', !/\{ico:'PLD'[^}]*t:/.test(ecritT),
    (ecritT.match(/\{ico:'PLD'[^}]*\}/) || [''])[0]);
dit('un contour noir non plus, c\'est le defaut', !/\{ico:'PLD'[^}]*b:/.test(ecritT),
    (ecritT.match(/\{ico:'PLD'[^}]*\}/) || [''])[0]);
dit('une taille reglee, si', /\{ico:'DANGER'[^}]*t:1\.75/.test(ecritT),
    (ecritT.match(/\{ico:'DANGER'[^}]*\}/) || [''])[0]);
dit('un contour blanc aussi', /\{ico:'DANGER'[^}]*b:'blanc'/.test(ecritT),
    (ecritT.match(/\{ico:'DANGER'[^}]*\}/) || [''])[0]);

/* ---------------- le fichier qu'on s'echange ----------------
   Un export autonome n'a aucun dossier autour de lui. Le dessin d'un job y
   arrivait donc en carre de couleur : son masque cherchait une image restee
   sur le site. Et il ne se remplace pas comme les autres images — la carte
   retient le CODE du dessin, son chemin ne nait qu'a l'execution. */
console.log('\n— et dans le fichier qu\'on colle sur Discord —');
const expo = await p.evaluate(async () => {
  const nom = Object.keys(CARTES)[0];
  CARTES[nom].icones = [{ico:'PLD', x:30, y:30, c:'#4c9df0'},
                        {ico:'DANGER', x:60, y:30, c:'#f2564d'}];
  const s = window.BIBLIO.depuisGlobaux(
    {COMPO, ROLE, BUFFS, CARTES, MOB, TR, FLOORS}, 'essai icones',
    window.__MS.reglages());
  const doc = await window.EXPORTHTML.fabrique(s, {base:'../'});
  return {
    embarque: /SORTIE\.icoEmbarque\(/.test(doc),
    combien: (doc.match(/"(?:PLD|DANGER)":"data:image\//g) || []).length,
    // plus aucun chemin vers le kit : il n'existe pas chez celui qui recoit
    resteUnChemin: /xi-studio-icons\/(?:jobs|markers)\/[A-Z]+\.png/.test(doc)
  };
});
dit('les icones partent avec le fichier', expo.embarque, String(expo.embarque));
dit('les deux qui servent, et elles seules', expo.combien === 2, String(expo.combien));
dit('aucune ne va plus chercher le site', !expo.resteUnChemin, String(expo.resteUnChemin));

dit('rien ne casse', bruit.length === 0 && bruitG.length === 0,
    bruit.concat(bruitG).slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nUn job, un repere : on le pose, il s\'enregistre, le groupe le voit.');
process.exit(ko ? 1 : 0);
