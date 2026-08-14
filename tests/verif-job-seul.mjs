/* ============================================================
   verif-job-seul.mjs — un job ecrit, un badge, tout de suite
   ------------------------------------------------------------
   On ecrit une ligne dans l'ordre ou on la dit : le job, puis
   l'action. Entre les deux — le temps de taper « PLD », ou de
   cliquer son bouton dans la barre — la ligne n'est encore QUE
   le job. Elle partait alors en titre de rubrique, c'est-a-dire
   un disque de couleur avec le mot a cote :

       ● PLD          au lieu de     [PLD]

   On ecrivait un job pour avoir son badge, on obtenait une puce.
   Et le geste laissait une rubrique vide dans data.js.

   On mesure sur le RENDU : le badge est un .role, la puce est le
   disque que .glabel::before dessine devant un titre.
   ============================================================ */
import {puppeteer, STUDIO, rapport} from './navigateur.mjs';

const {dit, bilan} = rapport();
const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const bruit = [];
const p = await b.newPage();
p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:900, height:800});
await p.goto(STUDIO, {waitUntil:'networkidle0'});
await p.waitForFunction(() => window.STRATCORE && window.STRATR, {timeout:9000});

const lu = await p.evaluate(() => {
  const rend = src => {
    const bloc = STRATCORE.textToBloc(src);
    const h = document.createElement('div');
    h.style.cssText = 'position:fixed;left:0;top:0;width:860px;z-index:9999';
    h.innerHTML = STRATR.cardHtml({kind:'pack', klabel:'FARM', name:'Essai', tag:'',
                                   noHeadImg:true, groups:bloc.groups}, {n:1}, FLOORS[0], {});
    document.body.appendChild(h);
    const out = {
      badges: [...h.querySelectorAll('.line')].map(d => [...d.querySelectorAll('.role')].map(e => e.textContent.trim()).join('+')),
      // un titre de rubrique se reconnait au disque que le CSS pose devant lui
      disques: [...h.querySelectorAll('.glabel')].filter(e => e.textContent.trim())
                 .map(e => e.textContent.trim()),
      groupes: bloc.groups.map(g => ({label:g.label, boite:!!g.boite, lignes:(g.lines||[]).length})),
      retour: STRATCORE.blocToText(bloc), src,
      // relire ce qu'on vient d'ecrire ne doit plus rien changer
      stable: STRATCORE.blocToText(STRATCORE.textToBloc(STRATCORE.blocToText(bloc)))
    };
    h.remove();
    return out;
  };
  return {
    pld:    rend('TANKBOX\nPLD : tank sur place\nPLD'),
    all:    rend('TANKBOX\nPLD : tank sur place\nALL'),
    deuxPt: rend('TANKBOX\nPLD : tank sur place\nALL :'),
    pldAll: rend('TANKBOX\nPLD : tank sur place\nPLD,ALL :'),
    // et une VRAIE rubrique doit rester une rubrique
    titre:  rend('Buffs · COR · GEO\nCOR : Chaos Roll'),
    regle:  rend('Regle\nALL : ne jamais fermer de SC Light')
  };
});

const cas = [['PLD', lu.pld, 'PLD'], ['ALL', lu.all, 'ALL'],
             ['ALL :', lu.deuxPt, 'ALL'], ['PLD,ALL :', lu.pldAll, 'PLD+ALL']];

for(const [ecrit, r, attendu] of cas){
  console.log('\n— on ecrit « ' + ecrit +' » seul sur une ligne —');
  dit('ca fait une ligne de plus, pas une rubrique', r.badges.length === 2,
      'badges ' + JSON.stringify(r.badges) + ' · rubriques ' + JSON.stringify(r.disques));
  dit('elle porte le badge ' + attendu, r.badges[1] === attendu, JSON.stringify(r.badges));
  dit('aucune puce ne s\'est posee a la place',
      r.disques.length === 0, JSON.stringify(r.disques));
  dit('et rien de vide ne reste dans les donnees',
      r.groupes.every(g => g.boite || g.label || g.lignes), JSON.stringify(r.groupes));
  // « PLD » se range en « PLD : », la forme que pose deja le bouton de la barre.
  // Ce qui compte est qu'elle ne bouge plus ensuite : rouvrir n'abime rien.
  dit('la ligne se range sous sa forme habituelle',
      r.retour.split('\n').pop() === attendu.replace(/\+/g, ',') + ' :', JSON.stringify(r.retour));
  dit('et rouvrir le texte ne le change plus', r.stable === r.retour, JSON.stringify(r.stable));
}

console.log('\n— une vraie rubrique reste une rubrique —');
dit('un titre ecrit en toutes lettres garde sa puce',
    lu.titre.disques.length === 1 && /Buffs/.test(lu.titre.disques[0]),
    JSON.stringify(lu.titre.disques));
dit('« Regle » aussi', lu.regle.disques.length === 1, JSON.stringify(lu.regle.disques));
dit('et sa ligne garde son badge', lu.regle.badges.join() === 'ALL', JSON.stringify(lu.regle.badges));

console.log('\n— le run entier ne titre plus aucune rubrique d\'un code de job —');
const restes = await p.evaluate(() => {
  const jobs = ['MNK','BRD','COR','GEO','RDM','PLD','DNC','WHM','WAR','RUN','SAM','NIN','THF',
                'DRK','BLM','SMN','BLU','PUP','DRG','BST','RNG','SCH','ALL'];
  const out = [];
  FLOORS.forEach(f => (f.phases||[]).forEach(ph => (ph.cards||[]).forEach(c =>
    (c.groups||[]).forEach(g => {
      const t = String(g.label||'').replace(/\s*[:—–]\s*$/,'').trim();
      if(t && t.split(/[,\/+]/).every(x => jobs.includes(x.trim().toUpperCase()))) out.push(t);
    }))));
  return out;
});
dit('aucune ne se relirait en ligne vide', restes.length === 0, JSON.stringify(restes));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nOn tape le job, le badge est la avant la phrase.');
process.exit(ko ? 1 : 0);
