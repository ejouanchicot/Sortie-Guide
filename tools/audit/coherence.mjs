/* ============================================================
   coherence.mjs — le contenu se contredit-il quelque part ?
   ------------------------------------------------------------
   Les tests regardent l'écran. Celui-ci regarde le TEXTE de la strat :
   ce qu'aucun rendu ne peut attraper, parce que la page s'affiche très
   bien avec « Minuet V » ici et « Valor Minuet V » trois lignes plus bas.

   Six contrôles, tous nés d'une vraie erreur :

     marques      une balise ouverte se referme, et dans le bon ordre.
                  « [c:fire][b]feu[/c][/b] » se croise et le rendu part
                  de travers.
     mot          un même mot ne porte qu'une couleur dans tout le guide.
                  Clobbering Wave était or, rouge et nu selon la ligne.
     base         quand la base GearSwap connaît un nom, la couleur écrite
                  est celle de son élément. Voir la mémoire des sources.
     nus          et l'inverse : rien de connu n'est laissé en blanc.
     moves        le même TP move ne dit pas deux choses. Skomora EST
                  Triboulex NQ, Ghatjot EST Dhartok.
     raccourcis   aucun nom de famille employé seul — « Elegy » n'est pas
                  un sort, « Bolter's » n'est pas un Roll.

     node tools/audit/coherence.mjs           tout
     node tools/audit/coherence.mjs --court   juste le verdict

   Sortie 0 si tout est propre, 1 sinon.
   ============================================================ */
import {readdirSync, readFileSync, statSync, existsSync} from 'fs';
import {fileURLToPath} from 'url';
import {join, dirname} from 'path';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const DATA = join(RACINE, 'js', 'data.js');
const COURT = process.argv.includes('--court');

/* La base GearSwap d'Eric : elle n'est pas dans le dépôt, et c'est normal —
   c'est son installation. Sans elle, on saute les deux contrôles qui en
   dépendent au lieu de mentir. */
const MAGIE = 'D:/Windower Tetsouo/addons/GearSwap/data/shared/data/magic';
function baseGearSwap(){
  if(!existsSync(MAGIE)) return null;
  const fichiers = [];
  (function marche(d){ for(const e of readdirSync(d)){ const p = join(d, e);
    if(statSync(p).isDirectory()) marche(p); else if(/\.lua$/i.test(e)) fichiers.push(p); } })(MAGIE);
  const sorts = {};
  const RE = /\[\s*"([^"]+)"\s*\]\s*=\s*\{([\s\S]*?)\n\s*\}/g;
  for(const f of fichiers){ const src = readFileSync(f, 'utf8'); let m;
    while((m = RE.exec(src))){
      const el = (m[2].match(/element\s*=\s*"([A-Za-z]+)"/) || [])[1];
      if(el) sorts[m[1]] = (el === 'Lightning' ? 'thunder' : el.toLowerCase());
    } }
  return sorts;
}

