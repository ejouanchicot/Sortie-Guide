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

/* ---------- une ligne adressée à LA PLACE, pas à l'un de ses jobs ----------
   « PLD,DNC : … » veut dire « la place 6, quel que soit celui qui la tient ».
   Le filtre masquait la ligne dès qu'UN de ses jobs manquait à la variante :
   elle était donc invisible dans les deux, donc nulle part, et aucun bouton
   ne la rappelait. Mesuré : 0 état visible sur 16. Une ligne n'est masquée
   que si AUCUN de ses jobs n'est là. */
console.log('\n— une ligne adressée aux deux jobs d\'une même place —');

const PLACE = 'La place six fait ceci';
const docFlex = await p.evaluate(async (marque) => {
  const s = window.BIBLIO.depuisGlobaux(
    {COMPO, ROLE, BUFFS, CARTES, MOB, TR, FLOORS}, 'Essai', window.__MS.reglages());
  const flex = window.SORTIE.compoCreneaux(s.compo).filter(c => c.length > 1)[0];
  const g = s.chapitres[0].phases[0].cards[0].groups[0];
  g.lines.unshift({r: flex.slice(), t: marque});
  // et un témoin : un seul des deux jobs, qui lui DOIT se masquer ailleurs
  g.lines.unshift({r: [flex[1]], t: marque + ' — seulement ' + flex[1]});
  return await window.EXPORTHTML.fabrique(s, {base:'../'});
}, PLACE);

const flex = await ouvre('place-flex', docFlex);
const vues = await (async () => {
  const f = path.join(dossier, 'place-flex.html');
  const g = await b.newPage();
  await g.goto('file:///' + f.replace(/\\/g, '/'), {waitUntil:'networkidle0'});
  await g.waitForFunction(() => document.querySelectorAll('.line').length > 0, {timeout:15000});
  const par = [];
  for(const c of await g.evaluate(() => [...document.querySelectorAll('.compchip')].map(x => x.dataset.c))){
    await g.evaluate(v => document.querySelector('.compchip[data-c="' + v + '"]')?.click(), c);
    await new Promise(r => setTimeout(r, 350));
    par.push(await g.evaluate((m, v) => {
      const l = [...document.querySelectorAll('.line')];
      const laPlace = l.find(e => e.textContent.trim().endsWith(m));
      const leSeul  = l.find(e => e.textContent.indexOf(m + ' — seulement') >= 0);
      return {variante:v,
              place: !!laPlace && laPlace.offsetParent !== null,
              seul:  !!leSeul  && leSeul.offsetParent !== null};
    }, PLACE, c));
  }
  await g.close();
  return par;
})();
dit('la rangée des variantes est bien proposée', flex.vu.rangeeVue,
    JSON.stringify(flex.vu.variantes));
vues.forEach(v => dit('variante ' + v.variante + ' : la ligne de la place s\'affiche',
                      v.place, 'elle est dans la page mais masquée'));
/* Le témoin est indispensable : sans lui, débrancher le filtre ferait passer
   l'assertion du dessus tout en cassant le tri par variante. */
dit('  et une ligne d\'un seul job reste masquée là où il n\'est pas',
    vues.some(v => !v.seul), JSON.stringify(vues));

/* ---------- le bouton « @ » propose une variante de CETTE compo ----------
   Il écrivait « @DNC » en dur — un nom de job du contenu, dans le moteur
   d'écriture, ce que l'architecture interdit. Sur toute strat dont la place
   libre n'est pas tenue par un DNC, il fabriquait une ligne que le guide ne
   montre dans AUCUNE variante : le lead l'écrivait, la voyait dans l'aperçu,
   publiait, et personne ne la lisait.
   On ne vérifie donc pas qu'il écrit tel nom, mais qu'il écrit un nom QUE LA
   COMPO CONNAÎT — sinon le contrôle se périmerait au prochain changement de
   composition, ce qui est exactement le défaut qu'on répare. */
console.log('\n— le bouton « @ » suit la composition —');
const q = await b.newPage();
await q.setViewport({width:1600, height:1000});
await q.goto(STUDIO, {waitUntil:'networkidle0'});
await q.waitForFunction(() => window.__SS && window.SORTIE, {timeout:9000});
const bouton = await q.evaluate(async (flexs) => {
  const out = [];
  const cr = COMPO.creneaux;
  const i = cr.findIndex(c => c.length > 1);
  const avant = i >= 0 ? cr[i].slice() : null;
  for(const flex of flexs){
    if(flex){ if(i >= 0) cr[i] = flex.slice(); else cr.push(flex.slice()); }
    else cr.forEach((c, k) => { if(c.length > 1) cr[k] = [c[0]]; });
    const noms = window.SORTIE.compoVariantes(COMPO).map(v => v.nom);
    window.__SS.recharge();
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('stTabStrat').click();
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('#ssTree .ss-step')?.click();
    await new Promise(r => setTimeout(r, 400));
    const ta = document.querySelector('#ssBlocs .ss-btxt');
    let ecrit = '(pas de zone de saisie)';
    const t = document.getElementById('ssToast');
    if(t) t.textContent = '';
    if(ta){
      ta.value = 'MNK : test'; ta.selectionStart = ta.selectionEnd = 4; ta.focus();
      const btn = document.querySelector('#ssBlocs [data-mk="comp"]') || document.querySelector('[data-mk="comp"]');
      if(!btn) ecrit = '(bouton @ introuvable)';
      else { btn.click();
        // le bouton insère dans la zone qu'il pilote, pas forcément celle qu'on
        // tient : on lit toutes les zones du bloc et on prend celle qui a bougé
        ecrit = [...document.querySelectorAll('#ssBlocs .ss-btxt')]
                  .map(x => x.value).find(v => /@/.test(v)) || ta.value; }
    }
    out.push({flex, noms, ecrit, message: (t ? t.textContent : '').slice(0, 110)});
    if(avant && i >= 0) cr[i] = avant; else if(!avant && i < 0) cr.pop();
  }
  return out;
}, [['PLD','DNC'], ['PLD','RUN'], null]);
await q.close();

bouton.forEach(c => {
  const m = /@([A-Za-z]+)/.exec(c.ecrit);
  if(c.flex){
    dit('place libre ' + c.flex.join('/') + ' : il propose une variante réelle',
        !!m && c.noms.indexOf(m[1]) >= 0,
        'écrit « ' + c.ecrit +' » pour ' + JSON.stringify(c.noms));
  } else {
    /* Le témoin : aucune place libre, donc aucune variante. Écrire quand même
       fabriquerait la ligne invisible qu'on vient de supprimer. */
    dit('aucune place libre : il n\'écrit rien et le dit', !m && /aucune place/i.test(c.message),
        'écrit « ' + c.ecrit + ' » · message « ' + c.message + ' »');
  }
});

dit('rien ne casse côté atelier', bruit.length === 0, bruit.slice(0, 2).join('\n       '));
await b.close();
fs.rmSync(dossier, {recursive:true, force:true});
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s) : une ligne ecrite peut ne jamais sortir.`
               : '\nUne ligne reservee sort quand elle le doit, et seulement la.');
process.exit(ko ? 1 : 0);
