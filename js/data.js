/* ============================================================
   data.js — CONTENU DE LA STRAT (Sortie · Nightfallens)
   ------------------------------------------------------------
   TOUT ce qui change quand on corrige ou ajoute du contenu
   (jobs, phases, boss, packs, buffs, images) vit ICI.
   Le moteur de rendu est dans app.js — pas besoin d'y toucher.
   ⚠ Ce fichier est chargé AVANT app.js.
   ============================================================ */

// ---- composition du groupe ----
// La strat se conçoit AVANT d'être écrite : combien on est, et avec quels jobs.
// `taille` = le nombre de joueurs visé. 6 en party, 12 ou 18 en alliance —
// ça dépend de l'event et de la strat.
// `creneaux` = une place par entrée. Une place tenue par PLUSIEURS jobs, ce
// sont des remplaçants : la place est la même, la personne change. Ici les
// cinq premières places sont fixes, la sixième se tient au PLD ou au DNC —
// et c'est exactement ce que fait la bascule en haut du guide.
// Tout le reste se déduit : la liste des jobs (boutons du filtre « Mon rôle »),
// et les façons de jouer la strat. Un seul job par créneau = une seule façon
// de jouer, et le sélecteur disparaît.
// Réglable dans Strat Studio (bouton « Compo ») — l'outil réécrit ce bloc.
const COMPO={taille:6,creneaux:[
 ["MNK"],
 ["BRD"],
 ["COR"],
 ["GEO"],
 ["RDM"],
 ["PLD","DNC"]
]};
// ROLE = les 22 jobs de FFXI, pas seulement la comp. UN rôle par job : il donne
// la COULEUR du badge, et il appartient à CETTE strat — NIN peut tanker ici et
// DPS dans une autre. Réglable dans Strat Studio (bouton « Rôles »), ne pas
// éditer les lignes ci-dessous à la main : l'outil les réécrit.
//
// Répartition décidée par Eric : tank = PLD RUN · heal = WHM RDM SCH SMN ·
// buff = BRD COR GEO · DD = tout le reste.
const ROLE={
 "PLD":"tank","RUN":"tank",
 "WHM":"heal","RDM":"heal","SCH":"heal","SMN":"heal",
 "BRD":"buff","COR":"buff","GEO":"buff",
 "WAR":"dd","MNK":"dd","THF":"dd","BLM":"dd","DRK":"dd","BST":"dd","RNG":"dd","SAM":"dd","NIN":"dd","DRG":"dd","BLU":"dd","PUP":"dd","DNC":"dd",
 "ALL":"all"
};

// ---- fabrique de ligne (r = rôles, t = texte ou liste, opt = {cond,warn,comp}) ----
// helper lignes
function ln(r,t,opt){opt=opt||{};return {r:r,t:t,cond:opt.cond,warn:opt.warn,comp:opt.comp};}

// ---- images des mobs / boss ----
const MOB={"Degei": "img/mob-degei.webp", "Skomora": "img/mob-skomora.webp", "Leshonn": "img/mob-leshonn.webp", "Ghatjot": "img/mob-ghatjot.webp", "Acuex": "img/mob-acuex.webp", "Fomor": "img/mob-fomor.webp", "Ghost": "img/mob-ghost.webp", "Umbril": "img/mob-umbril.webp",
  "Dhartok": "img/mob-dhartok.webp", "Gartell": "img/mob-gartell.webp", "Triboulex": "img/mob-triboulex.webp", "Aita": "img/mob-aita.webp", "Aminon": "img/mob-aminon.webp",
  "Botulus": "img/mob-botulus.webp", "Ixion": "img/mob-ixion.webp", "Naraka": "img/mob-naraka.webp", "Tulittia": "img/mob-tulittia.webp",
  "Slime": "img/mob-slime.webp", "Slug": "img/mob-slug.webp", "Flan": "img/mob-flan.webp",
  "Obdella": "img/mob-obdella.webp", "Porxie": "img/mob-porxie.webp", "Bhoot": "img/mob-bhoot.webp", "Deleterious": "img/mob-deleterious.webp"};
