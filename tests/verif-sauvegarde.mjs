/* On CASSE la sauvegarde, et on regarde si l'outil le dit.

   Trois pannes, trouvees par un audit le 15 aout 2026, et qu'aucun test ne
   voyait — parce qu'aucun test ne mettait la sauvegarde en echec :

   1. l'espace de travail ne peut plus ecrire (memoire pleine, navigation
      privee). Toute erreur etait avalee : on ecrivait une heure en croyant
      etre garde, et le rechargement reprenait tout ;

   2. deux onglets gardaient chacun SA version dans la meme entree, toutes les
      fractions de seconde. Le dernier gagnait, l'autre disparaissait ;

   3. le navigateur VIDE le fichier avant d'y ecrire. Si l'ecriture s'arrete
      la, `js/data.js` reste vide — et rien ne le relisait.

   Ce qui compte dans les trois : que l'outil PARLE. Une panne muette est pire
   qu'une panne, parce qu'on continue de travailler dedans. */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];

async function atelier(){
  const p = await b.newPage();
  p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
  await p.setViewport({width:1500, height:1000});
  await p.goto(STUDIO, {waitUntil:'networkidle0'});
  await p.waitForFunction(() => window.__STUDIO && window.__SS, {timeout:9000});
  await p.click('#stTabStrat');
  /* Ce que les 1800 + 400 ms achetaient sans le dire : que la liste des étapes
     soit là. Le clic juste en dessous porte un « ?. » qui avale son absence —
     sans étape à cliquer, aucun bloc ne s'ouvre et l'attente suivante expire,
     dix secondes plus loin, sur un message qui ne dit pas pourquoi. */
  await p.waitForSelector('#ssTree .ss-step', {timeout:15000});
  await p.evaluate(() => document.querySelector('#ssTree .ss-step').click());
  await p.waitForSelector('#ssBlocs .ss-btxt', {timeout:8000});
  return p;
}
// taper une ligne, comme un lead
async function tape(p, txt){
  await p.evaluate(t => {
    const ta = document.querySelector('#ssBlocs .ss-bloc .ss-btxt');
    ta.value = ta.value + '\n' + t;
    ta.dispatchEvent(new Event('input', {bubbles:true}));
  }, txt);
  /* CE DÉLAI RESTE, après deux tentatives de le remplacer.
     On attend la sauvegarde silencieuse, qui est débouncée — un timer du code.
     Attendre que la ligne apparaisse en bibliothèque marche… sauf que ce
     fichier CASSE l'écriture exprès, et qu'un onglet y passe en lecture : dans
     ces cas-là la ligne n'arrivera jamais, et l'attente consomme son timeout
     entier. Le test est passé de 13 à 34 secondes avant que je m'en aperçoive.
     Un délai fixe est ici la réponse honnête : il vaut pour les deux issues. */
  await new Promise(r => setTimeout(r, 1700));
}
const temoin = p => p.evaluate(() => {
  const el = document.getElementById('stUnsaved');
  return {vu: el && el.classList.contains('on'), classes: el ? el.className : null,
          mot: el ? el.textContent.trim() : null};
});

/* ---------------- 1. l'espace de travail ne peut plus ecrire ---------------- */
console.log('\n— la bibliothèque ne peut plus écrire —');
const p = await atelier();
await p.evaluate(() => {
  window.__vrai = BIBLIO.ecris; window.__essais = 0;
  BIBLIO.ecris = function(){ window.__essais++; return Promise.reject(new Error('QuotaExceededError')); };
});
await tape(p, 'ALL : travail qui ne doit pas se perdre en silence');
const panne = await temoin(p);
const essais = await p.evaluate(() => window.__essais);
dit('l\'écriture a bien été tentée', essais > 0, essais + ' tentative(s)');
dit('le témoin passe en panne, et se voit',
    panne.vu && /panne/.test(panne.classes || ''), JSON.stringify(panne));
dit('et il ne dit plus « non enregistré », qui est un état NORMAL',
    !!panne.mot && !/non enregistr/i.test(panne.mot), String(panne.mot));

console.log('\n— et il se retire quand ça repasse —');
await p.evaluate(() => { BIBLIO.ecris = window.__vrai; });
await tape(p, 'ALL : et ça repart');
const remis = await temoin(p);
dit('le témoin quitte l\'état de panne', !/panne/.test(remis.classes || ''), JSON.stringify(remis));

/* ---------------- 2. deux onglets ---------------- */
console.log('\n— deux onglets ouverts sur la même strat —');
const p2 = await atelier();
await tape(p, 'ALL : écrit par le premier onglet');
await tape(p2, 'ALL : écrit par le second onglet');
const second = await temoin(p2);
dit('le second onglet dit qu\'il n\'écrit pas',
    second.vu && /lecture/.test(second.classes || ''), JSON.stringify(second));
const garde = await p2.evaluate(async () => {
  const s = await BIBLIO.lis(BIBLIO.courante());
  const t = JSON.stringify(s.chapitres);
  return {premier: /premier onglet/.test(t), second: /second onglet/.test(t)};
});
dit('le travail du premier onglet est intact', garde.premier, JSON.stringify(garde));
dit('et le second n\'a rien écrasé', !garde.second, JSON.stringify(garde));

console.log('\n— et un clic reprend la main —');
await p2.evaluate(() => document.getElementById('stUnsaved').click());
await tape(p2, 'ALL : le second a repris la main');
const repris = await p2.evaluate(async () => {
  const s = await BIBLIO.lis(BIBLIO.courante());
  return {ecrit: /repris la main/.test(JSON.stringify(s.chapitres)),
          classes: document.getElementById('stUnsaved').className};
});
dit('il écrit de nouveau', repris.ecrit, JSON.stringify(repris));

/* ---------------- 3. le fichier ecrit puis relu ---------------- */
console.log('\n— le fichier écrit ne contient pas ce qu\'on voulait —');
const relu = await p.evaluate(async () => {
  // une poignée de fichier qui accepte l'écriture mais rend autre chose :
  // c'est exactement ce que laisse une écriture interrompue
  let surDisque = 'const NOM="avant";\nconst MOB={\n};\n';
  let ecritures = [];
  const faux = {name:'data.js',
    createWritable: async () => ({ write: async t => { ecritures.push(t); surDisque = ''; },
                                   close: async () => {} }),
    getFile: async () => ({ text: async () => surDisque })};
  const ok = await window.__STUDIO.ecrisEtRelis(faux, 'const NOM="apres";', surDisque, 'js/data.js');
  return {rendu: ok, ecritures: ecritures.length, surDisque: surDisque};
});
dit('l\'outil refuse de dire que c\'est sauvegardé', relu.rendu === false, JSON.stringify(relu));
dit('il a tenté d\'écrire, puis de remettre la version d\'avant',
    relu.ecritures === 2, relu.ecritures + ' écriture(s)');

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));
await b.close();
const ko = bilan();
console.log(ko ? '\nUne panne de sauvegarde peut encore passer inaperçue.'
               : '\nAucune panne de sauvegarde ne passe plus en silence.');
process.exit(ko ? 1 : 0);
