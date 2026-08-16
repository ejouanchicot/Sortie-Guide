/* ============================================================
   mort.mjs — ce que plus personne n'appelle
   ------------------------------------------------------------
   Les tests vérifient ce qui marche. Rien ne vérifiait ce qui ne
   sert plus. Quatre constantes d'intro sont restées mortes assez
   longtemps pour que j'écrive dedans deux fois en croyant écrire
   dans le guide — la page affichait autre chose, et rien ne l'a dit.

   Trois passes :

     API      un module publie `global.X = { a:…, b:… }`. Chaque
              membre doit être appelé ailleurs que chez lui.
     const    une constante de haut niveau jamais relue hors de son
              fichier — le cas des OVINTRO.
     locale   une fonction définie et jamais appelée, même chez elle.

   Ce que l'outil NE PEUT PAS savoir : un appel construit à la volée,
   `SORTIE[nom]()`. Il les compte et le dit — à toi de juger si un
   nom signalé passe par là.

     node tools/audit/mort.mjs
     node tools/audit/mort.mjs --tout   avec le détail des fichiers lus

   Sortie 0 si rien n'est mort, 1 sinon.
   ============================================================ */
import {readdirSync, readFileSync, statSync} from 'fs';
import {fileURLToPath} from 'url';
import {join, dirname, relative} from 'path';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const DETAIL = process.argv.includes('--tout');

/* Le code du site : js/, tools/ et les pages. Pas tests/ — un test qui
   serait le SEUL à appeler une fonction ne la rend pas vivante pour
   autant, il la maintient en vie pour rien. Pas tools/audit/ non plus. */
const IGNORE = /[\\/](tests|vendor|audit|build|archive|fiches-nm|maquettes)[\\/]|\.min\./;
const fichiers = [];
(function marche(d){
  for(const e of readdirSync(d)){
    if(e.startsWith('.') || e === 'node_modules' || e === 'sources' || e === 'img'
       || e === 'fonts' || e === 'docs') continue;
    const p = join(d, e);
    if(statSync(p).isDirectory()) marche(p);
    else if(/\.(js|html)$/.test(e) && !IGNORE.test(p)) fichiers.push(p);
  }
})(RACINE);

/* On lit le code SANS ses commentaires : une constante citée dans une
   explication n'est pas une constante utilisée, et `PHASES` apparaît dans
   trois commentaires de biblio.js sans y être lue une seule fois. On ne
   coupe que les lignes entièrement commentées et les blocs — jamais au
   milieu d'une ligne, pour ne pas casser une URL. */
function sansCommentaires(s){
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ')
          .split('\n').filter(l => !/^\s*(\/\/|\*|<!--)/.test(l)).join('\n');
}
const src = new Map();                       // chemin -> contenu, commentaires ôtés
for(const f of fichiers) src.set(f, sansCommentaires(readFileSync(f, 'utf8')));

/* Les tests, à part. Une fonction que SEUL un test appelle n'est pas morte —
   mais elle n'est pas vivante non plus : c'est du code maintenu pour lui-même.
   On le dit sans faire rougir l'outil, c'est un jugement, pas une panne. */
const DOSSIER_TESTS = join(RACINE, 'tests');
const codeTests = readdirSync(DOSSIER_TESTS)
  .filter(f => /\.mjs$/.test(f))
  .map(f => readFileSync(join(DOSSIER_TESTS, f), 'utf8'))
  .join('\n');
const court = f => relative(RACINE, f).replace(/\\/g, '/');
if(DETAIL) console.log('lus : ' + fichiers.map(court).join(', ') + '\n');

/* Est-ce que `nom` sert ailleurs que chez lui ?

   Un MEMBRE d'API ne se lit que pointé ou entre crochets — `S.pinMeta`,
   `SORTIE['pinMeta']`. Chercher le mot nu attraperait n'importe quelle
   variable locale du même nom.

   Une CONSTANTE, elle, se lit nue — `PHASES.forEach` — ou par nom
   construit, `window['PHASES']`, et là c'est la chaîne qu'on cherche.
   D'où les deux modes. */
function ailleurs(nom, chezLui, membre){
  const motifs = membre
    ? [new RegExp('\\.' + nom + '\\b'),
       new RegExp('\\[\\s*[\'"]' + nom + '[\'"]\\s*\\]')]
    : [new RegExp('\\b' + nom + '\\b')];
  for(const [f, s] of src){
    if(f === chezLui) continue;
    if(motifs.some(re => re.test(s))) return true;
  }
  return false;
}

const morts = [], parLesTests = [];
const dit = (categorie, nom, ou) => morts.push({categorie, nom, ou: court(ou)});