// échelle globale des images de mobs (garde le ratio entre elles) — réglable dans Map Studio
const MOBSCALE=1;
// marge des labels de mobs (px), identique partout — réglable dans Map Studio ; position par pastille via lp:'top|bottom|left|right'
const LBLMARGIN=0;

// ---- points sur la carte : boss (ordre) + packs ----
const BOSSES=[
 {name:'Ghatjot',n:4,el:'fire', x:11.7,y:6.4, nx:20.4,ny:7.9, label:'<span style="color:#ff8f6a">Ghatjot</span>'},
 {name:'Leshonn',n:3,el:'blue', x:95,y:7.1, nx:89.1,ny:7.9, label:'<span style="color:#5bd6ef">Leshonn</span>'},
 {name:'Degei',n:1,el:'gray', x:20.4,y:85.8, nx:20.4,ny:76.7, label:'Degei'},
 {name:'Skomora',n:2,el:'green', x:88.9,y:85.9, nx:89.1,ny:76.7, label:'<span style="color:#8affc0">Skomora</span>'},
];
const PACKS=[
 {name:'Acuex', el:'red', x:29.9,y:54.7, q:'', ph:1, lp:'top', label:'<c><span style="color:#fd7777">Acuex</span>\n<c>X12'},
 {name:'Fomor', el:'gray', x:26.9,y:68.1, q:'', ph:1, label:'<c><u>Fomors</u>\n<c>WHM X5\n<c>BLM X5\n<c>RDM X5'},
 {name:'Ghost', el:'green', x:67.4,y:67.4, q:'X12', ph:2, label:'<c><u><span style="color:#1eff00">Ghost</span></u>\n<c>X12'},
 {name:'Umbril', el:'blue', x:79.8,y:29.8, q:'X12', ph:3, label:'<c><u><span style="color:#009dff">Umbril</span></u>\n<c>X12'},
];

// ---- jeux de buffs ----
// Un bloc de préparation, posé en tête d'une étape. Son NOM est ce que le guide
// affiche en titre du bloc : on l'écrit, il n'est pas imposé par le moteur.
// Une étape s'y rattache par ce nom (« buffs:"Buffs de trajet" »), donc corriger
// un jeu le corrige dans toutes les étapes qui s'en servent.
// Réglable dans Strat Studio — ne pas éditer à la main, l'outil réécrit le bloc.
const BUFFS={
 "Buffs de départ":[
  ln(["ALL"],"Au Start : on attend Mazurka (BRD) et/ou Bolter's (COR) · on passe PAS la porte tant qu'on n'a pas l'un ou l'autre",{warn:1,comp:"PLD"}),
  ln(["ALL"],"Au Start : on attend Mazurka (BRD), Bolter's (COR) et/ou Chocobo Jig (DNC) · on passe PAS la porte tant qu'on n'a pas de move speed",{warn:1,comp:"DNC"}),
  ln(["COR"],"Bolter's + Tactician's"),
  ln(["BRD"],"Mazurka"),
  ln(["DNC"],"Chocobo Jig")
 ],
 "Buffs de trajet":[
  ln(["COR"],"Bolter's (Tactician's déjà posé)"),
  ln(["DNC"],"Chocobo Jig")
 ],
 "Buffs avant le dernier boss":[
  ln(["COR"],"Bolter's + Tactician's"),
  ln(["DNC"],"Chocobo Jig")
 ],
 "Buffs de trajet · sous-sol":[
  ln(["ALL"],"Sneak + Invisible"),
  ln(["COR"],"Bolter's + Tactician's")
 ]
};

