/* Choisir la couleur d'un mot dans une ligne de strat.

   Les noms d'element se colorent tout seuls, mais un lead veut souvent
   detacher autre chose : le nom d'un TP move devant sa description, un mot
   qu'il ne faut pas rater. Il le fait comme dans un traitement de texte —
   il selectionne, il clique une teinte.

   Ce qui compte ici :
   · la barre propose les teintes du theme ET une pipette ;
   · ce qu'on selectionne est entoure, et le rendu le colore ;
   · recolorer ne s'empile pas, ca remplace ;
   · Discord, qui n'a pas de couleur, recoit le texte sans les marques ;
   · et une strat RECUE ne peut toujours pas injecter de HTML dans la page. */
import {puppeteer} from './navigateur.mjs';
let ko = 0;
const dit=(t,c,d)=>{ if(c) console.log('  ok   '+t); else {ko++;console.log('  KO   '+t+(d?'\n       '+d:''));} };

const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
const p = await b.newPage();
const bruit=[]; p.on('pageerror',e=>bruit.push(String(e)));
await p.setViewport({width:1600, height:1000});
await p.goto('http://localhost:8137/tools/studio.html',{waitUntil:'networkidle0'});
await p.waitForFunction(()=>window.__SS && window.STRATR,{timeout:9000});
await p.click('#stTabStrat');
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>document.querySelector('#ssTree .ss-step')?.click());
await p.waitForSelector('#ssBlocs .ss-btxt',{timeout:5000});

console.log('\n— la barre propose de quoi colorer —');
const barre = await p.evaluate(()=>({
  teintes:[...document.querySelectorAll('#ssBlocs .ss-tb button[data-coul]')].map(x=>x.dataset.coul),
  pipette: !!document.querySelector('#ssBlocs .ss-colibre')
}));
dit('les sept teintes du thème sont là',
    ['or','bleu','rouge','vert','violet','gris','blanc'].every(t=>barre.teintes.includes(t)),
    barre.teintes.join(' '));
dit('et une pipette pour le reste', barre.pipette);

console.log('\n— on sélectionne, on clique une teinte —');
const pose = await p.evaluate(async ()=>{
  const bloc = document.querySelector('#ssBlocs .ss-bloc');
  const ta = bloc.querySelector('.ss-btxt');
  ta.value = 'ALL : Chymous Reek Conal · Dégâts + Stun + Choke';
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  ta.focus();
  const d = ta.value.indexOf('Chymous');
  ta.setSelectionRange(d, d + 'Chymous Reek'.length);
  bloc.querySelector('.ss-tb button[data-coul="or"]').click();
  await new Promise(r=>setTimeout(r,400));
  return {texte: ta.value, selection: ta.value.slice(ta.selectionStart, ta.selectionEnd)};
});
dit('le mot est entouré de la marque', /\[c:or\]Chymous Reek\[\/c\]/.test(pose.texte), pose.texte);
dit('et il reste sélectionné, pour enchaîner', pose.selection === 'Chymous Reek', pose.selection);

console.log('\n— le rendu le colore vraiment —');
await new Promise(r=>setTimeout(r,500));
const rendu = await p.evaluate(()=>{
  const html = document.getElementById('ssPreview').innerHTML;
  const m = html.match(/<span style="color:var\(--r-buff\)">([^<]*)<\/span>/);
  return {trouve: !!m, dedans: m ? m[1] : null, marqueVisible: /\[c:or\]/.test(
    document.getElementById('ssPreview').textContent)};
});
dit('le mot sort en couleur', rendu.trouve && rendu.dedans === 'Chymous Reek', JSON.stringify(rendu));
dit('et la marque ne se lit plus à l\'écran', !rendu.marqueVisible);

console.log('\n— recolorer remplace, ça ne s\'empile pas —');
const encore = await p.evaluate(async ()=>{
  const bloc = document.querySelector('#ssBlocs .ss-bloc');
  const ta = bloc.querySelector('.ss-btxt');
  ta.focus();
  const d = ta.value.indexOf('[c:or]');
  ta.setSelectionRange(d, d + '[c:or]Chymous Reek[/c]'.length);
  bloc.querySelector('.ss-tb button[data-coul="rouge"]').click();
  await new Promise(r=>setTimeout(r,300));
  return ta.value;
});
dit('une seule marque, la nouvelle',
    /\[c:rouge\]Chymous Reek\[\/c\]/.test(encore) && !/\[c:or\]/.test(encore), encore);

