/* ============================================================
   verif-roster.mjs — l'atelier ignore ce qu'on ecrit avec lui
   ------------------------------------------------------------
   Dix-huit noms de mobs de Sortie vivaient EN DUR dans l'atelier
   Carte : Degei, Skomora, Acuex… Preparer une strat pour un autre
   donjon obligeait donc a editer le moteur — dans un outil dont
   l'architecture dit qu'il ne connait aucun contenu.

   Ils sont maintenant portes par la CARTE, dans data.js : c'est
   elle qui sait quelles creatures on y rencontre.

   Ce qui compte ici :
   · une carte propose SON roster, et pas celui d'a cote ;
   · une carte qui n'en declare aucun reste utilisable — elle
     propose tout, plutot que rien ;
   · une creature non classee reste atteignable : c'est le filet,
     et il a deja servi ;
   · le roster survit a un enregistrement.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1500, height:950});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.SORTIE && window.Konva && window.__MS, {timeout:9000});

/* ---------------- le contenu porte son roster ---------------- */
console.log('\n— chaque carte dit ce qu\'on y rencontre —');
const contenu = await p.evaluate(() => {
  const noms = Object.keys(CARTES);
  return noms.map(n => ({carte:n, r:CARTES[n].roster || null}));
});
dit('les cartes livrées en déclarent un',
    contenu.every(c => c.r && c.r.boss && c.r.mid && c.r.pack),
    contenu.map(c => c.carte + ' : ' + (c.r ? Object.keys(c.r).join('/') : 'aucun')).join(' · '));
dit('et les deux étages ne proposent pas les mêmes boss',
    contenu.length > 1 && JSON.stringify(contenu[0].r.boss) !== JSON.stringify(contenu[1].r.boss),
    contenu.map(c => (c.r ? c.r.boss.join(',') : '—')).join(' | '));

/* ---------------- ce que la barre propose ---------------- */
async function proposes(cat){
  return await p.evaluate(c => {
    document.querySelector('.tool[data-tool="pin"]').click();
    const b = document.querySelector('#ar_cat button[data-pc="' + c + '"]');
    if(b) b.click();
    return [...document.querySelectorAll('#ar_grid .palbtn')].map(x => x.dataset.name);
  }, cat);
}
console.log('\n— la barre suit la carte ouverte —');
await new Promise(r => setTimeout(r, 500));
const bossHaut = await proposes('boss');
dit('au rez-de-chaussée, les boss du rez-de-chaussée',
    bossHaut.includes('Degei') && !bossHaut.includes('Dhartok'),
    bossHaut.join(' '));

// on passe au sous-sol par le vrai selecteur d'etage
const change = await p.evaluate(async () => {
  const sel = document.getElementById('carteSel') || document.getElementById('floorSel');
  if(!sel) return {non:'sélecteur introuvable'};
  const noms = Object.keys(CARTES);
  const cible = noms[1];
  const opt = [...sel.options].find(o => o.value === cible || o.textContent.trim() === cible);
  if(!opt) return {non:'carte du sous-sol absente du sélecteur', vus:[...sel.options].map(o=>o.value)};
  sel.value = opt.value; sel.dispatchEvent(new Event('change'));
  await new Promise(r => setTimeout(r, 1800));
  return {ok:true, carte:(FLOORS[window.__idx||1]||{}).carte};
});
if(change.non){
  dit('on peut passer à l\'autre carte', false, change.non + ' ' + JSON.stringify(change.vus || []));
}else{
  const bossBas = await proposes('boss');
  dit('au sous-sol, ceux du sous-sol',
      bossBas.includes('Dhartok') && !bossBas.includes('Degei'), bossBas.join(' '));
}

/* ---------------- une carte sans roster reste utilisable ---------------- */
console.log('\n— une carte qui ne déclare rien —');
const sans = await p.evaluate(async () => {
  const nom = Object.keys(CARTES)[0];
  const garde = CARTES[nom].roster;
  delete CARTES[nom].roster;
  await window.__MS.recharge();
  document.querySelector('.tool[data-tool="pin"]').click();
  await new Promise(r => setTimeout(r, 300));
  const b = document.querySelector('#ar_cat button[data-pc="boss"]');
  if(b) b.click();
  const vus = [...document.querySelectorAll('#ar_grid .palbtn')].map(x => x.dataset.name);
  CARTES[nom].roster = garde;
  return {vus, tousLesMobs: Object.keys(MOB).length};
});
dit('elle propose tout, plutôt que rien',
    sans.vus.length === sans.tousLesMobs && sans.vus.includes('Degei') && sans.vus.includes('Dhartok'),
    sans.vus.length + ' proposés sur ' + sans.tousLesMobs + ' créatures connues');

