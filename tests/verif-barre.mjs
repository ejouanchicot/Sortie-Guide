/* ============================================================
   verif-barre.mjs — la barre d'ecriture : tout y est, et rien ne bouge
   ------------------------------------------------------------
   Deux garanties, mesurees a l'ecran :

   1. TOUT ce que la grammaire connait a son bouton. Elle ne proposait
      que les jobs et quatre marqueurs — les sept couleurs de BOITE,
      les titres, les remarques et les vignettes n'existaient que pour
      qui avait lu le code. Et chaque bouton doit ECRIRE ce qu'il
      annonce : on verifie le texte produit, pas l'intention.

   2. Cliquer un bouton corrige la LIGNE, pas la VUE. Reecrire la zone
      de saisie ramene le curseur en fin de texte et fait defiler avec
      lui ; le remettre ensuite ne ramene pas la vue. On perdait des
      yeux la ligne qu'on ecrivait, a chaque clic.

   ⚠ Pour le defilement, le geste doit etre une VRAIE souris. Un
   `.click()` en JavaScript n'enleve pas le focus de la zone, donc rien
   ne defile et le test passe meme quand l'atelier est casse.
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

const trouve = await p.evaluate(() => {
  const el = [...document.querySelectorAll('#ssBlocs .ss-bloc')]
    .find(e => /Degei/i.test((e.querySelector('.ss-bname')||{}).value||''));
  if (!el) return false;
  el.dataset.essai = '1';
  return true;
});
if (!trouve) { console.log('le bloc du boss Degei est introuvable'); await b.close(); process.exit(1); }

/* ---------------- 1. tout est là, et chaque bouton écrit ce qu'il dit ---------------- */
const barre = await p.evaluate(() => {
  const tb = document.querySelector('.ss-bloc[data-essai] .ss-tb');
  return {
    familles: [...tb.querySelectorAll('.ss-tbl')].map(x => x.textContent.trim()),
    sansInfo: [...tb.querySelectorAll('button')].filter(x => !x.dataset.info)
                .map(x => x.textContent.trim()),
    boites: [...tb.querySelectorAll('button[data-boite]')].map(x => x.dataset.boite),
    marqueurs: [...tb.querySelectorAll('button[data-mk]')].map(x => x.dataset.mk),
    vignette: !!tb.querySelector('button[data-img]'),
    autreJob: !!tb.querySelector('button[data-plus]'),
    jobs: [...tb.querySelectorAll('button[data-job]')].map(x => x.dataset.job)
  };
});

console.log('\n— les trois familles —');
dit('qui · la ligne · le bloc', JSON.stringify(barre.familles) === '["qui","la ligne","le bloc"]',
    JSON.stringify(barre.familles));

console.log('\n— tout ce que la grammaire connait a son bouton —');
const BOITES = ['TANKBOX','HEALERBOX','BUFFBOX','DDBOX','MBBOX','REGLEBOX','PROCBOX'];
dit('les sept couleurs de boite', JSON.stringify(barre.boites) === JSON.stringify(BOITES),
    JSON.stringify(barre.boites));
['warn','cond','comp','sub','titre','note','ferme'].forEach(m => {
  dit('le marqueur « ' + m + ' »', barre.marqueurs.indexOf(m) >= 0, JSON.stringify(barre.marqueurs));
});
dit('la vignette d\'un mob', barre.vignette);
dit('un job hors composition', barre.autreJob);
dit('la compo entiere, ALL compris', barre.jobs.length >= 6 && barre.jobs.indexOf('ALL') >= 0,
    JSON.stringify(barre.jobs));

console.log('\n— chaque bouton dit ce qu\'il fait —');
dit('aucun bouton sans infobulle', barre.sansInfo.length === 0, JSON.stringify(barre.sansInfo));

console.log('\n— et il ecrit vraiment ce qu\'il annonce —');
const attendu = {TANKBOX:'tank', HEALERBOX:'heal', BUFFBOX:'buff', DDBOX:'dd',
                 MBBOX:'mb', REGLEBOX:'rules', PROCBOX:'rules proc'};
const essais = await p.evaluate(mots => {
  const el = document.querySelector('.ss-bloc[data-essai]'), ta = el.querySelector('.ss-btxt');
  const out = {};
  mots.forEach(mot => {
    ta.value = 'PLD : tank sur place';
    ta.setSelectionRange(ta.value.length, ta.value.length);
    el.querySelector('button[data-boite="' + mot + '"]').click();
    const L = ta.value.split('\n');
    const avantCurseur = ta.value.slice(0, ta.selectionStart).split('\n');
    out[mot] = {
      lignes: L,
      groupes: STRATCORE.textToBloc(ta.value).groups.map(g => ({cls:g.cls, boite:!!g.boite})),
      // le curseur doit etre au DEBUT de la ligne sous le mot-cle
      surLigneVide: avantCurseur[avantCurseur.length - 1] === '',
      motAuDessus: avantCurseur[avantCurseur.length - 2]
    };
  });
  return out;
}, BOITES);

