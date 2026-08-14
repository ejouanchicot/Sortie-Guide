/* ============================================================
   verif-boites.mjs — colorer un bloc sans repeter le badge
   ------------------------------------------------------------
   Une rubrique tire sa couleur de son titre. Ecrire « PLD » en
   tete colorait donc le bloc en bleu tank — mais le titre
   s'affichait AUSSI, juste au-dessus d'une ligne qui porte deja
   son badge PLD. On lisait « PLD » deux fois :

       PLD                        TANKBOX
       PLD : tank sur place       PLD : tank sur place

   Un mot en BOITE ne fait que la couleur, et ne s'ecrit nulle
   part a l'ecran. Ce qu'on verifie ici : qu'il colore, qu'il se
   taise, qu'il ne mange pas les vrais titres, et qu'il se
   reecrive tel quel — sinon il repartirait en « [tank] », qui se
   relit bien mais ne se retape pas de memoire.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:900, height:800});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.STRATCORE && window.STRATR, {timeout:9000});

/* ---------------- ce qu'on lit ---------------- */
console.log('\n— chaque mot pose sa couleur, et se tait —');
const MOTS = [['TANKBOX','tank'], ['HEALERBOX','heal'], ['BUFFBOX','buff'],
              ['DDBOX','dd'], ['MBBOX','mb'], ['REGLEBOX','rules'], ['PROCBOX','rules proc']];
const lu = await p.evaluate(mots => mots.map(([mot, cls]) => {
  const g = STRATCORE.textToBloc(mot + '\nPLD : une action').groups[0];
  return {mot, cls, obtenu: g.cls, titre: g.label, lignes: (g.lines||[]).length};
}), MOTS);
lu.forEach(x => dit(`${x.mot.padEnd(10)} colore en « ${x.cls} » sans rien ecrire`,
  x.obtenu === x.cls && x.titre === '' && x.lignes === 1, JSON.stringify(x)));

console.log('\n— et ne mange pas ce qui lui ressemble —');
const bords = await p.evaluate(() => {
  const un = t => { const g = STRATCORE.textToBloc(t + '\nPLD : x').groups[0];
                    return {label:g.label, cls:g.cls}; };
  return {casse: un('tankbox'), colle: un('TANKBOX du camp'),
          dansUnTitre: un('Setup TANKBOX'), vrai: un('Buff · farm')};
});
dit('la casse ne compte pas', bords.casse.label === '' && bords.casse.cls === 'tank',
    JSON.stringify(bords.casse));
dit('« TANKBOX du camp » reste un titre', bords.colle.label === 'TANKBOX du camp',
    JSON.stringify(bords.colle));
dit('le mot au milieu d\'un titre ne compte pas', bords.dansUnTitre.label === 'Setup TANKBOX',
    JSON.stringify(bords.dansUnTitre));
dit('un titre ordinaire garde son titre', bords.vrai.label === 'Buff · farm',
    JSON.stringify(bords.vrai));

/* ---------------- ce qu'on reecrit ---------------- */
console.log('\n— et se retrouve tel quel dans le fichier —');
const tour = await p.evaluate(() => {
  const source = 'TANKBOX\nPLD : tank sur place\n\nHEALERBOX\nWHM : Cure IV\n\n'
               + 'Buff · farm\nCOR : Chaos Roll';
  const bloc = STRATCORE.textToBloc(source);
  const reecrit = STRATCORE.blocToText(bloc);
  const relu = STRATCORE.textToBloc(reecrit);
  const forme = b => (b.groups||[]).map(g => g.label + '|' + g.cls + '|' + (g.lines||[]).length);
  return {reecrit, identique: reecrit === source,
          stable: JSON.stringify(forme(bloc)) === JSON.stringify(forme(relu))};
});
dit('il se reecrit avec le mot, pas en crochets', !/\[tank\]|\[soin\]/.test(tour.reecrit),
    JSON.stringify(tour.reecrit));
dit('le texte revient identique a la virgule pres', tour.identique,
    JSON.stringify(tour.reecrit));
dit('et se relit pareil', tour.stable);

/* ---------------- ce que ca donne a l'ecran ---------------- */
console.log('\n— a l\'ecran —');
const vu = await p.evaluate(() => {
  const bloc = STRATCORE.textToBloc(
    'PLD\nPLD : tank sur place\n\nTANKBOX\nPLD : tank sur place');
  const hote = document.createElement('div');
  hote.style.cssText = 'position:fixed;left:0;top:0;width:820px;z-index:9999';
  hote.innerHTML = STRATR.cardHtml({kind:'boss', name:'Essai', tag:'', groups:bloc.groups},
                                   {n:1}, FLOORS[0], {});
  document.body.appendChild(hote);
  const g = [...hote.querySelectorAll('.grp')].map(x => {
    const lab = x.querySelector('.glabel');
    return {titre: lab ? lab.textContent.trim() : null,
            fond: getComputedStyle(x).backgroundColor,
            hauteur: Math.round(x.getBoundingClientRect().height),
            badges: [...x.querySelectorAll('.role')].map(e => e.textContent.trim())};
  });
  hote.remove();
  return {ancienne: g[0], boite: g[1]};
});
dit('la boite n\'ecrit aucun titre', vu.boite.titre === null, String(vu.boite.titre));
dit('l\'ancienne facon en ecrivait un', vu.ancienne.titre === 'PLD', String(vu.ancienne.titre));
dit('mais les deux ont EXACTEMENT le meme fond', vu.boite.fond === vu.ancienne.fond,
    vu.ancienne.fond + ' / ' + vu.boite.fond);
dit('le badge du job, lui, reste', vu.boite.badges.indexOf('PLD') >= 0,
    JSON.stringify(vu.boite.badges));
dit('et le bloc y gagne en hauteur', vu.boite.hauteur < vu.ancienne.hauteur,
    vu.ancienne.hauteur + 'px → ' + vu.boite.hauteur + 'px');

// Le cadre teinte n'existait que sur les cartes boss. Dans un farm, ecrire
// TANKBOX ne donnait donc RIEN : on venait de retirer le titre, seul endroit
// ou la couleur vivait. Un mot nomme BOX doit faire une boite partout.
console.log('\n— sur un farm comme sur un boss —');
const partout = await p.evaluate(() => ['pack', 'boss'].map(kind => {
  const bloc = STRATCORE.textToBloc('TANKBOX\nPLD : tank sur place');
  const h = document.createElement('div');
  h.style.cssText = 'position:fixed;left:0;top:0;width:820px;z-index:9999';
  h.innerHTML = STRATR.cardHtml({kind, klabel:'FARM', name:'Essai', tag:'',
                                 noHeadImg:true, groups:bloc.groups}, {n:1}, FLOORS[0], {});
  document.body.appendChild(h);
  const s = getComputedStyle(h.querySelector('.grp'));
  const out = {kind, fond:s.backgroundColor, rayon:s.borderRadius,
               bordure:s.borderTopWidth + ' ' + s.borderTopColor};
  h.remove(); return out;
}));
partout.forEach(x => dit(`la boite se voit sur une carte « ${x.kind} »`,
  x.fond !== 'rgba(0, 0, 0, 0)' && parseFloat(x.rayon) > 0, JSON.stringify(x)));
dit('et c\'est exactement le meme cadre des deux cotes',
    partout[0].fond === partout[1].fond && partout[0].rayon === partout[1].rayon
      && partout[0].bordure === partout[1].bordure,
    JSON.stringify(partout));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLa couleur sans le doublon : le badge suffit.');
process.exit(ko ? 1 : 0);