/* ---------------- une strat gardee avant le roster ----------------
   Le cas qui a coute une carte : la bibliotheque garde la strat telle
   qu'elle etait. Une strat gardee avant que les cartes declarent leur
   roster n'en a pas — et la rouvrir vidait les cartes du leur, puis
   l'enregistrement l'effacait de data.js. Sans un mot, puisqu'une carte
   sans roster propose simplement tout. */
console.log('\n— une strat gardée avant que les cartes déclarent leur roster —');
const reprise = await p.evaluate(() => {
  const s = window.__STUDIO.instantane();
  Object.keys(s.cartes).forEach(k => { delete s.cartes[k].roster; });   // comme avant
  const g = {COMPO:{}, ROLE:{}, BUFFS:{}, MOB:{}, TR:{}, FLOORS:[],
             CARTES: JSON.parse(JSON.stringify(CARTES))};               // les cartes livrées
  BIBLIO.versGlobaux(s, g, SORTIE.resoudreCartes);
  return Object.keys(g.CARTES).map(k =>
    k + ' : ' + (g.CARTES[k].roster ? g.CARTES[k].roster.boss.join(',') : 'PERDU'));
});
dit('la carte livrée lui rend le sien', reprise.every(x => !/PERDU$/.test(x)), reprise.join(' · '));
dit('et chacune retrouve le sien, pas celui d\'à côté',
    reprise.length > 1 && reprise[0] !== reprise[1], reprise.join(' · '));

/* ---------------- le filet des creatures non classees ---------------- */
console.log('\n— une créature que le roster ignore —');
const filet = await p.evaluate(async () => {
  const nom = Object.keys(CARTES)[0];
  MOB['Chose'] = 'img/mobs/mob-flan.webp';       // une image que rien ne classe
  await window.__MS.recharge();
  document.querySelector('.tool[data-tool="pin"]').click();
  await new Promise(r => setTimeout(r, 300));
  const lu = c => { const b = document.querySelector('#ar_cat button[data-pc="' + c + '"]');
    if(b) b.click();
    return [...document.querySelectorAll('#ar_grid .palbtn')].map(x => x.dataset.name); };
  const packs = lu('pack'), boss = lu('boss');
  delete MOB['Chose'];
  return {dansPacks: packs.includes('Chose'), dansBoss: boss.includes('Chose')};
});
dit('elle reste atteignable par les packs', filet.dansPacks, String(filet.dansPacks));
dit('et ne vient pas polluer les boss', !filet.dansBoss, String(filet.dansBoss));

/* ---------------- il survit a l'enregistrement ---------------- */
console.log('\n— ce que data.js en retient —');
const ecrit = await p.evaluate(() => {
  const txt = window.__MS.blocs().find(x => x.nom === 'CARTES').txt;
  return {aRoster: /roster:\{/.test(txt),
          degei: /"boss":\["Degei"/.test(txt),
          combien: (txt.match(/roster:\{/g) || []).length};
});
dit('le roster est réécrit avec la carte', ecrit.aRoster && ecrit.degei,
    ecrit.combien + ' roster(s) écrit(s)');

/* Un nom de fichier exporte ne doit plus commencer par « sortie- » : il vient
   de la carte, sinon un troisieme chapitre sortait en « sous-sol ». */
console.log('\n— le nom du fichier exporté —');
const nomExp = await p.evaluate(() => {
  document.getElementById('btnExport').click();
  return new Promise(r => setTimeout(() => {
    let vu = null;
    const a = document.createElement('a');
    const vrai = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function(){ if(this.download) vu = this.download; };
    const dl = document.getElementById('ex_dl');
    if(dl) dl.click();
    HTMLAnchorElement.prototype.click = vrai;
    r(vu);
  }, 600));
});
dit('il vient du nom de la carte',
    !!nomExp && !/^sortie-/.test(nomExp) && /\.txt$|\.js$|\.png$|\.webp$|\.jpg$/.test(nomExp),
    String(nomExp));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nC\'est la carte qui dit ce qu\'on y rencontre.');
process.exit(ko ? 1 : 0);