for (const mot of BOITES) {
  const r = essais[mot];
  const boite = (r.groupes || []).filter(g => g.boite).pop();
  dit(mot.padEnd(9) + ' ouvre un cadre « ' + attendu[mot] + ' »',
      !!boite && boite.cls === attendu[mot], JSON.stringify(r.groupes));
  dit(mot.padEnd(9) + ' occupe sa ligne, et le curseur passe dessous',
      r.surLigneVide && r.motAuDessus === mot,
      'lignes ' + JSON.stringify(r.lignes) + ' · au-dessus du curseur « ' + r.motAuDessus + ' »');
}

const autres = await p.evaluate(() => {
  const el = document.querySelector('.ss-bloc[data-essai]'), ta = el.querySelector('.ss-btxt');
  const un = mk => {
    ta.value = 'PLD : tank sur place';
    ta.setSelectionRange(ta.value.length, ta.value.length);
    el.querySelector('button[data-mk="' + mk + '"]').click();
    return {texte: ta.value, choisi: ta.value.slice(ta.selectionStart, ta.selectionEnd)};
  };
  return {warn: un('warn'), cond: un('cond'), comp: un('comp'),
          sub: un('sub'), titre: un('titre'), note: un('note'), ferme: un('ferme')};
});
dit('Alerte pose le « ! » derriere le job', /^PLD!\s*:/.test(autres.warn.texte), autres.warn.texte);
dit('Condition pose le « ? » en fin de ligne, apres deux espaces',
    /\s{2}\?$/.test(autres.cond.texte), JSON.stringify(autres.cond.texte));
dit('Comp pose le « @ » derriere le job', /^PLD@\w+\s*:/.test(autres.comp.texte), autres.comp.texte);
dit('Action ouvre une ligne en retrait', /\n\s+$/.test(autres.sub.texte), JSON.stringify(autres.sub.texte));
dit('Titre pose un exemple, deja selectionne pour etre remplace',
    /Titre/.test(autres.titre.choisi), JSON.stringify(autres.titre.choisi));
dit('Remarque pose des parentheses, selectionnees aussi',
    /^\(.*\)$/.test(autres.note.choisi), JSON.stringify(autres.note.choisi));
dit('Refermer ajoute la ligne vide qui arrete la boite',
    /\n$/.test(autres.ferme.texte), JSON.stringify(autres.ferme.texte));

/* ---------------- 2. la vue ne bouge pas ---------------- */
await p.evaluate(() => {
  const ta = document.querySelector('.ss-bloc[data-essai] .ss-btxt');
  ta.value = STRATCORE.blocToText({groups: STRATCORE.textToBloc(
    Array.from({length:14}, (_, i) => 'PLD : action numero ' + i).join('\n')).groups});
  ta.dispatchEvent(new Event('input', {bubbles:true}));
});
await new Promise(r => setTimeout(r, 400));

const mesure = () => p.evaluate(() => {
  const ta = document.querySelector('.ss-bloc[data-essai] .ss-btxt');
  return {vue: Math.round(ta.scrollTop), max: Math.round(ta.scrollHeight - ta.clientHeight),
          actif: document.activeElement === ta,
          ligne: ta.value.slice(0, ta.selectionStart).split('\n').length,
          texte: ta.value};
});

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
  t.scrollTop = Math.round((t.scrollHeight - t.clientHeight) / 2);
});
await new Promise(r => setTimeout(r, 250));
const avant = await mesure();

console.log('\n— cliquer un job corrige la ligne, pas la vue —');
dit('la zone defile vraiment, et on est au milieu (sinon le test ne prouve rien)',
    avant.max > 60 && avant.vue > 20 && avant.vue < avant.max - 20,
    'vue ' + avant.vue + ' sur ' + avant.max);

const bouton = await p.$('.ss-bloc[data-essai] .ss-tb button[data-job="COR"]');
const bb = await bouton.boundingBox();
await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);   // VRAI clic souris
await new Promise(r => setTimeout(r, 250));
const apres = await mesure();

const laLigne = apres.texte.split('\n')[avant.ligne - 1] || '';
dit('la ligne du curseur a gagne le COR', /(^|,)COR\s*:/.test(laLigne), '« ' + laLigne + ' »');
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
               : '\nTout est sur un bouton, chacun ecrit ce qu\'il dit, et la vue reste.');
process.exit(ko ? 1 : 0);
