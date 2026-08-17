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
import {puppeteer} from './navigateur.mjs';

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
/* ---------- un bloc qu'on ne reconnaît pas se DIT, il ne s'avale pas ----------
   Le motif du bloc scalaire a été ancré sur la fin de ligne pour régler le cas
   d'un « ; » dans le nom d'une strat. Ancrer le rend plus strict, donc il RATE
   plus souvent — et il ne s'arrêtait pas : il continuait jusqu'au « ; » de fin
   de ligne suivant en avalant tout ce qu'il traversait. Mesuré alors : un
   commentaire en bout de ligne suffisait à faire disparaître BUFFS et MOB, dans
   un fichier resté syntaxiquement valide, avec « absents » vide — donc pas un
   mot, et l'écriture sur le disque.
   Deux formes que le lead peut réellement produire dans son data.js. */
console.log('\n— un bloc introuvable est signale, jamais avale —');
const avale = await p.evaluate((src) => {
  const DF = window.DATAFILE, out = [];
  for(const [quoi, abime] of [
    ['un commentaire en bout de ligne', src.replace(/^const LBLMARGIN=([^;]*);/m,
                                                    'const LBLMARGIN=$1;   // marge des etiquettes')],
    ['un point-virgule oublie',         src.replace(/^const MOBSCALE=([^;]*);/m,
                                                    'const MOBSCALE=$1')]
  ]){
    const r = DF.remplace(abime, [{nom:'LBLMARGIN', scalaire:true, txt:'const LBLMARGIN=6;'},
                                  {nom:'MOBSCALE',  scalaire:true, txt:'const MOBSCALE=1;'}]);
    out.push({quoi, absents:r.absents, perdues: abime.split('\n').length - r.texte.split('\n').length});
  }
  return out;
}, r.avant);
avale.forEach(c => {
  dit(c.quoi + ' : le bloc est signale absent', c.absents.length > 0, JSON.stringify(c.absents));
  dit('  et rien n\'a disparu du fichier', c.perdues === 0, c.perdues + ' ligne(s) perdue(s)');
});

dit('rien ne casse', bruit.length === 0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko ? `\n${ko} probleme(s).` : '\nUne sauvegarde a vide ne touche a rien.');
process.exit(ko ? 1 : 0);
