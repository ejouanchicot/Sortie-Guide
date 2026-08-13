/* ============================================================
   verif-texte.mjs — le texte tient-il dans Discord, et se coupe-t-il bien ?
   ------------------------------------------------------------
   Trois promesses a verifier, dans l'ordre ou elles cassent :
     1. aucun message ne depasse 2000 caracteres, MISE EN FORME
        COMPRISE — c'est la limite d'un compte sans Nitro ;
     2. on ne coupe jamais au milieu d'une phrase, d'une action ou
        d'une categorie ; quand une categorie doit etre coupee, son
        titre est repris avec « (suite) » ;
     3. une seule facon de jouer par message — melanger les lignes
        du PLD et celles du DNC donnerait des consignes qui se
        contredisent.
   ============================================================ */
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('stStratSel')?.options.length > 3, {timeout:8000});

const r = await p.evaluate(() => {
  const X = window.EXPORTTEXTE;
  const o = {variante:'PLD', compo:COMPO};
  const M = {style:'titres'}, C = {style:'couleurs'};
  const tout = X.messages(X.strat(FLOORS, o, BUFFS), M);
  const couleurs = X.messages(X.strat(FLOORS, o, BUFFS), C);

  // une categorie trop longue pour un message : le cas ou il FAUT couper
  const grosse = {label:'Une longue liste', cls:'', lines:
    Array.from({length:60}, (_,i) => ({r:['ALL'], t:'consigne numero '+(i+1)+' — '
      + 'une phrase assez longue pour que soixante d\'entre elles ne tiennent pas '
      + 'dans un seul message Discord'}))};
  const gros = {n:9, boss:'Cas limite', cards:[{kind:'pack', name:'Test', tag:'', groups:[grosse]}]};
  const enorme = X.messages(X.etape(gros, o, {}), M);
  const enormeC = X.messages(X.etape(gros, o, {}), C);

  // une seule ligne plus longue qu'un message entier
  const monstre = X.messages(X.etape({n:1, boss:'Monstre', cards:[{kind:'pack', name:'T', tag:'',
    groups:[{label:'Bloc', lines:[{r:['ALL'], t:Array.from({length:120},
      (_,i)=>'segment '+i+' de texte').join(' · ')}]}]}]}, o, {}), M);

  const dnc = X.texte(X.etape(FLOORS[0].phases[0], {variante:'DNC', compo:COMPO}, BUFFS), M);
  const pld = X.texte(X.etape(FLOORS[0].phases[0], o, BUFFS), M);
  const cor = X.texte(X.etape(FLOORS[0].phases[0],
    {variante:'PLD', compo:COMPO, job:'COR'}, BUFFS), M);

  return {tout, couleurs, enorme, enormeC, monstre, dnc, pld, cor, PLAFOND:X.PLAFOND};
});

const tous = [...r.tout, ...r.enorme, ...r.monstre];

console.log('\n— la limite de Discord —');
// On mesure comme le module budgete : chaque saut de ligne compte DOUBLE.
// Le presse-papier de Windows les rend sur deux caracteres, et parier sur la
// facon dont Discord compte ferait refuser un collage le jour ou on se trompe.
const pese = t => t.length + (t.split('\n').length - 1);
const trop = tous.filter(t => pese(t) > r.PLAFOND);
dit(`aucun des ${tous.length} messages ne depasse ${r.PLAFOND} caracteres, CR compris`,
    trop.length === 0, trop.map(t => pese(t)).join(', '));
console.log('       le plus long : ' + Math.max(...tous.map(pese))
  + ' (' + Math.max(...tous.map(t => t.length)) + ' sans les CR)');
dit('aucun message vide', tous.every(t => t.trim().length > 0));

console.log('\n— ou ca coupe —');
// une action et ses sous-actions ne doivent jamais etre separees : un message
// ne peut donc pas COMMENCER par une sous-action
const orphelines = tous.filter(t => /^\s*-\s+\S/.test(t.split('\n').find(l => /^  - /.test(l)) || '')
  && /^  - /.test(t.split('\n')[0]));
dit('aucun message ne commence par une sous-action', orphelines.length === 0);
// ni par une ligne de conduite sans savoir de quel bloc elle vient
const sansTete = r.tout.filter(t => /^- /.test(t.split('\n')[0]));
dit('aucun message ne commence par une consigne sans son titre', sansTete.length === 0,
    sansTete.map(t => t.split('\n')[0]).join('\n       '));
// aucune ligne tronquee : toute ligne « - » se termine par autre chose qu'un mot coupe
const coupes = tous.flatMap(t => t.split('\n')).filter(l => /\S-$/.test(l));
dit('aucune ligne ne se termine sur un mot coupe', coupes.length === 0, coupes.slice(0,3).join(' | '));

console.log('\n— une categorie trop longue —');
dit('elle est bien repartie sur plusieurs messages', r.enorme.length > 1, r.enorme.length + '');
dit('son titre est repris a chaque fois',
    r.enorme.filter(t => t.includes('Une longue liste')).length === r.enorme.length,
    r.enorme.map(t => t.split('\n').find(l=>l.includes('Une longue liste')) || '(absent)').join('\n       '));
