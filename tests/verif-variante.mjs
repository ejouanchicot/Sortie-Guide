/* ============================================================
   verif-variante.mjs — une strat sans variante n'avale pas les lignes
   ------------------------------------------------------------
   Une ligne peut être réservée à une façon de jouer : « PLD@DNC :
   … » ne sort que dans la variante DNC. Le guide affiche une
   variante à la fois et propose la rangée de boutons pour passer
   de l'une à l'autre.

   Mais une variante n'existe que si un créneau de la compo laisse
   le choix entre deux jobs. Une strat qui n'en a aucun ne montre
   PAS la rangée — et la ligne réservée était alors masquée pour
   toujours, sans aucun bouton pour la rappeler. Le lead l'écrivait
   dans l'atelier, la voyait à l'écran, l'enregistrait, la publiait,
   et elle ne sortait jamais. Rien ne le disait.

   L'atelier, lui, a un état « tout » qui ne filtre rien. C'est
   cette règle-là que le guide reprend quand il n'y a rien à
   choisir.

   On l'ouvre DEPUIS LE DISQUE, comme un guide reçu : c'est le même
   moteur, et c'est la forme sous laquelle une strat voyage.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';
import fs from 'fs';
import path from 'path';
import os from 'os';

const {dit, bilan} = rapport();
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'variante-'));
const b = await puppeteer.launch({headless:'new',
  args:['--no-sandbox','--allow-file-access-from-files']});
const p = await b.newPage();
const bruit = [];
p.on('pageerror', e => bruit.push(String(e).slice(0, 110)));
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.BIBLIO && window.EXPORTHTML && window.SORTIE,
                        {timeout:9000});

const MARQUE = 'Ligne reservee a une facon de jouer';

/* Deux fichiers : le même contenu, deux compos. L'un laisse le choix entre
   deux jobs sur un créneau — il a donc des variantes ; l'autre n'en laisse
   aucun. La ligne réservée est la même dans les deux. */
const fichiers = await p.evaluate(async (marque) => {
  function strat(figee){
    const s = window.BIBLIO.depuisGlobaux(
      {COMPO, ROLE, BUFFS, CARTES, MOB, TR, FLOORS}, 'Essai', window.__MS.reglages());
    if(figee){
      // un seul job par créneau : plus rien à choisir, donc plus de variante
      s.compo.creneaux = (s.compo.creneaux || []).map(cr => [cr[0]]);
    }
    const g = s.chapitres[0].phases[0].cards[0].groups[0];
    g.lines.unshift({r:['ALL'], t:marque, comp:'DNC'});
    return s;
  }
  return {
    avecVariantes: await window.EXPORTHTML.fabrique(strat(false), {base:'../'}),
    sansVariante:  await window.EXPORTHTML.fabrique(strat(true),  {base:'../'})
  };
}, MARQUE);

async function ouvre(nom, html){
  const f = path.join(dossier, nom + '.html');
  fs.writeFileSync(f, html, 'utf8');
  const g = await b.newPage();
  const err = [];
  g.on('pageerror', e => err.push(String(e).slice(0, 110)));
  await g.goto('file:///' + f.replace(/\\/g, '/'), {waitUntil:'networkidle0'});
  await g.waitForFunction(() => document.querySelectorAll('.line').length > 0,
                          {timeout:15000});
  const vu = await g.evaluate((marque) => {
    const l = [...document.querySelectorAll('.line')]
      .find(e => e.textContent.indexOf(marque) >= 0);
    return {trouvee: !!l,
            visible: !!l && l.offsetParent !== null,
            comp: document.body.getAttribute('data-comp'),
            variantes: [...document.querySelectorAll('.compchip')].map(x => x.dataset.c),
            rangeeVue: (() => { const c = document.getElementById('comp');
                                return !!c && getComputedStyle(c).display !== 'none'; })(),
            lignes: document.querySelectorAll('.line').length};
  }, MARQUE);
  await g.close();
  return {vu, err};
}

/* ---------- le cas qui cassait ---------- */
console.log('\n— une compo sans choix : rien à filtrer —');
const sans = await ouvre('sans-variante', fichiers.sansVariante);
dit('la rangée des variantes est bien absente',
    !sans.vu.rangeeVue && sans.vu.variantes.length === 0,
    'variantes proposées : ' + JSON.stringify(sans.vu.variantes));
dit('la ligne réservée est dans la page', sans.vu.trouvee,
    sans.vu.lignes + ' lignes en tout');
dit('  et elle S\'AFFICHE, faute de quoi rien ne peut la rappeler',
    sans.vu.visible, 'data-comp = « ' + sans.vu.comp + ' »');
dit('  rien ne casse', sans.err.length === 0, sans.err.slice(0, 2).join('\n       '));

/* ---------- et le filtre marche toujours quand il a un sens ----------
   Sans ce second fichier, la ligne du dessus passerait aussi si le filtre
   était simplement débranché — et on aurait « corrigé » en cassant. */
console.log('\n— une compo qui laisse le choix : le filtre décide —');
const avec = await ouvre('avec-variantes', fichiers.avecVariantes);
dit('la rangée des variantes est proposée',
    avec.vu.rangeeVue && avec.vu.variantes.length > 1,
    'variantes : ' + JSON.stringify(avec.vu.variantes));
dit('la ligne réservée à l\'autre variante est masquée',
    avec.vu.trouvee && !avec.vu.visible,
    'affichée alors que data-comp = « ' + avec.vu.comp + ' »');
dit('  rien ne casse', avec.err.length === 0, avec.err.slice(0, 2).join('\n       '));

dit('rien ne casse côté atelier', bruit.length === 0, bruit.slice(0, 2).join('\n       '));
await b.close();
fs.rmSync(dossier, {recursive:true, force:true});
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s) : une ligne ecrite peut ne jamais sortir.`
               : '\nUne ligne reservee sort quand elle le doit, et seulement la.');
process.exit(ko ? 1 : 0);
