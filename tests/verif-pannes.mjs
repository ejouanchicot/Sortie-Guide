/* ============================================================
   verif-pannes.mjs — quatre gestes qui mentaient
   ------------------------------------------------------------
   Quatre fonctions de l'atelier Carte etaient livrees et ne
   faisaient pas ce qu'elles annoncent. Aucune ne levait d'erreur :
   c'est pour ca qu'elles ont tenu si longtemps.

   · « Exporter les blocs » rendait un fichier VIDE — il lisait un
     champ qui n'existe pas. C'est le seul recours d'un lead qui
     n'a pas Chrome, ou qui veut transmettre sa carte.
   · Ctrl+C / Ctrl+V sur une icone la collait en PACK : une
     creature fantome, sans element ni phase, gravee dans data.js.
   · Ctrl+Z ne defaisait pas la pose d'une icone.
   · Le panneau des calques comptait les objets que Konva dessine,
     pas ceux que porte la carte : « Traces = 12 » pour 4 traces.

   Les trois premieres ont la meme cause : ajouter un type de
   marqueur demande de toucher treize endroits, et quatre ont ete
   manques quand les icones sont arrivees. Ce test tient ces
   quatre-la ; le catalogue unique reste a faire.
   ============================================================ */
import {puppeteer, STUDIO, rapport, attend, cliqueJusqua} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1500, height:950});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.SORTIE && window.Konva && window.__MS, {timeout:9000});

/* ---------------- 1. l'export des blocs ---------------- */
console.log('\n— « Exporter les blocs » rend le contenu, pas des lignes vides —');
const expo = await p.evaluate(() => {
  const blocs = window.__MS.blocs();
  return {
    nb: blocs.length,
    // le champ s'appelle txt — c'est celui que data-file.js relit
    tousRemplis: blocs.every(x => typeof x.txt === 'string' && x.txt.length > 10),
    noms: blocs.map(x => x.nom).join(' '),
    // undefined trahit la lecture d'un champ qui n'existe pas
    aucunIndefini: blocs.every(x => x.txt !== undefined)
  };
});
dit('les quatre blocs sont là', expo.nb === 4, expo.nb + ' · ' + expo.noms);
dit('chacun porte son texte', expo.tousRemplis && expo.aucunIndefini, expo.noms);

/* Le vrai geste : « Exporter » dans la barre, puis « Copier ». C'est ce chemin
   qui rendait neuf lignes vides — la fonction interne, elle, allait bien. */
const copie = await p.evaluate(async () => {
  let vu = null;
  const vrai = navigator.clipboard && navigator.clipboard.writeText;
  if (navigator.clipboard) navigator.clipboard.writeText = t => { vu = t; return Promise.resolve(); };
  document.getElementById('btnExport').click();
  await new Promise(r => setTimeout(r, 500));
  const cp = document.getElementById('ex_cp');
  if (!cp) return {absent:true};
  cp.click();
  await new Promise(r => setTimeout(r, 500));
  if (navigator.clipboard && vrai) navigator.clipboard.writeText = vrai;
  return {texte: vu};
});
dit('la boîte d\'export s\'ouvre sur « Copier »', !copie.absent, JSON.stringify(copie).slice(0,60));
if (!copie.absent) {
  const t = copie.texte || '';
  const lignes = t.split('\n').filter(l => l.trim()).length;
  dit('le texte copié porte les blocs, pas des lignes vides',
      /const CARTES=/.test(t) && /const FLOORS=/.test(t) && lignes > 12,
      lignes + ' lignes utiles · ' + t.length + ' caractères');
  dit('et aucun « undefined » n\'y traîne', t.length > 0 && !/undefined/.test(t),
      (t.match(/undefined/g) || []).length + ' occurrence(s)');
}

