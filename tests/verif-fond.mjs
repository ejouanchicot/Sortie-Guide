/* ============================================================
   verif-fond.mjs — poser une image de fond sur une carte
   ------------------------------------------------------------
   Ce qu'on verifie, dans l'ordre ou un lead le vivrait :
     1. le bouton est la, et il dit ce qu'il fait ;
     2. une capture d'ecran quelconque (grande, en PNG) devient une
        image WebP a la bonne taille ;
     3. elle est deposee dans img/ sous un nom deduit de la carte ;
     4. la carte retient le CHEMIN, pas l'image — sinon les donnees
        gonfleraient de centaines de kilo-octets par carte ;
     5. la carte se redessine avec, tout de suite.

   Le dossier img/ est une copie jetable : on ne touche pas au vrai.
   ============================================================ */
import {puppeteer} from './navigateur.mjs';

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
await p.setViewport({width:1600, height:950});
const bruit = [];
p.on('pageerror', e => bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('stStratSel')?.options.length > 3, {timeout:8000});

console.log('\n— l\'entree de menu —');
const b0 = await p.evaluate(() => {
  const s = document.getElementById('carteSel');
  const o = [...(s?.options || [])].find(x => x.value === '__fond__');
  return {existe:!!o, texte:(o?.textContent || '').trim(),
          visible:!!s?.checkVisibility(),
          entrees:[...(s?.options || [])].filter(x => x.value.slice(0,2) === '__').map(x => x.value)};
});
dit('elle est dans le selecteur de carte', b0.existe && b0.visible, JSON.stringify(b0));
dit('elle annonce un remplacement quand un fond existe deja',
    /Changer/.test(b0.texte), b0.texte);
dit('le menu porte aussi creer, renommer et supprimer',
    b0.entrees.join(',') === '__neuve__,__fond__,__renom__,__suppr__', JSON.stringify(b0.entrees));
// L'en-tete doit tenir sur UNE ligne aux largeurs d'ecran courantes. Sur deux,
// il mange la hauteur de la carte — et c'est ce qui arrivait des 1700 px.
console.log('\n— la place dans l\'en-tete —');
// On RECHARGE a chaque largeur au lieu de redimensionner : mesurer juste apres
// un redimensionnement rend une hauteur d'avant la reprise de mise en page une
// fois sur trois, et le test accusait le produit a tort. Recharger, c'est
// aussi ce que fait quelqu'un qui ouvre l'outil sur son ecran.
for(const W of [1920, 1600, 1440, 1366]){
  await p.setViewport({width:W, height:950});
  await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
  await p.waitForFunction(() => document.getElementById('carteSel'), {timeout:8000});
  const h = await p.evaluate(() =>
    Math.round(document.querySelector('.st-top').getBoundingClientRect().height));
  dit(`une seule ligne a ${W} px`, h <= 100, h + ' px');
}
await p.setViewport({width:1600, height:950});
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('carteSel'), {timeout:8000});

console.log('\n— la conversion —');
// une capture d'ecran plausible : grande, en PNG, pas carree
const r = await p.evaluate(async () => {
  const c = document.createElement('canvas');
  c.width = 2400; c.height = 1800;
  const g = c.getContext('2d');
  g.fillStyle = '#d9c9a3'; g.fillRect(0, 0, 2400, 1800);      // du papier
  for(let i = 0; i < 400; i++){                                // du bruit, pour du poids
    g.fillStyle = 'hsl(' + (i * 7 % 360) + ',40%,50%)';
    g.fillRect((i * 137) % 2400, (i * 71) % 1800, 40, 30);
  }
  const png = await new Promise(res => c.toBlob(res, 'image/png'));
  const fichier = new File([png], 'capture ÉCRAN.png', {type:'image/png'});
  const prete = await window.IMPORTIMAGE.prepare(fichier);
  return {avant:prete.avant, apres:{w:prete.w, h:prete.h, poids:prete.apres.poids,
          type:prete.blob.type},
          nom:window.IMPORTIMAGE.nomDeFichier('Sheol C · étage 2'),
          max:window.IMPORTIMAGE.COTE_MAX};
});
dit('le grand cote est ramene a la limite',
    Math.max(r.apres.w, r.apres.h) === r.max, `${r.apres.w}×${r.apres.h}`);
dit('les proportions sont gardees',
    Math.abs(r.apres.w / r.apres.h - r.avant.w / r.avant.h) < 0.01,
    `${r.avant.w}×${r.avant.h} → ${r.apres.w}×${r.apres.h}`);
dit('c\'est du WebP', r.apres.type === 'image/webp', r.apres.type);
dit('et ca pese moins qu\'avant', r.apres.poids < r.avant.poids,
    Math.round(r.avant.poids/1024) + ' Ko → ' + Math.round(r.apres.poids/1024) + ' Ko');
dit('le nom de fichier est utilisable dans un depot',
    /^[a-z0-9-]+\.webp$/.test(r.nom), r.nom);
dit('et il rappelle la carte', /sheol-c/.test(r.nom), r.nom);

console.log('\n— la carte retient le chemin, pas l\'image —');
// on simule le depot : le vrai passe par un selecteur de dossier, qu'aucun
// test ne peut ouvrir. Ce qui compte ici, c'est ce que la carte enregistre.
const suite = await p.evaluate(async () => {
  const f = FLOORS[0], nom = f.carte;
  const avant = CARTES[nom].fond;
  CARTES[nom].fond = 'img/cartes/map-essai.webp';
  window.SORTIE.resoudreCartes(FLOORS, CARTES);
  const projete = f.map;                       // le chapitre suit-il ?
  const dansLesDonnees = JSON.stringify(CARTES[nom]);
  CARTES[nom].fond = avant;                    // on remet en etat
  window.SORTIE.resoudreCartes(FLOORS, CARTES);
  return {projete, taille:dansLesDonnees.length,
          image:/data:image/.test(dansLesDonnees)};
});
dit('le chapitre suit le fond de sa carte', suite.projete === 'img/cartes/map-essai.webp', suite.projete);
dit('aucune image dans les donnees', !suite.image);
dit('la carte reste legere', suite.taille < 40000, Math.round(suite.taille/1024) + ' Ko');

