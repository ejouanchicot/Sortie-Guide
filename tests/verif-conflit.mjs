/* Deux versions d'une strat ne s'ecrasent plus en silence.

   Elle vit a DEUX endroits : `js/data.js` dans le depot, et l'espace de travail
   du navigateur. L'atelier repartait toujours du second, sans un mot. Tant
   qu'on est seul a ecrire, ils se suivent — mais le fichier peut bouger sans
   l'atelier (git, une correction a la main, un rechargement automatique qui
   repart d'une version d'avant), et l'un ecrasait l'autre.

   Ce qui compte ici, et dans cet ordre :
   · le cas NORMAL ne pose aucune question — y compris avec du travail non
     publie, qui est justement l'etat de tous les jours. Une question qui se
     pose a tort est pire que pas de question : on apprend a repondre sans lire ;
   · quand le fichier a vraiment change ailleurs, on demande ;
   · et quoi qu'on reponde, on ne redemande pas a l'ouverture suivante. */
import {puppeteer} from './navigateur.mjs';
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.setViewport({width:1500, height:950});

const ouvre = async () => {
  await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>window.__MS && window.__STUDIO,{timeout:9000});
  await new Promise(r=>setTimeout(r,1800));
};
// la modale est-elle posee, et que demande-t-elle ?
const question = () => p.evaluate(()=>{
  const m = document.getElementById('ssModal');
  return (m && !m.hidden) ? {titre:document.getElementById('ssModalTtl').textContent,
                             oui:document.getElementById('ssModalYes').textContent,
                             non:document.getElementById('ssModalNo').textContent} : null;
});
// « publier » sans toucher au disque : on note l'empreinte comme le fait
// l'enregistrement, puis on laisse la sauvegarde silencieuse la garder
const publie = () => p.evaluate(async ()=>{ await window.__STUDIO.publieFictif(); });

await ouvre();
console.log('\n— la premiere ouverture ne demande rien —');
dit('rien a trancher : le fichier est ce qu\'on vient d\'en tirer', !(await question()),
    JSON.stringify(await question()));

console.log('\n— on publie, on rouvre : toujours rien —');
// publier = le fichier dit desormais ce que dit l'atelier. On ne touche donc
// a rien avant : sans disque, c'est le seul etat ou les deux sont vraiment
// d'accord — et c'est bien celui que l'enregistrement produit.
await publie();
await new Promise(r=>setTimeout(r,700));
await ouvre();
dit('une strat publiee rouvre sans question', !(await question()),
    JSON.stringify(await question()));

console.log('\n— on travaille SANS publier, on rouvre : toujours rien —');
// ecrire un libelle ET lever le temoin « non enregistre », comme le fait
// l'atelier : c'est lui qui declenche la sauvegarde silencieuse
await p.evaluate(()=>{ FLOORS[0].bosses[0].label = 'PAS ENCORE PUBLIE'; window.__MS.blocs(); });
await new Promise(r=>setTimeout(r,1600));
await ouvre();
const garde = await p.evaluate(()=>FLOORS[0].bosses[0].label);
dit('du travail non publie ne declenche rien', !(await question()),
    JSON.stringify(await question()));
dit('et il est bien retrouve', garde === 'PAS ENCORE PUBLIE', String(garde));

console.log('\n— le fichier change ailleurs : on demande —');
// on simule un data.js modifie hors de l'atelier : l'empreinte notee ne
// correspond plus a ce que les globales du fichier diront a l'ouverture
await p.evaluate(async ()=>{
  const s = await BIBLIO.lis(BIBLIO.courante());
  s.fichier = 'un fichier qui a change ailleurs';
  await BIBLIO.ecris(s);
});
await ouvre();
const q = await question();
dit('l\'atelier pose la question', !!q, 'aucune modale');
if(q){
  dit('elle nomme les deux choix, sans « Annuler »',
      /fichier/i.test(q.oui) && /travail/i.test(q.non), JSON.stringify(q));
  // on garde son travail
  await p.evaluate(()=>document.getElementById('ssModalNo').click());
  await new Promise(r=>setTimeout(r,900));
  dit('garder son travail le garde vraiment',
      (await p.evaluate(()=>FLOORS[0].bosses[0].label)) === 'PAS ENCORE PUBLIE');

  console.log('\n— et on ne redemande pas a l\'ouverture suivante —');
  await ouvre();
  dit('la question ne revient pas', !(await question()), JSON.stringify(await question()));

  console.log('\n— l\'autre reponse : repartir du fichier —');
  await p.evaluate(async ()=>{
    const s = await BIBLIO.lis(BIBLIO.courante());
    s.fichier = 'a nouveau un fichier qui a change ailleurs';
    await BIBLIO.ecris(s);
  });
  await ouvre();
  dit('la question se pose de nouveau', !!(await question()));
  await p.evaluate(()=>document.getElementById('ssModalYes').click());
  await new Promise(r=>setTimeout(r,1200));
  const duFichier = await p.evaluate(()=>FLOORS[0].bosses[0].label);
  dit('le travail en cours a bien laissé la place au fichier',
      duFichier !== 'PAS ENCORE PUBLIE', String(duFichier));
  await ouvre();
  dit('et là non plus on ne redemande pas', !(await question()), JSON.stringify(await question()));
}

dit('rien n\'a casse', bruit.length===0, bruit.slice(0,3).join('\n       '));
await b.close();
console.log(ko ? '\nDeux versions peuvent encore s\'ecraser en silence.'
               : '\nAucune version n\'en ecrase une autre sans qu\'on l\'ait decide.');
process.exit(ko ? 1 : 0);
