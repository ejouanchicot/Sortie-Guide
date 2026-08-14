/* ============================================================
   verif-rangement.mjs — une strat d'avant le rangement s'ouvre encore
   ------------------------------------------------------------
   `img/` etait un dossier a plat : 24 vignettes de mobs, 6 fonds de
   carte et les icones de l'application, tout ensemble. Les vignettes
   vivent maintenant dans `img/mobs/`, les fonds dans `img/cartes/`.

   Le danger n'est pas le deplacement : c'est ce qui retient les
   ANCIENS chemins. Une strat gardee en bibliotheque, ou un fichier
   recu ecrit avant le rangement, dit encore « img/map.webp ». Et le
   chargeur d'image avale l'erreur : la carte s'ouvrirait sans son
   fond, les creatures sans vignette, sans un mot.

   Trois choses a tenir :
   · a l'entree, les anciens chemins sont repris — et les nouveaux
     passent intacts ;
   · l'export retrouve les images malgre le sous-dossier (son motif
     ne l'acceptait pas : il ne trouvait plus RIEN) ;
   · un fond depose va dans img/cartes/, et son effacement vise le
     bon fichier (removeEntry refuse un separateur).
   ============================================================ */
import {puppeteer, STUDIO, RACINE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1500, height:950});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.SORTIE && window.BIBLIO && window.__MS, {timeout:9000});

/* ---------------- la reprise des anciens chemins ---------------- */
console.log('\n— une strat écrite avant le rangement —');
const repris = await p.evaluate(() => {
  const B = window.BIBLIO;
  return {
    vignette: B.repriseChemin('img/mob-degei.webp'),
    fond:     B.repriseChemin('img/map.webp'),
    zone:     B.repriseChemin('img/map-e.webp'),
    // ce qui est deja range ne doit pas bouger
    dejaRange: B.repriseChemin('img/mobs/mob-degei.webp'),
    dejaFond:  B.repriseChemin('img/cartes/map.webp'),
    // une icone d'application reste a plat : on ne l'a pas rangee
    appli:    B.repriseChemin('img/logo.webp'),
    // et ce qui n'est pas un chemin passe sans dommage
    vide:     B.repriseChemin(null),
    dataUri:  B.repriseChemin('data:image/webp;base64,AAAA')
  };
});
dit('une vignette retrouve son dossier', repris.vignette === 'img/mobs/mob-degei.webp', repris.vignette);
dit('un fond de carte aussi', repris.fond === 'img/cartes/map.webp', repris.fond);
dit('un fond de zone aussi', repris.zone === 'img/cartes/map-e.webp', repris.zone);
dit('un chemin déjà rangé ne bouge pas',
    repris.dejaRange === 'img/mobs/mob-degei.webp' && repris.dejaFond === 'img/cartes/map.webp',
    repris.dejaRange + ' · ' + repris.dejaFond);
dit('une icône d\'application reste où elle est', repris.appli === 'img/logo.webp', repris.appli);
dit('et rien d\'autre n\'est touché',
    repris.vide === null && repris.dataUri === 'data:image/webp;base64,AAAA', String(repris.dataUri).slice(0,20));

/* ---------------- le vrai chemin : par la bibliotheque ---------------- */
console.log('\n— la même strat, rouverte par la bibliothèque —');
const ouvert = await p.evaluate(async () => {
  // une strat telle qu'elle dormait en bibliotheque AVANT le rangement
  const vieille = {
    id:'st-essai-vieux', nom:'strat d\'avant', maj:Date.now(),
    compo:{taille:6,creneaux:[['PLD']]}, role:{PLD:'tank'}, buffs:{}, tr:{},
    mob:{'Degei':'img/mob-degei.webp','Skomora':'img/mob-skomora.webp'},
    cartes:{'Essai':{fond:'img/map.webp', bosses:[], packs:[], mids:[], icones:[],
                     routes:[], texts:[], shapes:[],
                     zones:[{sector:'E', map:'img/map-e.webp', n:1}]}},
    chapitres:[{id:'top', fr:'Essai', en:'Test', carte:'Essai', phases:[]}]
  };
  await window.BIBLIO.ecris(vieille);
  const relue = await window.BIBLIO.lis('st-essai-vieux');
  const g = {COMPO:{}, ROLE:{}, BUFFS:{}, CARTES:{}, MOB:{}, TR:{}, FLOORS:[]};
  window.BIBLIO.versGlobaux(relue, g);
  await window.BIBLIO.supprime('st-essai-vieux');
  return {mob: g.MOB['Degei'], fond: g.CARTES['Essai'].fond,
          zone: g.CARTES['Essai'].zones[0].map};
});
dit('sa vignette pointe le bon fichier', ouvert.mob === 'img/mobs/mob-degei.webp', ouvert.mob);
dit('son fond de carte aussi', ouvert.fond === 'img/cartes/map.webp', ouvert.fond);
dit('et le fond de sa zone', ouvert.zone === 'img/cartes/map-e.webp', ouvert.zone);

