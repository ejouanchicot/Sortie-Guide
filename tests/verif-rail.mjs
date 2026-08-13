/* ============================================================
   verif-rail.mjs — le fil qui relie les etapes va-t-il au bout ?
   ------------------------------------------------------------
   Le rail anime de la timeline reliait 1 > 2 puis s'arretait net.
   Ca se voyait au SOUS-SOL et pas en haut, ce qui donnait au defaut
   un air de fantaisie.

   La cause : le rail est memorise en DISTANCE DEPUIS LE BAS de la
   timeline. C'est equivalent a une position tant que la hauteur ne
   bouge pas — mais `content-visibility:auto` laisse les cartes hors
   ecran sans mise en page, et leurs hauteurs ne sont qu'ESTIMEES.
   Quand elles se resolvent, la timeline change de taille et la
   distance ne designe plus le meme endroit.

   Les etapes du sous-sol sont presque vides : l'estimation y
   depassait le reel du simple au triple. D'ou un rail beaucoup trop
   court, alors que le calcul lui-meme etait juste.

   On ne teste donc pas la page a peine ouverte : on la PARCOURT
   d'abord, comme un lead qui lit, pour que les hauteurs se resolvent.
   C'est a ce moment-la que le defaut apparaissait.
   ============================================================ */
import {puppeteer, GUIDE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1440, height:1000});
await p.goto(GUIDE, {waitUntil:'networkidle0'});
await p.waitForFunction(() => typeof placeNodes === 'function'
                           && document.querySelector('.timeline'), {timeout:9000});

// compter les recalculs : surveiller une hauteur qu'on modifie soi-meme
// tournerait en rond, et la page ne repondrait plus
await p.evaluate(() => { window.__n = 0; const vrai = window.placeNodes;
  window.placeNodes = function(){ window.__n++; return vrai.apply(this, arguments); }; });

// La mise en page ne se resout qu'en approchant les cartes. Sans ce parcours,
// on mesurerait une page encore pleine d'estimations — et le defaut passerait.
const parcourir = () => p.evaluate(async () => {
  for(let y = 0; y < document.body.scrollHeight; y += 300){
    window.scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)); }
  window.scrollTo(0, 0);
});

async function etage(nom, motif){
  await p.evaluate(m => [...document.querySelectorAll('.floorrow button')]
    .find(x => new RegExp(m, 'i').test(x.textContent))?.click(), motif);
  await new Promise(r => setTimeout(r, 1100));
  await parcourir();
  await new Promise(r => setTimeout(r, 900));
  return p.evaluate(() => {
    const tl = document.querySelector('.timeline'), tr = tl.getBoundingClientRect();
    const bas = parseFloat(tl.style.getPropertyValue('--rail-bottom')) || 0;
    const fin = tr.height - bas;                       // ou le rail s'arrete
    const noeuds = [...tl.querySelectorAll('.tlnode')].map(n => ({
      num: n.textContent.trim(),
      y: n.getBoundingClientRect().top - tr.top + 19   // son centre
    }));
    return {noeuds: noeuds.map(n => n.num),
            atteints: noeuds.filter(n => n.y <= fin + 5).map(n => n.num),
            ecart: Math.round(noeuds[noeuds.length - 1].y - fin),
            hauteur: Math.round(tr.height)};
  });
}

for(const [nom, motif] of [['le sous-sol', 'Sous-sol|Basement'],
                           ['le rez-de-chaussee', 'Rez|Top']]){
  const r = await etage(nom, motif);
  console.log(`\n— ${nom} —`);
  console.log(`       ${r.noeuds.length} etapes · timeline ${r.hauteur}px`);
  dit(`le fil dessert toutes les etapes (${r.atteints.join('>')} sur ${r.noeuds.join('>')})`,
      r.atteints.length === r.noeuds.length,
      `il s'arrete apres ${r.atteints.join('>') || 'aucune'}`);
  dit('et s\'arrete pile sur la derniere, ni court ni long',
      Math.abs(r.ecart) <= 5, r.ecart + 'px d\'ecart');
}

console.log('\n— le recalcul ne s\'emballe pas —');
const n = await p.evaluate(() => window.__n);
dit('le rail se recalcule quand il faut, pas en boucle', n > 0 && n < 60, n + ' recalculs');
dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLe fil relie toutes les etapes, jusqu\'au dernier boss.');
process.exit(ko ? 1 : 0);
