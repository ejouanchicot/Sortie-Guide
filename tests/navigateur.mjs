/* ============================================================
   navigateur.mjs — d'où vient Puppeteer
   ------------------------------------------------------------
   Le projet n'a pas de package.json, et c'est voulu : le site est
   statique, il ne s'installe pas. Puppeteer vient donc d'ailleurs —
   d'une installation globale déjà présente sur la machine.

   Ce chemin vivait recopié dans chaque test. Une machine qui
   l'installe ailleurs les cassait tous d'un coup, et chaque nouveau
   test le recopiait une fois de plus. Il vit ici, et nulle part
   ailleurs.

   Si le lancement échoue : installer Puppeteer globalement
   (`npm i -g puppeteer`) puis ajouter le chemin à PISTES.
   ============================================================ */
import {createRequire} from 'module';
import {existsSync} from 'fs';
import {homedir} from 'os';

const PISTES = [
  // installation globale npm sous Windows (la machine d'Eric)
  homedir() + '/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/node_modules/',
  homedir() + '/AppData/Roaming/npm/node_modules/puppeteer/',
  // installations globales POSIX
  '/usr/local/lib/node_modules/puppeteer/',
  '/usr/lib/node_modules/puppeteer/'
];

function charge() {
  for (const p of PISTES) {
    if (!existsSync(p)) continue;
    try { return createRequire(p)('puppeteer'); } catch (e) { /* piste suivante */ }
  }
  // dernier recours : résolution normale, si le dépôt a été cloné
  // à côté d'un node_modules qui le contient
  try { return createRequire(import.meta.url)('puppeteer'); } catch (e) { }
  throw new Error(
    'Puppeteer introuvable. Installe-le (npm i -g puppeteer) ou ajoute\n' +
    'son chemin dans PISTES, en haut de tests/navigateur.mjs.');
}

export const puppeteer = charge();

/* L'adresse du serveur local. `tests/lancer.mjs` monte `tests/serveur.mjs`
   sur ce port, sauf s'il y trouve déjà quelque chose debout — un
   `python -m http.server 8137` laissé ouvert à la racine fait l'affaire
   pour travailler à la main, mais il plafonne à trois navigateurs. */
export const RACINE = 'http://localhost:8137';
export const STUDIO = RACINE + '/tools/studio.html';
export const GUIDE = RACINE + '/index.html';

/* Le compte-rendu partagé : « ok » ce qui passe, « KO » ce qui casse,
   avec le détail sous la ligne pour ne pas avoir à relancer pour voir. */
export function rapport() {
  let ko = 0;
  const dit = (t, c, d) => {
    if (c) console.log('  ok   ' + t);
    else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); }
  };
  return {dit, bilan: () => ko};
}

/* ============================================================
   Attendre une CONDITION, jamais une durée
   ------------------------------------------------------------
   Les tests dormaient 107 secondes en tout, réparties en délais
   fixes après chaque geste. Deux défauts, et le second est le
   pire :
     · c'était le gros du temps de la suite ;
     · un délai fixe ment sous charge. À six navigateurs de front,
       deux tests différents tombaient sur deux passages
       consécutifs et chacun passait seul — d'où le repli à
       quatre. Le sommeil ne rend pas un test fiable, il déplace
       le seuil auquel il devient capricieux.
   Ces trois fonctions attendent ce qu'on veut vraiment : que la
   carte ait fini de se dessiner, qu'un élément existe, qu'une
   condition soit vraie. Elles échouent bruyamment au bout du
   délai maximal, au lieu de laisser le test mesurer le vide.
   ============================================================ */

// Le rendu de l'atelier Carte est terminé. window.__MS.pret() rend la promesse
// du dernier rendu demandé ; on attend d'abord que le crochet existe, la page
// pouvant encore être en train de se monter.
export async function carteDessinee(page, delai = 15000) {
  await page.waitForFunction(() => !!(window.__MS && window.__MS.pret), {timeout: delai});
  await page.evaluate(() => window.__MS.pret());
}

// Une condition dans la page, avec un message utile si elle n'arrive jamais.
export async function attend(page, fn, quoi = 'la condition', delai = 10000, ...args) {
  try { await page.waitForFunction(fn, {timeout: delai}, ...args); }
  catch (e) { throw new Error('attente dépassée (' + delai + ' ms) : ' + quoi); }
}

// Un élément qui apparaît, puis qui est réellement visible.
export async function apparait(page, sel, delai = 10000) {
  await page.waitForSelector(sel, {visible: true, timeout: delai});
  return page.$(sel);
}

/* Cliquer, puis vérifier — et recommencer si le clic n'a pas pris.
   Konva reconstruit son hit-graph au dessin : sous charge, la carte peut être
   juste à l'écran sans encore répondre au pointeur. Allonger un délai jusqu'à
   ce que ça passe, c'est refaire le défaut qu'on répare ; on réessaie donc le
   geste lui-même, ce qui est immédiat quand la scène est prête et n'échoue que
   si elle ne l'est jamais. */
export async function cliqueJusqua(page, x, y, condition, quoi = 'le clic', essais = 12) {
  for (let i = 0; i < essais; i++) {
    await page.mouse.click(x, y);
    try {
      await page.waitForFunction(condition, {timeout: 700});
      return i;                       // rang de l'essai qui a pris
    } catch (e) { /* pas encore : on refait le geste */ }
  }
  throw new Error('sans effet après ' + essais + ' essais : ' + quoi);
}