/* ---- 1. les membres d'API publiés et jamais consommés ---- */
console.log('— ce qu\'un module publie, et que personne ne prend —');
{
  let vus = 0;
  for(const [f, s] of src){
    // global.X = { … } ou window.X = { … } sur plusieurs lignes
    for(const m of s.matchAll(/(?:global|window)\.[A-Z][A-Z0-9_]*\s*=\s*\{([\s\S]*?)\n\s*\};/g)){
      for(const mm of m[1].matchAll(/(?:^|[{,]\s*)([a-zA-ZéèÉ][a-zA-Z0-9_]{2,})\s*:/g)){
        const nom = mm[1];
        vus++;
        if(ailleurs(nom, f, true)) continue;
        (new RegExp('\\.' + nom + '\\b').test(codeTests) ? parLesTests : morts)
          .push({categorie:'api', nom, ou: court(f)});
      }
    }
  }
  const k = morts.filter(x => x.categorie === 'api');
  console.log(k.length ? '  KO   ' + k.length + ' membre(s) sur ' + vus + ' :\n'
      + k.map(x => '         ' + x.nom.padEnd(22) + x.ou).join('\n')
    : '  ok   les ' + vus + ' membres publiés servent tous');
}

/* ---- 2. les constantes de haut niveau jamais relues ---- */
console.log('\n— les constantes que personne ne relit —');
{
  let vus = 0;
  for(const [f, s] of src){
    for(const m of s.matchAll(/^const ([A-Z][A-Z0-9_]{2,})\s*=/gm)){
      const nom = m[1];
      vus++;
      /* Une constante qui ne sert QUE chez elle est parfaitement saine —
         `LANG` dans app.js n'a rien à faire ailleurs. Ce qu'on cherche,
         c'est celle que personne ne lit NULLE PART, y compris chez elle :
         c'était le cas des quatre OVINTRO. */
      const chezElle = (s.match(new RegExp('\\b' + nom + '\\b', 'g')) || []).length;
      if(chezElle <= 1 && !ailleurs(nom, f, false)) dit('const', nom, f);
    }
  }
  const k = morts.filter(x => x.categorie === 'const');
  console.log(k.length ? '  KO   ' + k.length + ' constante(s) sur ' + vus + ' :\n'
      + k.map(x => '         ' + x.nom.padEnd(22) + x.ou).join('\n')
    : '  ok   les ' + vus + ' constantes de haut niveau sont lues');
}

/* ---- 3. les fonctions définies et jamais appelées, même chez elles ---- */
console.log('\n— les fonctions que rien n\'appelle —');
{
  let vus = 0;
  for(const [f, s] of src){
    for(const m of s.matchAll(/^\s*function ([a-zA-ZéèÉ][a-zA-Z0-9_]{2,})\s*\(/gm)){
      const nom = m[1];
      vus++;
      // chez elle : la définition compte pour une occurrence
      const chezElle = (s.match(new RegExp('\\b' + nom + '\\b', 'g')) || []).length;
      if(chezElle <= 1 && !ailleurs(nom, f, false)) dit('locale', nom, f);
    }
  }
  const k = morts.filter(x => x.categorie === 'locale');
  console.log(k.length ? '  KO   ' + k.length + ' fonction(s) sur ' + vus + ' :\n'
      + k.map(x => '         ' + x.nom.padEnd(22) + x.ou).join('\n')
    : '  ok   les ' + vus + ' fonctions déclarées servent toutes');
}

/* ---- ce que seuls les tests tiennent en vie ---- */
if(parLesTests.length){
  console.log('\n— vivants uniquement par les tests —');
  parLesTests.forEach(x => console.log('  ' + x.nom.padEnd(22) + x.ou));
  console.log('  Ce n\'est pas mort : la fonction tourne, mais depuis SON fichier.');
  console.log('  Publiée pour qu\'un test l\'interroge cas par cas — vérifie que');
  console.log('  l\'export porte un commentaire qui le dit, sinon quelqu\'un la');
  console.log('  supprimera en la croyant morte. C\'est arrivé.');
}

/* ---- la limite de l'outil, dite à voix haute ---- */
const dynamiques = [...src].filter(([, s]) => /\[\s*(nom|name|cle|key|k|n)\s*\]\s*\(/.test(s));
if(dynamiques.length){
  console.log('\n— prudence —');
  console.log('  ' + dynamiques.length + ' fichier(s) appellent par nom construit : '
    + dynamiques.map(([f]) => court(f)).join(', '));
  console.log('  un nom signalé plus haut peut y passer sans que je le voie.');
}

console.log('\n' + '═'.repeat(52));
console.log(morts.length
  ? '\x1b[31m' + morts.length + ' chose(s) que plus personne n\'appelle.\x1b[0m'
  : '\x1b[32mRien ne traîne : tout ce qui est écrit sert.\x1b[0m');
process.exit(morts.length ? 1 : 0);
