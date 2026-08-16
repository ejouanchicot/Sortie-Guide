/* ============================================================
   lancer.mjs — passer tous les tests d'un coup
   ------------------------------------------------------------
   Chaque test ouvre un vrai navigateur sur un vrai serveur :
   ils vérifient ce qui arrive à l'écran, pas ce que le code avait
   l'intention de faire. Trois pannes ont déjà survécu à un test
   qui passait au vert sans regarder la page.

   Ils tournaient un par un, par crainte qu'ils se marchent dessus.
   La crainte ne tient plus : chaque test ouvre SON navigateur, avec
   son profil et sa propre IndexedDB, et ceux qui « écrivent » un
   fichier utilisent un faux handle qui ne touche jamais le disque.
   Le serveur, lui, ne fait que servir des fichiers. Ils tournent
   donc à plusieurs — cinq minutes d'attente sont devenues une.

   Ce qu'on ne sacrifie pas, c'est la lecture du bilan : les blocs
   sortent dans l'ordre des fichiers, jamais entremêlés, même si
   le troisième finit avant le premier.

     node tests/lancer.mjs              tous
     node tests/lancer.mjs fond css     seulement ceux dont le nom contient
     node tests/lancer.mjs --serie      un par un (si un test devient capricieux)

   Sortie 0 si tout passe, 1 sinon — de quoi l'enchaîner à autre chose.
   ============================================================ */
import {spawn} from 'child_process';
import {readdirSync} from 'fs';
import {fileURLToPath} from 'url';
import {cpus} from 'os';
import path from 'path';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, '..');
const PORT = 8137;

const args = process.argv.slice(2);
const enSerie = args.includes('--serie');
const filtres = args.filter(a => !a.startsWith('--'));

/* Combien à la fois. Deux plafonds successifs, tous deux mesurés :

   · `python -m http.server` refusait les connexions au-delà de trois
     navigateurs — d'où `tests/serveur.mjs`, qui ne les refuse pas ;
   · à six, ce sont les tests eux-mêmes qui lâchent. Ils attendent la page
     avec des délais en dur, et sous cette charge les délais mentent : deux
     tests différents sont tombés sur deux passages, chacun passant seul.

   Quatre : trois passages verts d'affilée, 113 s. Un test qui rougit au
   hasard est pire qu'une suite lente — on apprend à ignorer le rouge. */
const demande = (args.find(a => a.startsWith('--front=')) || '').split('=')[1];
const FRONT = enSerie ? 1
  : Math.max(1, Math.min(+demande || 4, (cpus().length || 4) - 1));

const tests = readdirSync(ICI)
  .filter(f => f.startsWith('verif-') && f.endsWith('.mjs'))
  .filter(f => !filtres.length || filtres.some(m => f.includes(m)))
  .sort();

if (!tests.length) {
  console.log('Aucun test ne correspond à : ' + filtres.join(' '));
  process.exit(1);
}

/* Le serveur : on ne le remonte pas s'il tourne déjà. Eric le laisse
   souvent ouvert dans un terminal à côté — le tuer sous ses pieds
   serait une mauvaise surprise. */
async function debout() {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 1200);
    const r = await fetch(`http://localhost:${PORT}/index.html`, {signal: c.signal});
    clearTimeout(t);
    return r.ok;
  } catch (e) { return false; }
}

let serveur = null;
if (await debout()) {
  console.log(`Serveur déjà debout sur :${PORT} — on s'en sert.`);
} else {
  console.log(`Serveur monté sur :${PORT} pour la durée des tests.`);
  serveur = spawn(process.execPath, [path.join(ICI, 'serveur.mjs')],
                  {cwd: RACINE, stdio: 'ignore'});
  for (let i = 0; i < 25 && !(await debout()); i++) await new Promise(r => setTimeout(r, 200));
  if (!(await debout())) {
    console.log('Le serveur ne répond pas.');
    serveur.kill();
    process.exit(1);
  }
}
console.log(FRONT > 1 ? `${tests.length} tests, ${FRONT} à la fois.`
                      : `${tests.length} tests, un par un.`);

/* On capture la sortie au lieu de la laisser couler : à plusieurs, elle
   s'entremêlerait et le rouge deviendrait illisible. */
const passe = t => new Promise(res => {
  const p = spawn(process.execPath, [path.join(ICI, t)], {cwd: RACINE});
  let sortie = '';
  p.stdout.on('data', d => { sortie += d; });
  p.stderr.on('data', d => { sortie += d; });
  p.on('close', code => res({ok: code === 0, sortie}));
  p.on('error', e => res({ok: false, sortie: String(e)}));
});

const fini = new Array(tests.length).fill(null);
let aEcrire = 0;                       // le prochain bloc à sortir, dans l'ordre
function vide() {
  while (aEcrire < tests.length && fini[aEcrire]) {
    process.stdout.write(`\n\x1b[1m━━ ${tests[aEcrire]} ━━\x1b[0m\n` + fini[aEcrire].sortie);
    aEcrire++;
  }
}

let suivant = 0;
async function ouvrier() {
  while (suivant < tests.length) {
    const i = suivant++;
    fini[i] = await passe(tests[i]);
    vide();
  }
}
await Promise.all(Array.from({length: Math.min(FRONT, tests.length)}, ouvrier));

if (serveur) serveur.kill();

const echecs = tests.filter((t, i) => !fini[i].ok);
console.log('\n' + '═'.repeat(52));
if (echecs.length) {
  console.log(`\x1b[31m${echecs.length} test(s) en échec :\x1b[0m ` + echecs.join(', '));
  console.log(`Relance-en un seul : node tests/lancer.mjs ${echecs[0].replace(/^verif-|\.mjs$/g, '')}`);
} else {
  console.log(`\x1b[32mLes ${tests.length} tests passent.\x1b[0m`);
}
process.exit(echecs.length ? 1 : 0);
