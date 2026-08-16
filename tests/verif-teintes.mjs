/* Deux mots cote a cote doivent se distinguer, pas « presque ».

   Foudre, tenebres et le violet des debuffs se tenaient a onze points d'ecart
   perceptif dans le theme sombre : « [c:thunder]Stun[/c] + [c:violet]Paralysis[/c] »
   sortait en une seule couleur pour qui lit vite. Dix-sept dans le theme clair,
   ou un lead lit son telephone dehors.

   On ne juge pas a l'oeil : on lit les teintes que le NAVIGATEUR calcule, on
   mesure l'ecart en Lab, et on verifie que chacune reste lisible sur son fond.
   Trente est le plancher — en dessous, deux mots se confondent en plein run. */
import {puppeteer} from './navigateur.mjs';
let ko = 0;
const dit = (t,c,d) => { if(c) console.log('  ok   ' + t);
  else { ko++; console.log('  KO   ' + t + (d ? '\n       ' + d : '')); } };

const PLANCHER = 30;      // ecart perceptif minimum entre deux teintes voisines
const LISIBLE  = 4.5;     // contraste minimum sur le fond de la page

function lab([r,g,b]){
  const l = [r,g,b].map(v => { v/=255; return v>0.04045 ? Math.pow((v+0.055)/1.055,2.4) : v/12.92; });
  const x=(l[0]*.4124+l[1]*.3576+l[2]*.1805)/.95047,
        y= l[0]*.2126+l[1]*.7152+l[2]*.0722,
        z=(l[0]*.0193+l[1]*.1192+l[2]*.9505)/1.08883;
  const f = t => t>0.008856 ? Math.cbrt(t) : 7.787*t+16/116;
  return [116*f(y)-16, 500*(f(x)-f(y)), 200*(f(y)-f(z))];
}
const ecart = (a,b) => { const A=lab(a), B=lab(b);
  return Math.round(Math.hypot(A[0]-B[0], A[1]-B[1], A[2]-B[2])); };
function lum([r,g,b]){ const l=[r,g,b].map(v => { v/=255;
  return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
  return .2126*l[0] + .7152*l[1] + .0722*l[2]; }
const contraste = (a,b) => { const A=lum(a)+.05, B=lum(b)+.05;
  return Math.round((Math.max(A,B)/Math.min(A,B))*10)/10; };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit = []; p.on('pageerror', e => bruit.push(String(e)));
await p.setViewport({width:1400, height:1000});
await p.goto('http://localhost:8137/index.html', {waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,900));

/* On lit les teintes TELLES QUE LE NAVIGATEUR LES CALCULE — pas telles qu'on
   les a ecrites dans la feuille. Une variable redefinie ailleurs se verrait. */
const lis = (theme) => p.evaluate((theme)=>{
  document.documentElement.setAttribute('data-theme', theme);
  const sonde = document.createElement('span');
  sonde.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(sonde);
  const prends = (v) => { sonde.style.color = 'var(' + v + ')';
    return getComputedStyle(sonde).color.match(/\d+/g).slice(0,3).map(Number); };
  const out = {};
  ['--e-thunder','--e-dark','--violet','--e-fire','--e-ice','--e-wind',
   '--e-earth','--e-water','--e-light'].forEach(v => { out[v] = prends(v); });
  out.fond = getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0,3).map(Number);
  sonde.remove();
  return out;
}, theme);

for(const theme of ['dark','light']){
  const t = await lis(theme);
  console.log('\n— thème ' + (theme === 'dark' ? 'sombre' : 'clair') + ' —');

  const VOISINES = [
    ['foudre', '--e-thunder', 'ténèbres', '--e-dark'],
    ['foudre', '--e-thunder', 'violet des débuffs', '--violet'],
    ['ténèbres', '--e-dark', 'violet des débuffs', '--violet']
  ];
  for(const [na, a, nb, jb] of VOISINES){
    const d = ecart(t[a], t[jb]);
    dit(na + ' et ' + nb + ' ne se confondent pas', d >= PLANCHER,
        'écart ' + d + ', il en faut ' + PLANCHER);
  }
  // et chacune doit rester lisible : une teinte bien separee mais illisible
  // n'a rien resolu
  for(const v of ['--e-thunder','--e-dark','--violet']){
    const c = contraste(t[v], t.fond);
    dit(v.replace('--','') + ' se lit sur le fond', c >= LISIBLE, 'contraste ' + c);
  }
  // les huit elements entre eux : on ne veut pas resoudre une paire en en
  // cassant une autre
  const ELS = ['--e-fire','--e-ice','--e-wind','--e-earth','--e-thunder',
               '--e-water','--e-light','--e-dark'];
  let pire = 999, quoi = '';
  for(let i=0;i<ELS.length;i++) for(let j=i+1;j<ELS.length;j++){
    const d = ecart(t[ELS[i]], t[ELS[j]]);
    if(d < pire){ pire = d; quoi = ELS[i] + ' / ' + ELS[j]; }
  }
  dit('les huit éléments restent séparables entre eux', pire >= 25,
      'le pire : ' + quoi + ' à ' + pire);
}

dit('rien n\'a cassé', bruit.length === 0, bruit.slice(0,3).join('\n       '));
await b.close();
console.log(ko ? '\nDeux couleurs se ressemblent trop pour être lues en run.'
               : '\nChaque teinte se distingue de ses voisines, dans les deux thèmes.');
process.exit(ko ? 1 : 0);