const src = readFileSync(DATA, 'utf8');
const MARQUE = /\[(b|i|c:(?:[a-zA-Zé]+|#[0-9a-fA-F]{3,8})|t:[a-zé]+)\]|\[\/(b|i|c|t)\]/g;
const LIT = '"((?:[^"\\\\]|\\\\.)*)"';
const nu = s => s.replace(MARQUE, '').replace(/\s+/g, ' ').trim();

const soucis = [];
const dit = (titre, lignes) => {
  if(!lignes.length){ console.log('  ok   ' + titre); return; }
  soucis.push(titre);
  console.log('  KO   ' + titre + ' — ' + lignes.length);
  if(!COURT) lignes.slice(0, 12).forEach(l => console.log('         ' + l));
};

console.log('\n— les marques se referment —');
{
  const tordus = [];
  for(const lit of src.match(/"(?:[^"\\]|\\.)*"/g) || []){
    if(!/\[\/?(b|i|c|t)/.test(lit)) continue;
    const pile = []; let ok = true;
    for(const m of lit.matchAll(MARQUE)){
      if(m[1]) pile.push(m[1].charAt(0) === 'c' ? 'c' : m[1].charAt(0) === 't' ? 't' : m[1]);
      else if(pile.pop() !== m[2]){ ok = false; break; }
    }
    if(!ok || pile.length) tordus.push(lit.slice(1, 110));
  }
  dit('aucune marque de travers', tordus);
}

/* ---- les mots colorés, une seule fois pour les trois contrôles suivants ---- */
const mots = new Map();          // mot -> Map(teinte -> nombre)
const titres = new Set();        // les mots qui sont des LABELS de TP move
for(const m of src.matchAll(new RegExp('label:' + LIT, 'g')))
  for(const t of m[1].matchAll(/\[c:([a-zA-Z#0-9]+)\]([^[\]]{2,40})\[\/c\]/g)) titres.add(t[2].trim());
for(const m of src.matchAll(/\[c:([a-zA-Z#0-9]+)\](?:\[b\])?([^[\]]{1,40}?)(?:\[\/b\])?\[\/c\]/g)){
  const mot = m[2].trim(); if(!mot) continue;
  if(!mots.has(mot)) mots.set(mot, new Map());
  const t = mots.get(mot);
  t.set(m[1], (t.get(m[1]) || 0) + 1);
}

console.log('\n— un mot, une couleur —');
dit('aucun mot ne change de couleur selon la ligne',
  [...mots].filter(([, t]) => t.size > 1)
    .map(([mot, t]) => mot.padEnd(22) + [...t].map(([c, n]) => c + ' ×' + n).join('  ·  ')));

const sorts = baseGearSwap();
console.log('\n— les couleurs suivent la base GearSwap —');
if(!sorts) console.log('  --   base introuvable, contrôle sauté (' + MAGIE + ')');
else {
  const faux = [];
  for(const [mot, t] of mots){
    const attendu = sorts[mot];
    if(!attendu) continue;
    for(const c of t.keys()){
      if(c === attendu) continue;
      if(titres.has(mot) && c === 'or') continue;   // un NOM de move, pas le sort
      faux.push(mot.padEnd(22) + 'écrit ' + c.padEnd(9) + '· la base dit ' + attendu);
    }
  }
  dit('aucune couleur ne contredit la base', faux);

  const ELEMENTS = new Set(['fire','ice','wind','earth','thunder','water','light','dark']);
  const nus = new Map();
  for(const m of src.matchAll(/(?<!\])\[b\]([^[\]]{2,40})\[\/b\](?!\[\/c\])/g)){
    const t = m[1].trim();
    if(sorts[t] && !ELEMENTS.has(t.toLowerCase())) nus.set(t, sorts[t]);
  }
  dit('rien de connu n\'est laissé en blanc',
    [...nus].map(([t, e]) => t.padEnd(22) + '→ ' + e));
}

console.log('\n— un TP move ne dit pas deux choses —');
{
  const moves = {};
  for(const m of src.matchAll(new RegExp('label:' + LIT + '[^}]*?note:' + LIT, 'g'))){
    const n = nu(m[1]);
    (moves[n] = moves[n] || []).push(nu(m[2]));
  }
  const divergents = [];
  for(const k of Object.keys(moves)){
    const v = moves[k];
    if(v.length > 1 && v.some(x => x !== v[0]))
      divergents.push(k + '\n           ' + v.join('\n           '));
  }
  dit('aucun move écrit de deux façons', divergents);
}

console.log('\n— aucun raccourci de nom —');
{
  const SUSPECTS = [
    ['Minuet sans Valor',            /(?<!Valor )Minuet/],
    ['Aria sans of Passion',         /Aria(?! of Passion)/],
    ['Elegy sans son tier',          /(?<!Carnage |Battlefield )Elegy/],
    ['Requiem sans son tier',        /(?<!Foe Requiem )Requiem(?! VI)/],
    ['Mazurka sans Chocobo/Raptor',  /(?<!Chocobo |Raptor )Mazurka/],
    ['Bolter sans Roll',             /Bolter(?:'s)?(?!'s Roll)(?! Roll)/],
    ['Tactician sans Roll',          /Tactician(?:'s)?(?!'s Roll)(?! Roll)/],
    ['Weapon Skill en toutes lettres', /Weapon ?Skill/i],
    ['Skillchain en toutes lettres', /Skillchain/i],
    ['TP Move en majuscule',         /TP Moves?\b/]
  ];
  const restants = [];
  for(const lit of src.match(/"(?:[^"\\]|\\.)*"/g) || []){
    const t = lit.replace(MARQUE, '');
    for(const [nom, re] of SUSPECTS)
      if(re.test(t)) restants.push(nom.padEnd(32) + '│ ' + t.slice(1, 92));
  }
  dit('aucun nom de famille employé seul', restants);
}

console.log('\n' + '═'.repeat(52));
if(soucis.length){
  console.log('\x1b[31m' + soucis.length + ' contrôle(s) en échec :\x1b[0m ' + soucis.join(' · '));
} else {
  console.log('\x1b[32mLe contenu ne se contredit nulle part.\x1b[0m');
}
process.exit(soucis.length ? 1 : 0);
