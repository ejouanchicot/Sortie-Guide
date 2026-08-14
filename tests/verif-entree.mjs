/* ============================================================
   verif-entree.mjs — Entree en bout de ligne ne vole pas les puces
   ------------------------------------------------------------
   Le farm Acuex commence par un PLD qui porte deux actions :

       PLD : prend les Acuex → les amene au camp Fomor
             tank tout (Acuex + Fomor)

   On finissait la ligne du PLD, Entree, « ALL : … » — et « tank tout »
   changeait de job sans rien dire : il se rangeait sous le ALL qu'on
   venait d'ecrire, qui repartait en liste a puces, pendant que le PLD
   perdait la sienne. On tapait au clavier ce qu'on voyait, et l'apercu
   montrait autre chose.

   On mesure sur l'APERCU, avec de vraies frappes : ce qui compte est
   le badge qu'on lit en diagonale pendant un run.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1500, height:1000});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.STRATCORE && window.STRATR, {timeout:9000});

// l'atelier Strategie, premiere etape du run : le double farm Acuex + Fomor
await p.evaluate(() => {
  const t = [...document.querySelectorAll('button')].find(e => /^strat/i.test(e.textContent.trim()));
  if (t) t.click();
});
await p.waitForSelector('#ssTree .ss-step', {timeout:5000});
await p.evaluate(() => document.querySelector('#ssTree .ss-step').click());
await p.waitForSelector('.ss-bloc .ss-btxt', {timeout:5000});

const trouve = await p.evaluate(() => {
  const els = [...document.querySelectorAll('.ss-bloc')];
  const i = els.findIndex(e => /Acuex/i.test((e.querySelector('.ss-bname')||{}).value || ''));
  if (i < 0) return -1;
  els[i].dataset.essai = '1';
  return i;
});
if (trouve < 0) { console.log('le farm Acuex est introuvable dans l\'etape 1'); await b.close(); process.exit(1); }

/* On pose le curseur EN BOUT de la ligne du PLD, puis on tape vraiment. */
await p.evaluate(() => {
  const ta = document.querySelector('.ss-bloc[data-essai] .ss-btxt');
  const L = ta.value.split('\n');
  const i = L.findIndex(l => /^PLD\s*:/.test(l));
  const pos = L.slice(0, i+1).join('\n').length;
  ta.focus(); ta.setSelectionRange(pos, pos);
});
await p.keyboard.press('Enter');
await p.keyboard.type('ALL : on se regroupe');
await new Promise(r => setTimeout(r, 600));

const vu = await p.evaluate(() => {
  // les lignes de la CARTE : la preparation en tete d'etape en a aussi
  // desormais, elle s'ecrit avec la meme grammaire (voir verif-preparation)
  const lignes = [...document.querySelectorAll('#ssPreview .card .line')];
  return {
    texte: document.querySelector('.ss-bloc[data-essai] .ss-btxt').value,
    lignes: lignes.slice(0, 4).map(d => ({
      badges: [...d.querySelectorAll('.role')].map(e => e.textContent.trim()),
      puces: [...d.querySelectorAll('li')].map(e => e.textContent.trim()),
      texte: d.querySelector('li') ? null : (d.querySelector('.txt')||{}).textContent.trim()
    }))
  };
});
const pld = vu.lignes.find(l => l.badges.join() === 'PLD');
const all = vu.lignes.find(l => l.badges.join() === 'ALL' && /regroupe/.test(JSON.stringify(l)));

console.log('\n— le PLD garde ses deux actions —');
dit('sa ligne existe toujours', !!pld, JSON.stringify(vu.lignes));
dit('« tank tout » lui appartient encore',
    !!pld && pld.puces.some(t => /tank tout/.test(t)), JSON.stringify(pld));

console.log('\n— la ligne qu\'on vient d\'ecrire est une ligne, pas une puce —');
dit('elle porte son badge ALL', !!all, JSON.stringify(vu.lignes));
dit('son texte se lit d\'un bloc, sans puce',
    !!all && all.puces.length === 0 && /on se regroupe/.test(all.texte || ''),
    JSON.stringify(all));
dit('elle n\'a pas ramasse le « tank tout » du PLD',
    !!all && !/tank tout/.test(JSON.stringify(all)), JSON.stringify(all));

console.log('\n— et le texte s\'ecrit bien sous la liste —');
dit('la nouvelle ligne se pose apres « tank tout »',
    vu.texte.split('\n').findIndex(l => /tank tout/.test(l))
      < vu.texte.split('\n').findIndex(l => /on se regroupe/.test(l)),
    vu.texte.split('\n').slice(0, 5).join(' ⏎ '));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nEntree finit la ligne du job, elle ne coupe pas sa liste.');
process.exit(ko ? 1 : 0);
