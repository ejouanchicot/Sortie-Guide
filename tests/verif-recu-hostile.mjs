/* ============================================================
   verif-recu-hostile.mjs — une strat reçue n'exécute rien
   ------------------------------------------------------------
   Un lead reçoit un .html sur Discord, l'ouvre, et le publie.
   Rien de ce fichier ne doit pouvoir s'exécuter chez lui — ni à
   l'ouverture, ni au moment où il enregistre.

   Ce test existe parce que le premier correctif a raté sa cible.
   L'audit avait NOMMÉ deux champs, `phasesNom` et `el` ; ils ont
   été bouchés, la classe entière est restée ouverte. Trois autres
   partaient encore nus — `n`, `niv`, `taille` — et un quatrième,
   `taille` encore, arrivait en innerHTML dans le sous-titre du
   guide, où il s'exécutait à la SIMPLE OUVERTURE du fichier :
   ni atelier, ni enregistrement, un double-clic suffisait.

   Il ne vérifie donc pas une ligne de code, mais une PROPRIÉTÉ :
   quel que soit le champ, ce qui vient d'une strat reçue ne
   s'exécute pas. On force les champs un par un ; le jour où
   quelqu'un en ajoute un, il faudra l'ajouter ici — et le
   commentaire d'à côté le dira.
   ============================================================ */
import {puppeteer, STUDIO, GUIDE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
await p.setViewport({width:1400, height:900});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.SORTIE && window.STRATCORE && window.STRATR, {timeout:9000});

/* ---------- 1. ce qui part dans data.js ---------- */
console.log('\n— rien de ce qu\'on reçoit ne s\'exécute dans data.js —');

const ecrit = await p.evaluate(() => {
  const S = window.SORTIE, SC = window.STRATCORE;
  // Chaque charge referme l'objet, pose un drapeau, puis rouvre un objet
  // bidon pour que la fin du fichier reste syntaxiquement valide — c'est
  // exactement la forme qui passait.
  const cas = {
    'n (phaseConst)': () => SC.phasesConst('X',
      [{n:"0}];globalThis.PWN=1;var _=[{n:9,title:'x',cards:[]", title:'t', cards:[]}]),
    'niv (grpConst)': () => SC.phasesConst('X', [{n:1, title:'t', cards:[
      {kind:'pack', name:'P', tag:'', groups:[{label:'L', niv:"1,note:(globalThis.PWN=1,'x')", lines:[]}]}]}]),
    'taille (compoConst)': () => S.compoConst('X',
      {taille:"6};globalThis.PWN=1;var _={taille:6", creneaux:[['MNK']]}),
    'el (bossesConst)': () => S.bossesConst('X',
      [{name:'B', n:1, el:"fire',x:0,y:0}];globalThis.PWN=1;var _=[{name:'x", x:1, y:1}]),
    'phasesNom (chapitresConst)': () => S.chapitresConst('X',
      [{id:'c', nom:'A', carte:'C', phasesNom:"0;globalThis.PWN=1;var Q"}]),
    'lp (pinMeta)': () => S.bossesConst('X',
      [{name:'B', n:1, el:'fire', x:1, y:1, lp:"top';globalThis.PWN=1;var _='", label:'L'}])
  };
  const out = {};
  for(const [nom, faire] of Object.entries(cas)){
    let src = '';
    try { src = faire(); } catch(e){ out[nom] = {erreur:String(e.message).slice(0,50)}; continue; }
    // on l'exécute comme le navigateur le ferait avec <script src="js/data.js">
    delete window.PWN;
    const s = document.createElement('script');
    s.textContent = 'try{' + src + '}catch(e){}';
    document.head.appendChild(s); s.remove();
    out[nom] = {execute: window.PWN === 1, extrait: src.split('\n')[1] || src.slice(0, 70)};
    delete window.PWN;
  }
  return out;
});

Object.entries(ecrit).forEach(([nom, r]) => {
  if(r.erreur){ dit(nom + ' — le sérialiseur a refusé', true, r.erreur); return; }
  dit(nom + ' ne s\'exécute pas', r.execute === false, r.extrait);
});

/* ---------- 2. ce qui part dans le HTML du guide ---------- */
console.log('\n— ni dans le sous-titre, qui s\'affiche sans un clic —');

const entete = await p.evaluate(() => {
  const R = window.STRATR;
  R.config({tr:s=>s, MOB:{}, ELC:{}, ROLE:{}});
  const piege = '<img src=x onerror="globalThis.PWN2=1">';
  const e = R.entete('Sortie', {taille:piege, creneaux:[['MNK'],['PLD','DNC']]});
  // on l'injecte pour de vrai : c'est ce que fait app.js
  const d = document.createElement('div');
  delete window.PWN2;
  d.innerHTML = e.sous;
  document.body.appendChild(d);
  const vu = {balise: !!d.querySelector('img'), execute: window.PWN2 === 1,
              sous: e.sous.slice(0, 70)};
  d.remove(); delete window.PWN2;
  return vu;
});
dit('une taille piégée ne devient pas une balise', !entete.balise, entete.sous);
dit('  et rien ne s\'exécute à l\'affichage', !entete.execute);

/* ---------- 3. le guide reçu s'affiche quand même ---------- */
console.log('\n— et une strat honnête n\'est pas abîmée au passage —');

const g = await b.newPage();
await g.goto(GUIDE, {waitUntil:'networkidle0'});
await g.waitForFunction(() => document.querySelectorAll('.card').length > 0, {timeout:15000});
const vrai = await g.evaluate(() => ({
  sous: (document.getElementById('gSous') || {}).textContent || '',
  cartes: document.querySelectorAll('.card').length,
  lignes: document.querySelectorAll('.line').length
}));
dit('le sous-titre annonce toujours la compo', /joueur/.test(vrai.sous), vrai.sous.slice(0, 50));
dit('et la strat s\'affiche entière', vrai.cartes > 0 && vrai.lignes > 0,
    vrai.cartes + ' cartes · ' + vrai.lignes + ' lignes');
await g.close();

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));
await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s) : une strat recue peut encore agir.`
               : '\nCe qu\'on recoit reste du texte, jamais du code.');
process.exit(ko ? 1 : 0);
