/* ============================================================
   verif-puce.mjs — la Puce survit-elle au trajet atelier → guide ?
   ------------------------------------------------------------
   La Puce, c'est une annotation posee sur la carte qui prend la
   forme d'une pastille ronde : un numero d'ordre, une lettre, un
   mot. Elle n'est pas un objet a part — c'est un TEXTE a qui on
   coche « Puce ». Ce choix est econome (rien de nouveau dans
   data.js) mais il la rend fragile : elle traverse trois codes
   ecrits separement, et personne ne la gardait.

     le socle    ecrit  sh:'pill'  dans data.js
     l'atelier   la dessine avec Konva
     le guide    la dessine en SVG

   Les deux dessins sont volontairement independants — backends
   incompatibles. Ce qu'on verifie ici, c'est donc qu'ils disent
   la MEME chose du meme objet, et qu'un texte ordinaire ne
   devienne jamais un disque par accident.
   ============================================================ */
import {puppeteer, STUDIO, GUIDE, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];

/* ---------------- l'atelier : le geste ---------------- */
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1600, height:1000});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.__MS && window.Konva && Konva.stages.length, {timeout:8000});

const centre = await p.$eval('#stage', el => {
  const r = el.getBoundingClientRect(); return {x:r.x + r.width/2, y:r.y + r.height/2}; });

// poser un texte : outil Texte, clic sur la carte, on ecrit dedans
async function poser(dx, mot) {
  await p.click('[data-tool="text"]');
  await p.mouse.click(centre.x + dx, centre.y);
  await p.waitForSelector('#mped_pill', {timeout:4000});
  await p.evaluate(t => { const ed = document.getElementById('mped');
    ed.focus(); ed.textContent = t;
    ed.dispatchEvent(new InputEvent('input', {bubbles:true})); }, mot);
  await new Promise(r => setTimeout(r, 300));
}

// une annotation ordinaire d'abord — c'est elle qui ne doit PAS devenir ronde
await poser(-220, 'on passe par la');
await p.keyboard.press('Escape');
await new Promise(r => setTimeout(r, 200));

// puis la Puce, comme un lead qui numerote un boss
await poser(0, '3');

// ce que Konva dessine vraiment, pas ce qu'on croit lui avoir demande
const dessin = () => p.evaluate(() => {
  const g = Konva.stages[0].find('.text').slice(-1)[0];
  if (!g) return null;
  const bg = g.getChildren().find(n => n.getClassName() === 'Rect');
  const o  = g._meta && g._meta.o;
  return {visible:bg.visible(), w:bg.width(), h:bg.height(),
          rayon:bg.cornerRadius(), fond:bg.fill(), couleur:o && o.c, forme:o && o.sh};
});

console.log('\n— le geste, dans l\'atelier —');
/* C'etait « dit('…', true) » : une condition litterale, qui ne peut pas
   rougir. La garantie tenait en realite au waitForSelector('#mped_pill') de
   poser(), vingt lignes plus haut — donc la promesse n'etait pas fausse, mais
   la ligne qui l'affichait ne mesurait rien et le rapport la comptait comme un
   « ok ». On regarde la case elle-meme : presente, utilisable, et pas encore
   cochee sur un texte ordinaire. */
const casePuce = await p.evaluate(() => {
  const c = document.getElementById('mped_pill');
  if(!c) return null;
  const r = c.getBoundingClientRect();
  return {type:c.type, coche:!!c.checked, visible:r.width > 0 && r.height > 0,
          desactivee:!!c.disabled};
});
dit('editer un texte propose de le passer en Puce',
    !!casePuce && casePuce.type === 'checkbox' && casePuce.visible && !casePuce.desactivee,
    JSON.stringify(casePuce));
dit('  et elle n\'est pas cochee sur un texte ordinaire',
    !!casePuce && !casePuce.coche, JSON.stringify(casePuce));

const avant = await dessin();
dit('un texte ordinaire n\'a pas de disque', !avant.visible && avant.rayon < avant.w / 4,
    `visible=${avant.visible} rayon=${avant.rayon}`);

await p.click('#mped_pill');
await new Promise(r => setTimeout(r, 300));
const apres = await dessin();

dit('cocher « Puce » dessine un disque',
    Math.abs(apres.w - apres.h) < 0.2 && Math.abs(apres.rayon - apres.w / 2) < 0.2,
    `${apres.w} x ${apres.h}, rayon ${apres.rayon}`);
dit('le disque se voit sans avoir a cocher « Fond »', apres.visible === true);
// un disque blanc sur une carte claire ne se verrait pas : le blanc par defaut doit ceder
dit('le blanc par defaut laisse la place a une couleur visible',
    (apres.couleur || '').toLowerCase() !== '#ffffff', 'couleur du disque : ' + apres.couleur);
