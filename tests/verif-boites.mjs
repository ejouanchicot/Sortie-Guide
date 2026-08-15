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

   Depuis, ecrire « PLD » tout seul ne titre plus rien : c'est une
   ligne d'action dont le texte reste a venir (voir verif-job-seul).
   Pour colorer une rubrique, il n'y a donc plus que la BOITE.
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

/* ---------------- chaque cadre se nomme ----------------
   Un cadre n'etait distingue QUE par sa couleur. Pour un oeil deuteranope,
   celui du tank et celui des degats donnaient le meme rectangle. Trois lettres
   dans le coin se lisent sans la couleur — et elles doivent y etre sur TOUS les
   cadres, y compris ceux qui portent deja un titre. */
console.log('\n— chaque cadre dit son nom dans le coin —');
const ETIQUETTES = {tank:'TANK', heal:'SOIN', buff:'BUFF', debuff:'DEBUFF', dd:'DPS',
                    mb:'MB', tp:'TP MOVES', rules:'RÈGLES', 'rules proc':'PROCS'};
const coins = await p.evaluate(mots => {
  const h = document.createElement('div');
  h.style.cssText = 'position:fixed;left:0;top:0;width:900px;z-index:9999';
  document.body.appendChild(h);
  const out = mots.map(mot => {
    // avec un titre : c'est le cas qui n'avait pas d'etiquette
    const bloc = STRATCORE.textToBloc(mot + '\nUn titre\nPLD : une action');
    h.innerHTML = STRATR.groupsHtml(bloc.groups, []);
    const g = h.querySelector('.grp.boite');
    return {mot, cls: g ? g.className : null,
            tag: g ? getComputedStyle(g, '::before').content.replace(/^"|"$/g, '') : null};
  });
  h.remove();
  return out;
}, Object.keys(ETIQUETTES).map(c => ({tank:'TANKBOX', heal:'HEALERBOX', buff:'BUFFBOX',
  debuff:'DEBUFFBOX', dd:'DDBOX', mb:'MBBOX', tp:'TPBOX', rules:'REGLEBOX',
  'rules proc':'PROCBOX'})[c]));
Object.keys(ETIQUETTES).forEach((cls, i) => {
  dit('« ' + ETIQUETTES[cls] + ' » dans le coin du cadre ' + cls,
      coins[i] && coins[i].tag === ETIQUETTES[cls], JSON.stringify(coins[i]));
});

/* ---------------- ce qu'on lit ---------------- */
console.log('\n— chaque mot pose sa couleur, et se tait —');
const MOTS = [['TANKBOX','tank'], ['HEALERBOX','heal'], ['BUFFBOX','buff'],
              ['DEBUFFBOX','debuff'], ['DDBOX','dd'], ['MBBOX','mb'],
              ['TPBOX','tp'], ['REGLEBOX','rules'], ['PROCBOX','rules proc']];
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
/* Le titre en toutes lettres est desormais la SEULE facon de titrer une
   rubrique : « PLD » tout seul est une ligne d'action, plus un titre. */
