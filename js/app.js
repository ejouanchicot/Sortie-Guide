
const JOBS=["MNK","BRD","COR","GEO","RDM","PLD","DNC"];
const ROLE={MNK:"dd",DNC:"dd",WAR:"dd",BRD:"buff",COR:"buff",GEO:"buff",RDM:"heal",WHM:"heal",PLD:"tank",RUN:"tank",ALL:"all"};
const RCOL={dd:"var(--r-dd)",buff:"var(--r-buff)",heal:"var(--r-heal)",tank:"var(--r-tank)",all:"var(--r-all)"};
function jcol(j){return RCOL[ROLE[j]||"all"];}

// helper lignes
function ln(r,t,opt){opt=opt||{};return {r:r,t:t,cond:opt.cond,warn:opt.warn,comp:opt.comp};}

// ---- i18n FR / EN ----
const LANG=(function(){try{var l=localStorage.getItem('sortie_lang');return l==='en'?'en':'fr';}catch(e){return 'fr';}})();
const TR={
 "Au Start : on attend Mazurka (BRD) et/ou Bolter's (COR) · on passe PAS la porte tant qu'on n'a pas l'un ou l'autre":"At Start: wait for Mazurka (BRD) and/or Bolter's (COR) · do NOT go through the door until you have one or the other",
 "Au Start : on attend Mazurka (BRD), Bolter's (COR) et/ou Chocobo Jig (DNC) · on passe PAS la porte tant qu'on n'a pas de move speed":"At Start: wait for Mazurka (BRD), Bolter's (COR) and/or Chocobo Jig (DNC) · do NOT go through the door until you have move speed",
 "Bolter's (Tactician's déjà posé)":"Bolter's (Tactician's already up)",
 "Trajet · buffs de déplacement":"Route · movement buffs",
 "Depuis le Start (centre-gauche) · mur de droite, plein SUD → coin bas-gauche.":"From Start (center-left) · right wall, straight SOUTH → bottom-left corner.",
 "le PLD amène les Acuex au camp Fomor, tank tout · 3 Acuex + 3 Fomor → pop les coffres":"PLD brings the Acuex to the Fomor camp, tanks everything · 3 Acuex + 3 Fomor → pop the chests",
 "Setup · au camp Fomor":"Setup · at the Fomor camp",
 "prend les Acuex → les amène au camp Fomor":"grab the Acuex → bring them to the Fomor camp",
 "tank tout (Acuex + Fomor)":"tank everything (Acuex + Fomor)",
 "on buff au camp Fomor · on farm les deux en même temps":"buff at the Fomor camp · farm both at once",
 "Acuex ×3 → SC mono-cible + MB Fire (×3 kills)":"Acuex ×3 → single-target SC + MB Fire (×3 kills)",
 "Savage Blade > Last Stand  (PLD+COR ou BRD+COR)":"Savage Blade > Last Stand  (PLD+COR or BRD+COR)",
 "MB Fire sur le SC":"MB Fire on the SC",
 "on spam pour tuer · le proc (mages) ne fait pas de dégât":"just spam to kill · the proc (mages) deals no damage",
 "Règle":"Rule",
 "NE PAS fermer de SC Light si Degei est Fire / Wind / Thunder…":"Do NOT close a Light SC if Degei is Fire / Wind / Thunder…",
 "NE PAS fermer de SC Dark si Degei est Ice / Earth / Water…":"Do NOT close a Dark SC if Degei is Ice / Earth / Water…",
 "Setup : PLD fixe l'aggro · RDM pose Gravity II · GEO pose Geo-Gravity":"Setup: PLD holds hate · RDM applies Gravity II · GEO applies Geo-Gravity",
 "JA de Degei pendant le setup → le BRD proc si possible":"Degei JA during setup → BRD procs if possible",
 "RDM libre → BRD + RDM procent ensemble":"RDM free → BRD + RDM proc together",
 "1 proc suffit en général (2 max) · sous ~20 % pas la peine":"1 proc is usually enough (2 max) · below ~20% don't bother",
 "Procs · contre par (fait par les mages)":"Procs · countered by (done by the mages)",
 "kite en gérant la distance : rester à +30 yalm au max, plonger sous 30 juste pour build l'aggro / heal, puis ressortir.":"kite while managing distance: stay at +30 yalm as much as possible, dip under 30 only to build enmity / heal, then back out.",
 "+30 yalm = safe (pas de moves du boss)":"+30 yalm = safe (no boss moves)",
 "sous 30 yalm : build l'aggro (JA magie : Flash, Foil)":"under 30 yalm: build enmity (magic JA: Flash, Foil)",
 "heal la party à ~21 yalm":"heal the party at ~21 yalm",
 "COR et BRD déjà en place depuis le farm. Seul le GEO change sur le boss.":"COR and BRD already up from the farm. Only GEO changes on the boss.",
 "déjà OK si Acuex avant Fomor":"already OK if Acuex before Fomor",
 "set anti-slow":"anti-slow set",
 "DD · on spam":"DD · spam",
 "WS libres (spam)":"free WS (spam)",
 "spam Ruthless Stroke · le DNC ne peut pas proc":"spam Ruthless Stroke · DNC can't proc",
 "Switch Rudra's Storm si Degei est Fire / Wind / Thunder":"Switch to Rudra's Storm if Degei is Fire / Wind / Thunder",
 "Mur de droite, plein EST → coin bas-droite (Ghost ×3, puis Skomora, case N).":"Right wall, straight EAST → bottom-right corner (Ghost ×3, then Skomora, cell N).",
 "tape (DPS)":"melee (DPS)",
 "SC Light à mort":"Light SC until dead",
 "tank sur place":"tank in place",
 "sans RDM : Honor + Minuet ×2 + Victory":"no RDM: Honor + Minuet ×2 + Victory",
 "Distract III · plus dur à land (Skomora est Darkness)":"Distract III · harder to land (Skomora is Darkness)",
 "Victory Smite ×2  (ou Victory → Shijin)":"Victory Smite ×2  (or Victory → Shijin)",
 "Mur de droite, plein NORD → coin haut-droite (Umbril ×5, puis Leshonn).":"Right wall, straight NORTH → top-right corner (Umbril ×5, then Leshonn).",
 "≥1 WS par mob · tous tués = lock ses TP moves":"≥1 WS per mob · all killed = locks its TP moves",
 "≥1 WS par mob (obligatoire)":"≥1 WS per mob (mandatory)",
 "DD · tout le monde tape":"DD · everyone hits",
 "≥1 WS par mob (obligatoire) · PLD, COR, RDM, BRD, MNK":"≥1 WS per mob (mandatory) · PLD, COR, RDM, BRD, MNK",
 "≥1 WS par mob (obligatoire) · DNC, COR, RDM, BRD, MNK":"≥1 WS per mob (mandatory) · DNC, COR, RDM, BRD, MNK",
 "kite le boss":"kite the boss",
 "Zap copie un debuff → pas de Paralyze":"Zap copies a debuff → no Paralyze",
 "Règles":"Rules",
 "JAMAIS son élément actif (SC/nuke) → il HEAL":"NEVER its active element (SC/nuke) → it HEALS",
 "proc opposé = retire ses stacks DT/dmg (+5%)":"opposite proc = removes its DT/dmg stacks (+5%)",
 "alterne SC > MB, varie la source (anti-résist)":"alternate SC > MB, vary the source (anti-resist)",
 "pas d'empilement (Counter 500+/hit)":"don't stack up (Counter 500+/hit)",
 "◈ Mains THUNDER → proc Earth":"◈ THUNDER active → proc Earth",
 "◈ Mains WIND → proc Ice":"◈ WIND active → proc Ice",
 "MB Earth sur le SC":"MB Earth on the SC",
 "MB Ice sur le SC":"MB Ice on the SC",
 "Chokehold vole les buffs = wipe → proc opposé / kill vite (Asylum si WHM)":"Chokehold steals buffs = wipe → opposite proc / kill fast (Asylum if WHM)",
 "DD (varie la source)":"DD (vary the source)",
 "SC selon le mode":"SC depending on the mode",
 "Ghatjot (pas de farm)":"Ghatjot (no farm)",
 "Mur de droite, plein OUEST → coin haut-gauche (Ghatjot). Pas de farm.":"Right wall, straight WEST → top-left corner (Ghatjot). No farm.",
 "absorbe Water · porte verrouillée à l'engage":"absorbs Water · door locks on engage",
 "WS libres, évite Howling Fist > Savage (+ Chakra)":"free WS, avoid Howling Fist > Savage (+ Chakra)",
 "Ruthless Stroke (jamais Darkness)":"Ruthless Stroke (never Darkness)",
 "absorbe Water → boost ses TP moves":"absorbs Water → boosts its TP moves",
 "SEUL danger : Howling Fist > Savage Blade = Distortion → à éviter":"ONLY danger: Howling Fist > Savage Blade = Distortion → avoid",
 "Chakra retire le Taint (poison AoE)":"Chakra removes the Taint (AoE poison)",
 "Taint stack → augmente Clobbering Wave · Ra'Kaznar Metal A = Poison retirable":"Taint stacks → boosts Clobbering Wave · Ra'Kaznar Metal A = removable Poison",
 "kill avant que ça monte":"kill before it stacks up",
 "Vue d'ensemble du run":"Run overview",
 "cliquer sur la carte pour agrandir":"click the map to zoom",
 "Trajet":"Route",
 "Pack de mobs":"Mob pack",
 "Déplacement :":"Route:",
 "Tous":"All",
 "N'afficher que mon rôle":"Show only my role"
};
function tr(s){ return (LANG==='en' && s!=null && TR[s]!==undefined) ? TR[s] : s; }
const OVINTRO = LANG==='en'
 ? '<p><b>Sortie \u00b7 linear run, 4 phases.</b> Follow the <b>right wall</b> from Start to the last boss: Degei \u2192 Skomora \u2192 Leshonn \u2192 Ghatjot. Each phase: a <b>farm</b> (pop the chests) then the <b>boss</b>.</p><p class="ovi-tip">Click your job in <b>My role</b> (or <b>Solo</b> to see only your actions), pick the <b>comp</b> at the top, then scroll down the rail.</p>'
 : '<p><b>Sortie \u00b7 run lin\u00e9aire en 4 phases.</b> On suit le <b>mur de droite</b> depuis le Start jusqu\'au dernier boss, en encha\u00eenant Degei \u2192 Skomora \u2192 Leshonn \u2192 Ghatjot. Chaque phase : un <b>farm</b> (pop des coffres) puis le <b>boss</b>.</p><p class="ovi-tip">Clique ton job dans <b>Mon r\u00f4le</b> (ou <b>Solo</b> pour ne voir que tes actions), choisis la <b>comp</b> en haut, puis descends le long du rail.</p>';