dit('le disque porte bien cette couleur', apres.fond === apres.couleur,
    `disque ${apres.fond} / objet ${apres.couleur}`);

// et on doit pouvoir revenir en arriere
await p.click('#mped_pill');
await new Promise(r => setTimeout(r, 300));
const retour = await dessin();
dit('decocher la rend a un texte ordinaire', !retour.forme && !retour.visible,
    `forme=${retour.forme} fond visible=${retour.visible}`);

// on la remet pour la suite
await p.click('#mped_pill');
await new Promise(r => setTimeout(r, 300));
const puce = await dessin();

/* ---------------- ce qui part dans data.js ---------------- */
console.log('\n— ce qui s\'enregistre —');
const ecrit = await p.evaluate(() => {
  const blocs = window.__MS.blocs();
  const lignes = blocs.flatMap(x => String(x.txt).split('\n'));
  return {pill: lignes.filter(l => l.includes("sh:'pill'")),
          textes: lignes.filter(l => /^\s*\{x:[\d.]+,y:[\d.]+, t:'/.test(l))};
});
dit('la Puce laisse une trace dans data.js', ecrit.pill.length === 1,
    ecrit.pill.join(' | ') || '(aucune)');
dit('elle s\'ecrit sur la meme ligne qu\'un texte, sans bloc en plus',
    ecrit.pill.every(l => /^\s*\{x:[\d.]+,y:[\d.]+, t:'/.test(l)), ecrit.pill.join(' | '));
dit('les textes ordinaires ne deviennent pas des Puces',
    ecrit.textes.length > ecrit.pill.length,
    `${ecrit.textes.length} textes dont ${ecrit.pill.length} Puce(s)`);

/* ---------------- le guide : l'autre dessin ---------------- */
console.log('\n— le meme objet, dessine par le guide —');
const objet = await p.evaluate(() => {
  const g = Konva.stages[0].find('.text').slice(-1)[0];
  return JSON.parse(JSON.stringify(g._meta.o));
});

const g2 = await b.newPage();
g2.on('pageerror', e => bruit.push(String(e)));
await g2.goto(GUIDE, {waitUntil:'networkidle0'});
const svg = await g2.evaluate(o => {
  const avec = txtSvg(o);
  const sans = txtSvg(Object.assign({}, o, {sh:undefined}));
  const m = avec.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"[^>]*fill:([^;"]+)/);
  return {cercle: !!m, cx: m && +m[1], cy: m && +m[2], r: m && +m[3], fill: m && m[4],
          sansCercle: !/<circle/.test(sans), texteRendu: /<text /.test(avec)};
}, objet);

dit('le guide la dessine en rond', svg.cercle);
dit('centree la ou on l\'a posee',
    Math.abs(svg.cx - objet.x) < 0.01 && Math.abs(svg.cy - objet.y) < 0.01,
    `${svg.cx},${svg.cy} au lieu de ${objet.x},${objet.y}`);
dit('de la couleur choisie dans l\'atelier', svg.fill === objet.c,
    `${svg.fill} au lieu de ${objet.c}`);
dit('avec son texte par-dessus', svg.texteRendu);
dit('un texte sans « Puce » reste un texte', svg.sansCercle);

// Les deux moteurs mesurent le texte autrement (Konva le mesure vraiment, le
// guide l'estime). On ne compare donc pas au pixel : on verifie qu'aucun des
// deux ne part dans un ordre de grandeur different de l'autre.
const dAtelier = puce.w / 1024 * 100;          // Konva travaille en px sur 1024
const dGuide   = svg.r * 2;                    // le guide en % de carte
const ecart    = Math.abs(dAtelier - dGuide) / Math.max(dAtelier, dGuide);
dit('les deux dessins sont de la meme taille a 25 % pres', ecart < 0.25,
    `atelier ${dAtelier.toFixed(2)} % / guide ${dGuide.toFixed(2)} % — ecart ${(ecart*100).toFixed(0)} %`);
console.log(`       atelier ${dAtelier.toFixed(2)} % · guide ${dGuide.toFixed(2)} % de la carte`);
// une pastille doit contenir ce qu'on y ecrit
dit('assez grande pour le texte qu\'elle porte', svg.r * 2 > (objet.s || 1.5),
    `diametre ${(svg.r*2).toFixed(2)} pour un texte de ${objet.s}`);

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLa Puce se pose, s\'enregistre, et se retrouve pareille dans le guide.');
process.exit(ko ? 1 : 0);
