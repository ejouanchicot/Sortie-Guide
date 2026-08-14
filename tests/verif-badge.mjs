/* ============================================================
   verif-badge.mjs — un job ecrit devant vaut badge
   ------------------------------------------------------------
   Le badge du job est ce qui se lit en diagonale pendant un run :
   on cherche le sien, on fait sa ligne. Deux facons de l'ecrire le
   faisaient disparaitre, et dans les deux cas on obtenait une puce
   a la place — sans rien pour dire qu'on n'en voulait pas :

     · deux lignes du meme job a la suite etaient reunies sous un
       seul badge, et les textes devenaient des puces ;
     · un job tape devant une ligne EN RETRAIT partait en texte
       dans la puce — on ecrivait « ALL : » justement pour avoir le
       badge, et c'est le contraire qui arrivait.

   La liste a puces reste possible, mais seulement demandee : on
   indente une action sous une ligne, SANS job devant.
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

/* On mesure sur le rendu : le badge est un element, la puce en est un
   autre. Ce que le modele contient importe moins que ce qu'on voit. */
const lire = await p.evaluate(() => {
  const rend = src => {
    const bloc = STRATCORE.textToBloc(src);
    const h = document.createElement('div');
    h.style.cssText = 'position:fixed;left:0;top:0;width:860px;z-index:9999';
    h.innerHTML = STRATR.cardHtml({kind:'pack', klabel:'FARM', name:'Essai', tag:'',
                                   noHeadImg:true, groups:bloc.groups}, {n:1}, FLOORS[0], {});
    document.body.appendChild(h);
    const out = [...h.querySelectorAll('.line')].map(d => ({
      badges: [...d.querySelectorAll('.role')].map(e => e.textContent.trim()),
      puces: [...d.querySelectorAll('li')].map(e => e.textContent.trim())
    }));
    h.remove();
    return {lignes: out, retour: STRATCORE.blocToText(bloc), src};
  };
  return {
    deuxAll: rend('TANKBOX\nALL : on buff au camp\nALL : on farm les deux'),
    // le cas du farm Acuex : « ALL : » tape devant une action en retrait
    retrait: rend('TANKBOX\nPLD : prend les Acuex\n      ALL : tank tout (Acuex + Fomor)'),
    liste:   rend('TANKBOX\nCOR : Chaos Roll\n      Samurai Roll')
  };
});

console.log('\n— deux lignes du meme job gardent chacune son badge —');
dit('elles restent deux lignes', lire.deuxAll.lignes.length === 2,
    JSON.stringify(lire.deuxAll.lignes));
dit('chacune porte son badge ALL',
    lire.deuxAll.lignes.every(l => l.badges.join() === 'ALL'),
    JSON.stringify(lire.deuxAll.lignes.map(l => l.badges)));
dit('et aucune n\'est devenue une puce',
    lire.deuxAll.lignes.every(l => l.puces.length === 0),
    JSON.stringify(lire.deuxAll.lignes.map(l => l.puces)));

console.log('\n— un job tape devant une ligne en retrait vaut badge —');
dit('la ligne en retrait devient une ligne a part', lire.retrait.lignes.length === 2,
    JSON.stringify(lire.retrait.lignes));
dit('elle porte le badge qu\'on a ecrit',
    lire.retrait.lignes[1] && lire.retrait.lignes[1].badges.join() === 'ALL',
    JSON.stringify(lire.retrait.lignes.map(l => l.badges)));
dit('le « ALL : » n\'est pas reste dans le texte',
    !/ALL\s*:/.test(JSON.stringify(lire.retrait.lignes)),
    JSON.stringify(lire.retrait.lignes));
dit('et le PLD du dessus n\'a plus de puce',
    lire.retrait.lignes[0] && lire.retrait.lignes[0].puces.length === 0,
    JSON.stringify(lire.retrait.lignes[0]));

console.log('\n— la liste a puces, elle, reste possible —');
dit('une action en retrait SANS job reste une puce',
    lire.liste.lignes.length === 1 && lire.liste.lignes[0].puces.length === 2,
    JSON.stringify(lire.liste.lignes));
dit('sous le seul badge COR',
    lire.liste.lignes[0] && lire.liste.lignes[0].badges.join() === 'COR',
    JSON.stringify(lire.liste.lignes[0]));
dit('et son texte revient au caractere pres', lire.liste.retour === lire.liste.src,
    JSON.stringify(lire.liste.retour));

dit('rien ne casse', bruit.length === 0, bruit.slice(0, 3).join('\n       '));

await b.close();
const ko = bilan();
console.log(ko ? `\n${ko} probleme(s).`
               : '\nOn ecrit un job, on voit son badge.');
process.exit(ko ? 1 : 0);