const BUFFS_P1=[
  ln(["ALL"],"Au Start : on attend Mazurka (BRD) et/ou Bolter's (COR) · on passe PAS la porte tant qu'on n'a pas l'un ou l'autre",{warn:1,comp:"PLD"}),
  ln(["ALL"],"Au Start : on attend Mazurka (BRD), Bolter's (COR) et/ou Chocobo Jig (DNC) · on passe PAS la porte tant qu'on n'a pas de move speed",{warn:1,comp:"DNC"}),
  ln(["COR"],"Bolter's + Tactician's"),
  ln(["BRD"],"Mazurka"),
  ln(["DNC"],"Chocobo Jig",{comp:"DNC"})
];
const BUFFS_STD=[
  ln(["COR"],"Bolter's (Tactician's déjà posé)"),
  ln(["DNC"],"Chocobo Jig",{comp:"DNC"})
];

const PHASES=[
{n:1,boss:"Degei",map:"",title:"Double Farm · Acuex + Fomor → Degei",route:"Depuis le Start (centre-gauche) · mur de droite, plein SUD → coin bas-gauche.",buffs:BUFFS_P1,cards:[
  {kind:"pack",name:"Double Farm · Acuex ×3 + Fomor ×3",tag:"le PLD amène les Acuex au camp Fomor, tank tout · 3 Acuex + 3 Fomor → pop les coffres",noHeadImg:true,groups:[
    {label:"Setup · au camp Fomor",cls:"tank",lines:[
      ln(["PLD"],["prend les Acuex → les amène au camp Fomor","tank tout (Acuex + Fomor)"],{comp:"PLD"}),
      ln(["ALL"],"on buff au camp Fomor · on farm les deux en même temps")
    ]},
    {label:"Buff · farm",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["GEO"],["Acumen","Malaise"]),
      ln(["BRD"],["Honor March","Victory March"])
    ]},
    {label:"Fomor ×3 · SC Step 4",cls:"dd",img:"Fomor",lines:[
      ln(["MNK"],"Shijin Spiral → Tornado Kick (SC Step 4) ×3",{comp:"PLD"}),
      ln(["DNC"],"Dancing Edge ×4",{comp:"DNC"})
    ]},
    {label:"Acuex ×3 → SC mono-cible + MB Fire (×3 kills)",cls:"mb",img:"Acuex",lines:[
      ln(["PLD","RDM"],"Chant du Cygne > Chant du Cygne"),
      ln(["PLD","COR","BRD"],"Savage Blade > Last Stand  (PLD+COR ou BRD+COR)"),
      ln(["MNK"],"Victory Smite ×2  (Light)",{comp:"DNC"}),
      ln(["RDM","GEO"],"MB Fire sur le SC")
    ]}
  ]},
  {kind:"boss",name:"Boss · Degei",tag:"on spam pour tuer · le proc (mages) ne fait pas de dégât",groups:[
    {label:"Règle",cls:"rules",lines:[
      ln(["ALL"],"NE PAS fermer de SC Light si Degei est Fire / Wind / Thunder…",{warn:1}),
      ln(["ALL"],"NE PAS fermer de SC Dark si Degei est Ice / Earth / Water…",{warn:1}),
      ln(["ALL"],"Setup : PLD fixe l'aggro · RDM pose Gravity II · GEO pose Geo-Gravity"),
      ln(["ALL"],"JA de Degei pendant le setup → le BRD proc si possible"),
      ln(["ALL"],"RDM libre → BRD + RDM procent ensemble"),
      ln(["ALL"],"1 proc suffit en général (2 max) · sous ~20 % pas la peine")
    ]},
    {label:"Procs · contre par (fait par les mages)",cls:"rules proc",lines:[
      ln(["ALL"],"Flaming Kick → WATER"),
      ln(["ALL"],"Flashflood → THUNDER"),
      ln(["ALL"],"Icy Grasp → FIRE"),
      ln(["ALL"],"Eroding Flesh → WIND"),
      ln(["ALL"],"Fulminous Smash → EARTH")
    ]},
    {label:"PLD",cls:"tank",note:"kite en gérant la distance : rester à +30 yalm au max, plonger sous 30 juste pour build l'aggro / heal, puis ressortir.",lines:[
      ln(["PLD"],"+30 yalm = safe (pas de moves du boss)"),
      ln(["PLD"],"sous 30 yalm : build l'aggro (JA magie : Flash, Foil)"),
      ln(["PLD"],"heal la party à ~21 yalm")
    ]},
    {label:"Buffs · COR · GEO · BRD",cls:"buff",note:"COR et BRD déjà en place depuis le farm. Seul le GEO change sur le boss.",lines:[
      ln(["GEO"],"Geo-Gravity"),
      ln(["GEO"],"Indi-Frailty",{cond:"déjà OK si Acuex avant Fomor"}),
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["BRD"],["Honor March","Victory March","Minuet V","Aria"],{cond:"set anti-slow"})
    ]},
    {label:"RDM",cls:"heal",lines:[
      ln(["RDM"],["Saboteur → Gravity II","Dia III","Distract III"])
    ]},
    {label:"DD · on spam",cls:"dd",lines:[
      ln(["COR"],["spam Savage Blade","Light Shot (Dia III)"]),
      ln(["MNK"],"WS libres (spam)"),
      ln(["DNC"],["spam Ruthless Stroke","Switch Rudra's Storm si Degei est Fire / Wind / Thunder"],{comp:"DNC"})
    ]}
  ]}
]},
{n:2,boss:"Skomora",map:"",title:"Ghost → Skomora",route:"Mur de droite, plein EST → coin bas-droite (Ghost ×3, puis Skomora, case N).",buffs:BUFFS_STD,cards:[
  {kind:"pack",name:"Pack · Ghost ×3",tag:"weak Fire · SC → MB Fire",groups:[
    {label:"Buff · farm",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["GEO"],["Acumen","Malaise"]),
      ln(["BRD"],["Honor March","Victory March"]),
      ln(["COR"],"tape (DPS)")
    ]},
    {label:"DD · SC",cls:"dd",lines:[
      ln(["MNK"],"Victory Smite ×2"),
      ln(["DNC"],"Ruthless Stroke ×2 = Fusion",{comp:"DNC"})
    ]},
    {label:"MB Fire",cls:"mb",lines:[
      ln(["RDM","GEO"],"MB Fire sur le SC")
    ]}
  ]},
  {kind:"boss",name:"Boss · Skomora",tag:"SC Light à mort",groups:[
    {label:"PLD",cls:"tank",lines:[
      ln(["PLD"],"tank sur place"),
      ln(["PLD"],"Holy Circle + Sepulcher",{comp:"PLD"})
    ]},
    {label:"Buffs · COR · GEO · BRD",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["GEO"],["Geo-Frailty","Indi-Fury"]),
      ln(["BRD"],["Honor March","Minuet ×2","Aria"],{cond:"sans RDM : Honor + Minuet ×2 + Victory"})
    ]},
    {label:"RDM",cls:"heal",lines:[
      ln(["RDM"],["Dia III","Distract III · plus dur à land (Skomora est Darkness)"])
    ]},
    {label:"DD",cls:"dd",lines:[
      ln(["COR"],["spam Savage Blade","Light Shot (Dia III)"]),
      ln(["MNK"],"Victory Smite ×2  (ou Victory → Shijin)"),
      ln(["DNC"],"spam Ruthless Stroke",{comp:"DNC"})
    ]}
  ]}
]},
{n:3,boss:"Leshonn",map:"",title:"Umbril → Leshonn",route:"Mur de droite, plein NORD → coin haut-droite (Umbril ×5, puis Leshonn).",buffs:BUFFS_STD,cards:[
  {kind:"pack",name:"Pack · Umbril ×5",tag:"≥1 WS par mob · tous tués = lock ses TP moves",groups:[
    {label:"Buff · farm",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["BRD"],["Honor March","Victory March"])
    ]},
    {label:"DD · tout le monde tape",cls:"dd",lines:[
      ln(["ALL"],"≥1 WS par mob (obligatoire) · PLD, COR, RDM, BRD, MNK",{comp:"PLD"}),
      ln(["ALL"],"≥1 WS par mob (obligatoire) · DNC, COR, RDM, BRD, MNK",{comp:"DNC"})
    ]}
  ]},
  {kind:"boss",name:"Boss · Leshonn",tag:"Thunder ↔ Wind · ~870k",groups:[
    {label:"PLD",cls:"tank",lines:[
      ln(["PLD"],"kite le boss")
    ]},
    {label:"Buffs · COR · GEO · BRD",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["GEO"],["Geo-Gravity","Indi-Frailty"]),
      ln(["BRD"],["Honor March","Minuet ×2","Aria"])
    ]},
    {label:"RDM",cls:"heal",lines:[
      ln(["RDM"],["Saboteur → Gravity II","Distract III"]),
      ln(["RDM"],"Zap copie un debuff → pas de Paralyze")
    ]},
    {label:"Règles",cls:"rules",lines:[
      ln(["ALL"],"JAMAIS son élément actif (SC/nuke) → il HEAL",{warn:1}),
      ln(["ALL"],"proc opposé = retire ses stacks DT/dmg (+5%)"),
      ln(["ALL"],"alterne SC > MB, varie la source (anti-résist)"),
      ln(["ALL"],"pas d'empilement (Counter 500+/hit)")
    ]},
    {label:"◈ Mains THUNDER → proc Earth",cls:"",lines:[
      ln(["MNK"],"Shijin Spiral > Asuran Fists (Gravitation)"),
      ln(["DNC"],"Rudra's Storm ×2 = Darkness",{comp:"DNC"}),
      ln(["COR"],"spam Savage Blade"),
      ln(["RDM","GEO"],"MB Earth sur le SC")
    ]},
    {label:"◈ Mains WIND → proc Ice",cls:"",lines:[
      ln(["MNK"],"Shijin Spiral > Tornado Kick (Induration)"),
      ln(["DNC"],"Rudra's Storm ×2 = Darkness",{comp:"DNC"}),
      ln(["COR"],"spam Savage Blade"),
      ln(["RDM","GEO"],"MB Ice sur le SC"),
      ln(["ALL"],"Chokehold vole les buffs = wipe → proc opposé / kill vite (Asylum si WHM)",{warn:1})
    ]}
  ]}
]},
{n:4,boss:"Ghatjot",map:"",title:"Ghatjot (pas de farm)",route:"Mur de droite, plein OUEST → coin haut-gauche (Ghatjot). Pas de farm.",buffs:[
  ln(["COR"],"Bolter's + Tactician's"),
  ln(["DNC"],"Chocobo Jig",{comp:"DNC"})
],cards:[
  {kind:"boss",name:"Boss · Ghatjot",tag:"absorbe Water · porte verrouillée à l'engage",groups:[
    {label:"PLD",cls:"tank",lines:[
      ln(["PLD"],"tank sur place")
    ]},
    {label:"Buffs · COR · GEO · BRD",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["GEO"],["Geo-Frailty","Indi-Fury"]),
      ln(["BRD"],["Honor March","Minuet ×2","Aria"])
    ]},
    {label:"RDM",cls:"heal",lines:[
      ln(["RDM"],["Dia III","Distract III"])
    ]},
    {label:"DD",cls:"dd",lines:[
      ln(["COR"],["spam Savage Blade","Light Shot (Dia III)"]),
      ln(["MNK"],"WS libres, évite Howling Fist > Savage (+ Chakra)"),
      ln(["DNC"],"Ruthless Stroke (jamais Darkness)",{comp:"DNC"})
    ]},
    {label:"Règles",cls:"rules",lines:[
      ln(["ALL"],"absorbe Water → boost ses TP moves"),
      ln(["ALL"],"SEUL danger : Howling Fist > Savage Blade = Distortion → à éviter",{warn:1}),
      ln(["MNK"],"Chakra retire le Taint (poison AoE)"),
      ln(["ALL"],"Taint stack → augmente Clobbering Wave · Ra'Kaznar Metal A = Poison retirable"),
      ln(["ALL"],"kill avant que ça monte")
    ]}
  ]}
]}
];

