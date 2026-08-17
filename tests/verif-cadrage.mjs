/* Une carte doit TOUJOURS se voir en arrivant dessus.

   Chaque carte retient son zoom et son cadrage, pour qu'un enregistrement — qui
   peut faire recharger la page — ne fasse pas reperdre la place ou on
   travaillait. Mais un cadrage retenu peut ne plus rien valoir :

   · la scene n'est mesurable que VISIBLE. L'atelier qui ouvre sur l'onglet
     Strategie fait naitre la carte dans un panneau masque : elle mesure 0, et
     le cadrage calcule la-dessus vaut un zoom de 0,1 %. Retenu puis rapplique,
     il donnait une carte « qui ne charge plus » — elle etait la, grande comme
     un point ;
   · un cadrage peut aussi laisser la carte entierement hors de l'ecran, apres
     un redimensionnement ou en venant d'un autre poste.

   Dans les deux cas on recadre sur la carte entiere, plutot que d'ouvrir sur
   du vide. */
import {puppeteer, carteDessinee} from './navigateur.mjs';
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.setViewport({width:1500, height:1000});
/* Ce test affirme que RIEN n'est retenu tant qu'on n'a pas vu la carte. Il
   partait donc du principe que « studio_vues » est vide au départ — vrai quand
   il tourne seul, faux quand un autre test a déjà écrit un cadrage dans le même
   profil de navigateur. Un rouge sur trois passages, sans qu'aucune panne
   existe : c'est une dépendance à l'ORDRE, pas un défaut de l'outil. On part
   d'une ardoise propre. */
/* UNE SEULE FOIS : evaluateOnNewDocument rejoue à chaque navigation, et ce
   test recharge exprès pour vérifier qu'un cadrage est RETENU. L'effacer à
   chaque fois lui retirerait son sujet. */
await p.evaluateOnNewDocument(() => {
  try{
    if(!sessionStorage.getItem('__ardoise')){
      localStorage.removeItem('studio_vues');
      sessionStorage.setItem('__ardoise','1');
    }
  }catch(e){}
});
const ouvre = async () => {
  await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>window.__MS && window.__STUDIO,{timeout:9000});
  await carteDessinee(p);
};
// la carte se voit-elle vraiment ? on mesure le FOND a l'ecran
const largeurDuFond = () => p.evaluate(()=>{
  const f = Konva.stages[0].find('Image')[0];
  return f ? Math.round(f.getClientRect().width) : 0;
});

console.log('\n— l\'atelier ouvre sur la Stratégie : la carte naît masquée —');
await ouvre();
await p.evaluate(()=>{ localStorage.setItem('studio_atelier','strat');
                       localStorage.removeItem('studio_vues'); });
await ouvre();
const masquee = await p.evaluate(()=>({
  onglet: window.__STUDIO.actif(),
  largeurScene: document.getElementById('stage').clientWidth,
  retenu: localStorage.getItem('studio_vues')
}));
dit('on démarre bien avec la carte masquée',
    masquee.onglet === 'strat' && masquee.largeurScene === 0, JSON.stringify(masquee));
dit('rien n\'est retenu tant qu\'on ne voit rien', !masquee.retenu, String(masquee.retenu));

await p.click('#stTabMap');
/* Changer d'onglet ne redessine pas : la promesse de __MS.pret() est celle du
   rendu PRÉCÉDENT, déjà résolue, et l'attendre ne laisse rien se passer. Ce
   qu'on attend ici, c'est que la scène reprenne sa taille — le panneau était
   masqué, donc large de zéro. C'est exactement ce que la ligne suivante mesure. */
await p.waitForFunction(() => {
  const f = Konva.stages[0] && Konva.stages[0].find('Image')[0];
  return !!f && f.getClientRect().width > 300;
}, {timeout:15000}).catch(() => {});   // l'assertion suivante reste le juge
dit('en arrivant sur la carte, elle se voit', (await largeurDuFond()) > 300,
    (await largeurDuFond()) + ' px de large');

console.log('\n— un cadrage retenu qui ne vaut plus rien —');
for(const [quoi, vue] of [
  ['un zoom de 0,1 %',        {s:0.0009765625, x:0, y:0}],
  ['un zoom hors des bornes', {s:42, x:0, y:0}],
  ['une carte hors écran',    {s:0.8, x:-9000, y:-9000}]
]){
  await p.evaluate(v=>{
    const nom = Object.keys(CARTES)[0];
    localStorage.setItem('studio_vues', JSON.stringify({[nom]: v}));
    localStorage.setItem('studio_atelier','map');
  }, vue);
  await ouvre();
  dit(quoi + ' → on recadre sur la carte entière', (await largeurDuFond()) > 300,
      (await largeurDuFond()) + ' px de large');
}

console.log('\n— mais un cadrage normal est bien repris —');
await p.evaluate(()=>{
  const nom = Object.keys(CARTES)[0];
  localStorage.setItem('studio_vues', JSON.stringify({[nom]:{s:2.2, x:-200, y:-150}}));
  localStorage.setItem('studio_atelier','map');
});
await ouvre();
const zoom = await p.evaluate(()=>Konva.stages[0].scaleX());
dit('le zoom qu\'on avait pris est retrouvé', Math.abs(zoom - 2.2) < 0.01, String(zoom));

dit('rien n\'a cassé', bruit.length===0, bruit.slice(0,3).join('\n       '));
await b.close();
console.log(ko ? '\nUne carte peut encore s\'ouvrir sur du vide.'
               : '\nUne carte s\'ouvre toujours sur quelque chose.');
process.exit(ko ? 1 : 0);