// ---- PHASES : le cœur de la strat ----
const PHASES=[
{n:1,boss:"Degei",map:"",title:"Double Farm · Acuex + Fomor → Degei",route:"Depuis le Start (centre-gauche) · mur de droite, plein SUD → coin bas-gauche.",buffs:"Buffs de départ",cards:[
  {kind:"pack",name:"Double Farm · Acuex ×3 + Fomor ×3",tag:"le PLD amène les Acuex au camp Fomor, tank tout · 3 Acuex + 3 Fomor → pop les coffres",noHeadImg:true,groups:[
    {label:"Setup · au camp Fomor",cls:"tank",lines:[
      ln(["PLD"],["prend les Acuex → les amène au camp Fomor","tank tout (Acuex + Fomor)"]),
      ln(["ALL"],"on buff au camp Fomor · on farm les deux en même temps")
    ]},
    {label:"Buff · farm",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["GEO"],["Acumen","Malaise"]),
      ln(["BRD"],["Honor March","Victory March"])
    ]},
    {label:"Fomor ×3 · SC Step 4",cls:"dd",img:"Fomor",lines:[
      ln(["MNK"],"Shijin Spiral → Tornado Kick (SC Step 4) ×3",{comp:"PLD"}),
      ln(["DNC"],"Dancing Edge ×4")
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
      ln(["DNC"],["spam Ruthless Stroke","Switch Rudra's Storm si Degei est Fire / Wind / Thunder"])
    ]}
  ]}
]},
{n:2,boss:"Skomora",map:"",title:"Ghost → Skomora",route:"Mur de droite, plein EST → coin bas-droite (Ghost ×3, puis Skomora, case N).",buffs:"Buffs de trajet",cards:[
  {kind:"pack",name:"Pack · Ghost ×3",tag:"weak Fire · SC → MB Fire",groups:[
    {label:"Buff · farm",cls:"buff",lines:[
      ln(["COR"],["Chaos Roll","Samurai Roll"]),
      ln(["GEO"],["Acumen","Malaise"]),
      ln(["BRD"],["Honor March","Victory March"]),
      ln(["COR"],"tape (DPS)")
    ]},
    {label:"DD · SC",cls:"dd",lines:[
      ln(["MNK"],"Victory Smite ×2"),
      ln(["DNC"],"Ruthless Stroke ×2 = Fusion")
    ]},
    {label:"MB Fire",cls:"mb",lines:[
      ln(["RDM","GEO"],"MB Fire sur le SC")
    ]}
  ]},
  {kind:"boss",name:"Boss · Skomora",tag:"SC Light à mort",groups:[
    {label:"PLD",cls:"tank",lines:[
      ln(["PLD"],"tank sur place"),
      ln(["PLD"],"Holy Circle + Sepulcher")
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
      ln(["DNC"],"spam Ruthless Stroke")
    ]}
  ]}
]},
{n:3,boss:"Leshonn",map:"",title:"Umbril → Leshonn",route:"Mur de droite, plein NORD → coin haut-droite (Umbril ×5, puis Leshonn).",buffs:"Buffs de trajet",cards:[
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
      ln(["DNC"],"Rudra's Storm ×2 = Darkness"),
      ln(["COR"],"spam Savage Blade"),
      ln(["RDM","GEO"],"MB Earth sur le SC")
    ]},
    {label:"◈ Mains WIND → proc Ice",cls:"",lines:[
      ln(["MNK"],"Shijin Spiral > Tornado Kick (Induration)"),
      ln(["DNC"],"Rudra's Storm ×2 = Darkness"),
      ln(["COR"],"spam Savage Blade"),
      ln(["RDM","GEO"],"MB Ice sur le SC"),
      ln(["ALL"],"Chokehold vole les buffs = wipe → proc opposé / kill vite (Asylum si WHM)",{warn:1})
    ]}
  ]}
]},
{n:4,boss:"Ghatjot",map:"",title:"Ghatjot (pas de farm)",route:"Mur de droite, plein OUEST → coin haut-gauche (Ghatjot). Pas de farm.",buffs:"Buffs avant le dernier boss",cards:[
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
      ln(["DNC"],"Ruthless Stroke (jamais Darkness)")
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

/* ============================================================
   SOUS-SOL (Basement · secteurs E-H) — SQUELETTE
   À compléter en run. Ordre actuel (modifiable) :
   Dhartok (E) → Triboulex (G) → Aïta (H) → Gartell (F).
   Aminon (E) = boss final, pas encore fait.
   ============================================================ */
const PHASES_B=[
{n:1,sector:"E",boss:"Dhartok",title:"Secteur E · Dhartok",route:"",buffs:"Buffs de trajet · sous-sol",cards:[
  {kind:"pack",klabel:"MIDBOSS",name:"Sur le trajet",tag:"comp DNC",noHeadImg:true,groups:[
    {label:"Botulus",cls:"",lines:[
      ln(["DNC"],"On tue Botulus sur le trajet : dégâts dans le dos, et on stun chacun de ses TP moves au Flat Blade")
    ]}
  ]},
  {kind:"boss",name:"Boss · Dhartok",tag:"à définir",groups:[]}
]},
{n:2,sector:"G",boss:"Triboulex",title:"Secteur G · Triboulex",route:"",buffs:"Buffs de trajet · sous-sol",cards:[
  {kind:"pack",klabel:"MIDBOSS",name:"Sur le trajet",tag:"comp DNC",noHeadImg:true,groups:[
    {label:"Naraka",cls:"",lines:[
      ln(["DNC"],"On tue Naraka sur le trajet : dégâts dans le dos, et on stun chacun de ses TP moves au Flat Blade")
    ]}
  ]},
  {kind:"boss",name:"Boss · Triboulex",tag:"à définir",groups:[]}
]},
{n:3,sector:"H",boss:"Aita",title:"Secteur H · Aïta",route:"On file directement au boss.",buffs:"Buffs de trajet · sous-sol",cards:[
  {kind:"boss",name:"Boss · Aïta",tag:"à définir",groups:[]}
]},
{n:4,sector:"F",boss:"Gartell",title:"Secteur F · Gartell",route:"On file directement au boss.",buffs:"Buffs de trajet · sous-sol",cards:[
  {kind:"boss",name:"Boss · Gartell",tag:"à définir",groups:[]}
]},
{n:5,sector:"E",boss:"Aminon",soon:true,title:"Aminon · boss final (E)"}
];
const BOSSES_B=[
 {name:'Dhartok',n:1,el:'red', x:27.6,y:22, nx:28,ny:27.9, lp:'top'},
 {name:'Triboulex',n:2,el:'green', x:74.8,y:83.5, nx:75,ny:75},
 {name:'Aita',n:3,el:'gray', x:28.1,y:83, nx:28.1,ny:74.9},
 {name:'Gartell',n:4,el:'blue', x:83.6,y:27.5, nx:74.9,ny:28, lp:'right'},
 {name:'Aminon',n:5,el:'dark', x:13.5,y:51.5, nx:20.2,ny:51.5, lp:'left'},
];
const PACKS_B=[
];
// midboss (NM mineurs) — un par secteur
const MIDS_B=[
 {name:'Botulus', el:'earth', x:22.3,y:38.8, lp:'left'},
 {name:'Ixion', el:'thunder', x:51.4,y:22.7, lp:'top'},
 {name:'Naraka', el:'ice', x:80.3,y:58.4, lp:'right'},
 {name:'Tulittia', el:'dark', x:51.6,y:80.5},
];
// chemins vers chaque boss (indépendants, un par zone, depuis le hub central)
const ROUTES_B=[
 {n:1, el:'earth', fs:0.5, points:'51.5,45.7 51.5,39 45.3,39 45.3,36 42.3,36 38.5,42.1 32.8,42.1 32.8,35.8 26.6,35.9 26.6,30.9 28,27.9'},
 {n:2, el:'ice', a:1, fs:0.5, points:'51.5,57.2 51.5,64.1 57.8,64.1 57.8,67.1 60.4,67.1 64.7,60.9 70.4,60.9 70.4,67.1 76.6,67.1 76.6,72 75,75'},
 {n:3, el:'dark', fs:0.5, points:'45.8,51.7 38.9,51.7 38.9,57.8 36,57.8 36,60.5 42.2,64.8 42.2,70.3 36,70.3 36,76.5 30.9,76.5 28.1,74.9'},
 {n:4, el:'thunder', fs:0.5, points:'57.2,51.6 64.2,51.6 64.2,45.3 67.1,45.3 67.1,42.6 60.9,38.2 60.9,32.8 67.1,32.8 67.1,26.5 72.1,26.5 74.9,28.1'},
];
// ---- annotations texte (outil Texte de Map Studio) · {x,y,t,s,c} · s = taille en % de carte ----
const TEXTS_B=[
];
// ---- formes libres (outils Formes / Image) · {k,x,y,w,h,...} · k = rect | ell | img ----
const SHAPES_B=[
];

// ---- zones du sous-sol : chacune a SA carte + son boss/midboss/chemin ----
const ZONES_B=[
 {sector:'E', map:'img/map-e.webp', n:1, mid:'Botulus'},
 {sector:'F', map:'img/map-f.webp', n:4, mid:'Ixion'},
 {sector:'G', map:'img/map-g.webp', n:2, mid:'Naraka'},
 {sector:'H', map:'img/map-h.webp', n:3, mid:'Tulittia'},
];
// zones du rez-de-chaussée : PAS de carte par zone (la carte générale reste entière),
// on filtre juste le contenu affiché. A=Ghatjot, B=Leshonn, C=Skomora, D=Degei.
const ZONES_TOP=[
 {sector:'A', n:4, mid:'Obdella'},
 {sector:'B', n:3, mid:'Porxie'},
 {sector:'C', n:2, mid:'Bhoot'},
 {sector:'D', n:1, mid:'Deleterious'},
];

// ---- intros de la vue d'ensemble (FR / EN) ----
const OVINTRO_TOP_FR='<p><b>Sortie · run linéaire en 4 phases.</b> On suit le <b>mur de droite</b> depuis le Start jusqu\'au dernier boss, en enchaînant Degei → Skomora → Leshonn → Ghatjot. Chaque phase : un <b>farm</b> (pop des coffres) puis le <b>boss</b>.</p><p class="ovi-tip">Clique ton job dans <b>Mon rôle</b> (ou <b>Solo</b> pour ne voir que tes actions), choisis la <b>comp</b> en haut, puis descends le long du rail.</p>';
const OVINTRO_TOP_EN='<p><b>Sortie · linear run, 4 phases.</b> Follow the <b>right wall</b> from Start to the last boss: Degei → Skomora → Leshonn → Ghatjot. Each phase: a <b>farm</b> (pop the chests) then the <b>boss</b>.</p><p class="ovi-tip">Click your job in <b>My role</b> (or <b>Solo</b> to see only your actions), pick the <b>comp</b> at the top, then scroll down the rail.</p>';
const OVINTRO_BOT_FR='<p><b>Sous-sol · secteurs E → H.</b> 4 boss majeurs : Dhartok (E), Triboulex (G), Aïta (H), Gartell (F), puis <b>Aminon</b> en boss final.</p><p class="ovi-tip">🚧 Strat en cours d\'écriture — on la complète run après run. La carte et le placement des points arrivent bientôt.</p>';
const OVINTRO_BOT_EN='<p><b>Basement · sectors E → H.</b> Four major NMs: Dhartok (E), Triboulex (G), Aita (H), Gartell (F), then <b>Aminon</b> as the final boss.</p><p class="ovi-tip">🚧 Strategy is being written — filled in run after run. Map and point placement coming soon.</p>';

// tracé du chemin (overview top floor)
const OVPTS_TOP="17.7,42.4 23.6,42.4 23.6,51.5 26.7,51.6 26.7,60.9 23.6,61.0 23.7,73.4 35.9,73.4 36.0,70.8 39.1,70.3 39.6,67.3 45.3,67.3 45.4,73.4 64.1,73.4 64.2,70.4 73.4,70.4 73.5,73.5 85.9,73.5 85.9,61.0 82.9,60.9 82.8,57.9 79.7,57.8 79.7,51.6 86.0,51.5 86.0,33.4 82.9,32.9 82.9,23.5 86.0,23.4 85.9,11.2 73.6,11.2 73.5,14.3 70.4,14.3 70.3,17.1 64.1,17.1 64.0,11.1 45.5,11.1 45.4,14.2 36.0,14.2 35.9,10.9 20.4,10.9 20.4,8.3";
// étage haut : tronçons du chemin par étape (1→4), découpés depuis OVPTS_TOP aux coins des boss
const ROUTES_TOP=[
 {n:1, el:'red', c1:'#949494', a:1, fs:0.5, points:'17.3,42.3 23.7,42.3 23.7,46.5 23.7,51.5 26.7,51.6 26.7,60.9 23.6,60.8 23.6,76.6 20.5,76.6'},
 {n:2, el:'red', c1:'#49a300', a:1, fs:0.51, points:'24.7,73.6 26.8,73.1 30.9,73.6 36.1,73.5 36.1,70.4 39.1,70.4 39.1,67.3 45.5,67.3 45.5,73.6 64.1,73.5 64.1,70.3 70.4,70.3 73.5,70.4 73.5,73.5 89.2,73.6 89.2,76.7'},
 {n:3, el:'red', c1:'#005fdb', a:1, fs:0.5, points:'86.3,72.7 85.5,71 86,66 86,61.1 83,61.1 83,57.9 79.8,58 79.8,51.6 86.1,51.6 86.1,46.4 86.1,38.2 86.1,33 83,33 83,23.6 86,23.6 86.1,8 89.2,8'},
 {n:4, el:'red', c1:'#c70000', a:1, fs:0.5, points:'85.1,11 83.2,11.6 78.5,11.1 73.5,11.2 73.5,14.3 70.4,14.3 70.4,17.4 64.1,17.3 64.1,11.1 50.7,11.1 45.4,11.1 45.5,14.3 36.1,14.2 36.1,11.1 20.4,11 20.4,8'},
];
const TEXTS=[
];
// ---- formes libres (outils Formes / Image) · {k,x,y,w,h,...} · k = rect | ell | img ----
const SHAPES=[
];

// ---- midboss (NM mineurs) du rez-de-chaussée : Obdella=A, Porxie=B, Bhoot=C, Deleterious=D ----
const MIDS_TOP=[
 {name:'Obdella', el:'red', x:42.2,y:26.2, label:'<span style="color:#ff8f6a">Obdella</span>'},
 {name:'Porxie', el:'blue', x:69.1,y:27.9, label:'<span style="color:#5bd6ef">Porxie</span>'},
 {name:'Bhoot', el:'green', x:67.3,y:53.5, label:'<span style="color:#8affc0">Bhoot</span>'},
 {name:'Deleterious', el:'gray', x:40.6,y:51.6, label:'Deleterious'},
];

// ---- CARTES ----
// Une carte est un MODULE autonome : son fond, ses marqueurs, ses tracés, ses
// annotations. Elle ne sait rien de la stratégie qui s'en sert — et deux
// chapitres, ou deux strats différentes, peuvent pointer la même. C'est ce qui
// permet d'en dessiner une puis de la réutiliser ailleurs.
// Les tableaux ci-dessous sont ceux que l'atelier Carte réécrit ; la carte ne
// fait que les rassembler sous un nom.
const CARTES={
 "Sortie · rez-de-chaussée":{
  fond:'img/map.webp', trace:OVPTS_TOP, depart:{x:17.7,y:42.4,l:'S'}, departNom:'Start · Device',
  bosses:BOSSES, packs:PACKS, mids:MIDS_TOP, routes:ROUTES_TOP, texts:TEXTS, shapes:SHAPES, zones:ZONES_TOP},
 "Sortie · sous-sol":{
  fond:'img/map-basement.webp', trace:'', depart:null, departNom:'',
  bosses:BOSSES_B, packs:PACKS_B, mids:MIDS_B, routes:ROUTES_B, texts:TEXTS_B, shapes:SHAPES_B, zones:ZONES_B}
};

// ---- CHAPITRES de la strat ----
// Un chapitre ne CONTIENT plus sa carte : il la DÉSIGNE par son nom. Le socle
// (sortie-map-core.js) projette ensuite les champs de la carte sur le chapitre,
// par référence — tout ce qui lisait f.bosses ou f.map continue de marcher.
const FLOORS=[
 {id:'top', fr:'Rez-de-chaussée', en:'Top Floor', sub:'A–D',
  carte:"Sortie · rez-de-chaussée",
  introFr:OVINTRO_TOP_FR, introEn:OVINTRO_TOP_EN, phases:PHASES},
 {id:'bottom', fr:'Sous-sol', en:'Basement', sub:'E–H',
  carte:"Sortie · sous-sol",
  introFr:OVINTRO_BOT_FR, introEn:OVINTRO_BOT_EN, phases:PHASES_B}
];
