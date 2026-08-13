// Reecrit data.js : les tableaux de carte passent DANS le registre CARTES,
// les douze constantes par etage disparaissent. On n'ecrit que si les donnees
// relues sont identiques.
import {readFileSync, writeFileSync} from 'fs'; import vm from 'vm';
const ROOT='G:/01_Development/Game_Project/Sortie-Guide/'; const R=f=>readFileSync(ROOT+f,'utf8');
function charge(txt){
  const c={window:{},console}; vm.createContext(c);
  vm.runInContext(txt,c);
  vm.runInContext(R('js/sortie-map-core.js'),c);
  vm.runInContext(';globalThis.__x={F:FLOORS,C:CARTES};',c);
  return {S:c.window.SORTIE, ...c.__x};
}
const avant=R('js/data.js');
const d=charge(avant);
const S=d.S;

// 1. le registre, tableaux inclus
const bloc = S.cartesConst('CARTES', d.C);
// 2. les chapitres, avec le bon nom de bloc de phases
d.F.forEach(f=>{ f.__phases = (f.id==='top') ? 'PHASES' : 'PHASES_B'; });
const chap = S.chapitresConst('FLOORS', d.F);

let out = avant;
// remplace le registre
out = out.replace(/const CARTES=\{[\s\S]*?\n\};/, () => bloc);
out = out.replace(/const FLOORS=\[[\s\S]*?\n\];/, () => chap);
// retire les douze constantes devenues inutiles (elles vivent dans CARTES)
const MORTS=['BOSSES','PACKS','MIDS_TOP','ROUTES_TOP','TEXTS','SHAPES','ZONES_TOP',
             'BOSSES_B','PACKS_B','MIDS_B','ROUTES_B','TEXTS_B','SHAPES_B','ZONES_B','OVPTS_TOP'];
MORTS.forEach(n=>{
  const re = new RegExp('(^|\n)(//[^\n]*\n)*const '+n+'\s*=\s*(\[[\s\S]*?\n\];|"[^"]*";)','');
  if(!re.test(out)) console.log('  ? '+n+' introuvable');
  out = out.replace(re, '');
});
out = out.replace(/\n{3,}/g, '\n\n');

const d2 = charge(out);
const same = JSON.stringify(d.C)===JSON.stringify(d2.C);
const sameF = JSON.stringify(d.F.map(f=>({id:f.id,carte:f.carte,map:f.map,n:(f.bosses||[]).length})))
           === JSON.stringify(d2.F.map(f=>({id:f.id,carte:f.carte,map:f.map,n:(f.bosses||[]).length})));
console.log('cartes identiques apres relecture   : '+same);
console.log('chapitres identiques                : '+sameF);
console.log('constantes mortes restantes         : '+MORTS.filter(n=>new RegExp('const '+n+'\s*=').test(out)).join(', ')||'aucune');
console.log('lignes : '+avant.split('\n').length+' -> '+out.split('\n').length);
if(!same || !sameF){ console.error('ABANDON'); process.exit(1); }
writeFileSync(ROOT+'js/data.js', out);
console.log('js/data.js reecrit');
