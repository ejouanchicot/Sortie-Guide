/* ============================================================
   verif-telephone.mjs — le guide sur le téléphone d'un lead
   ------------------------------------------------------------
   C'est le seul écran qui compte pendant un run : le téléphone
   posé à côté du clavier, ou tenu d'une main entre deux packs.
   Deux choses s'y payent cash, et les deux ont été mesurées :

   · la barre du haut mangeait 454 px sur les 568 d'un petit
     téléphone — 80 % de l'écran pour cinq rangées de boutons et
     un en-tête qui ne se lit qu'une fois. Il restait 114 px de
     strat ;
   · les animations tournaient même quand le système demandait de
     les couper : « * » ne désigne pas les pseudo-éléments, et le
     rail de la timeline y défile une fois par seconde.

   On regarde donc la PLACE que prend la barre, qu'elle suive bien
   quand on descend, que rien ne déborde sur le côté, et qu'un lead
   qui coupe les animations les coupe vraiment.
   ============================================================ */
import {puppeteer, GUIDE, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});

/* Le plus petit téléphone encore en service, et un courant. Au-dessus,
   l'en-tête a la place de rester : on vérifie que la règle ne déborde pas
   sur l'écran où elle n'a pas lieu d'être. */
const ECRANS = [
  ['un petit téléphone',  320, 568, 0.40],
  ['un téléphone courant',390, 844, 0.30],
  ['un grand téléphone',  430, 932, 0.30],
  ['une tablette',        900, 900, 0.30]
];

for(const [quoi, w, h, part] of ECRANS){
  const p = await b.newPage();
  const bruit = [];
  p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
  await p.setViewport({width:w, height:h, isMobile:w < 600, hasTouch:w < 600});
  await p.goto(GUIDE, {waitUntil:'networkidle0'});
  await p.waitForSelector('.card', {timeout:15000});
  await p.waitForFunction(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--stickh').trim() !== '',
    {timeout:8000}).catch(() => {});

  const vu = await p.evaluate(() => {
    const st = document.querySelector('.topstick'), ba = document.querySelector('.bars');
    // ce qui reste collé n'est pas le même bloc partout : display:contents
    // laisse « position:sticky » dans le style calculé mais supprime la boîte
    const cs = getComputedStyle(st);
    const colle = (cs.position === 'sticky' && cs.display !== 'contents') ? st : ba;
    return {haut: colle.getBoundingClientRect().height, ecran: innerHeight,
            quoi: colle.className,
            stickh: parseFloat(getComputedStyle(document.documentElement)
                    .getPropertyValue('--stickh')) || 0,
            large: document.documentElement.scrollWidth, ecranL: innerWidth};
  });
  console.log('\n— ' + quoi + ' · ' + w + '×' + h + ' —');
  dit('la barre laisse la place à la strat',
      vu.haut / vu.ecran <= part,
      Math.round(vu.haut) + ' px sur ' + vu.ecran + ' — '
      + Math.round(vu.haut / vu.ecran * 100) + ' %, on en accepte '
      + Math.round(part * 100) + ' %');
  /* La hauteur mémorisée sert à ne pas glisser une étape SOUS la barre quand
     on la rejoint par un bouton. Elle doit désigner ce qui colle vraiment. */
  dit('  et la hauteur retenue est la sienne', Math.abs(vu.stickh - vu.haut) < 2,
      vu.stickh + ' px retenus pour ' + Math.round(vu.haut) + ' px de « ' + vu.quoi + ' »');
  dit('  rien ne déborde sur le côté', vu.large <= vu.ecranL + 1,
      vu.large + ' px de contenu pour ' + vu.ecranL + ' px d\'écran');

  // on descend pour de vrai : une barre qui décolle ne sert plus à rien
  const suit = await p.evaluate(async () => {
    const st = document.querySelector('.topstick'), ba = document.querySelector('.bars');
    const cs = getComputedStyle(st);
    const colle = (cs.position === 'sticky' && cs.display !== 'contents') ? st : ba;
    window.scrollTo({top: 1200, behavior: 'instant'});
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {top: colle.getBoundingClientRect().top, y: window.scrollY};
  });
  dit('  elle reste en haut quand on descend', suit.y > 200 && suit.top <= 1,
      'à ' + Math.round(suit.y) + ' px de défilement, elle est à '
      + Math.round(suit.top) + ' px du haut');
  dit('  rien ne casse', bruit.length === 0, bruit.slice(0, 2).join('\n       '));
  await p.close();
}

/* ---------- l'atelier en fenêtre réduite ----------
   Le lead travaille souvent l'atelier dans une fenêtre posée à côté du jeu.
   Sa barre était en une seule ligne, et body en overflow:hidden : ce qui
   sortait de l'écran était PERDU, pas décalé. Mesuré à 768 px : « Partager »,
   « Recharger » et « Enregistrer » entièrement hors champ, 210 px à droite,
   et window.scrollX bloqué à 0. On ne pouvait plus enregistrer son travail.
   On regarde donc chaque commande, pas la largeur du contenu : une barre qui
   ne déborde pas peut très bien avoir escamoté un bouton. */