// ---- colorisation des éléments dans le texte ----
const ELS=[["WATER|Water|Eau","water"],["THUNDER|Thunder|Foudre","thunder"],["FIRE|Fire|Feu","fire"],["WIND|Wind|Vent","wind"],["EARTH|Earth|Terre","earth"],["ICE|Ice|Glace","ice"],["LIGHT|Light|Lumière","light"],["DARK|Darkness|Dark|Ténèbres","dark"]];
function esc(s){return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
function colorize(s){
  s=esc(s);
  ELS.forEach(([words,cls])=>{
    s=s.replace(new RegExp("\\b("+words+")\\b","g"),'<span class="el '+cls+'">$1</span>');
  });
  // flèche plus visible
  s=s.replace(/→/g,'<span style="color:var(--dim)">→</span>');
  return s;
}
function roleChip(r){return '<span class="role" style="--jc:'+jcol(r)+'">'+r+'</span>';}
function lineHtml(l,g){
  const roles=(l.r||["ALL"]);
  const chips=roles.map(roleChip).join("");
  const isProc = g && /\bproc\b/.test(g.cls||"") && typeof l.t==="string" && /→/.test(l.t);
  var body;
  if(isProc){
    const parts=l.t.split("→");
    body='<span class="pcja">'+esc(parts[0].trim())+'</span><span class="pcsep">›</span><span class="pcel">'+colorize(parts[1].trim())+'</span>';
  }
  else if(Array.isArray(l.t)){ body='<ul class="acts">'+l.t.map(function(it){return '<li>'+colorize(tr(it))+'</li>';}).join("")+'</ul>'; }
  else { body=colorize(tr(l.t)); }
  return '<div class="line'+(l.warn?' warn':'')+(isProc?' proc':'')+(Array.isArray(l.t)?' stack':'')+'" data-r="'+roles.join(" ")+'"'+(l.comp?' data-comp="'+l.comp+'"':'')+'>'
    +'<span class="roles" style="display:flex;gap:3px;flex:none">'+chips+'</span>'
    +'<span class="txt">'+body+(l.cond?' <span class="cond">'+esc(tr(l.cond))+'</span>':'')+'</span></div>';
}
// plusieurs actions d'un même job → label une fois + liste à puces
function runHtml(run){
  const roles=(run[0].r||["ALL"]);
  const chips=roles.map(roleChip).join("");
  const comp=run[0].comp;
  var lis="";
  run.forEach(function(l){
    if(Array.isArray(l.t)){ l.t.forEach(function(it){ lis+='<li>'+colorize(tr(it))+'</li>'; }); }
    else { lis+='<li'+(l.warn?' class="warn"':'')+'>'+colorize(tr(l.t))+(l.cond?' <span class="cond">'+esc(tr(l.cond))+'</span>':'')+'</li>'; }
  });
  return '<div class="line stack" data-r="'+roles.join(" ")+'"'+(comp?' data-comp="'+comp+'"':'')+'>'
    +'<span class="roles" style="display:flex;gap:3px;flex:none">'+chips+'</span>'
    +'<span class="txt"><ul class="acts">'+lis+'</ul></span></div>';
}
function groupBody(g){
  if(/\bproc\b/.test(g.cls||"")) return g.lines.map(function(l){return lineHtml(l,g);}).join("");
  var out="",i=0,L=g.lines;
  while(i<L.length){
    var key=(L[i].r||["ALL"]).join(" ")+"|"+(L[i].comp||"");
    var j=i+1;
    while(j<L.length && ((L[j].r||["ALL"]).join(" ")+"|"+(L[j].comp||""))===key) j++;
    if(j-i>1) out+=runHtml(L.slice(i,j)); else out+=lineHtml(L[i],g);
    i=j;
  }
  return out;
}

// ---- render ----
const app=document.getElementById("app");

function ovDot(x,y,l){return '<circle cx="'+x+'" cy="'+y+'" r="1.6" fill="#0d1218" stroke="url(#pg)" stroke-width="0.85"/><text x="'+x+'" y="'+(y+0.68)+'" text-anchor="middle" class="ovn">'+l+'</text>';}
const MAPIMG="img/map.jpg";
const ZMAP={1:'#a6b2c2',2:'var(--e-wind)',3:'var(--e-water)',4:'var(--e-fire)'};
const OVSTEPS='<ol class="ovsteps">'+PHASES.map(function(p){return '<li style="--zc:'+ZMAP[p.n]+'"><span class="osnum">'+p.n+'</span><span class="ostxt"><b>'+esc(p.boss)+'</b><span>'+esc(tr(p.title))+'</span></span></li>';}).join('')+'</ol>';
const OVERVIEW='<section class="overview">'
  +'<div class="ovhead"><span class="ovtitle">'+tr("Vue d'ensemble du run")+'</span>'
  +'<span class="ovsub"><span class="zoomhint">'+tr("cliquer sur la carte pour agrandir")+'</span></span></div>'
  +'<div class="ovgrid">'
  +'<div class="ovside"><div class="ovintro">'+OVINTRO+'</div></div>'
  +'<div class="ovmapwrap">'
  +'<div class="ovmap mapfig">'
  +'<img src="'+MAPIMG+'" alt="Carte complète du run" loading="lazy" onerror="this.closest(\'.ovmap\').classList.add(\'nomap\')">'
  +'<div class="mapmiss">Carte non trouvée · ajoute <code>maps/overview.png</code>.</div>'
  +'<svg class="ovroute" viewBox="0 0 100 100" aria-hidden="true">'
  +'<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa9e6"/><stop offset="1" stop-color="#8b7cff"/></linearGradient></defs>'
  +'<polyline class="ovrail" points="17.7,42.4 23.6,42.4 23.6,51.5 26.7,51.6 26.7,60.9 23.6,61.0 23.7,73.4 35.9,73.4 36.0,70.8 39.1,70.3 39.6,67.3 45.3,67.3 45.4,73.4 64.1,73.4 64.2,70.4 73.4,70.4 73.5,73.5 85.9,73.5 85.9,61.0 82.9,60.9 82.8,57.9 79.7,57.8 79.7,51.6 86.0,51.5 86.0,33.4 82.9,32.9 82.9,23.5 86.0,23.4 85.9,11.2 73.6,11.2 73.5,14.3 70.4,14.3 70.3,17.1 64.1,17.1 64.0,11.1 45.5,11.1 45.4,14.2 36.0,14.2 35.9,10.9 20.4,10.9 20.4,8.3"/>'
  +'<polyline class="ovflow" points="17.7,42.4 23.6,42.4 23.6,51.5 26.7,51.6 26.7,60.9 23.6,61.0 23.7,73.4 35.9,73.4 36.0,70.8 39.1,70.3 39.6,67.3 45.3,67.3 45.4,73.4 64.1,73.4 64.2,70.4 73.4,70.4 73.5,73.5 85.9,73.5 85.9,61.0 82.9,60.9 82.8,57.9 79.7,57.8 79.7,51.6 86.0,51.5 86.0,33.4 82.9,32.9 82.9,23.5 86.0,23.4 85.9,11.2 73.6,11.2 73.5,14.3 70.4,14.3 70.3,17.1 64.1,17.1 64.0,11.1 45.5,11.1 45.4,14.2 36.0,14.2 35.9,10.9 20.4,10.9 20.4,8.3"/>'
  +ovDot(17.7,42.4,'S')
  +'</svg></div>'
  +'</div>'
  +'</div></section>';
app.innerHTML=OVERVIEW;
const MOB={"Degei": "img/mob-degei.png", "Skomora": "img/mob-skomora.png", "Leshonn": "img/mob-leshonn.png", "Ghatjot": "img/mob-ghatjot.png", "Acuex": "img/mob-acuex.png", "Fomor": "img/mob-fomor.png", "Ghost": "img/mob-ghost.png", "Umbril": "img/mob-umbril.png"};
const ELC={fire:'var(--e-fire)',water:'var(--e-water)',ice:'var(--e-ice)',thunder:'var(--e-thunder)',wind:'var(--e-wind)',earth:'var(--e-earth)',light:'var(--e-light)',dark:'var(--e-dark)',red:'var(--e-fire)',blue:'var(--e-water)',green:'var(--e-wind)',gray:'#a6b2c2'};
const ZC2={red:'#ff9d3a',blue:'#7ce0ff',green:'#b6ff5a',gray:'#ffffff'};
const BOSSES=[
 {name:'Ghatjot',n:4,el:'red', x:12.5,y:5.5, nx:20.4,ny:7.9},
 {name:'Leshonn',n:3,el:'blue',x:95,  y:7.9, nx:89.1,ny:7.9},
 {name:'Degei',  n:1,el:'gray',x:20.4,y:83,  nx:20.4,ny:76.7},
 {name:'Skomora',n:2,el:'green',x:89.1,y:85, nx:89.1,ny:76.7}
];
const PACKS=[
 {name:'Acuex', el:'red', x:29.7,y:53.5, q:'×12', ph:1},
 {name:'Fomor', el:'gray',x:28,y:69, q:'WHM/BLM/RDM ×5', ph:1},
 {name:'Ghost', el:'green',x:67.0,y:66.1, q:'×12', ph:2},
 {name:'Umbril',el:'blue',x:78.5,y:29.0, q:'×12', ph:3}
];
function pqHtml(q){
  var m=q.match(/×\d+/); var count=m?m[0]:'';
  var rest=q.replace(/×\d+/,'').trim();
  if(rest.indexOf('/')>=0){
    var jobs=rest.split('/').map(function(s){return s.trim();}).filter(Boolean);
    return '<span class="pq pqlist">'+(count?'<b>'+count+'</b>':'')+jobs.map(function(j){return '<span>'+j+'</span>';}).join('')+'</span>';
  }
  return '<span class="pq">'+q+'</span>';
}
(function(){
  const ovmap=document.querySelector('.ovmap'); if(!ovmap)return;
  const wrap=document.createElement('div'); wrap.className='ovpoi'; let h='';
  PACKS.forEach(p=>{ h+='<div class="poi pack" style="left:'+p.x+'%;top:'+p.y+'%;--pc:'+ELC[p.el]+'"><img src="'+MOB[p.name]+'" alt="'+p.name+'"><span class="plabel">'+p.name+''+pqHtml(p.q)+'</span></div>'; });
  BOSSES.forEach(bo=>{
    var ad=(-(4-bo.n)*0.3375)+'s'; // onde de pulsation dans le sens du chemin (1→2→3→4)
    h+='<div class="poi boss" style="left:'+bo.x+'%;top:'+bo.y+'%;--pc:'+ELC[bo.el]+';--pc2:'+ZC2[bo.el]+';--ad:'+ad+'"><img src="'+MOB[bo.name]+'" alt="'+bo.name+'"><span class="plabel">'+bo.name+'</span></div>';
    h+='<div class="ovnum" style="left:'+bo.nx+'%;top:'+bo.ny+'%;--pc:'+ELC[bo.el]+';--pc2:'+ZC2[bo.el]+';--ad:'+ad+'">'+bo.n+'</div>';
  });
  wrap.innerHTML=h; ovmap.appendChild(wrap);
})();
const BOSSN={};BOSSES.forEach(b=>BOSSN[b.n]=b);
const SEG={"1":"17.7,42.4 23.6,42.4 23.6,51.5 26.7,51.6 26.7,60.9 23.6,61.0 23.7,73.4","2":"23.7,73.4 35.9,73.4 36.0,70.8 39.1,70.3 39.6,67.3 45.3,67.3 45.4,73.4 64.1,73.4 64.2,70.4 73.4,70.4 73.5,73.5 85.9,73.5","3":"85.9,73.5 85.9,61.0 82.9,60.9 82.8,57.9 79.7,57.8 79.7,51.6 86.0,51.5 86.0,33.4 82.9,32.9 82.9,23.5 86.0,23.4 85.9,11.2","4":"85.9,11.2 73.6,11.2 73.5,14.3 70.4,14.3 70.3,17.1 64.1,17.1 64.0,11.1 45.5,11.1 45.4,14.2 36.0,14.2 35.9,10.9 20.4,10.9 20.4,8.3"};
function phaseMapHtml(p){
  var seg=SEG[p.n], bo=BOSSN[p.n];
  var packs=PACKS.filter(function(x){return x.ph===p.n;});
  var poi='';
  packs.forEach(function(pk){ poi+='<div class="poi pack" style="left:'+pk.x+'%;top:'+pk.y+'%;--pc:'+ELC[pk.el]+'"><img src="'+MOB[pk.name]+'" alt="'+pk.name+'"><span class="plabel">'+pk.name+''+pqHtml(pk.q)+'</span></div>'; });
  poi+='<div class="poi boss" style="left:'+bo.x+'%;top:'+bo.y+'%;--pc:'+ELC[bo.el]+';--pc2:'+ZC2[bo.el]+'"><img src="'+MOB[bo.name]+'" alt="'+bo.name+'"><span class="plabel">'+bo.name+'</span></div>';
  poi+='<div class="ovnum" style="left:'+bo.nx+'%;top:'+bo.ny+'%;--pc:'+ELC[bo.el]+';--pc2:'+ZC2[bo.el]+'">'+bo.n+'</div>';
  var startDot='';
  if(p.n===1){ startDot=ovDot(17.7,42.4,'S'); }
  else { var pb=BOSSN[p.n-1]; poi+='<div class="ovnum" style="left:'+pb.nx+'%;top:'+pb.ny+'%;--pc:'+ELC[pb.el]+';--pc2:'+ZC2[pb.el]+'">'+pb.n+'</div>'; }
  var svg='<svg class="ovroute" viewBox="0 0 100 100" aria-hidden="true"><polyline class="ovrail" points="'+seg+'"/><polyline class="ovflow" points="'+seg+'"/>'+startDot+'</svg>';
  return '<div class="ovmap phasemap mapfig"><img src="'+MAPIMG+'" alt="Carte Phase '+p.n+'" loading="lazy">'+svg+'<div class="ovpoi">'+poi+'</div></div>';
}



const TL=document.createElement('div');TL.className='timeline';app.appendChild(TL);
const startNode=document.createElement('div');startNode.className='tlstart';startNode.innerHTML='<span class="tldot">S</span><span class="tllab">Start · Device</span>';TL.appendChild(startNode);
PHASES.forEach(p=>{
  const sec=document.createElement("section");
  sec.className="phase"; sec.id="phase"+p.n;
  let cards="";
  p.cards.forEach(c=>{
    let groups="";
    c.groups.forEach(g=>{
      var gthumb='';
      if(g.img && MOB[g.img]){ var gpk=PACKS.find(function(x){return x.name===g.img;}); var gac=gpk?ELC[gpk.el]:'var(--r-buff)';
        gthumb='<span class="gthumb" style="--ac:'+gac+'"><img src="'+MOB[g.img]+'" alt="'+g.img+'"></span>'; }
      var glabelHtml='<div class="glabel '+(g.cls||"")+'">'+colorize(tr(g.label))+'</div>';
      var headHtml = g.img ? '<div class="ghead">'+gthumb+glabelHtml+'</div>' : glabelHtml;
      groups+='<div class="grp '+(g.cls||"")+(g.img?' hasimg':'')+'">'+headHtml+(g.note?'<div class="gnote">'+esc(tr(g.note))+'</div>':'')+groupBody(g)+'</div>';
    });
    // portrait(s) du/des mob(s) + couleur d'accent
    var mks=[], acc='var(--r-buff)';
    if(c.kind==="boss"){ var bb=BOSSN[p.n]; if(bb){ mks=[bb.name]; acc=ELC[bb.el]; } }
    else { var nm=tr(c.name)+" "+c.name; mks=Object.keys(MOB).filter(function(k){return nm.indexOf(k)>=0;});
      var pk=PACKS.find(function(x){return mks.indexOf(x.name)>=0;}); if(pk) acc=ELC[pk.el]; }
    if(c.noHeadImg) mks=[];
    var thumbHtml = mks.length ? '<span class="cthumbs'+(mks.length>1?' multi':'')+'">'+mks.map(function(k){return '<span class="cthumb"><img src="'+MOB[k]+'" alt="'+k+'"></span>';}).join('')+'</span>' : '';
    cards+='<div class="card '+(c.kind==="boss"?"boss":"pack")+'" style="--ac:'+acc+'">'
      +'<div class="chead">'+thumbHtml
      +'<div class="chmeta"><div class="chtop"><span class="ckind '+c.kind+'">'+(c.kind==="boss"?"BOSS":"FARM")+'</span>'
      +'<span class="cname">'+esc(tr(c.name))+'</span></div>'
      +'<span class="ctag">'+colorize(tr(c.tag))+'</span></div></div>'
      +'<div class="cbody">'+groups+'</div></div>';
  });
  const buffsHtml='<div class="buffs"><span class="bhead">'+tr("Trajet · buffs de déplacement")+'</span>'
    + p.buffs.map(b=>'<span class="bl'+(b.warn?' warn':'')+'" data-r="'+(b.r||['ALL']).join(' ')+'"'+(b.comp?' data-comp="'+b.comp+'"':'')+'>'+roleChip(b.r[0])+'<span>'+(Array.isArray(b.t)?'<ul class="acts">'+b.t.map(function(it){return '<li>'+colorize(tr(it))+'</li>';}).join('')+'</ul>':colorize(tr(b.t)))+'</span></span>').join("")+'</div>';
  const mapHtml = p.map ? '<figure class="mapfig" data-full="'+p.map+'">'
      +'<img src="'+p.map+'" alt="Carte Phase '+p.n+' · '+esc(p.boss)+'" loading="lazy" onerror="this.closest(\'.mapfig\').classList.add(\'missing\')">'
      +'<div class="mapmiss">Carte non trouvée · ajoute <code>'+esc(p.map)+'</code> dans le dépôt (dossier <code>maps/</code>).</div>'
      +'<figcaption>Carte · Phase '+p.n+' · '+esc(p.boss)+'<span class="zoomhint"> · cliquer pour agrandir</span></figcaption>'
      +'</figure>' : '';
  const numPill=(k)=>{const bb=BOSSN[k];return '<span class="segpill" style="--sc:'+ELC[bb.el]+'">'+k+'</span>';};
  const fromHtml=p.n===1?'<span class="segstart">Start</span>':numPill(p.n-1);
  const segHtml='<span class="pseg">'+fromHtml+'<span class="segar">→</span>'+numPill(p.n)+'</span>';
  const bz=BOSSN[p.n];
  sec.style.setProperty('--pc',ELC[bz.el]); sec.style.setProperty('--pc2',ZC2[bz.el]);
  sec.innerHTML='<div class="tlnode" style="--pc:'+ELC[bz.el]+';--pc2:'+ZC2[bz.el]+'">'+p.n+'</div>'
    +'<div class="phcard">'
    +'<div class="phhead">'
    +'<div class="phtop"><span class="phtag">PHASE '+p.n+'</span>'+segHtml+'</div>'
    +'<h2 class="phtitle">'+esc(tr(p.title))+'</h2>'
    +'<div class="phroute"><span class="rk">'+tr("Déplacement :")+'</span> '+esc(tr(p.route))+'</div>'
    +'</div>'
    +'<div class="pgrid"><div class="pleft">'
    +buffsHtml
    +'<div class="cards">'+cards+'</div>'
    +'</div></div>'
    +'</div>';
  TL.appendChild(sec);
});

// nav phases
const nav=document.getElementById("nav");
PHASES.forEach(p=>{
  const a=document.createElement("a");a.href="#phase"+p.n;a.className="chip";
  a.innerHTML='<b>'+p.n+'</b>'+esc(p.boss);
  nav.appendChild(a);
});
const navLinks=[...nav.querySelectorAll('.chip')];
if('IntersectionObserver' in window){
  const spy=new IntersectionObserver((ents)=>{ents.forEach(e=>{if(e.isIntersecting){const id=e.target.id;navLinks.forEach(a=>a.classList.toggle('navactive',a.getAttribute('href')==='#'+id));}});},{rootMargin:'-45% 0px -50% 0px'});
  document.querySelectorAll('.phase').forEach(s=>spy.observe(s));
}
function placeNodes(){
  document.querySelectorAll('.phase').forEach(function(ph){
    var node=ph.querySelector('.tlnode'), head=ph.querySelector('.phhead');
    if(node&&head){ var pr=ph.getBoundingClientRect(), hr=head.getBoundingClientRect();
      node.style.top=Math.max(0,(hr.top-pr.top)+(hr.height/2)-19)+'px'; }
  });
}
placeNodes();
window.addEventListener('resize',placeNodes);
window.addEventListener('load',function(){placeNodes();setTimeout(placeNodes,300);});
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(placeNodes);}
setTimeout(placeNodes,600);

