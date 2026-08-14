/* ============================================================
   verif-preparation.mjs — la meme regle partout
   ------------------------------------------------------------
   Le bloc de preparation avait sa propre grammaire : deux espaces
   au lieu du « : », aucune rubrique, aucune BOITE. On y ecrivait
   TANKBOX, il ne se passait rien — et le bouton job de la barre y
   laissait son « : » dans le texte. Il fallait donc se souvenir
   dans lequel des deux blocs on etait en train d'ecrire.

   Une seule regle desormais, celle de la strat :

       BOX
       contenu
                    <- la ligne vide referme la boite
       un job ecrit = un badge

   On verifie que la preparation et un bloc de strat rendent le
   MEME balisage a partir du MEME texte, et que les strats deja
   ecrites — une simple suite de lignes — se lisent toujours.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:900, height:900});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.STRATCORE && window.STRATR, {timeout:9000});

/* Le meme texte, ecrit dans une carte et dans une preparation. */
const TXT = 'BUFFBOX\nCOR : Bolter\'s + Tactician\'s\nBRD : Mazurka\n\nTANKBOX\nPLD : Sentinel avant la porte';

const lu = await p.evaluate(txt => {
  const pose = html => { const h = document.createElement('div');
    h.style.cssText = 'position:fixed;left:0;top:0;width:860px;z-index:9999';
    h.innerHTML = html; document.body.appendChild(h); return h; };
  const lire = h => ({
    boites: [...h.querySelectorAll('.grp')].map(g => g.className.replace(/\s+/g,' ').trim()),
    lignes: [...h.querySelectorAll('.line')].map(d =>
      [...d.querySelectorAll('.role')].map(e => e.textContent.trim()).join('+')
      + ' | ' + d.querySelector('.txt').textContent.trim()),
    cadres: [...h.querySelectorAll('.grp')].map(g => getComputedStyle(g).borderTopWidth)
  });
  const groups = STRATCORE.textToBloc(txt).groups;

  const hc = pose(STRATR.cardHtml({kind:'pack', klabel:'FARM', name:'Essai', tag:'',
                                   noHeadImg:true, groups}, {n:1}, FLOORS[0], {}));
  const carte = lire(hc); hc.remove();

  const hp = pose(STRATR.buffsHtml('Buffs de depart', groups));
  const prep = lire(hp);
  prep.titre = (hp.querySelector('.bhead')||{}).textContent;
  hp.remove();

  // une preparation d'avant les rubriques : une simple suite de lignes
  const vieux = [{r:['COR'], t:"Bolter's + Tactician's"}, {r:['BRD'], t:'Mazurka'}];
  const hv = pose(STRATR.buffsHtml('Buffs de depart', vieux));
  const ancien = lire(hv); hv.remove();

  return {carte, prep, ancien,
          // aller-retour : ce qu'on ecrit, ce qui s'enregistre, ce qu'on relit
          texte: STRATCORE.blocToText({groups}),
          texteVieux: STRATCORE.blocToText({groups: SORTIE.groupesBuffs(vieux)}),
          ecritVieux: STRATCORE.buffsConst('BUFFS', {'Jeu': vieux}),
          ecritNeuf: STRATCORE.buffsConst('BUFFS', {'Jeu': groups})};
}, TXT);

console.log('\n— le meme texte donne le meme rendu des deux cotes —');
dit('les memes rubriques', JSON.stringify(lu.prep.boites) === JSON.stringify(lu.carte.boites),
    'carte ' + JSON.stringify(lu.carte.boites) + '\n       prep  ' + JSON.stringify(lu.prep.boites));
dit('les memes lignes, avec les memes badges',
    JSON.stringify(lu.prep.lignes) === JSON.stringify(lu.carte.lignes),
    'carte ' + JSON.stringify(lu.carte.lignes) + '\n       prep  ' + JSON.stringify(lu.prep.lignes));

console.log('\n— la BOITE fait une boite dans la preparation aussi —');
dit('deux boites, une par mot-cle', lu.prep.boites.filter(c => /boite/.test(c)).length === 2,
    JSON.stringify(lu.prep.boites));
dit('la premiere est teintee buff', /\bbuff\b/.test(lu.prep.boites[0] || ''), lu.prep.boites[0]);
dit('la seconde est teintee tank', /\btank\b/.test(lu.prep.boites[1] || ''), lu.prep.boites[1]);
dit('chacune a vraiment un cadre', lu.prep.cadres.every(c => parseFloat(c) > 0),
    JSON.stringify(lu.prep.cadres));
