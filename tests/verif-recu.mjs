/* ============================================================
   verif-recu.mjs — ouvrir la strat d'un inconnu
   ------------------------------------------------------------
   Un export HTML est AUSSI le fichier de sauvegarde : il circule
   sur Discord, et le Studio le relit. Une strat ouverte par un
   lead a donc pu etre ecrite par n'importe qui.

   Une douzaine de champs — l'intro d'un chapitre, un secteur, les
   roles d'une ligne, la couleur d'un trace, le chemin d'une
   vignette — arrivaient jusqu'a la page sans etre echappes. On y
   logeait « <img src=x onerror=…> » et le code partait :
   · chez celui qui DOUBLE-CLIQUE le guide recu, sans un clic ;
   · chez le lead qui l'IMPORTE, avec acces a toute sa
     bibliotheque et a l'ecriture de son data.js.

   Ce test remplit chaque champ d'une charge qui, si elle
   s'execute, leve un temoin. Aucun temoin ne doit se lever, et la
   strat doit rester lisible : on echappe, on ne supprime pas.

   Le piege a retenir : esc() ne touche pas au guillemet. Ecrit
   DANS un attribut, il laisse sortir n'importe quelle valeur.
   Dans un attribut, c'est escAttr.
   ============================================================ */
import {puppeteer, RACINE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];

/* La charge : trois formes d'evasion, selon l'endroit ou le champ tombe.
   `TEMOIN` est le nom de la variable qu'un code execute poserait. */
const CHARGE = '<img src=x onerror="window.__PWN=1">';
const CHARGE_ATTR = 'x" onmouseover="window.__PWN=1" data-z="';
const CHARGE_STYLE = 'red;x:expression(window.__PWN=1)';