// filtre par job
const jobsEl=document.getElementById("jobs");
const allBtn=document.createElement("button");allBtn.className="chip on";allBtn.id="jobAll";allBtn.textContent=tr("Tous");
jobsEl.appendChild(allBtn);
JOBS.forEach(j=>{
  const b=document.createElement("button");b.className="chip jobchip";b.dataset.j=j;b.textContent=j;
  b.style.setProperty("--jc",jcol(j));
  jobsEl.appendChild(b);
});
const soloBtn=document.createElement("button");soloBtn.className="chip";soloBtn.id="soloToggle";soloBtn.textContent="Solo";soloBtn.title=tr("N'afficher que mon rôle");
jobsEl.appendChild(soloBtn);
let curJob=null;
function lineHidden(el){
  const comp=document.body.getAttribute("data-comp");
  const roles=(el.dataset.r||"").split(" ");
  // comp flex : PLD et DNC s'excluent — on cache le job flex absent
  const other = comp==="PLD" ? "DNC" : "PLD";
  if(roles.indexOf(other)>=0) return true;
  const dc=el.dataset.comp;
  if(dc && dc!==comp) return true;
  if(document.body.classList.contains("solo") && curJob){
    if(roles.indexOf("ALL")<0 && roles.indexOf(curJob)<0) return true;
  }
  return false;
}
function applyFilter(){
  const solo=document.body.classList.contains("solo") && !!curJob;
  document.querySelectorAll(".line").forEach(el=>{
    const roles=(el.dataset.r||"").split(" ");
    el.classList.toggle("solohide", solo && roles.indexOf("ALL")<0 && roles.indexOf(curJob)<0);
  });
  document.querySelectorAll(".grp").forEach(g=>{
    g.classList.toggle("emptyhide", ![...g.querySelectorAll(".line")].some(l=>!lineHidden(l)));
  });
  document.querySelectorAll(".card").forEach(c=>{
    c.classList.toggle("emptyhide", ![...c.querySelectorAll(".line")].some(l=>!lineHidden(l)));
  });
  document.querySelectorAll(".buffs .bl").forEach(el=>{
    const roles=(el.dataset.r||"").split(" ");
    el.classList.toggle("solohide", solo && roles.indexOf("ALL")<0 && roles.indexOf(curJob)<0);
  });
  document.querySelectorAll(".buffs").forEach(bf=>{
    bf.classList.toggle("emptyhide", ![...bf.querySelectorAll(".bl")].some(l=>!lineHidden(l)));
  });
  if(typeof placeNodes==='function') requestAnimationFrame(placeNodes);
}
function setJob(j){
  curJob=j;
  document.querySelectorAll("#jobs .jobchip").forEach(b=>b.classList.remove("on"));allBtn.classList.remove("on");
  if(!j){allBtn.classList.add("on");document.body.classList.remove("jobsel");}
  else{const bb=document.querySelector('#jobs .jobchip[data-j="'+j+'"]');if(bb)bb.classList.add("on");document.body.classList.add("jobsel");}
  document.querySelectorAll(".line").forEach(el=>{
    const roles=(el.dataset.r||"").split(" ");
    el.classList.toggle("match", !!j && roles.indexOf(j)>=0);
  });
  try{localStorage.setItem("sortie_role", j||"");}catch(e){}
  applyFilter();
}
jobsEl.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.id==="langToggle")return;
  if(b.id==="soloToggle"){
    document.body.classList.toggle("solo");
    soloBtn.classList.toggle("on",document.body.classList.contains("solo"));
    try{localStorage.setItem("sortie_solo",document.body.classList.contains("solo")?"1":"0");}catch(e){}
    applyFilter();return;
  }
  if(b.id==="jobAll")setJob(null);
  else setJob(b.dataset.j===curJob?null:b.dataset.j);
});