console.log('\n— l\'atelier dans une fenêtre réduite —');
for(const w of [1400, 1100, 900, 768, 600]){
  const a = await b.newPage();
  const err = [];
  a.on('pageerror', e => err.push(String(e).slice(0, 110)));
  await a.setViewport({width:w, height:800});
  await a.goto(STUDIO, {waitUntil:'networkidle0'});
  await a.waitForFunction(() => window.__MS && window.__MS.pret, {timeout:12000});
  await a.evaluate(() => window.__MS.pret());
  const vu = await a.evaluate(() => {
    const cible = {'Enregistrer':'stSave', 'Partager':'stExport', 'Recharger':'stReload',
                   'le choix de la strat':'stStratSel', 'l\'onglet Carte':'stTabMap',
                   'l\'onglet Stratégie':'stTabStrat'};
    const perdus = [];
    for(const [nom, id] of Object.entries(cible)){
      const e = document.getElementById(id);
      if(!e){ perdus.push(nom + ' (absent)'); continue; }
      const r = e.getBoundingClientRect();
      if(r.width < 2 || r.height < 2) continue;             // caché volontairement
      if(r.right > innerWidth + 1 || r.left < -1 ||
         r.bottom > innerHeight + 1 || r.top < -1) perdus.push(nom);
    }
    return {perdus, deborde: document.documentElement.scrollWidth > innerWidth + 1,
            carte: Math.round(document.querySelector('.st-panes')?.getBoundingClientRect().height || 0)};
  });
  dit(w + ' px : toutes les commandes restent atteignables', vu.perdus.length === 0,
      'hors de portée : ' + vu.perdus.join(', '));
  dit('  et rien ne déborde', !vu.deborde);
  // une barre qui prendrait tout l'écran serait une autre façon de perdre l'outil
  dit('  il reste de quoi travailler', vu.carte > 400, vu.carte + ' px de plan de travail');
  dit('  rien ne casse', err.length === 0, err.slice(0, 2).join('\n       '));
  await a.close();
}

/* ---------- ce qui n'est pas regardé ne tourne pas ----------
   Les pulsations des marqueurs et des pastilles animent une OMBRE PORTÉE : le
   navigateur repeint à chaque image, sur le fil principal. Mesuré page
   immobile, CPU bridé ×4 : 63 % d'un cœur pendant qu'on LIT la strat, avec 29
   animations en marche — un téléphone posé à côté du clavier chauffe pendant
   tout le run, pour des lueurs situées hors de l'écran.
   On ne touche pas à leur allure : elles se mettent en pause quand ce qu'elles
   animent sort du champ, et reprennent où elles en étaient. Après : 38 % et 7
   animations.
   On compte les animations plutôt que le CPU — le compte est le fait, le CPU
   dépend de la machine et rougirait au hasard sur un test parallèle. */
console.log('\n— ce qui sort de l\'écran cesse de tourner —');
const veille = await b.newPage();
await veille.setViewport({width:390, height:844, isMobile:true, hasTouch:true});
await veille.goto(GUIDE, {waitUntil:'networkidle0'});
await veille.waitForSelector('.card', {timeout:15000});
const compte = () => veille.evaluate(() =>
  document.documentElement.getAnimations({subtree:true})
    .filter(a => a.playState === 'running').length);
await new Promise(r => setTimeout(r, 900));
const enHaut = await compte();
await veille.evaluate(() => window.scrollTo({top:2500, behavior:'instant'}));
await new Promise(r => setTimeout(r, 900));
const enLisant = await compte();
// et en revenant : la pause ne doit pas être définitive
await veille.evaluate(() => window.scrollTo({top:0, behavior:'instant'}));
await new Promise(r => setTimeout(r, 900));
const revenu = await compte();
await veille.close();
dit('en haut, les repères de la carte pulsent', enHaut > 5, enHaut + ' animation(s)');
dit('  et beaucoup se taisent quand on lit plus bas', enLisant < enHaut / 2,
    enLisant + ' contre ' + enHaut + ' en haut');
/* Le témoin : une pause définitive ferait passer la ligne du dessus tout en
   cassant l'écran d'accueil. */
dit('  elles repartent quand on remonte', revenu >= enHaut - 2,
    revenu + ' au retour, ' + enHaut + ' au départ);'.replace(');', ''));

/* ---------- couper les animations les coupe vraiment ---------- */
console.log('\n— quand le système demande de couper les animations —');
const p = await b.newPage();
await p.setViewport({width:390, height:844, isMobile:true, hasTouch:true});
await p.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}]);
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await p.waitForSelector('.card', {timeout:15000});
await new Promise(r => setTimeout(r, 800));

/* getAnimations({subtree:true}) rend AUSSI celles des pseudo-éléments — c'est
   tout l'objet : elles échappaient à la règle, et elles seules. */
const tourne = await p.evaluate(() =>
  document.documentElement.getAnimations({subtree:true})
    .filter(a => a.playState === 'running')
    .map(a => (a.animationName || a.transitionProperty || '?')
              + ' sur ' + (a.effect?.target?.tagName || '?')
              + '.' + ((a.effect?.target?.className || '') + '').trim().split(/\s+/)[0]
              + (a.effect?.pseudoElement || '')));
dit('plus une seule animation ne tourne', tourne.length === 0,
    tourne.length + ' encore en marche :\n       ' + [...new Set(tourne)].slice(0, 6).join('\n       '));

// et la page est toujours là : couper le mouvement ne doit rien effacer
const reste = await p.evaluate(() => ({
  cartes: document.querySelectorAll('.card').length,
  lignes: document.querySelectorAll('.line').length
}));
dit('  et la strat s\'affiche entière', reste.cartes > 0 && reste.lignes > 0,
    reste.cartes + ' cartes · ' + reste.lignes + ' lignes');
await p.close();

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s) : le guide tient mal sur un telephone.`
               : '\nLe guide laisse la place a la strat, et se tait quand on lui demande.');
process.exit(ko ? 1 : 0);
