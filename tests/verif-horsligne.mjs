/* ============================================================
   verif-horsligne.mjs — le guide dans le metro
   ------------------------------------------------------------
   « Marche hors ligne » est un argument de l'outil. Il n'etait
   vrai que pour l'ATELIER : le service worker n'etait enregistre
   que depuis tools/studio.js. Un membre du linkshell qui recoit
   un lien vers le guide et n'ouvre jamais l'atelier n'installait
   donc rien — reseau coupe, rechargement, plus rien a l'ecran.
   C'est le public le plus nombreux, celui qui ne fait que lire.

   Ce test coupe vraiment le reseau et recharge. Il ne regarde pas
   si le code « prevoit » le hors-ligne : il regarde si la strat
   s'affiche encore.
   ============================================================ */
import {puppeteer, RACINE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});

async function essaie(nom, url, attendu){
  const p = await b.newPage();
  await p.setViewport({width:1200, height:900});
  await p.goto(url, {waitUntil:'networkidle0'});

  const sw = await p.evaluate(async () => {
    if(!navigator.serviceWorker) return {non:'pas de serviceWorker'};
    const r = await navigator.serviceWorker.getRegistration();
    if(!r) return {non:'aucun enregistrement'};
    await navigator.serviceWorker.ready;
    return {actif: !!r.active, portee: r.scope};
  });
  dit(nom + ' installe son hors-ligne', !sw.non && sw.actif, sw.non || sw.portee);

  // le temps que le cache se remplisse, puis on coupe pour de bon
  await new Promise(r => setTimeout(r, 2500));
  await p.setOfflineMode(true);
  let vu = null, tombe = null;
  try{
    await p.reload({waitUntil:'domcontentloaded', timeout:20000});
    await new Promise(r => setTimeout(r, 2200));
    vu = await p.evaluate(() => ({
      cartes: document.querySelectorAll('.card').length,
      canvas: document.querySelectorAll('canvas').length,
      texte: document.body.innerText.trim().length
    }));
  }catch(e){ tombe = String(e).slice(0, 80); }
  await p.setOfflineMode(false);
  await p.close();

  if(tombe){ dit(nom + ' se recharge sans réseau', false, tombe); return; }
  dit(nom + ' se recharge sans réseau', vu.texte > 500, JSON.stringify(vu));
  dit(nom + ' garde son contenu', attendu(vu), JSON.stringify(vu));
}

console.log('\n— on coupe le réseau, et on recharge —');
// le guide : ce sont ses cartes de strat qui doivent rester
await essaie('le guide', RACINE + '/index.html', v => v.cartes > 0);
// l'atelier : c'est sa toile
await essaie('l\'atelier', RACINE + '/tools/studio.html', v => v.canvas > 0);

/* La liste prechargee doit citer la coquille du GUIDE, pas seulement celle de
   l'atelier — sans quoi le guide dependait d'une visite prealable reussie. */
console.log('\n— ce que la liste préchargée promet —');
const p = await b.newPage();
const sw = await (await p.goto(RACINE + '/sw.js')).text();
await p.close();
const dedans = f => new RegExp("'" + f.replace(/[.\/]/g, '\\$&') + "'").test(sw);
dit('le guide y est', dedans('index.html'), 'index.html');
dit('son moteur aussi', dedans('js/app.js'), 'js/app.js');
dit('le socle partagé aussi', dedans('js/sortie-map-core.js'), 'js/sortie-map-core.js');
/* Le cache ne se purge que si VERSION change : livrer sans la monter laisse
   l'ancien code chez tous ceux qui ont deja ouvert l'outil. */
const v = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
dit('la version du cache est nommée', !!v && /v\d+$/.test(v), v);

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLe guide et l\'atelier s\'ouvrent sans reseau.');
process.exit(ko ? 1 : 0);