// sélecteur de comp (flex PLD / DNC)
const compEl=document.getElementById("comp");
function setComp(c){
  document.body.setAttribute("data-comp",c);
  compEl.querySelectorAll(".compchip").forEach(b=>b.classList.toggle("on",b.dataset.c===c));
  try{localStorage.setItem("sortie_comp",c);}catch(e){}
  const other=c==="PLD"?"DNC":"PLD";
  if(curJob===other)setJob(null);
  applyFilter();
}
compEl.addEventListener("click",e=>{const b=e.target.closest(".compchip");if(b)setComp(b.dataset.c);});
let initComp="PLD";try{const s=localStorage.getItem("sortie_comp");if(s==="PLD"||s==="DNC")initComp=s;}catch(e){}
setComp(initComp);
try{if(localStorage.getItem("sortie_solo")==="1"){document.body.classList.add("solo");soloBtn.classList.add("on");}}catch(e){}
try{var savedRole=localStorage.getItem("sortie_role");
  if(savedRole){ if(savedRole==="PLD"||savedRole==="DNC"){ if(savedRole===initComp) setJob(savedRole); else applyFilter(); } else if(JOBS.indexOf(savedRole)>=0){ setJob(savedRole); } else applyFilter(); }
  else applyFilter();
}catch(e){applyFilter();}

