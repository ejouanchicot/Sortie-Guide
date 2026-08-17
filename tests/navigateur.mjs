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