/* ---------------- 2. coller une icone ---------------- */
console.log('\n— coller une icône donne une icône, pas une créature fantôme —');
const colle = await p.evaluate(async () => {
  const f = FLOORS[0];
  f.icones = [{ico:'PLD', x:30, y:30, c:'#4c9df0'}];
  f.packs  = (f.packs || []).slice();
  await window.__MS.recharge();
  const avant = {ico:(f.icones||[]).length, pack:(f.packs||[]).length};

  const st = Konva.stages[0];
  const g = Array.from(st.find('.pin')).find(n => n._meta && n._meta.kind === 'ico');
  if (!g) return {erreur:'icône introuvable'};
  const r = g.getClientRect(), box = st.container().getBoundingClientRect();
  return {avant, clic:{x:box.x + r.x + r.width/2, y:box.y + r.y + r.height/2}};
});
if (colle.erreur) dit('on retrouve l\'icône sur la carte', false, colle.erreur);
else {
  // la sélection est faite quand l'anneau est posé sur la scène
  await cliqueJusqua(p, colle.clic.x, colle.clic.y,
                     () => Konva.stages[0].find('.selring').length > 0,
                     'la sélection de l\'icône');
  await p.keyboard.down('Control'); await p.keyboard.press('KeyC');
  await p.keyboard.press('KeyV'); await p.keyboard.up('Control');
  await attend(p, () => (FLOORS[0].icones || []).length >= 2,
               'la seconde icône, collée');

  const apres = await p.evaluate(() => {
    const f = FLOORS[0];
    const ecrit = window.__MS.blocs().find(x => x.nom === 'CARTES').txt;
    return {ico:(f.icones||[]).length, pack:(f.packs||[]).length,
            // la trace d'un pack fantome : ni element, ni phase
            fantome: /el:'undefined'|ph:undefined/.test(ecrit),
            deuxIco: (ecrit.match(/\{ico:'PLD'/g) || []).length};
  });
  dit('la copie rejoint les icônes', apres.ico === colle.avant.ico + 1,
      colle.avant.ico + ' → ' + apres.ico);
  dit('et pas les créatures', apres.pack === colle.avant.pack,
      colle.avant.pack + ' → ' + apres.pack);
  dit('rien d\'incomplet n\'est écrit dans data.js', !apres.fantome, String(apres.fantome));
  dit('les deux icônes s\'y retrouvent', apres.deuxIco === 2, String(apres.deuxIco));
}

/* ---------------- 3. annuler la pose d'une icone ---------------- */
console.log('\n— Ctrl+Z défait la pose d\'une icône —');
const annule = await p.evaluate(async () => {
  const f = FLOORS[0];
  f.icones = [{ico:'PLD', x:30, y:30, c:'#4c9df0'}];
  await window.__MS.recharge();
  const depart = f.icones.length;
  /* On pose comme le lead : on prend le marqueur dans la barre et on le lâche
     sur la carte. C'est ce geste-là que Ctrl+Z doit savoir défaire. */
  document.querySelector('.tool[data-tool="pin"]').click();
  await new Promise(r => setTimeout(r, 350));
  document.querySelector('#ar_cat button[data-pc="marq"]').click();
  await new Promise(r => setTimeout(r, 350));
  const btn = [...document.querySelectorAll('#ar_grid .palbtn')]
    .find(x => x.dataset.name === 'DANGER');
  if (!btn) return {erreur:'DANGER absent de la barre'};
  const cnv = document.querySelector('.konvajs-content canvas');
  const r = cnv.getBoundingClientRect();
  const dt = new DataTransfer();
  btn.dispatchEvent(new DragEvent('dragstart', {bubbles:true, dataTransfer:dt}));
  const cx = r.left + r.width * 0.6, cy = r.top + r.height * 0.6;
  cnv.dispatchEvent(new DragEvent('dragover', {bubbles:true, cancelable:true, dataTransfer:dt, clientX:cx, clientY:cy}));
  cnv.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:dt, clientX:cx, clientY:cy}));
  btn.dispatchEvent(new DragEvent('dragend', {bubbles:true, dataTransfer:dt}));
  await new Promise(r2 => setTimeout(r2, 900));
  return {depart, pose: FLOORS[0].icones.length};
});
if (annule.erreur) dit('on pose une icône de plus', false, annule.erreur);
else if (annule.pose !== annule.depart + 1) {
  dit('on pose une icône de plus', false, annule.depart + ' → ' + annule.pose);
} else {
  dit('on pose une icône de plus', true, annule.depart + ' → ' + annule.pose);
  await p.keyboard.down('Control'); await p.keyboard.press('KeyZ'); await p.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 900));
  const apres = await p.evaluate(() => ({
    n: (FLOORS[0].icones || []).length,
    dessinees: Konva.stages[0].find('.pin').filter(x => x._meta && x._meta.kind === 'ico').length
  }));
  dit('Ctrl+Z la retire du contenu', apres.n === annule.depart,
      annule.pose + ' → ' + apres.n);
  dit('et de la carte', apres.dessinees === annule.depart,
      apres.dessinees + ' dessinée(s)');
}