// lightbox pour agrandir les cartes
const lb=document.createElement("div");lb.className="lightbox hide";lb.innerHTML='<div class="lbstage"></div>';
document.body.appendChild(lb);
const lbStage=lb.querySelector(".lbstage");
function closeLb(){lb.classList.add("hide");lbStage.innerHTML="";}
document.getElementById("app").addEventListener("click",e=>{
  const fig=e.target.closest(".mapfig");if(!fig)return;
  if(fig.classList.contains("ovmap")){
    // carte d'ensemble : on clone tout le bloc (fond + pointillé animé + pastilles)
    const clone=fig.cloneNode(true);
    clone.classList.remove("mapfig");clone.classList.add("lbov");
    lbStage.innerHTML="";lbStage.appendChild(clone);
  }else{
    const img=e.target.closest(".mapfig img")||fig.querySelector("img");if(!img)return;
    lbStage.innerHTML='<img alt="Carte agrandie" src="'+img.src+'">';
  }
  lb.classList.remove("hide");
});
lb.addEventListener("click",closeLb);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLb();});

// (animation d'apparition des cartes retirée — affichage direct)

const sbar=document.getElementById("sbar");
function upbar(){const h=document.documentElement;const max=h.scrollHeight-h.clientHeight;sbar.style.width=(max>0?(h.scrollTop/max*100):0)+"%";}
window.addEventListener("scroll",upbar,{passive:true});
window.addEventListener("resize",upbar);
upbar();

