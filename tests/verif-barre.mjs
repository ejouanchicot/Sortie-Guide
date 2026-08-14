/* ============================================================
   verif-barre.mjs — la barre corrige la ligne, pas la vue
   ------------------------------------------------------------
   On ecrit au milieu d'une strat, on clique un job dans la barre :
   le badge se posait bien sous le curseur, mais le texte partait
   tout en bas. Reecrire la zone de saisie ramene le curseur en fin
   de texte et fait defiler avec lui ; le remettre ensuite ne ramene
   pas la vue. On perdait des yeux la ligne qu'on ecrivait, a chaque
   clic — et sur un boss, il y a trente lignes.

   ⚠ Le geste doit etre une VRAIE souris. Un `.click()` en JavaScript
   n'enleve pas le focus de la zone de saisie, donc rien ne defile et
   le test passe meme quand l'atelier est casse. C'est le mousedown
   qui fait tout : il sort du champ, et le code doit y revenir sans
   deplacer la vue.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1500, height:900});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.STRATCORE && window.STRATR, {timeout:9000});
await p.evaluate(() => {
  const t = [...document.querySelectorAll('button')].find(e => /^strat/i.test(e.textContent.trim()));
  if (t) t.click();
});
await p.waitForSelector('#ssTree .ss-step', {timeout:5000});
await p.evaluate(() => document.querySelector('#ssTree .ss-step').click());
await p.waitForSelector('#ssBlocs .ss-bloc .ss-btxt', {timeout:5000});

// le boss : c'est le bloc le plus long, celui qui defile
const trouve = await p.evaluate(() => {
  const el = [...document.querySelectorAll('#ssBlocs .ss-bloc')]
    .find(e => /Degei/i.test((e.querySelector('.ss-bname')||{}).value||''));
  if (!el) return false;
  el.dataset.essai = '1';
  return true;
});
if (!trouve) { console.log('le bloc du boss Degei est introuvable'); await b.close(); process.exit(1); }

const mesure = () => p.evaluate(() => {
  const ta = document.querySelector('.ss-bloc[data-essai] .ss-btxt');
  return {vue: Math.round(ta.scrollTop), max: Math.round(ta.scrollHeight - ta.clientHeight),
          curseur: ta.selectionStart, actif: document.activeElement === ta,
          ligne: ta.value.slice(0, ta.selectionStart).split('\n').length,
          texte: ta.value};
});

// on se pose dans la zone comme un lead : clic dedans, puis milieu du texte
const zone = await p.$('.ss-bloc[data-essai] .ss-btxt');
await zone.scrollIntoViewIfNeeded();
await new Promise(r => setTimeout(r, 200));
const bz = await zone.boundingBox();
await p.mouse.click(bz.x + bz.width / 2, bz.y + 30);
await p.evaluate(() => {
  const t = document.querySelector('.ss-bloc[data-essai] .ss-btxt');
  const L = t.value.split('\n');
  const pos = L.slice(0, Math.floor(L.length / 2) + 1).join('\n').length;
  t.setSelectionRange(pos, pos);
  t.scrollTop = Math.round((t.scrollHeight - t.clientHeight) / 2);   // au milieu
});
await new Promise(r => setTimeout(r, 250));
const avant = await mesure();

dit('la zone defile vraiment, et on est au milieu (sinon le test ne prouve rien)',
    avant.max > 60 && avant.vue > 20 && avant.vue < avant.max - 20,
    'vue ' + avant.vue + ' sur ' + avant.max);

/* le geste : un vrai clic souris sur le bouton COR de la barre de CE bloc */
const bouton = await p.$('.ss-bloc[data-essai] .ss-tb button[data-job="COR"]');
const bb = await bouton.boundingBox();
await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
await new Promise(r => setTimeout(r, 250));
const apres = await mesure();

console.log('\n— le badge se pose la ou etait le curseur —');
const laLigne = apres.texte.split('\n')[avant.ligne - 1] || '';
dit('la ligne du curseur a gagne le COR', /(^|,)COR\s*:/.test(laLigne), '« ' + laLigne + ' »');
dit('et elle a garde son texte', laLigne.length > 8, '« ' + laLigne + ' »');

console.log('\n— et la vue ne bouge pas —');
dit('le defilement est reste ou il etait', apres.vue === avant.vue,
    avant.vue + 'px → ' + apres.vue + 'px  (le bas serait ' + apres.max + 'px)');
dit('la zone n\'est pas partie tout en bas', apres.vue < apres.max - 20,
    apres.vue + ' / ' + apres.max);
dit('la zone de saisie a repris la main', apres.actif, String(apres.actif));
dit('le curseur est reste sur la ligne qu\'on ecrit', apres.ligne === avant.ligne,
    'ligne ' + avant.ligne + ' → ' + apres.ligne);

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nOn clique un job, la ligne change, la vue reste.');
process.exit(ko ? 1 : 0);
