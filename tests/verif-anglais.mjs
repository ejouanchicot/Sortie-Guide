/* ============================================================
   verif-anglais.mjs — le guide, lu par un lead anglophone
   ------------------------------------------------------------
   Aucun des 40 autres tests n'ouvrait le guide en anglais, et les
   contrôles de contenu ne regardent que le français. La moitié du
   linkshell lisait donc une page que rien ne vérifiait.

   Ce que ça laissait passer, très concrètement : tr() déréférençait
   TR sans garde, avec un court-circuit sur LANG==='en'. En français
   TR n'était jamais touché — le guide allait parfaitement bien MÊME
   SI i18n.js ne se chargeait plus du tout. En anglais, chaque appel
   levait et la page restait blanche. Suite verte, lead anglophone
   devant rien.

   On vérifie donc, dans l'ordre où il le vivrait :
     1. la page s'affiche, et la console est muette ;
     2. les libellés sortent bien en anglais, pas en français ;
     3. le contenu de la strat aussi ;
     4. la bascule EN/FR revient au français ;
     5. et si i18n.js disparaît, le guide reste LISIBLE (en français)
        au lieu de mourir — c'est la garde de tr().
   ============================================================ */
import {puppeteer, GUIDE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});

async function ouvre(lang, avant){
  const p = await b.newPage();
  const bruit = [];
  p.on('pageerror', e => bruit.push(String(e)));
  p.on('console', m => { if(m.type() === 'error') bruit.push(m.text()); });
  await p.setViewport({width:1400, height:900});
  await p.evaluateOnNewDocument(l => { try { localStorage.setItem('sortie_lang', l); } catch(e){} }, lang);
  if(avant) await avant(p);
  await p.goto(GUIDE, {waitUntil:'networkidle0'});
  // le guide se dessine en JavaScript APRÈS networkidle0 : on attend ce qu'on lit
  await p.waitForFunction(() => document.querySelectorAll('.card, .phase').length > 0, {timeout:15000});
  return {p, bruit};
}

console.log('\n— le guide en anglais —');

const {p, bruit} = await ouvre('en');
const vu = await p.evaluate(() => ({
  texte: document.body.innerText,
  titre: (document.getElementById('gTitre') || {}).textContent || '',
  cartes: document.querySelectorAll('.card').length,
  etapes: document.querySelectorAll('.phase').length,
  lignes: document.querySelectorAll('.line').length,
  lang: document.documentElement.getAttribute('lang')
}));

dit('la page se remplit', vu.etapes > 0 && vu.cartes > 0 && vu.lignes > 0,
    vu.etapes + ' étapes · ' + vu.cartes + ' cartes · ' + vu.lignes + ' lignes');
dit('rien ne casse', bruit.length === 0, bruit.join(' | '));
dit('la page se déclare en anglais', vu.lang === 'en', 'lang=' + vu.lang);

// Des libellés d'interface qui DOIVENT être passés en anglais.
const ATTENDUS = ['Run overview', 'All', 'Floor'];
ATTENDUS.forEach(function(mot){
  dit('« ' + mot +' » est traduit', vu.texte.indexOf(mot) >= 0);
});

// Et leur version française qui ne doit PLUS être là.
const INTERDITS = ["Vue d'ensemble du run", "N'afficher que mon rôle", 'Étage'];
INTERDITS.forEach(function(mot){
  dit('« ' + mot + ' » a bien disparu', vu.texte.indexOf(mot) < 0,
      'resté en français dans la page anglaise');
});

console.log('\n— la bascule revient au français —');

const fr = await ouvre('fr');
const vufr = await fr.p.evaluate(() => ({texte: document.body.innerText,
                                         lang: document.documentElement.getAttribute('lang')}));
dit('le français revient', vufr.texte.indexOf("Vue d'ensemble du run") >= 0 && vufr.lang === 'fr');
dit('rien ne casse non plus', fr.bruit.length === 0, fr.bruit.join(' | '));
await fr.p.close();

console.log('\n— i18n.js manquant : lisible, pas mort —');

/* La panne qu'aucun test ne voyait. On coupe le fichier de traductions et on
   rouvre EN ANGLAIS : la page doit rester lisible. Un guide en français est
   un guide dégradé ; une page blanche n'est plus un guide.

   Dans un contexte de navigation ISOLÉ, et ce n'est pas un détail : le service
   worker garde js/i18n.js et le sert sans passer par le réseau. Dans un
   contexte déjà visité il répondait à notre place, la coupure n'avait aucun
   effet, et ce bloc passait au vert sans rien prouver — il l'a fait, la
   première fois que je l'ai écrit. */
const ctx = await (b.createBrowserContext ? b.createBrowserContext()
                                          : b.createIncognitoBrowserContext());
const q = await ctx.newPage();
const bruitSans = [];
q.on('pageerror', e => bruitSans.push(String(e)));
await q.setViewport({width:1400, height:900});
await q.evaluateOnNewDocument(() => { try { localStorage.setItem('sortie_lang', 'en'); } catch(e){} });
await q.setRequestInterception(true);
q.on('request', r => (/\/i18n\.js(\?|$)/.test(r.url()) ? r.abort() : r.continue()));
await q.goto(GUIDE, {waitUntil:'networkidle0'});
/* On attend le CONTENU, pas 400 ms ni la seule présence des lignes : sous
   charge, les .line existent déjà que la strat n'est pas encore écrite dedans,
   et on mesurait 849 caractères. C'est la quantité de texte qui est le sujet
   de l'assertion — c'est donc elle qu'on attend. */
await q.waitForFunction(() => document.body.innerText.trim().length > 2000,
                        {timeout:15000}).catch(() => {});

const vus = await q.evaluate(() => ({
  TRabsent: (typeof TR === 'undefined'),
  enAnglais: (typeof LANG !== 'undefined') && LANG === 'en',
  etapes: document.querySelectorAll('.phase').length,
  lignes: document.querySelectorAll('.line').length,
  texte: document.body.innerText.trim().length
}));

/* On affirme la PRÉCONDITION avant d'en tirer quoi que ce soit : sans elle,
   les deux lignes suivantes ne mesurent rien. */
dit('i18n.js est bien absent de la page', vus.TRabsent,
    'TR est défini — le service worker l\'a servi, ce bloc ne prouverait rien');
dit('et la page est bien en anglais', vus.enAnglais, 'LANG n\'est pas « en »');
dit('le guide s\'affiche quand même', vus.etapes > 0 && vus.lignes > 0,
    vus.etapes + ' étapes · ' + vus.lignes + ' lignes');
dit('et il reste du texte à lire', vus.texte > 2000, vus.texte + ' caractères');
dit('sans une erreur de page', bruitSans.length === 0, bruitSans.join(' | '));
await q.close();
await ctx.close();

await p.close();
await b.close();
console.log(bilan() ? '' : '\nUn lead anglophone lit la même strat que les autres.');
process.exit(bilan() ? 1 : 0);