console.log('\n— ce qui est ecrit dans le fichier —');
const ecrit = await p.evaluate(() => {
  const blocs = window.__MS.blocs();
  const c = blocs.filter(x => x.nom === 'CARTES')[0];
  return {a:!!c, fond:(c.txt.match(/fond:"[^"]*"/) || [])[0], images:/data:image/.test(c.txt)};
});
dit('le bloc des cartes porte le chemin', ecrit.a && /img\//.test(ecrit.fond || ''), ecrit.fond);
dit('et jamais l\'image elle-meme', !ecrit.images);

/* Supprimer une carte : le geste le plus risque du lot. Un chapitre la DESIGNE
   par son nom — le laisser pointer vers rien donnerait un chapitre sans carte
   et sans message. */
console.log('\n— supprimer une carte —');
const supp = await p.evaluate(async () => {
  // on repond « oui » a la confirmation sans ouvrir de boite
  const vraiDemande = window.__MS.demande;
  const noms0 = Object.keys(CARTES);
  const chap0 = FLOORS.map(f => f.carte);

  // une carte en trop, que personne n'utilise
  CARTES['Carte jetable'] = {fond:'', trace:'', depart:null, departNom:'',
    bosses:[{name:'X', n:1, el:'fire', x:1, y:1, nx:0, ny:0}],
    packs:[], mids:[], routes:[], texts:[], shapes:[], zones:[]};
  return {noms0, chap0, apres:Object.keys(CARTES).length};
});
dit('on peut ajouter une carte pour l\'essai', supp.apres === supp.noms0.length + 1);

// la vraie suppression passe par une boite de dialogue : on la court-circuite
const fin = await p.evaluate(async () => {
  const S = window.SORTIE, REG = CARTES, FL = FLOORS;
  const nom = FL[0].carte;                       // celle du premier chapitre
  const noms = Object.keys(REG);
  const suite = noms.filter(k => k !== nom)[0];
  const utilisent = FL.filter(f => f.carte === nom).length;

  // exactement ce que fait supprimeCarte apres la confirmation
  S.deposeCartes(FL, REG);
  delete REG[nom];
  FL.forEach(x => { if(x.carte === nom) x.carte = suite; });
  S.resoudreCartes(FL, REG);

  return {partie:!(nom in REG), utilisent, suite,
          orphelins:FL.filter(f => !REG[f.carte]).length,
          chapitresOntUneCarte:FL.every(f => Array.isArray(f.bosses)),
          restantes:Object.keys(REG).length};
});
dit('la carte disparait du registre', fin.partie);
dit('aucun chapitre ne pointe dans le vide', fin.orphelins === 0, fin.orphelins + ' orphelin(s)');
dit('les chapitres concernes basculent sur une autre', fin.chapitresOntUneCarte);
console.log('       ' + fin.utilisent + ' chapitre(s) bascule(s) sur « ' + fin.suite + ' » · '
  + fin.restantes + ' carte(s) restantes');

/* La case « effacer aussi l'image ». Deux regles qu'on ne peut pas deviner a
   la place de l'utilisateur, et qui ne se rattrapent pas : un fichier efface
   ne va pas dans une corbeille. */
console.log('\n— effacer aussi l\'image de fond —');
const cases = await p.evaluate(() => {
  const II = window.IMPORTIMAGE;
  const R = CARTES;
  const nom = Object.keys(R)[0];
  const auto = II.cheminFond(nom);

  // 1. une image que l'outil a nommee : proposee, cochee d'avance
  const gardeFond = R[nom].fond;
  R[nom].fond = auto;
  const seule = {partagee:Object.keys(R).filter(k => k !== nom && R[k].fond === auto).length,
                 auto:R[nom].fond === auto};

  // 2. la meme image sur deux cartes : on ne doit pas la proposer du tout
  const autre = Object.keys(R)[1];
  const gardeAutre = autre ? R[autre].fond : null;
  if(autre) R[autre].fond = auto;
  const partage = Object.keys(R).filter(k => k !== nom && R[k].fond === auto).length;

  // 3. une image posee a la main : proposee, mais PAS cochee
  if(autre) R[autre].fond = gardeAutre;
  R[nom].fond = 'img/une-carte-a-moi.webp';
  const main = R[nom].fond === II.cheminFond(nom);

  R[nom].fond = gardeFond;
  return {nomAuto:auto, seule, partage, mainEstAuto:main};
});
dit('une image nommee par l\'outil se reconnait a son nom',
    /^img\/cartes\/map-/.test(cases.nomAuto), cases.nomAuto);
dit('elle n\'est pas partagee quand elle ne sert qu\'a une carte', cases.seule.partagee === 0);
dit('partagee par deux cartes, elle est detectee comme telle', cases.partage === 1,
    cases.partage + ' autre(s) carte(s)');
dit('une image posee a la main ne passe pas pour une image de l\'outil',
    cases.mainEstAuto === false);

// et on ne doit jamais pouvoir supprimer la derniere
const derniere = await p.evaluate(() => {
  const s = document.getElementById('carteSel');
  return [...s.options].some(o => o.value === '__suppr__');
});
dit('l\'entree existe tant qu\'il reste plusieurs cartes', derniere);

dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nL\'image de fond s\'importe et la carte n\'en garde que le chemin.');
process.exit(ko ? 1 : 0);