dit('les reprises sont annoncees', r.enorme.filter(t => /\(suite\)/.test(t)).length === r.enorme.length - 1);
dit('les 60 consignes y sont toutes',
    r.enorme.join('\n').match(/consigne numero /g)?.length === 60,
    (r.enorme.join('\n').match(/consigne numero /g)||[]).length + '');

console.log('\n— une seule ligne interminable —');
dit('elle est coupee', r.monstre.length > 1, r.monstre.length + '');
dit('a une respiration du texte, pas au milieu d\'un mot',
    !/segmen$|segme$|\bsegment \d*$/m.test(r.monstre.join('\n').replace(/\n/g,'@')),
    r.monstre.map(t => JSON.stringify(t.slice(-40))).join('\n       '));

console.log('\n— une seule facon de jouer —');
dit('la comp PLD ne parle pas au DNC', !/`DNC`/.test(r.pld),
    (r.pld.match(/^.*`DNC`.*$/m) || [''])[0]);
dit('la comp DNC ne parle pas au PLD', !/`PLD`/.test(r.dnc),
    (r.dnc.match(/^.*`PLD`.*$/m) || [''])[0]);
dit('chacune garde ses propres consignes', /Chocobo Jig/.test(r.dnc) && !/Chocobo Jig/.test(r.pld));
// chaque consigne gardee doit CONCERNER le job choisi ; les autres badges
// d'une meme ligne disent avec qui il enchaine, et doivent rester
const horsSujet = r.cor.split(/\r?\n/).filter(l => /^- /.test(l))
  .filter(l => !/`COR`/.test(l) && !/`ALL`/.test(l));
dit('chaque consigne gardee concerne bien le job choisi', horsSujet.length === 0,
    horsSujet.slice(0, 3).join(' | '));
dit('et il reste quelque chose a lire', /`COR`/.test(r.cor));

console.log('\n— le vocabulaire de Discord —');
const md = r.tout.join('\n');
const attendu = [
  ['# ',      /^# \S/m,            'titre de chapitre'],
  ['## ',     /^## \S/m,           'titre d\'etape'],
  ['### ',    /^### \S/m,          'titre de carte'],
  ['-# ',     /^-# \S/m,           'petit texte'],
  ['__**',    /^__\*\*.+\*\*__$/m, 'rubrique soulignee grasse'],
  ['> ',      /^> \S/m,            'citation pour le trajet'],
  ['- ',      /^- \S/m,            'liste'],
  ['  - ',    /^ {2}- \S/m,        'liste imbriquee'],
  ['`',       /`[A-Z]{2,4}`/,      'job en code'],
  ['**',      /\*\*(FIRE|Fire|WATER|Water|LIGHT|Light)\b/, 'element en gras'],
  ['*(…)*',   /\*\([^)]+\)\*/,     'condition en italique']
];
attendu.forEach(([sig, re, quoi]) =>
  dit(`${sig.padEnd(6)} ${quoi}`, re.test(md)));

console.log('\n— les emoji —');
// Le rendu n'en ajoute qu'un, celui qui alerte : le reste se dit avec la mise
// en forme. Ceux que l'auteur a ecrits dans SON texte ne nous regardent pas —
// on ne reecrit pas ses mots.
const EMO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const source = await p.evaluate(() =>
  JSON.stringify([FLOORS, BUFFS]));
const ecritsParLAuteur = new Set(source.match(EMO) || []);
const ajoutes = [...new Set(md.match(EMO) || [])]
  .filter(e => !ecritsParLAuteur.has(e));
dit('le rendu n\'ajoute qu\'un emoji, celui qui alerte',
    ajoutes.length === 1 && ajoutes[0] === '⚠', JSON.stringify(ajoutes));
console.log('       ecrits par l\'auteur, laisses tels quels : '
  + (ecritsParLAuteur.size ? [...ecritsParLAuteur].join(' ') : '(aucun)'));

console.log('\n— la mise en forme « couleurs » —');
const tousC = [...r.couleurs, ...r.enormeC];
dit('chaque message est un bloc ansi complet',
    tousC.every(t => /^```ansi\n/.test(t) && /\n```(\n-# \d+\/\d+)?$/.test(t)),
    tousC.filter(t => !/^```ansi\n/.test(t)).length + ' mal ouverts');
dit('aucun code de couleur laisse ouvert',
    tousC.every(t => (t.match(/\[[0-9;]+m/g) || []).length % 2 === 0),
    tousC.map(t => (t.match(/\[[0-9;]+m/g)||[]).length).join(','));
dit('le compteur reste hors du bloc',
    !tousC.some(t => /-# \d+\/\d+[\s\S]*```$/.test(t)));
const tropC = tousC.filter(t => pese(t) > r.PLAFOND);
dit('les codes de couleur sont comptes dans les 2000', tropC.length === 0,
    tropC.map(pese).join(', '));
console.log('       le plus long : ' + Math.max(...tousC.map(pese)));
dit('les roles y sont bien teintes',
    /\[1;34mPLD/.test(tousC.join('')) && /\[1;35mCOR/.test(tousC.join('')),
    JSON.stringify(tousC.join('').match(/\[1;3\dm[A-Z]{2,4}/g)?.slice(0,6)));

dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nLe texte tient dans Discord et se coupe ou il faut.');
process.exit(ko ? 1 : 0);
