/* ============================================================
   verif-ecriture.mjs — enregistrer sans rien changer ne change rien
   ------------------------------------------------------------
   L'outil reecrit des blocs entiers de js/data.js et js/i18n.js. Si
   sa mise en forme derive d'un iota de celle du fichier, chaque
   enregistrement produit un git diff illisible ou le vrai changement
   se noie. On simule donc une sauvegarde a vide et on compare.

   Les ecarts sont affiches ligne a ligne : quand la mise en forme
   change volontairement, on voit exactement ce qu'on accepte.
   ============================================================ */
import {createRequire} from 'module';
const require = createRequire('C:/Users/g0dli/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/');
const puppeteer = require('puppeteer');

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e)));
await p.goto('http://localhost:8137/tools/studio.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => document.getElementById('stStratSel')?.options.length > 3, {timeout:8000});

const r = await p.evaluate(async () => {
  const avant = await (await fetch('../js/data.js')).text();
  const blocs = window.__SS.blocs().concat(window.__MS.blocs());
  const res = window.DATAFILE.remplace(avant, blocs);
  const trAvant = await (await fetch('../js/i18n.js')).text();
  const trRes = window.DATAFILE.remplace(trAvant, window.__SS.blocsTr());
  return {avant, apres:res.texte, absents:res.absents,
          noms:blocs.map(x => x.nom),
          trAvant, trApres:trRes.texte, trAbsents:trRes.absents};
});

let ko = 0;
const dit = (t, c, d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

console.log('\nblocs ecrits : ' + r.noms.join(', '));
dit('tous les blocs existent dans data.js', r.absents.length === 0, r.absents.join(', '));
dit('tous les blocs existent dans i18n.js', r.trAbsents.length === 0, r.trAbsents.join(', '));

function ecarts(a, b) {
  const la = a.split('\n'), lb = b.split('\n');
  const out = [];
  // comparaison ligne a ligne apres alignement grossier : on veut voir CE qui
  // change, pas produire un diff parfait
  let i = 0, j = 0;
  while (i < la.length || j < lb.length) {
    if (la[i] === lb[j]) { i++; j++; continue; }
    const suite = lb.indexOf(la[i], j);
    const suiteA = la.indexOf(lb[j], i);
    if (suite >= 0 && (suiteA < 0 || suite - j <= suiteA - i)) {
      while (j < suite) out.push('+ ' + lb[j++]);
    } else if (suiteA >= 0) {
      while (i < suiteA) out.push('- ' + la[i++]);
    } else { out.push('- ' + la[i++]); out.push('+ ' + lb[j++]); }
    if (out.length > 400) return out;
  }
  return out;
}

for (const [nom, a, z] of [['js/data.js', r.avant, r.apres], ['js/i18n.js', r.trAvant, r.trApres]]) {
  const d = ecarts(a, z);
  dit(nom + ' est inchange', d.length === 0, d.length + ' ligne(s) :\n       ' + d.slice(0, 60).join('\n       '));
}
dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nUne sauvegarde a vide ne touche a rien.');
process.exit(ko ? 1 : 0);