// ---- contr\u00f4les : th\u00e8me + langue ----
document.documentElement.lang=LANG;
(function(){
  const host=document.getElementById("topctl")||jobsEl;
  // th\u00e8me clair / sombre
  const themeBtn=document.createElement("button");
  themeBtn.className="chip ctlbtn"; themeBtn.id="themeToggle";
  function paintTheme(){
    var cur=document.documentElement.getAttribute("data-theme")||"dark";
    themeBtn.textContent = cur==="light" ? "\u263e" : "\u2600";
    themeBtn.title = cur==="light" ? (LANG==='en'?"Dark mode":"Passer en sombre") : (LANG==='en'?"Light mode":"Passer en clair");
  }
  paintTheme();
  themeBtn.addEventListener("click",function(){
    var cur=document.documentElement.getAttribute("data-theme")||"dark";
    var nx=cur==="light"?"dark":"light";
    document.documentElement.setAttribute("data-theme",nx);
    try{localStorage.setItem("sortie_theme",nx);}catch(e){}
    paintTheme();
    if(typeof placeNodes==='function') requestAnimationFrame(placeNodes);
  });
  host.appendChild(themeBtn);
  // langue FR / EN
  const langBtn=document.createElement("button");
  langBtn.className="chip ctlbtn"; langBtn.id="langToggle";
  langBtn.textContent = LANG==='en' ? 'FR' : 'EN';
  langBtn.title = LANG==='en' ? 'Passer en fran\u00e7ais' : 'Switch to English';
  langBtn.addEventListener("click",function(){ try{localStorage.setItem("sortie_lang", LANG==='en'?'fr':'en');}catch(e){} location.reload(); });
  host.appendChild(langBtn);
})();
// mesure de la hauteur du sticky pour les offsets d'ancre
(function(){
  const stick=document.querySelector(".topstick");
  function measure(){ if(stick) document.documentElement.style.setProperty("--stickh",stick.offsetHeight+"px"); }
  measure(); window.addEventListener("resize",measure);
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(measure);}
})();
if(LANG==='en'){
  document.title="SORTIE \u00b7 Run guide";
  document.querySelectorAll(".rlabel").forEach(function(el){ if(el.textContent.trim()==="Mon r\u00f4le") el.textContent="My role"; });
  var bsub=document.querySelector(".bsub");
  if(bsub) bsub.innerHTML='Run \u00b7 4 phases \u00b7 fixed <span class="jc" style="color:var(--r-dd)">MNK</span><span class="jc" style="color:var(--r-buff)">BRD</span><span class="jc" style="color:var(--r-buff)">COR</span><span class="jc" style="color:var(--r-buff)">GEO</span><span class="jc" style="color:var(--r-heal)">RDM</span> + 1 flex (<span class="jc" style="color:var(--r-tank)">PLD</span> or <span class="jc" style="color:var(--r-dd)">DNC</span>)';
  var foot=document.querySelector(".foot");
  if(foot) foot.textContent="Run strategy \u00b7 interactive layout \u00b7 click your job to highlight your actions.";
}
