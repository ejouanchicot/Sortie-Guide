/* ============================================================
   lancer.mjs — passer tous les tests d'un coup
   ------------------------------------------------------------
   Chaque test ouvre un vrai navigateur sur un vrai serveur :
   ils vérifient ce qui arrive à l'écran, pas ce que le code avait
   l'intention de faire. Trois pannes ont déjà survécu à un test
   qui passait au vert sans regarder la page.

   Ce lanceur monte le serveur local s'il n'est pas déjà là, passe
   les tests un par un, et rend un bilan. Un par un et pas en
   parallèle : ils partagent le même navigateur, le même port et
   la même base IndexedDB — lancés ensemble, ils se marchent dessus
   et le rouge devient impossible à lire.

     node tests/lancer.mjs              tous
     node tests/lancer.mjs fond css     seulement ceux dont le nom contient

   Sortie 0 si tout passe, 1 sinon — de quoi l'enchaîner à autre chose.
   ============================================================ */
import {spawn} from 'child_process';
import {readdirSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, '..');
const PORT = 8137;

const filtres = process.argv.slice(2);
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
  serveur = spawn('python', ['-m', 'http.server', String(PORT)],
                  {cwd: RACINE, stdio: 'ignore'});
  for (let i = 0; i < 25 && !(await debout()); i++) await new Promise(r => setTimeout(r, 200));
  if (!(await debout())) {
    console.log('Le serveur ne répond pas. Python est-il dans le PATH ?');
    serveur.kill();
    process.exit(1);
  }
}

const passe = t => new Promise(res => {
  const p = spawn(process.execPath, [path.join(ICI, t)], {cwd: RACINE, stdio: 'inherit'});
  p.on('close', code => res(code === 0));
  p.on('error', () => res(false));
});

const echecs = [];
for (const t of tests) {
  console.log(`\n\x1b[1m━━ ${t} ━━\x1b[0m`);
  if (!(await passe(t))) echecs.push(t);
}

if (serveur) serveur.kill();

console.log('\n' + '═'.repeat(52));
if (echecs.length) {
  console.log(`\x1b[31m${echecs.length} test(s) en échec :\x1b[0m ` + echecs.join(', '));
  console.log(`Relance-en un seul : node tests/lancer.mjs ${echecs[0].replace(/^verif-|\.mjs$/g, '')}`);
} else {
  console.log(`\x1b[32mLes ${tests.length} tests passent.\x1b[0m`);
}
process.exit(echecs.length ? 1 : 0);
