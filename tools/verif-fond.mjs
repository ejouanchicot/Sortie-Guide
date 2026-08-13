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
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');

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
dit('le menu porte aussi nouvelle carte et renommer',
    b0.entrees.join(',') === '__neuve__,__fond__,__renom__', JSON.stringify(b0.entrees));
// L'en-tete doit tenir sur UNE ligne aux largeurs d'ecran courantes. Sur deux,
// il mange la hauteur de la carte — et c'est ce qui arrivait des 1700 px.
console.log('\n— la place dans l\'en-tete —');
for(const W of [1920, 1600, 1440, 1366]){
  await p.setViewport({width:W, height:950});
  // Deux images, pas un delai : un delai fixe mesurait parfois la mise en page
  // d'AVANT le redimensionnement, et le test accusait le produit a tort.
  const h = await p.evaluate(() => new Promise(res =>
    requestAnimationFrame(() => requestAnimationFrame(() =>
      res(Math.round(document.querySelector('.st-top').getBoundingClientRect().height))))));
  dit(`une seule ligne a ${W} px`, h <= 100, h + ' px');
}
await p.setViewport({width:1600, height:950});

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
  CARTES[nom].fond = 'img/map-essai.webp';
  window.SORTIE.resoudreCartes(FLOORS, CARTES);
  const projete = f.map;                       // le chapitre suit-il ?
  const dansLesDonnees = JSON.stringify(CARTES[nom]);
  CARTES[nom].fond = avant;                    // on remet en etat
  window.SORTIE.resoudreCartes(FLOORS, CARTES);
  return {projete, taille:dansLesDonnees.length,
          image:/data:image/.test(dansLesDonnees)};
});
dit('le chapitre suit le fond de sa carte', suite.projete === 'img/map-essai.webp', suite.projete);
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

dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nL\'image de fond s\'importe et la carte n\'en garde que le chemin.');
process.exit(ko ? 1 : 0);