const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1400, height:1000});
await p.goto(RACINE + '/index.html', {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.SORTIE && typeof renderFloor === 'function', {timeout:9000});

/* ---------------- le socle ---------------- */
console.log('\n— ce que le socle sait refuser —');
const socle = await p.evaluate((C, CA) => {
  const S = window.SORTIE;
  return {
    escGarde: S.esc('a<b>"c'),
    attrGarde: S.escAttr('a<b>"c'),
    coulBonne: S.couleurSure('#4c9df0', '#000'),
    coulRgb: S.couleurSure('rgb(12, 34, 56)', '#000'),
    coulJeton: S.couleurSure('var(--e-fire)', '#000'),
    coulSale: S.couleurSure('red;x:expression(1)', '#000'),
    coulGuillemet: S.couleurSure('#fff" onload="x', '#000'),
    nbBon: S.nombreSur('12.5', 0),
    nbSale: S.nombreSur('12" onload="x', 0),
    nbVide: S.nombreSur(undefined, 7),
    // l'intro garde sa mise en forme mais perd tout le reste
    htmlGarde: S.htmlSur('<p>reste <b>gras</b></p>'),
    htmlClasse: S.htmlSur('<p class="ovi-tip">astuce</p>'),
    htmlScript: S.htmlSur('<p>avant<script>window.__PWN=1<\/script>après</p>'),
    htmlEvent: S.htmlSur('<p onclick="window.__PWN=1">texte</p>'),
    htmlImg: S.htmlSur('bonjour' + C),
    htmlDiv: S.htmlSur('<div>le texte reste</div>')
  };
}, CHARGE, CHARGE_ATTR);

dit('esc protège les chevrons', socle.escGarde === 'a&lt;b&gt;"c', socle.escGarde);
dit('escAttr protège AUSSI le guillemet', socle.attrGarde === 'a&lt;b&gt;&quot;c', socle.attrGarde);
dit('une vraie couleur passe', socle.coulBonne === '#4c9df0' && socle.coulRgb === 'rgb(12, 34, 56)',
    socle.coulBonne + ' · ' + socle.coulRgb);
dit('un jeton du guide aussi', socle.coulJeton === 'var(--e-fire)', socle.coulJeton);
dit('une couleur bricolée retombe sur le repli',
    socle.coulSale === '#000' && socle.coulGuillemet === '#000',
    socle.coulSale + ' · ' + socle.coulGuillemet);
dit('un nombre reste un nombre', socle.nbBon === 12.5 && socle.nbSale === 12 && socle.nbVide === 7,
    [socle.nbBon, socle.nbSale, socle.nbVide].join(' · '));

console.log('\n— l\'intro garde sa mise en forme, et rien d\'autre —');
dit('le gras et les paragraphes restent', /<p>reste <b>gras<\/b><\/p>/.test(socle.htmlGarde), socle.htmlGarde);
dit('la classe d\'astuce reste', /class="ovi-tip"/.test(socle.htmlClasse), socle.htmlClasse);
dit('un script part, le texte autour reste',
    !/script/i.test(socle.htmlScript) && /avant/.test(socle.htmlScript) && /après/.test(socle.htmlScript),
    socle.htmlScript);
dit('un gestionnaire d\'événement part', !/onclick/i.test(socle.htmlEvent) && /texte/.test(socle.htmlEvent),
    socle.htmlEvent);
dit('une image injectée part', !/<img/i.test(socle.htmlImg) && /bonjour/.test(socle.htmlImg), socle.htmlImg);
dit('une balise inconnue est déballée, son texte reste',
    !/<div/i.test(socle.htmlDiv) && /le texte reste/.test(socle.htmlDiv), socle.htmlDiv);

/* ---------------- le guide, avec une strat piegee ---------------- */
console.log('\n— une strat piégée, rendue dans le guide —');
const vu = await p.evaluate((C, CA, CS) => {
  delete window.__PWN;
  const f = FLOORS[0];
  // chaque champ que l'auteur d'une strat controle
  f.introFr = '<p>Intro <b>normale</b></p>' + C;
  f.introEn = f.introFr;
  f.sub = C;
  f.map = CA;
  f.icones = [{ico:'DANGER', x:'20" onload="window.__PWN=1', y:30, c:CS, label:C}];
  f.shapes = [{k:'rect', x:40, y:40, w:'10" onload="window.__PWN=1', h:10, c:CS},
              {k:'img', x:60, y:40, w:10, h:10, src:CA}];
  f.routes = [{n:1, el:'fire', c1:CS, points:CA, a:1, fs:1}];
  f.texts  = [{x:50, y:70, s:2, c:CS, t:C}];
  if(f.phases && f.phases[0]) f.phases[0].sector = C;
  if(f.packs && f.packs[0]) { f.packs[0].name = C; MOB[C] = CA; }
  renderFloor(f);
  /* On cherche un vrai ATTRIBUT, pas une chaine dans le HTML : du texte
     correctement echappe contient « onerror="… » lui aussi, puisqu'il l'affiche.
     Ce qui compte est qu'aucun element ne le PORTE. */
  const porteurs = [...document.querySelectorAll('*')].filter(el =>
    [...el.attributes].some(a => /^on/i.test(a.name) && /__PWN/.test(a.value)));
  return {
    pwn: !!window.__PWN,
    // la charge doit apparaitre ECHAPPEE, pas interpretee
    scriptVivant: !!document.querySelector('.ovintro img, .ovintro script'),
    porteurs: porteurs.length,
    ou: porteurs.slice(0,2).map(el => el.tagName + '.' + el.className).join(' '),
    // et la strat reste lisible
    introLisible: /Intro/.test(document.querySelector('.ovintro')?.textContent || ''),
    grasGarde: !!document.querySelector('.ovintro b'),
    cartes: document.querySelectorAll('.card').length
  };
}, CHARGE, CHARGE_ATTR, CHARGE_STYLE);

dit('rien ne s\'exécute à l\'ouverture', vu.pwn === false, 'témoin levé : ' + vu.pwn);
dit('la charge n\'est pas devenue une balise', !vu.scriptVivant, String(vu.scriptVivant));
dit('aucun élément ne porte de gestionnaire injecté', vu.porteurs === 0,
    vu.porteurs + ' porteur(s) : ' + vu.ou);
dit('et la strat reste lisible', vu.introLisible && vu.grasGarde && vu.cartes > 0,
    vu.cartes + ' cartes · gras ' + vu.grasGarde);

/* ---------------- la ligne de strat, partagee guide + atelier ---------------- */
console.log('\n— la ligne de strat, le rendu partagé —');
const ligne = await p.evaluate((C, CA) => {
  delete window.__PWN;
  const html = STRATR.lineHtml({r:[CA], comp:CA, t:'faire quelque chose'}, {});
  const d = document.createElement('div');
  d.innerHTML = html;
  document.body.appendChild(d);
  const el = d.querySelector('.line');
  const res = {
    pwn: !!window.__PWN,
    // l'attribut doit contenir la charge ENTIERE, pas s'etre fait couper en deux
    rEntier: (el && el.getAttribute('data-r')) === CA,
    pasDAutreAttr: el ? !el.hasAttribute('onmouseover') && !el.hasAttribute('data-z') : false,
    texte: el ? el.textContent.indexOf('faire quelque chose') >= 0 : false
  };
  d.remove();
  return res;
}, CHARGE, CHARGE_ATTR);
dit('la charge reste dans l\'attribut, entière', ligne.rEntier, String(ligne.rEntier));
dit('elle n\'a pas créé d\'attribut au passage', ligne.pasDAutreAttr, String(ligne.pasDAutreAttr));
dit('et la ligne se lit toujours', ligne.texte && !ligne.pwn, String(ligne.texte));

/* ---------------- le meme fichier, importe dans l'atelier ---------------- */
console.log('\n— la même strat, importée dans le Studio —');
const st = await b.newPage();
const bruitS = [];
st.on('pageerror', e => bruitS.push(String(e)));
await st.setViewport({width:1500, height:950});
await st.goto(RACINE + '/tools/studio.html', {waitUntil:'networkidle0'});
await st.waitForFunction(() => window.SORTIE && window.Konva && window.__MS, {timeout:9000});

const atelier = await st.evaluate(async (C, CA, CS) => {
  delete window.__PWN;
  const nom = Object.keys(CARTES)[0];
  CARTES[nom].icones = [{ico:'DANGER', x:30, y:30, c:CS, label:C}];
  CARTES[nom].routes = [{n:1, el:'fire', c1:CS, points:'10,10 20,20'}];
  window.__MS.recharge();
  await new Promise(r => setTimeout(r, 1600));
  // on ouvre le panneau des traces : c'est lui qui peignait la couleur recue
  const st2 = Konva.stages[0];
  return {pwn: !!window.__PWN,
          blocs: window.__MS.blocs().map(x => x.txt).join('').length,
          dessine: st2.find('.pin').length > 0};
}, CHARGE, CHARGE_ATTR, CHARGE_STYLE);
dit('rien ne s\'exécute à l\'import', atelier.pwn === false, String(atelier.pwn));
dit('et l\'atelier dessine quand même la carte', atelier.dessine && atelier.blocs > 100,
    atelier.blocs + ' caractères de blocs');

dit('rien ne casse', bruit.length === 0 && bruitS.length === 0,
    bruit.concat(bruitS).slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nUne strat recue s\'affiche, et rien d\'autre ne se passe.');
process.exit(ko ? 1 : 0);