dit('la ligne vide les a bien separees — pas d\'emboitement',
    !lu.prep.boites.some(c => /aimbrique/.test(c)), JSON.stringify(lu.prep.boites));
dit('le nom de la preparation reste en tete', /Buffs de depart/.test(lu.prep.titre || ''),
    String(lu.prep.titre));

console.log('\n— les badges y suivent la meme regle —');
dit('COR, BRD et PLD ont chacun le leur',
    lu.prep.lignes.join(' ').includes('COR |') && lu.prep.lignes.join(' ').includes('BRD |')
    && lu.prep.lignes.join(' ').includes('PLD |'), JSON.stringify(lu.prep.lignes));
dit('et le « : » n\'est pas reste dans le texte',
    !lu.prep.lignes.some(l => /\|\s*:/.test(l)), JSON.stringify(lu.prep.lignes));

console.log('\n— une strat deja ecrite se lit toujours —');
dit('ses lignes s\'affichent', lu.ancien.lignes.length === 2, JSON.stringify(lu.ancien.lignes));
dit('avec leurs badges', lu.ancien.lignes[0].startsWith('COR |'), JSON.stringify(lu.ancien.lignes));
dit('elle ne gagne aucun cadre au passage',
    !lu.ancien.boites.some(c => /boite/.test(c)), JSON.stringify(lu.ancien.boites));
dit('et son texte ne s\'ouvre pas sur une ligne vide',
    !/^\n/.test(lu.texteVieux), JSON.stringify(lu.texteVieux));

console.log('\n— ce qui s\'enregistre dans data.js —');
dit('une preparation s\'ecrit en rubriques', /lines:\[/.test(lu.ecritNeuf),
    lu.ecritNeuf.split('\n').slice(0, 4).join(' ⏎ '));
dit('la BOITE y laisse sa marque', /boite:1/.test(lu.ecritNeuf),
    lu.ecritNeuf.split('\n').slice(0, 3).join(' ⏎ '));
dit('une ancienne se range dans une rubrique sans titre',
    /label:""/.test(lu.ecritVieux) && !/boite:1/.test(lu.ecritVieux),
    lu.ecritVieux.split('\n').slice(0, 3).join(' ⏎ '));

/* ---------------- une panne reste chez elle ----------------
   La preparation et la strat se dessinaient a la suite : la premiere ratait,
   la seconde n'etait jamais atteinte, et l'etape entiere s'affichait vide —
   sans rien pour dire lequel des deux avait lache. */
console.log('\n— si la preparation tombe, la strat reste —');
await p.evaluate(() => {
  const t = [...document.querySelectorAll('button')].find(e => /^strat/i.test(e.textContent.trim()));
  if (t) t.click();
});
await p.waitForSelector('#ssTree .ss-step', {timeout:5000});
await p.evaluate(() => document.querySelector('#ssTree .ss-step').click());
await p.waitForSelector('#ssBlocs .ss-bloc', {timeout:5000});

const panne = await p.evaluate(() => {
  const avant = document.querySelectorAll('#ssBlocs .ss-bloc').length;
  const vrai = SORTIE.groupesBuffs;
  SORTIE.groupesBuffs = function(){ throw new Error('essai de panne'); };
  document.querySelector('#ssTree .ss-step').click();     // redessine l'etape
  const out = {
    avant: avant,
    blocs: document.querySelectorAll('#ssBlocs .ss-bloc').length,
    dit: (document.querySelector('#ssBuffs .ss-panne') || {}).textContent || '',
    texte: (document.querySelector('#ssBlocs .ss-btxt') || {}).value || ''
  };
  SORTIE.groupesBuffs = vrai;
  document.querySelector('#ssTree .ss-step').click();      // on remet d'aplomb
  out.remis = document.querySelectorAll('#ssBuffs .ss-btxt').length;
  return out;
});
dit('les blocs de strat sont toujours la', panne.blocs === panne.avant && panne.blocs > 0,
    panne.avant + ' avant → ' + panne.blocs + ' pendant la panne');
dit('avec leur contenu', panne.texte.length > 20, panne.texte.slice(0, 60));
dit('et la preparation dit qu\'elle n\'a pas pu s\'afficher',
    /ne s.affiche pas/.test(panne.dit), JSON.stringify(panne.dit.slice(0, 80)));
dit('une fois la panne partie, elle revient', panne.remis === 1, String(panne.remis));

// la panne provoquee ci-dessus journalise dans la console : c'est voulu
dit('rien ne casse', bruit.filter(x => !/essai de panne/.test(x)).length === 0,
    bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nUne seule grammaire : la preparation s\'ecrit comme le reste.');
process.exit(ko ? 1 : 0);