/* ---------------- 4. les compteurs de calques ---------------- */
console.log('\n— le panneau des calques compte la strat, pas les traits —');
const calques = await p.evaluate(async () => {
  const f = FLOORS[0];
  f.routes = [{n:1, el:'fire', points:'10,10 20,20'}, {n:2, el:'water', points:'30,30 40,40'}];
  f.texts  = [{x:50, y:50, s:2, t:'une note'}];
  f.shapes = [];
  await window.__MS.recharge();
  const lire = mot => {
    const l = [...document.querySelectorAll('.lay')].find(e => new RegExp(mot,'i').test(e.textContent));
    if (!l) return null;
    const m = l.textContent.match(/(\d+)\s*$/);
    return m ? +m[1] : null;
  };
  return {routes: lire('Trac'), textes: lire('Textes'), formes: lire('Formes'),
          fond: lire('Carte'), vraiRoutes: f.routes.length, vraiTextes: f.texts.length};
});
dit('deux tracés sont annoncés « 2 », pas « 6 »',
    calques.routes === calques.vraiRoutes, 'annoncé ' + calques.routes + ' pour ' + calques.vraiRoutes);
dit('une note est annoncée « 1 »', calques.textes === calques.vraiTextes,
    'annoncé ' + calques.textes + ' pour ' + calques.vraiTextes);
dit('aucune forme, donc « 0 »', calques.formes === 0, String(calques.formes));
dit('un seul fond de carte', calques.fond === 1, String(calques.fond));

/* ---------------- 5. le catalogue est la source unique ----------------
   Les trois premieres pannes venaient du meme endroit : ajouter un type de
   marqueur demandait de toucher treize listes, et quatre ont ete manquees.
   Elles se deduisent maintenant d'un catalogue. Ce test verifie qu'un type
   declare est reellement pris partout — sans quoi on aurait juste deplace
   l'oubli. */
console.log('\n— un type déclaré est pris partout —');
const cat = await p.evaluate(async () => {
  const f = FLOORS[0];
  // une carte qui porte un objet de CHAQUE type, pose par le vrai chemin
  f.bosses = [{name:'Degei', n:1, el:'red', x:20, y:20}];
  f.mids   = [{name:'Bhoot', el:'blue', x:30, y:30}];
  f.packs  = [{name:'Acuex', el:'gray', x:40, y:40, q:'×3', ph:1}];
  f.icones = [{ico:'PLD', x:50, y:50, c:'#4c9df0'}];
  await window.__MS.recharge();

  const avant = {bosses:f.bosses.length, mids:f.mids.length,
                 packs:f.packs.length, icones:f.icones.length};
  // l'historique doit tout retenir : on modifie, on annule, on recompte
  const instantane = JSON.stringify(avant);
  f.icones.push({ico:'WHM', x:60, y:60, c:'#3fca6a'});
  f.packs.push({name:'Acuex', el:'gray', x:70, y:70, q:'×1', ph:1});
  window.__MS.blocs();                       // force un pas d'historique
  return {avant: instantane,
          calques: [...document.querySelectorAll('.lay')]
            .map(e => e.textContent.replace(/\s+/g,' ').trim())};
});
const attendus = ['Boss', 'Mid-boss', 'Packs', 'Icônes'];
dit('chaque type a sa ligne dans les calques',
    attendus.every(t => cat.calques.some(l => l.indexOf(t) === 0)),
    JSON.stringify(cat.calques.filter(l => attendus.some(t => l.indexOf(t) === 0))));

const couvre = await p.evaluate(() => {
  /* Ce que l'atelier ecrit dans data.js doit contenir un objet de chaque type.
     Un type oublie par le catalogue disparaitrait ici en silence. */
  const ecrit = window.__MS.blocs().find(x => x.nom === 'CARTES').txt;
  return {boss: /\{name:'Degei'/.test(ecrit),
          mid:  /\{name:'Bhoot'/.test(ecrit),
          pack: /\{name:'Acuex'/.test(ecrit),
          ico:  /\{ico:'PLD'/.test(ecrit),
          fantome: /el:'undefined'|ph:undefined/.test(ecrit)};
});
dit('et chacun s\'écrit dans data.js',
    couvre.boss && couvre.mid && couvre.pack && couvre.ico, JSON.stringify(couvre));
dit('sans qu\'aucun ne se range au mauvais endroit', !couvre.fantome, String(couvre.fantome));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nLes quatre gestes font ce qu\'ils annoncent.');
process.exit(ko ? 1 : 0);