const vu = await p.evaluate(() => {
  const bloc = STRATCORE.textToBloc(
    'Tank du camp\nPLD : tank sur place\n\nTANKBOX\nPLD : tank sur place');
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
dit('une rubrique titree, elle, ecrit son titre', vu.ancienne.titre === 'Tank du camp',
    String(vu.ancienne.titre));
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

/* ---------------- une boite qui porte un titre ----------------
   Un mot-clé seul suffit quand le badge dit tout. Mais on veut aussi
   encadrer un morceau qui a un nom et une vignette — et que le cadre
   s'arrete quand on saute une ligne, sans avoir a le dire. */
console.log('\n— une boite peut porter un titre, et s\'arrete a la ligne vide —');
const titree = await p.evaluate(() => {
  const src = ['DDBOX',
               'Fomor ×3 · SC Step 4  [img:Fomor]',
               'MNK@PLD : Shijin Spiral → Tornado Kick (SC Step 4) ×3',
               'DNC : Dancing Edge ×4',
               '',
               'Buff · farm',
               'COR : Chaos Roll'].join('\n');
  const bloc = STRATCORE.textToBloc(src);
  const h = document.createElement('div');
  h.style.cssText = 'position:fixed;left:0;top:0;width:840px;z-index:9999';
  h.innerHTML = STRATR.cardHtml({kind:'pack', klabel:'FARM', name:'Essai', tag:'',
                                 noHeadImg:true, groups:bloc.groups}, {n:1}, FLOORS[0], {});
  document.body.appendChild(h);
  const cadre = g => { const s = getComputedStyle(g);
    return s.borderRadius !== '0px' && s.backgroundColor !== 'rgba(0, 0, 0, 0)'; };
  const gs = [...h.querySelectorAll('.grp')];
  const out = {n: bloc.groups.length,
    boite: bloc.groups[0] && {label:bloc.groups[0].label, cls:bloc.groups[0].cls,
      img:bloc.groups[0].img||null, lignes:(bloc.groups[0].lines||[]).length},
    suivante: bloc.groups[1] && {label:bloc.groups[1].label, boite:!!bloc.groups[1].boite},
    encadree: gs[0] ? cadre(gs[0]) : null,
    suivanteEncadree: gs[1] ? cadre(gs[1]) : null,
    vignette: !!(gs[0] && gs[0].querySelector('.gthumb img')),
    reecrit: STRATCORE.blocToText(bloc), source: src};
  h.remove(); return out;
});
dit('le titre qui suit le mot-cle est CELUI de la boite, pas une rubrique de plus',
    titree.n === 2 && titree.boite.label === 'Fomor ×3 · SC Step 4',
    JSON.stringify(titree.boite));
dit('elle garde la couleur du mot-cle, et sa vignette',
    titree.boite.cls === 'dd' && titree.boite.img === 'Fomor' && titree.vignette,
    JSON.stringify(titree.boite));
dit('les deux lignes sont dedans', titree.boite.lignes === 2);
dit('et le cadre se voit', titree.encadree === true);
dit('un saut de ligne la referme', titree.suivante.label === 'Buff · farm'
    && titree.suivante.boite === false, JSON.stringify(titree.suivante));
dit('ce qui suit n\'est donc pas encadre', titree.suivanteEncadree === false);
dit('et le texte revient au caractere pres', titree.reecrit === titree.source,
    JSON.stringify(titree.reecrit));

/* ---------------- une boite dans une boite ----------------
   Le magic burst appartient au bloc de degats qui le prepare : il tient
   DEDANS, il ne vient pas apres. Une BOITE ecrite sans avoir saute de
   ligne s'emboite donc dans celle d'avant. */
console.log('\n— une boite ecrite dans une autre s\'y emboite —');
const gigogne = await p.evaluate(() => {
  const src = ['DDBOX',
               'Fomor ×3 · SC Step 4  [img:Fomor]',
               'MNK@PLD : Shijin Spiral → Tornado Kick (SC Step 4) ×3',
               'MBBOX',
               'RDM : MB Fire sur le SC',
               '',
               'Buff · farm',
               'COR : Chaos Roll'].join('\n');
  const bloc = STRATCORE.textToBloc(src);
  const h = document.createElement('div');
  h.style.cssText = 'position:fixed;left:0;top:0;width:900px;z-index:9999';
  h.innerHTML = STRATR.cardHtml({kind:'pack', klabel:'FARM', name:'Essai', tag:'',
                                 noHeadImg:true, groups:bloc.groups}, {n:1}, FLOORS[0], {});
  document.body.appendChild(h);
  const dd = h.querySelector('.grp.dd'), mb = h.querySelector('.grp.mb'),
        bf = h.querySelector('.grp.buff');
  const out = {niveaux: bloc.groups.map(g => g.niv || 0),
               mbDedans: !!(dd && mb && dd.contains(mb)),
               buffDehors: !!(dd && bf && !dd.contains(bf)),
               mbEncadre: mb ? getComputedStyle(mb).borderRadius !== '0px' : false,
               teinteMb: mb ? getComputedStyle(mb).getPropertyValue('--gc').trim() : null,
               teinteDd: dd ? getComputedStyle(dd).getPropertyValue('--gc').trim() : null,
               reecrit: STRATCORE.blocToText(bloc), source: src};
  h.remove(); return out;
});
dit('la seconde boite est marquee comme emboitee',
    JSON.stringify(gigogne.niveaux) === '[0,1,0]', JSON.stringify(gigogne.niveaux));
dit('et elle est vraiment DANS la premiere', gigogne.mbDedans === true);
dit('elle garde son propre cadre', gigogne.mbEncadre === true);
dit('sa couleur tranche sur celle qui la porte',
    gigogne.teinteMb !== gigogne.teinteDd,
    gigogne.teinteDd + ' contre ' + gigogne.teinteMb);
dit('le saut de ligne referme les DEUX', gigogne.buffDehors === true);
// Sans ligne vide avant une boite emboitee : c'est elle qui refermerait.
dit('et le texte revient au caractere pres', gigogne.reecrit === gigogne.source,
    JSON.stringify(gigogne.reecrit));

/* ---------------- ecrire une ligne de plus SOUS une boite ----------------
   On ecrit une boite, on y met ses lignes, et plus tard on ajoute une
   consigne dessous. Elle sortait du cadre : seule une ligne portant un
   job y restait. Il fallait retaper le mot-cle pour la ramener dedans —
   l'ordre de frappe changeait donc le resultat, et l'atelier glissait au
   passage une ligne vide qui figeait la coupure dans le fichier.
   Une boite ne se referme QU'A la ligne vide. */
console.log('\n— une ligne ajoutee sous une boite y reste —');
const suite = await p.evaluate(() => {
  const rend = src => {
    const bloc = STRATCORE.textToBloc(src);
    const h = document.createElement('div');
    h.style.cssText = 'position:fixed;left:0;top:0;width:860px;z-index:9999';
    h.innerHTML = STRATR.cardHtml({kind:'pack', klabel:'FARM', name:'Essai', tag:'',
                                   noHeadImg:true, groups:bloc.groups}, {n:1}, FLOORS[0], {});
    document.body.appendChild(h);
    const dd = h.querySelector('.grp.dd');
    const dedans = txt => { const e = [...h.querySelectorAll('*')].filter(
      x => x.textContent.indexOf(txt) >= 0 && !x.querySelector('*'))[0];
      return !!(dd && e && dd.contains(e)
                && e.getBoundingClientRect().bottom <= dd.getBoundingClientRect().bottom + 1); };
    const out = {niveaux: bloc.groups.map(g => g.niv || 0), dedans,
                 retour: STRATCORE.blocToText(bloc), src};
    // on garde le noeud le temps de mesurer, l'appelant lit `dedans` avant
    const r = {niveaux: out.niveaux, retour: out.retour, stable: out.retour === src,
               consigne: dedans('Focus le dernier'), apres: dedans('Rudra Storm')};
    h.remove(); return r;
  };
  const un = rend(['DDBOX', 'MNK : Victory Smite ×2', 'Focus le dernier',
                   'THF : Rudra Storm'].join('\n'));
  const deux = rend(['DDBOX', 'MNK : Victory Smite ×2', 'Focus le dernier',
                     'Puis les adds'].join('\n'));
  const vide = STRATCORE.textToBloc(
    ['DDBOX', 'MNK : Victory Smite ×2', '', 'Buff · farm', 'COR : Chaos Roll'].join('\n'));
  return {un, deux, refermee: {niveaux: vide.groups.map(g => g.niv || 0),
                               boite: !!vide.groups[1].boite}};
});
dit('la consigne sans job reste DANS le cadre', suite.un.consigne === true);
dit('et les lignes ecrites sous elle aussi', suite.un.apres === true);
dit('elle s\'y range en sous-rubrique', JSON.stringify(suite.un.niveaux) === '[0,1]',
    JSON.stringify(suite.un.niveaux));
dit('deux consignes de suite sont soeurs, pas emboitees',
    JSON.stringify(suite.deux.niveaux) === '[0,1,1]', JSON.stringify(suite.deux.niveaux));
dit('le texte ne gagne plus de ligne vide au passage', suite.un.stable === true,
    JSON.stringify(suite.un.retour));
dit('et la ligne vide, elle, referme toujours',
    JSON.stringify(suite.refermee.niveaux) === '[0,0]' && suite.refermee.boite === false,
    JSON.stringify(suite.refermee));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLa couleur sans le doublon : le badge suffit.');
process.exit(ko ? 1 : 0);