/* ---------------- les fichiers repondent vraiment ---------------- */
console.log('\n— les fichiers sont bien là où on les annonce —');
const fichiers = await p.evaluate(async () => {
  const a = [];
  for(const c of Object.values(CARTES)){
    if(c.fond) a.push(c.fond);
    (c.zones || []).forEach(z => { if(z.map) a.push(z.map); });
  }
  Object.values(MOB).forEach(v => a.push(v));
  const uniques = [...new Set(a)];
  const morts = [];
  for(const u of uniques){
    const r = await fetch('../' + u);
    if(!r.ok) morts.push(u + ' ' + r.status);
  }
  return {n: uniques.length, morts,
          aPlat: uniques.filter(u => /^img\/(?!mobs\/|cartes\/)/.test(u))};
});
dit('toutes les images du contenu répondent', fichiers.morts.length === 0,
    fichiers.n + ' images · ' + JSON.stringify(fichiers.morts.slice(0,3)));
dit('et aucune ne traîne plus à plat', fichiers.aPlat.length === 0,
    JSON.stringify(fichiers.aPlat.slice(0,3)));

/* ---------------- le fond depose ---------------- */
console.log('\n— où va un fond qu\'on dépose —');
const depot = await p.evaluate(() => {
  const II = window.IMPORTIMAGE;
  return {dossier: II.DOSSIER, chemin: II.cheminFond('Sortie · sous-sol'),
          nom: II.nomDeFichier('Sortie · sous-sol')};
});
dit('il va dans le dossier des cartes', depot.dossier === 'img/cartes', depot.dossier);
dit('et son chemin le dit', depot.chemin === 'img/cartes/' + depot.nom, depot.chemin);

/* ---------------- l'export retrouve tout ---------------- */
console.log('\n— et l\'export embarque tout, sous-dossier compris —');
const expo = await p.evaluate(async () => {
  const s = window.BIBLIO.depuisGlobaux(
    {COMPO, ROLE, BUFFS, CARTES, MOB, TR, FLOORS}, 'essai rangement',
    window.__MS.reglages());
  const doc = await window.EXPORTHTML.fabrique(s, {base:'../'});
  /* Le bloc de sauvegarde garde ses CHEMINS, et c'est voulu : le Studio qui le
     relit a les vraies images, et une strat reimportee n'a rien a faire de
     1,3 Mo de copies. On regarde donc ce que la page AFFICHE. */
  const affiche = doc.replace(/<script type="application\/json"[\s\S]*?<\/script>/g, '');
  return {
    images: (doc.match(/data:image\//g) || []).length,
    resteUnChemin: /["'(]img\/[A-Za-z0-9._\/-]+\.(?:webp|png|jpe?g)/.test(affiche),
    exemple: (affiche.match(/["'(]img\/[A-Za-z0-9._\/-]+\.(?:webp|png|jpe?g)/) || [''])[0],
    poids: Math.round(doc.length / 1024)
  };
});
dit('les images sont dedans', expo.images > 20, expo.images + ' images · ' + expo.poids + ' Ko');
dit('et plus aucune ne va chercher le site', !expo.resteUnChemin, expo.exemple || 'aucun');

/* ---------------- le guide, a l'ecran ---------------- */
console.log('\n— le guide affiche ses images —');
const g = await b.newPage();
const bruitG = [];
g.on('pageerror', e => bruitG.push(String(e)));
const manquantes = [];
g.on('requestfailed', r => { if(/\/img\//.test(r.url())) manquantes.push(r.url().split('/').slice(-2).join('/')); });
await g.setViewport({width:1400, height:1000});
await g.goto(RACINE + '/index.html', {waitUntil:'networkidle0'});
await new Promise(r => setTimeout(r, 1500));
const vu = await g.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => /\/img\//.test(i.src));
  return {total: imgs.length, cassees: imgs.filter(i => i.complete && i.naturalWidth === 0).length};
});
await g.close();
dit('aucune image du guide ne casse', vu.cassees === 0 && manquantes.length === 0,
    vu.total + ' images · ' + JSON.stringify(manquantes.slice(0,3)));

dit('rien ne casse', bruit.length === 0 && bruitG.length === 0,
    bruit.concat(bruitG).slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nRange, et rien n\'a perdu son image.');
process.exit(ko ? 1 : 0);
