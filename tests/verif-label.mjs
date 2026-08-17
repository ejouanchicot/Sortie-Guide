/* Le libelle qu'on ecrit sur un marqueur doit tenir.

   Un marqueur affiche son nom par defaut. On peut lui ecrire autre chose —
   « Boss1 », une couleur, une consigne — et c'est ce libelle-la que le guide
   montre. Il a disparu plus d'une fois entre l'ecriture et le fichier.

   Trois moments ou il se perdait, et qu'on garde ici :
   · ouvrir l'editeur sur un libelle deja pose doit le montrer — s'il s'ouvre
     vide, le refermer efface ce qu'on croyait garder ;
   · le refermer sans rien taper ne doit RIEN changer ;
   · le changer doit partir dans data.js, l'ancien avec. */
import {puppeteer, carteDessinee} from './navigateur.mjs';
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.setViewport({width:1600, height:1000});
await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
await p.waitForFunction(()=>window.__MS && window.__STUDIO,{timeout:9000});
await carteDessinee(p);

// le premier boss de la premiere carte, quel que soit le contenu du fichier
const trace = await p.evaluate(async ()=>{
  const st = Konva.stages[0];
  const cible = (FLOORS[0].bosses||[])[0];
  if(!cible) return {non:'aucun boss sur la première carte'};
  let g = null;
  st.find('.pin').forEach(x=>{ if(x._meta && x._meta.o === cible) g = x; });
  if(!g) return {non:'le marqueur de ' + cible.name + ' n\'est pas sur la scène'};
  const o = g._meta.o, dansData = () =>
    window.__MS.blocs().find(x=>x.nom==='CARTES').txt;

  o.label = 'MON LIBELLE';
  const pose = /label:'MON LIBELLE'/.test(dansData());

  g.fire('click', {evt:{button:0, preventDefault(){}, stopPropagation(){}}, target:g}, true);
  await new Promise(r=>setTimeout(r,600));
  const card = document.querySelector('.mecard');
  if(!card) return {non:'la carte de propriétés ne s\'ouvre pas'};
  const crayon = [...card.querySelectorAll('button')]
    .find(x=>/diter le label/i.test((x.title||'')+' '+(x.textContent||'')));
  if(!crayon) return {non:'pas de quoi éditer le label dans la carte de propriétés'};
  crayon.click();
  await new Promise(r=>setTimeout(r,800));
  let ed = document.getElementById('mped');
  const montre = !!(ed && /MON LIBELLE/.test(ed.innerHTML));

  // refermer sans rien taper
  ed.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
  await new Promise(r=>setTimeout(r,600));
  const intact = o.label === 'MON LIBELLE' && /label:'MON LIBELLE'/.test(dansData());

  // le rouvrir et le changer — refermer l'éditeur rouvre déjà la carte de
  // propriétés du marqueur ; on ne reclique que si elle n'est pas là
  let card2 = document.querySelector('.mecard');
  if(!card2 || !card2.querySelector('button')){
    g.fire('click', {evt:{button:0, preventDefault(){}, stopPropagation(){}}, target:g}, true);
    await new Promise(r=>setTimeout(r,600));
    card2 = document.querySelector('.mecard');
  }
  const crayon2 = card2 && [...card2.querySelectorAll('button')]
    .find(x=>/diter le label/i.test((x.title||'')+' '+(x.textContent||'')));
  if(!crayon2) return {non:'la carte de propriétés ne revient pas après l\'édition'};
  crayon2.click();
  await new Promise(r=>setTimeout(r,800));
  ed = document.getElementById('mped');
  ed.innerHTML = 'LIBELLE CHANGE';
  ed.dispatchEvent(new Event('input', {bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  ed.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
  await new Promise(r=>setTimeout(r,600));
  const txt = dansData();
  return {nom:cible.name, pose, montre, intact,
          change: /label:'LIBELLE CHANGE'/.test(txt),
          ancienParti: !/label:'MON LIBELLE'/.test(txt)};
});

if(trace.non){
  dit('on peut éditer le libellé d\'un marqueur', false, trace.non);
}else{
  console.log('\n— le libellé d\'un marqueur, de l\'écriture au fichier (' + trace.nom + ') —');
  dit('ce qu\'on écrit part dans data.js', trace.pose);
  dit('rouvrir l\'éditeur montre le libellé déjà posé', trace.montre,
      'il s\'ouvre vide — le refermer effacerait ce qu\'on croyait garder');
  dit('le refermer sans rien taper ne l\'efface pas', trace.intact);
  dit('le changer part dans data.js', trace.change);
  dit('et l\'ancien ne traîne plus', trace.ancienParti);
}
dit('rien n\'a cassé', bruit.length===0, bruit.slice(0,3).join('\n       '));

await b.close();
console.log(ko ? '\nUn libellé se perd encore entre la carte et le fichier.'
               : '\nCe qu\'on écrit sur un marqueur arrive dans le fichier.');
process.exit(ko ? 1 : 0);