console.log('\n— le nuancier prend le mot dès l\'ouverture —');
const roue = await p.evaluate(async ()=>{
  const bloc = document.querySelector('#ssBlocs .ss-bloc');
  const ta = bloc.querySelector('.ss-btxt');
  const libre = bloc.querySelector('.ss-colibre');
  ta.value = 'ALL : on stun Flat Blade sinon wipe';
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  ta.focus();
  const d = ta.value.indexOf('Flat Blade');
  ta.setSelectionRange(d, d + 'Flat Blade'.length);
  // le clic qui ouvre la roue, avant toute teinte choisie
  libre.value = '#ff8f6a';
  libre.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  await new Promise(r=>setTimeout(r,250));
  const ouverture = ta.value;
  // puis on promène dans la roue : deux teintes de suite
  libre.value = '#4c9df0'; libre.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,150));
  libre.value = '#3fca6a'; libre.dispatchEvent(new Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,250));
  return {ouverture, fin: ta.value};
});
dit('le mot est entouré dès qu\'on ouvre la roue',
    /\[c:#ff8f6a\]Flat Blade\[\/c\]/.test(roue.ouverture), roue.ouverture);
dit('promener dans la roue n\'empile pas les marques',
    /\[c:#3fca6a\]Flat Blade\[\/c\]/.test(roue.fin)
      && (roue.fin.match(/\[c:/g)||[]).length === 1, roue.fin);

console.log('\n— gras, italique, taille : le même geste —');
const forme = await p.evaluate(async ()=>{
  const bloc = document.querySelector('#ssBlocs .ss-bloc');
  const ta = bloc.querySelector('.ss-btxt');
  const pose = async (sel, bouton)=>{
    ta.focus();
    const d = ta.value.indexOf(sel);
    ta.setSelectionRange(d, d + sel.length);
    bloc.querySelector(bouton).click();
    await new Promise(r=>setTimeout(r,250));
  };
  ta.value = 'ALL : on stun Flat Blade sinon wipe';
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  await pose('Flat Blade', '.ss-tb button[data-fmt="b"]');
  const gras = ta.value;
  await pose('wipe', '.ss-tb button[data-fmt="i"]');
  const ital = ta.value;
  await pose('on stun', '.ss-tb button[data-taille="grand"]');
  const grand = ta.value;
  // le même bouton sur la même sélection l'enlève, comme dans un traitement de texte
  await pose('[b]Flat Blade[/b]', '.ss-tb button[data-fmt="b"]');
  return {gras, ital, grand, retire: ta.value,
          html: document.getElementById('ssPreview').innerHTML};
});
dit('le gras s\'écrit', /\[b\]Flat Blade\[\/b\]/.test(forme.gras), forme.gras);
dit('l\'italique aussi', /\[i\]wipe\[\/i\]/.test(forme.ital), forme.ital);
dit('la taille aussi', /\[t:grand\]on stun\[\/t\]/.test(forme.grand), forme.grand);
dit('et recliquer le même bouton l\'enlève', !/\[b\]/.test(forme.retire), forme.retire);

const rendu2 = await p.evaluate(()=>({
  gras:  STRATR.colorize('on stun [b]Flat Blade[/b]'),
  ital:  STRATR.colorize('sinon [i]wipe[/i]'),
  grand: STRATR.colorize('[t:grand]AMINON[/t]'),
  petit: STRATR.colorize('[t:petit]hors comp[/t]'),
  melange: STRATR.colorize('[b][c:or]Chymous Reek[/c][/b]'),
  taillePipee: STRATR.colorize('[t:90px]coucou[/t]')
}));
dit('le gras devient du gras', /<b>Flat Blade<\/b>/.test(rendu2.gras), rendu2.gras);
dit('l\'italique devient de l\'italique', /<i>wipe<\/i>/.test(rendu2.ital), rendu2.ital);
dit('grand et petit ont leur corps',
    /font-size:1\.18em/.test(rendu2.grand) && /font-size:\.86em/.test(rendu2.petit),
    rendu2.grand + ' · ' + rendu2.petit);
dit('les marques s\'emboîtent', /<b><span style="color:var\(--r-buff\)">/.test(rendu2.melange),
    rendu2.melange);
dit('une taille inventée ne passe pas', !/font-size/.test(rendu2.taillePipee), rendu2.taillePipee);

console.log('\n— les marques s\'emboîtent, dans tous les sens —');
const cas = await p.evaluate(()=>{
  const C = s => STRATR.colorize(s);
  const bienForme = h => {           // le balisage produit se referme-t-il dans l'ordre ?
    const pile = [], re = /<(\/?)(b|i|span)\b[^>]*>/g; let m;
    while((m = re.exec(h))){
      if(m[1]){ if(pile.pop() !== m[2]) return false; } else pile.push(m[2]);
    }
    return pile.length === 0;
  };
  const essais = {
    'gras dans couleur':        '[c:or][b]X[/b][/c]',
    'couleur dans gras':        '[b][c:or]X[/c][/b]',
    'trois niveaux':            '[t:petit][b][c:or]X[/c][/b][/t]',
    'même famille imbriquée':   '[c:or]A [c:bleu]B[/c] C[/c]',
    'gras dans gras':           '[b]A [b]B[/b] C[/b]',
    'marques croisées':         '[b]A [c:or]B[/b] C[/c]',
    'ouverture oubliée':        '[b]A [c:or]B',
    'fermeture orpheline':      'A[/b] B',
    'la ligne d\'Eric':         '[b][c:or]Chymous Reek:[/c][/b] [[c:bleu]Conal[/c]] '
                              + '[t:petit][c:rouge]Dmg[/c] + [c:or]Stun[/c] + [c:bleu]Choke[/c][/t]'
  };
  const out = {};
  Object.keys(essais).forEach(k=>{ const h = C(essais[k]); out[k] = {h, ok:bienForme(h)}; });
  return out;
});
Object.keys(cas).forEach(k=>{
  dit(k + ' : le balisage se referme dans l\'ordre', cas[k].ok, cas[k].h);
});
dit('« même famille imbriquée » garde ses deux teintes',
    /var\(--r-buff\)/.test(cas['même famille imbriquée'].h)
      && /var\(--r-tank\)/.test(cas['même famille imbriquée'].h),
    cas['même famille imbriquée'].h);
dit('« la ligne d\'Eric » garde ses crochets écrits à la main',
    /\[<span/.test(cas['la ligne d\'Eric'].h) && /<\/span>\]/.test(cas['la ligne d\'Eric'].h),
    cas['la ligne d\'Eric'].h);
dit('une fermeture orpheline reste du texte',
    /\[\/b\]/.test(cas['fermeture orpheline'].h), cas['fermeture orpheline'].h);

console.log('\n— dans une boîte à procs, la flèche coupe la ligne en deux —');
const proc = await p.evaluate(()=>{
  const g = {cls:'rules proc'};
  const L = t => STRATR.lineHtml({r:['ALL'], t:t}, g);
  return {
    eric: L('[b][c:or]Cesspool[/c][/b] [[c:bleu]AoE[/c]] Dégâts + Taint (5 min) '
          + '→ déclenche l’aura double-TP'),
    ancienne: L('Flaming Kick → WATER'),
    flecheDansUneMarque: L('[c:or]A → B[/c] → l’effet')
  };
});
dit('la mise en forme de l’action est rendue, pas écrite en toutes lettres',
    !/\[b\]|\[c:or\]/.test(proc.eric) && /<b><span style="color:var\(--r-buff\)">Cesspool/.test(proc.eric),
    proc.eric);
dit('l’effet, à droite, garde la sienne',
    /pcel/.test(proc.eric) && /double-TP/.test(proc.eric), proc.eric);
dit('les procs d’avant se lisent comme avant',
    /pcja">Flaming Kick<\/span>/.test(proc.ancienne) && /el water/.test(proc.ancienne),
    proc.ancienne);
dit('une flèche écrite DANS une marque ne coupe pas la ligne',
    /pcja">[^<]*<span style="color:var\(--r-buff\)">A → B<\/span>/.test(proc.flecheDansUneMarque)
      || /<span style="color:var\(--r-buff\)">A → B<\/span>/.test(proc.flecheDansUneMarque),
    proc.flecheDansUneMarque);

console.log('\n— le nom d\'un TP move en titre, ses effets dessous, sans « ALL : » —');
const rub = await p.evaluate(()=>{
  const txt = 'PROCBOX\n'
    + '[b][c:or]Nullifying Rain[/c][/b]\n'
    + '([t:petit][c:bleu]AoE[/c] · [c:rouge]Dmg[/c] + [c:violet]Taint[/c] (5 min)[/t])\n'
    + '[b][c:or]Noyade[/c][/b]\n'
    + '([t:petit][c:rouge]Dmg[/c] + [c:blanc]Silence[/c][/t])\n';
  const bloc = STRATCORE.textToBloc(txt, {});
  return {groupes:bloc.groups, aller:STRATCORE.blocToText(bloc),
          html:STRATR.groupsHtml(bloc.groups, []), source:txt};
});
dit('le titre garde sa mise en forme au lieu de la manger',
    rub.groupes[0].label === '[b][c:or]Nullifying Rain[/c][/b]', rub.groupes[0].label);
dit('et il garde la couleur de sa boîte', rub.groupes[0].cls === 'rules proc',
    JSON.stringify(rub.groupes[0].cls));
dit('les effets sont bien la remarque du titre',
    /Taint/.test(rub.groupes[0].note || ''), String(rub.groupes[0].note));
dit('le deuxième move reste DANS la boîte', rub.groupes[1].niv === 1,
    JSON.stringify(rub.groupes[1]));
dit('aucune ligne, donc aucun badge « ALL »',
    rub.groupes.every(g => !(g.lines||[]).length) && !/class="role"/.test(rub.html));
dit('le titre sort en gras et en or',
    /<b><span style="color:var\(--r-buff\)">Nullifying Rain<\/span><\/b>/.test(rub.html),
    rub.html.slice(0, 200));
dit('la remarque sort en petit et en couleurs',
    /gnote[^>]*><span style="font-size:\.86em">/.test(rub.html)
      && /var\(--r-tank\)/.test(rub.html), rub.html.slice(0, 400));
dit('et le champ réaffiche exactement ce qu\'on avait tapé',
    rub.aller.trim() === rub.source.trim(), JSON.stringify(rub.aller));
// une rubrique qui n'est que son titre et ses effets se serre : sept d'entre
// elles dans une boîte à procs en faisaient un mur haut de deux écrans
dit('elle est marquée comme se lisant d\'un coup d\'œil',
    (rub.html.match(/class="grp[^"]*seultitre/g)||[]).length === 2,
    (rub.html.match(/class="grp[^"]*"/g)||[]).join(' · '));

const meta = await p.evaluate(()=>{
  const un = STRATCORE.textToBloc('Fomor ×3  [dégâts]  [img:Fomor]', {}).groups[0];
  return {label:un.label, cls:un.cls, img:un.img};
});
dit('les deux vraies consignes du titre marchent toujours',
    meta.label === 'Fomor ×3' && meta.cls === 'dd' && meta.img === 'Fomor', JSON.stringify(meta));

console.log('\n— Discord reçoit le texte, pas les marques —');
const disco = await p.evaluate(()=>{
  const t = STRATR.sansMarques('ALL : [c:or]Chymous Reek[/c] [c:gris]Conal · Choke[/c]');
  return {texte:t, marques:/\[c:|\[\/c\]/.test(t)};
});
dit('les marques sont retirées', !disco.marques, disco.texte);
dit('le texte, lui, est intact', /Chymous Reek/.test(disco.texte) && /Conal/.test(disco.texte));

console.log('\n— une strat reçue ne peut toujours rien injecter —');
const sur = await p.evaluate(()=>({
  balise:   STRATR.colorize('<img src=x onerror=alert(1)>'),
  inconnue: STRATR.colorize('[c:mauve]coucou[/c]'),
  tordue:   STRATR.colorize('[c:javascript:alert(1)]coucou[/c]')
}));
dit('le HTML écrit dans une ligne reste du texte', !/<img/.test(sur.balise), sur.balise);
dit('un nom de couleur inconnu retombe sur celui du thème',
    /color:var\(--txt\)/.test(sur.inconnue), sur.inconnue);
dit('et une marque tordue n\'est pas une marque — elle reste du texte',
    !/<span/.test(sur.tordue) && !/javascript/.test(sur.tordue.replace(/\[c:[^\]]*\]/,'')),
    sur.tordue);

dit('rien n\'a cassé', bruit.length===0, bruit.slice(0,3).join('\n       '));
await b.close();
console.log(ko ? '\nLa couleur ne tient pas de bout en bout.'
               : '\nOn colore ce qu\'on veut, et rien d\'autre ne passe.');
process.exit(ko ? 1 : 0);
