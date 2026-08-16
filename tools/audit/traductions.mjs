/* ============================================================
   traductions.mjs — ce que le guide ne sait plus dire en anglais
   ------------------------------------------------------------
   La clé d'une traduction EST la phrase française. Retoucher une
   ligne d'un caractère l'orpheline en silence : le français continue
   de s'afficher, l'anglais retombe sur le français, et personne ne
   le voit avant qu'un lead anglophone ouvre le guide.

   On ne compte pas les phrases sans entrée comme des trous : un nom
   de TP move s'écrit pareil dans les deux langues, et lui inventer
   une entrée identique n'ajoute rien. Ce qu'on cherche, c'est le
   FRANÇAIS resté sans anglais.

     node tools/audit/traductions.mjs
     node tools/audit/traductions.mjs --tout   y compris les identiques

   Sortie 0 si rien de français ne manque, 1 sinon.
   ============================================================ */
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {join, dirname} from 'path';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const TOUT = process.argv.includes('--tout');

globalThis.window = {};
(0, eval)(readFileSync(join(RACINE, 'js', 'i18n.js'), 'utf8')
  .replace(/\bconst\s+TR\s*=/, 'globalThis.TR ='));
const TR = globalThis.TR || {};

const data = readFileSync(join(RACINE, 'js', 'data.js'), 'utf8');
const LIT = '"((?:[^"\\\\]|\\\\.)*)"';
const textes = new Map();                       // texte -> d'où il vient
const prends = (re, ou) => { for(const m of data.matchAll(new RegExp(re, 'g')))
  if(m[1].trim()) textes.set(m[1], ou); };
prends('ln\\(\\[[^\\]]*\\],\\s*' + LIT, 'ligne');
prends('note:' + LIT,  'remarque');
prends('label:' + LIT, 'titre');
prends('cond:' + LIT,  'condition');
prends('tag:' + LIT,   'sous-titre');
// une ligne peut être un TABLEAU de textes — chacun est traduit séparément
for(const m of data.matchAll(new RegExp('ln\\(\\[[^\\]]*\\],\\s*\\[([\\s\\S]*?)\\]\\s*[,)]', 'g')))
  for(const t of m[1].matchAll(new RegExp(LIT, 'g')))
    if(t[1].trim()) textes.set(t[1], 'ligne (liste)');

const MARQUE = /\[(b|i|c:(?:[a-zA-Zé]+|#[0-9a-fA-F]{3,8})|t:[a-zé]+)\]|\[\/(b|i|c|t)\]/g;
/* Du français, pas juste « pas d'entrée » : accents, articles, mots-outils.
   « Feast of Arrows » n'a rien à traduire ; « on s'écarte au pull » si. */
const FRANCAIS = /[àâçéèêëîïôùûüœ]|\b(le|la|les|un|une|des|du|au|aux|et|ou|on|il|elle|se|sa|ses|son|qui|que|dans|sur|pour|sans|avec|pas|plus|tout|toutes|entre|après|avant|chaque|leur|lui|nos|est|sont)\b/i;

const sansAnglais = [], identiques = [];
for(const [t, ou] of textes){
  if(TR[t] !== undefined) continue;
  (FRANCAIS.test(t.replace(MARQUE, '')) ? sansAnglais : identiques).push([t, ou]);
}

console.log('clés de traduction : ' + Object.keys(TR).length
  + ' · textes du contenu : ' + textes.size);
console.log('français sans anglais : ' + sansAnglais.length
  + ' · déjà anglais, rien à faire : ' + identiques.length + '\n');
sansAnglais.forEach(([t, ou]) => console.log('  ' + ou.padEnd(14) + '│ ' + t.replace(MARQUE, '').slice(0, 96)));
if(TOUT && identiques.length){
  console.log('\n— sans entrée, mais déjà en anglais —');
  identiques.forEach(([t, ou]) => console.log('  ' + ou.padEnd(14) + '│ ' + t.replace(MARQUE, '').slice(0, 96)));
}

console.log('\n' + '═'.repeat(52));
console.log(sansAnglais.length
  ? '\x1b[31m' + sansAnglais.length + ' phrase(s) française(s) sans anglais.\x1b[0m'
  : '\x1b[32mTout ce qui est en français a son anglais.\x1b[0m');
process.exit(sansAnglais.length ? 1 : 0);
