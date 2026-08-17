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

async function essaie(nom, url, attendu, minTexte){
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

  /* Ce qu'on voit AVEC le réseau : c'est à ça qu'on comparera. Un seuil absolu
     de 500 caractères ne prouvait rien sur une page qui en fait des dizaines de
     milliers — la moitié du contenu pouvait manquer sans que la ligne rougisse.
     Un ratio, lui, ne se périme pas quand la strat grossit.

     Mais les deux mesures doivent être prises au MÊME moment de la vie de la
     page. `networkidle0` ne dit rien du rendu : ces deux pages se dessinent en
     JavaScript après, et mesurer ici pour comparer à un état pris deux
     secondes plus tard ne compare rien.

     On ATTEND donc la cible, au lieu de guetter une stabilité : « le texte n'a
     pas bougé depuis 400 ms » se vérifie aussi pendant un creux du rendu, et
     sous charge ça donnait 933 caractères sur 2744 — un rouge que la mesure
     fabriquait elle-même. Vérifié à la main : hors ligne, la page rend
     exactement la même chose qu'en ligne, sans une requête échouée.
     Si la cible n'est pas atteinte dans le délai, alors c'est un vrai échec. */
  const posee = async (page, cible) => {
    await page.waitForFunction(
      () => document.querySelectorAll('.card, canvas').length > 0, {timeout:20000});
    if(cible) await page.waitForFunction(
      n => document.body.innerText.trim().length >= n, {timeout:20000}, cible).catch(() => {});
    return page.evaluate(() => ({
      cartes: document.querySelectorAll('.card').length,
      canvas: document.querySelectorAll('canvas').length,
      texte: document.body.innerText.trim().length
    }));
  };
  const enLigne = await posee(p);

  // le temps que le cache se remplisse, puis on coupe pour de bon
  await new Promise(r => setTimeout(r, 2500));
  await p.setOfflineMode(true);
  let vu = null, tombe = null;
  try{
    await p.reload({waitUntil:'domcontentloaded', timeout:20000});
    // même attente, et on vise ce que la page servait AVEC le réseau
    vu = await posee(p, Math.round(enLigne.texte * 0.9));
  }catch(e){ tombe = String(e).slice(0, 80); }
  await p.setOfflineMode(false);
  await p.close();

  if(tombe){ dit(nom + ' se recharge sans réseau', false, tombe); return; }
  // la page en ligne doit d'abord avoir quelque chose à montrer, sinon la
  // comparaison qui suit vaut zéro
  dit(nom + ' a bien du contenu quand le réseau est là', enLigne.texte > minTexte,
      enLigne.texte + ' caractères en ligne, seuil ' + minTexte);
  const part = enLigne.texte ? vu.texte / enLigne.texte : 0;
  dit(nom + ' se recharge sans réseau', part > 0.9,
      Math.round(part * 100) + ' % du contenu (' + vu.texte + ' sur ' + enLigne.texte + ')');
  dit(nom + ' garde son contenu', attendu(vu, enLigne), JSON.stringify(vu));
}

console.log('\n— on coupe le réseau, et on recharge —');
// Le guide : ce sont ses cartes de strat qui doivent rester — TOUTES, pas une.
// « > 0 » laissait passer un guide amputé de six cartes sur sept. Et c'est un
// document : il pèse des dizaines de milliers de caractères.
await essaie('le guide', RACINE + '/index.html', (v, en) => v.cartes === en.cartes, 2000);
// L'atelier : c'est sa toile, aussi peuplée qu'en ligne. Mais c'est une
// INTERFACE — ses libellés tiennent en un millier de caractères, et c'est
// normal : lui appliquer le seuil d'un document le ferait rougir à tort.
await essaie('l\'atelier', RACINE + '/tools/studio.html',
             (v, en) => v.canvas >= en.canvas && v.canvas > 0, 500);

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
