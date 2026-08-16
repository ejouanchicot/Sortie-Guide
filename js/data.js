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
// Le nom de la strat : c'est le titre du guide. Le sous-titre, lui, se déduit
// de la composition ci-dessous — il n'y a rien à écrire deux fois.
const NOM="Sortie";

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
const MOB={
 "Degei":"img/mobs/mob-degei.webp",
 "Skomora":"img/mobs/mob-skomora.webp",
 "Leshonn":"img/mobs/mob-leshonn.webp",
 "Ghatjot":"img/mobs/mob-ghatjot.webp",
 "Acuex":"img/mobs/mob-acuex.webp",
 "Fomor":"img/mobs/mob-fomor.webp",
 "Ghost":"img/mobs/mob-ghost.webp",
 "Umbril":"img/mobs/mob-umbril.webp",
 "Dhartok":"img/mobs/mob-dhartok.webp",
 "Gartell":"img/mobs/mob-gartell.webp",
 "Triboulex":"img/mobs/mob-triboulex.webp",
 "Aita":"img/mobs/mob-aita.webp",
 "Aminon":"img/mobs/mob-aminon.webp",
 "Botulus":"img/mobs/mob-botulus.webp",
 "Ixion":"img/mobs/mob-ixion.webp",
 "Naraka":"img/mobs/mob-naraka.webp",
 "Tulittia":"img/mobs/mob-tulittia.webp",
 "Slime":"img/mobs/mob-slime.webp",
 "Slug":"img/mobs/mob-slug.webp",
 "Flan":"img/mobs/mob-flan.webp",
 "Obdella":"img/mobs/mob-obdella.webp",
 "Porxie":"img/mobs/mob-porxie.webp",
 "Bhoot":"img/mobs/mob-bhoot.webp",
 "Deleterious":"img/mobs/mob-deleterious.webp"
};
// échelle globale des images de mobs (garde le ratio entre elles) — réglable dans Map Studio
const MOBSCALE=0.6;
// marge des labels de mobs (px), identique partout — réglable dans Map Studio ; position par pastille via lp:'top|bottom|left|right'
const LBLMARGIN=0;

// ---- jeux de buffs ----
// Un bloc de préparation, posé en tête d'une étape. Son NOM est ce que le guide
// affiche en titre du bloc : on l'écrit, il n'est pas imposé par le moteur.
// Une étape s'y rattache par ce nom (« buffs:"Buffs de trajet" »), donc corriger
// un jeu le corrige dans toutes les étapes qui s'en servent.
// Une préparation s'écrit comme n'importe quel autre bloc de la strat : les
// mêmes rubriques, les mêmes BOÎTES qu'une ligne vide referme, les mêmes badges.
// Elle n'était qu'une suite de lignes ; celles d'avant se lisent toujours.
// Réglable dans Strat Studio — ne pas éditer à la main, l'outil réécrit le bloc.
const BUFFS={
 "Buffs de départ":[
  {label:"",cls:"",lines:[
    ln(["ALL"],"Au Start : on attend [c:wind][b]Chocobo Mazurka[/b][/c] (BRD) et/ou [b]Bolter's Roll[/b] (COR) · on passe PAS la porte tant qu'on n'a pas l'un ou l'autre",{warn:1,comp:"PLD"}),
    ln(["ALL"],"Au Start : on attend [c:wind][b]Chocobo Mazurka[/b][/c] (BRD), [b]Bolter's Roll[/b] (COR) et/ou [b]Chocobo Jig II[/b] (DNC) · on passe PAS la porte tant qu'on n'a pas de move speed",{warn:1,comp:"DNC"}),
    ln(["COR"],"[b]Bolter's Roll[/b] + [b]Tactician's Roll[/b]"),
    ln(["BRD"],"[c:wind][b]Chocobo Mazurka[/b][/c]"),
    ln(["DNC"],"[b]Chocobo Jig II[/b]")
  ]}
 ],
 "Buffs de trajet":[
  {label:"",cls:"",lines:[
    ln(["COR"],"[b]Bolter's Roll[/b] / [b]Tactician's Roll[/b]"),
    ln(["ALL"],"[b]Chocobo Jig II[/b]",{comp:"DNC"})
  ]}
 ],
 "Buffs avant le dernier boss":[
  {label:"",cls:"",lines:[
    ln(["COR"],"[b]Bolter's Roll[/b] + [b]Tactician's Roll[/b]"),
    ln(["DNC"],"Chocobo Jig II")
  ]}
 ],
 "Buffs de trajet · sous-sol":[
  {label:"",cls:"",lines:[
    ln(["ALL"],["[c:wind][b]Sneak[/b][/c]","[c:wind][b]Invisible[/b][/c]"]),
    ln(["COR"],["[b]Bolter's Roll[/b]","[b]Tactician's Roll[/b]"])
  ]}
 ]
};

// ---- PHASES : le cœur de la strat ----
const PHASES=[
{n:1,boss:"Degei",map:"",title:"Double Farm · Acuex + Fomor → Degei",route:"Depuis le Start (centre-gauche) · mur de droite, plein SUD → coin bas-gauche.",buffs:"Buffs de départ",cards:[
  {kind:"pack",name:"Double Farm · Acuex ×3 + Fomor ×3",tag:"le PLD amène les Acuex au camp Fomor, tank tout · 3 Acuex + 3 Fomor → pop les coffres",noHeadImg:true,groups:[
    {label:"",cls:"tank",boite:1,lines:[
      ln(["PLD"],["prend les [b]Acuex[/b] → les amène au [b]camp Fomor[/b]","tank tout ([b]Acuex[/b] + [b]Fomor[/b])"]),
      ln(["ALL"],"on buff au camp Fomor · on farm les deux en même temps")
    ]},
    {label:"",cls:"buff",boite:1,lines:[
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["GEO"],["[c:ice][b]Indi-Acumen[/b][/c]","[c:thunder][b]Geo-Malaise[/b][/c]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[c:thunder][b]Victory March[/b][/c]"])
    ]},
    {label:"Fomor ×3 · SC Step 4",cls:"dd",boite:1,img:"Fomor",lines:[
      ln(["MNK"],"[b]Shijin Spiral[/b] → [b]Tornado Kick[/b] ×3",{comp:"PLD"}),
      ln(["DNC"],"[b]Dancing Edge[/b] ×4")
    ]},
    {label:"Acuex ×3 → SC + MB",cls:"dd",boite:1,img:"Acuex",lines:[
      ln(["PLD","COR"],"[b]Savage Blade[/b] > [b]Last Stand[/b] (Light)"),
      ln(["MNK"],"[b]Victory Smite[/b] ×2 (Light)",{comp:"DNC"})
    ]},
    {label:"",cls:"mb",boite:1,niv:1,lines:[
      ln(["RDM","GEO"],"MB Fire sur le SC")
    ]}
  ]},
  {kind:"boss",name:"Boss · Degei",tag:"on spam pour tuer · le proc (mages) ne fait pas de dégât",groups:[
    {label:"",cls:"rules",boite:1,lines:[
      ln(["ALL"],"NE PAS fermer de SC Light si Degei est Fire / Wind / Thunder…",{warn:1}),
      ln(["ALL"],"NE PAS fermer de SC Dark si Degei est Ice / Earth / Water…",{warn:1}),
      ln(["ALL"],"à [c:or]3:00[/c] il enrage · plus que [b][c:or]Vivisection[/c][/b], et [c:rouge]1/4[/c] des dégâts",{warn:1}),
      ln(["ALL"],"[c:or]30 s[/c] sans proc = [c:rouge]-5 % DT[/c] · ça monte à [c:rouge]-90 %[/c] et ça ne redescend jamais",{warn:1}),
      ln(["BRD"],"une [b]Threnody[/b] suffit à proc · le sort n'a pas besoin de faire des dégâts")
    ]},
    {label:"",cls:"rules proc",boite:1,lines:[
      ln(["ALL"],"Flaming Kick → WATER"),
      ln(["ALL"],"Flashflood → THUNDER"),
      ln(["ALL"],"Icy Grasp → FIRE"),
      ln(["ALL"],"Eroding Flesh → WIND"),
      ln(["ALL"],"Fulminous Smash → EARTH")
    ]},
    {label:"",cls:"debuff",boite:1,lines:[
      ln(["RDM"],["[c:light][b]Dia III[/b][/c]","[c:ice][b]Distract III[/b][/c]"])
    ]},
    {label:"",cls:"buff",boite:1,lines:[
      ln(["GEO"],["[c:wind][b]Geo-Gravity[/b][/c]","[c:wind][b]Indi-Frailty[/b][/c]"]),
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[c:thunder][b]Victory March[/b][/c]","[c:fire][b]Valor Minuet V[/b][/c]","[c:fire][b]Aria of Passion[/b][/c]"])
    ]},
    {label:"",cls:"dd",boite:1,lines:[
      ln(["MNK"],"WS libres (spam)"),
      ln(["DNC"],["spam [b]Ruthless Stroke[/b]","Switch [b]Rudra's Storm[/b] si Degei est Fire / Wind / Thunder"]),
      ln(["COR"],["spam [b]Savage Blade[/b]","Light Shot ([c:light][b]Dia III[/b][/c])"])
    ]}
  ]}
]},
{n:2,boss:"Skomora",map:"",title:"Ghost → Skomora",route:"Mur de droite, plein EST → coin bas-droite (Ghost ×3, puis Skomora, case N).",buffs:"Buffs de trajet",cards:[
  {kind:"pack",name:"Pack · Ghost ×3",tag:"weak Fire · SC → MB Fire",groups:[
    {label:"",cls:"buff",boite:1,lines:[
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["GEO"],["[c:thunder][b]Geo-Malaise[/b][/c]","[c:ice][b]Indi-Acumen[/b][/c]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[c:thunder][b]Victory March[/b][/c]"])
    ]},
    {label:"",cls:"dd",boite:1,lines:[
      ln(["MNK"],"[b]Victory Smite[/b] ×2 (Light)"),
      ln(["DNC"],"[b]Ruthless Stroke[/b] ×2 = [b]Fusion[/b]"),
      ln(["ALL"],"Kill après le MB",{warn:1})
    ]},
    {label:"MB Fire",cls:"mb",boite:1,niv:1,lines:[
      ln(["RDM","GEO"],"MB Fire sur le SC")
    ]}
  ]},
  {kind:"boss",name:"Boss · Skomora",tag:"SC Light à mort",groups:[
    {label:"",cls:"tank",boite:1,lines:[
      ln(["PLD"],"[b]Holy Circle[/b] + [b]Sepulcher[/b]")
    ]},
    {label:"",cls:"buff",boite:1,lines:[
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["GEO"],["[c:wind][b]Geo-Frailty[/b][/c]","[c:fire][b]Indi-Fury[/b][/c]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[b][c:fire]Valor Minuet[/c] ×2[/b]","[c:fire][b]Aria of Passion[/b][/c]"],{cond:"sans RDM : [c:thunder][b]Honor March[/b][/c] + [c:fire][b]Valor Minuet[/b][/c] ×2 + [c:thunder][b]Victory March[/b][/c]"})
    ]},
    {label:"",cls:"debuff",boite:1,lines:[
      ln(["RDM"],["[c:light][b]Dia III[/b][/c]","[c:ice][b]Distract III[/b][/c] [t:petit]plus dur à land (Skomora est Darkness)[/t]"])
    ]},
    {label:"",cls:"dd",boite:1,lines:[
      ln(["COR"],["spam [b]Savage Blade[/b]","Light Shot ([c:light][b]Dia III[/b][/c])"]),
      ln(["MNK"],["[b]Victory Smite[/b] ×2 (ou [b]Victory[/b] → [b]Shijin[/b])","(Light)"]),
      ln(["DNC"],["spam [b]Ruthless Stroke[/b] x3","([b]Fusion[/b])>(Light)"])
    ]},
    {label:"[c:or]Setting the Stage[/c] toutes les [b][c:or]3:00[/c][/b]",cls:"tp",boite:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]~30 000 Dmg[/b][/c] divisés entre les cibles à portée[/t]",lines:[]},
    {label:"[c:dark]Cruel Joke[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE 10 y[/b][/c]] [c:violet][b]Haunted[/b][/c] + [c:or][b]ignore les Shadows[/b][/c][/t]",lines:[]},
    {label:"[c:or]Last Laugh[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]1 cible[/b][/c]] [c:rouge][b]Critical Dmg[/b][/c] + [c:dark][b]Drain[/b][/c], [c:or][b]HATE RESET[/b][/c][/t]",lines:[]},
    {label:"[c:or]Regurgitated Swarm[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:ice][b]Paralysis[/b][/c], [c:or][b]TP RESET[/b][/c][/t]",lines:[]},
    {label:"[c:or]Feast of Arrows[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE 10 y[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:ice][b]Bind[/b][/c] + [c:dark][b]Bio[/b][/c][/t]",lines:[]},
    {label:"[c:or]Curtain Call[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:dark][b]Bio[/b][/c][/t]",lines:[]}
  ]}
]},
{n:3,boss:"Leshonn",map:"",title:"Umbril → Leshonn",route:"Mur de droite, plein NORD → coin haut-droite (Umbril ×5, puis Leshonn).",buffs:"Buffs de trajet",cards:[
  {kind:"pack",name:"Pack · Umbril ×5",tag:"≥1 WS par mob · tous tués = lock ses [b]TP moves[/b]",groups:[
    {label:"",cls:"buff",boite:1,lines:[
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[c:thunder][b]Victory March[/b][/c]"])
    ]},
    {label:"",cls:"dd",boite:1,lines:[
      ln(["ALL"],"≥1 WS par mob",{comp:"PLD"}),
      ln(["ALL"],"≥1 WS par mob",{comp:"DNC"})
    ]}
  ]},
  {kind:"boss",name:"Boss · Leshonn",tag:"Thunder ↔ Wind · ~870k",groups:[
    {label:"",cls:"rules",boite:1,lines:[
      ln(["ALL"],"JAMAIS son élément actif (SC/nuke) → il HEAL",{warn:1}),
      ln(["ALL"],"proc opposé = retire ses stacks DT/dmg (+5%)"),
      ln(["ALL"],"alterne SC > MB, varie la source (anti-résist)"),
      ln(["ALL"],"pas d'empilement (Counter 500+/hit)")
    ]},
    {label:"",cls:"buff",boite:1,lines:[
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["GEO"],["[c:wind][b]Geo-Gravity[/b][/c]","[c:wind][b]Indi-Frailty[/b][/c]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[c:fire][b]Valor Minuet V[/b][/c]","[c:fire][b]Valor Minuet IV[/b][/c]","[c:fire][b]Aria of Passion[/b][/c]"])
    ]},
    {label:"",cls:"debuff",boite:1,lines:[
      ln(["RDM"],["[b]Saboteur[/b] → [c:wind][b]Gravity II[/b][/c]","[c:ice][b]Distract III[/b][/c]","[b]Zap[/b] copie un debuff → pas de [c:ice][b]Paralyze[/b][/c]"])
    ]},
    {label:"Mains THUNDER → proc Earth",cls:"tp",boite:1,lines:[
      ln(["MNK"],"[b]Shijin Spiral[/b] > [b]Asuran Fists[/b] (Gravitation)"),
      ln(["DNC"],"[b]Rudra's Storm[/b] ×2 = Darkness"),
      ln(["COR"],"spam [b]Savage Blade[/b]"),
      ln(["RDM","GEO"],"MB Earth sur le SC")
    ]},
    {label:"Mains WIND → proc Ice",cls:"tp",boite:1,lines:[
      ln(["MNK"],"[b]Shijin Spiral[/b] > [b]Tornado Kick[/b] (Induration)"),
      ln(["DNC"],"[b]Rudra's Storm[/b] ×2 = Darkness"),
      ln(["COR"],"[b]Savage Blade[/b]"),
      ln(["RDM","GEO"],"MB Ice sur le SC"),
      ln(["ALL"],"Chokehold vole les buffs = wipe → proc opposé / kill vite (Asylum si WHM)",{warn:1})
    ]}
  ]}
]},
{n:4,boss:"Ghatjot",map:"",title:"Ghatjot (pas de farm)",route:"Mur de droite, plein OUEST → coin haut-gauche (Ghatjot). Pas de farm.",buffs:"Buffs avant le dernier boss",cards:[
  {kind:"boss",name:"Boss · Ghatjot",tag:"absorbe Water · porte verrouillée à l'engage",groups:[
    {label:"",cls:"rules",boite:1,lines:[
      ln(["ALL"],"absorbe Water → boost ses [b]TP moves[/b]"),
      ln(["ALL"],"aucun dégât Water : ni magie, ni WS, ni SC [b]Distortion[/b] ou [b]Darkness[/b] · un SC Darkness l'a soigné de [c:rouge]70 000[/c]",{warn:1}),
      ln(["ALL"],"chaque absorption ajoute jusqu'à [c:rouge]×3[/c] ce montant à son prochain [b]TP move[/b]",{warn:1}),
      ln(["MNK"],"Chakra retire le [c:water]Taint[/c] ([c:water]Poison[/c])"),
      ln(["ALL"],"[c:water]Taint[/c] stack → augmente [b][c:or]Clobbering Wave[/c][/b] · Ra'Kaznar Metal A = [c:water]Poison[/c] retirable")
    ]},
    {label:"",cls:"tank",boite:1,lines:[
      ln(["PLD"],"tank sur place")
    ]},
    {label:"",cls:"buff",boite:1,lines:[
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["GEO"],["[c:wind][b]Geo-Frailty[/b][/c]","[c:fire][b]Indi-Fury[/b][/c]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[c:fire][b]Valor Minuet V[/b][/c]","[c:fire][b]Valor Minuet IV[/b][/c]","[c:fire][b]Aria of Passion[/b][/c]"])
    ]},
    {label:"",cls:"debuff",boite:1,lines:[
      ln(["RDM"],["[c:light][b]Dia III[/b][/c]","[c:ice][b]Distract III[/b][/c]"])
    ]},
    {label:"",cls:"dd",boite:1,lines:[
      ln(["MNK"],"WS libres, évite [b][c:rouge]Howling Fist[/c][/b] > [b]Savage Blade[/b] = (Distortion) → à éviter"),
      ln(["DNC"],"[b]Ruthless Stroke[/b]"),
      ln(["COR"],["spam [b]Savage Blade[/b]","Light Shot ([c:light][b]Dia III[/b][/c])"])
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
  {kind:"pack",name:"Botulus",tag:"",groups:[
    {label:"",cls:"dd",boite:1,lines:[
      ln(["ALL"],["majorité des dégâts en [b]WS[/b], dans son [b]dos[/b]","les dégâts de [b]SC[/b] ne comptent pas","[c:thunder]Stun[/c] chacun de ses [b]TP moves[/b] au [b]Flat Blade[/b]"])
    ]},
    {label:"[c:or]Chymous Reek[/c]",cls:"tp",boite:1,note:"[t:petit][[c:bleu][b]Conal[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:thunder][b]Stun[/b][/c] + [c:wind][b]Choke[/b][/c][/t]",lines:[]},
    {label:"[c:or]Crowning Flatus[/c]",cls:"",niv:1,note:"[t:petit][c:rouge][b]Dmg[/b][/c] + [c:thunder][b]Stun[/b][/c] + [c:blanc][b]Knockback[/b][/c][/t]",lines:[]},
    {label:"[c:or]Gnash 'n Guttle[/c]",cls:"",niv:1,note:"[t:petit][c:blanc][b]Max HP Down[/b][/c] (-50%)[/t]",lines:[]},
    {label:"[c:or]Just Desserts[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:thunder][b]Stun[/b][/c] + [c:water][b]Drown[/b][/c][/t]",lines:[]},
    {label:"[c:or]Rancid Reflux[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:wind][b]Gravity[/b][/c] + [c:blanc][b]Knockback[/b][/c][/t]",lines:[]},
    {label:"[c:or]Slimy Proposal[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:#fb00ff][b]Charm[/b][/c] + [c:light][b]Dia[/b][/c][/t]",lines:[]},
    {label:"[c:or]Sloughy Sputum[/c]",cls:"",niv:1,note:"[t:petit][c:rouge][b]Dmg[/b][/c] + [c:wind][b]Gravity[/b][/c] + [c:water][b]Drown[/b][/c] + [c:blanc][b]Knockback[/b][/c][/t]",lines:[]}
  ]},
  {kind:"boss",name:"Dhartok",tag:"",groups:[
    {label:"",cls:"tank",boite:1,lines:[
      ln(["ALL"],"le [b][c:bleu]MNK[/c][/b]/[b][c:bleu]DNC[/c][/b] tank · ne reste pas collé à eux",{comp:"DNC"})
    ]},
    {label:"",cls:"rules",boite:1,niv:1,lines:[
      ln(["ALL"],"on retire le [c:water]Poison[/c] systématiquement, il multiplie les dégâts de [b][c:or]Clobbering Wave[/c][/b]",{warn:1}),
      ln(["ALL"],"les nuages de [b][c:or]Cesspool[/c][/b] le [b]soignent[/b] s'il est dedans · on le sort de la flaque",{warn:1}),
      ln(["ALL"],"[b][c:or]Cesspool[/c][/b] lui donne [c:or]3:00[/c] de double TP move · le 2e pose un nuage sous sa cible"),
      ln(["ALL"],"jamais de SC [b]Darkness[/b] · c'est du Water, il l'absorbe et le seal s'use",{warn:1}),
      ln(["ALL"],"on varie les WS · il monte un mur de résistance sur celles qu'on répète")
    ]},
    {label:"",cls:"dd",boite:1,lines:[
      ln(["MNK"],"toutes les WS autorisées, [b]sauf [c:rouge]Howling Fist[/c][/b]"),
      ln(["DNC"],"[b]Ruthless Stroke[/b]"),
      ln(["RDM"],"[b]Black Halo[/b]"),
      ln(["COR","BRD"],"[b]Savage Blade[/b]")
    ]},
    {label:"",cls:"debuff",boite:1,lines:[
      ln(["BRD"],["[c:earth][b]Carnage Elegy[/b][/c]","[c:light][b]Foe Requiem VII[/b][/c]","[c:dark][b]Light Threnody II[/b][/c]"]),
      ln(["RDM"],["[c:light][b]Dia III[/b][/c]","[c:ice][b]Distract III[/b][/c]"]),
      ln(["COR"],"Light Shot ([c:light][b]Dia III[/b][/c])")
    ]},
    {label:"",cls:"buff",boite:1,lines:[
      ln(["GEO"],["[c:wind][b]Geo-Frailty[/b][/c]","[c:fire][b]Indi-Fury[/b][/c]"]),
      ln(["COR"],["[b]Chaos Roll[/b]","[b]Samurai Roll[/b]"]),
      ln(["BRD"],["[c:thunder][b]Honor March[/b][/c]","[c:fire][b]Valor Minuet V[/b][/c]","[c:fire][b]Valor Minuet IV[/b][/c]","[c:thunder][b]Blade Madrigal[/b][/c]","[c:fire][b]Aria of Passion[/b][/c]"])
    ]},
    {label:"[c:or]Nullifying Rain[/c]",cls:"tp",boite:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:water][b]Taint[/b][/c] (5 min)[/t]",lines:[]},
    {label:"[c:or]Noyade[/c]",cls:"",niv:1,note:"[t:petit][c:rouge][b]Dmg[/b][/c] + [c:wind][b]Silence[/b][/c] + [c:water][b]Taint[/b][/c] (-40 HP/tic, 5 min)[/t]",lines:[]},
    {label:"[c:or]Cesspool[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:water][b]Taint[/b][/c] (5 min)[/t]",lines:[]},
    {label:"[c:or]Clobbering Wave[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]Conal[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:blanc][b]Knockback[/b][/c][/t]",lines:[]},
    {label:"[c:or]Fetid Eddies[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]Conal[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:water][b]Taint[/b][/c] (-30 HP/tic, 5 min)[/t]",lines:[]}
  ]}
]},
{n:2,sector:"G",boss:"Triboulex",title:"Secteur G · Triboulex",route:"",buffs:"Buffs de trajet · sous-sol",cards:[
  {kind:"pack",name:"Naraka",tag:"",groups:[
    {label:"",cls:"",lines:[
      ln(["ALL"],"[c:thunder]Stun[/c] chacun de ses [b]TP moves[/b] au [b]Flat Blade[/b]")
    ]},
    {label:"[c:or]Raksha Stance[/c]",cls:"tp",boite:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:or][b]Magic Dmg −50 %[/b][/c] + [c:or][b]Erase self[/b][/c] + [c:violet][b]Dispel ×3[/b][/c][/t]",lines:[]},
    {label:"[c:or]Raksha: Judgment[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:wind][b]Silence[/b][/c] + [c:fire][b]Amnesia[/b][/c] + [c:ice][b]Bind[/b][/c][/t]",lines:[]},
    {label:"[c:or]Raksha: Illusion[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]Conal[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:ice][b]Paralysis[/b][/c] + [c:dark][b]Curse[/b][/c] (-50 % HP/MP)[/t]",lines:[]},
    {label:"[c:or]Raksha: Vengeance[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:violet][b]Muddle[/b][/c] + [c:violet][b]Weakness[/b][/c] (1 min)[/t]",lines:[]},
    {label:"[c:or]Yaksha Stance[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:or][b]Physical Dmg −50 %[/b][/c] + [c:or][b]Erase self[/b][/c] + [c:violet][b]Dispel ×3[/b][/c][/t]",lines:[]},
    {label:"[c:or]Yaksha: Damnation[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]Conal[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:violet][b]Magic Def. Down[/b][/c] + [c:violet][b]Def. Down[/b][/c][/t]",lines:[]},
    {label:"[c:or]Yaksha: Bliss[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]Conal[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:violet][b]Attack Down[/b][/c] (-25 %) + [c:violet][b]Magic Attack Down[/b][/c][/t]",lines:[]},
    {label:"[c:or]Yaksha: Oblivion[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:violet][b]All Stats Down[/b][/c] (-50 %), [c:or][b]HATE RESET[/b][/c][/t]",lines:[]},
    {label:"[c:or]Sakra Storm[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]Conal[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:violet][b]Zombie[/b][/c] + [c:ice][b]Paralysis[/b][/c] + [c:violet][b]Muddle[/b][/c], [c:or][b]HATE RESET[/b][/c][/t]",lines:[]},
    {label:"[c:or]Yama's Judgment[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:rouge][b]Doom[/b][/c] (5 counts)[/t]",lines:[]}
  ]},
  {kind:"boss",name:"Triboulex",tag:"",groups:[
    {label:"[c:or]Setting the Stage[/c] toutes les [b][c:or]3:00[/c][/b]",cls:"rules",boite:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]~30 000 Dmg[/b][/c] divisés entre les cibles à portée[/t]",lines:[
      ln(["ALL"],"chaque dégât Light lui retire [c:or]500[/c] · c'est le nombre de hits qui compte, pas leur taille"),
      ln(["COR","RDM"],"spam [c:light][b]Dia[/b][/c] entre deux [b][c:or]Setting the Stage[/c][/b] · un cast instantané vaut un gros nuke ici"),
      ln(["ALL"],"le timer part du [b]claim[/b] et survit au wipe · le compteur Light, lui, repart à zéro et le move gagne [c:rouge]+1000[/c]",{warn:1})
    ]},
    {label:"",cls:"dd",boite:1,lines:[
      ln(["ALL"],"[b]derrière[/b] le mob, à [c:or]5,1 yalms[/c] du tank hors des [c:or]fetters[/c], mais groupés"),
      ln(["PLD"],"straight tank à [b]max melee range[/b], côté [c:or]nord[/c]"),
      ln(["MNK"],"[b]Tornado Kick[/b]",{cond:"espacer les WS, sinon on se wall"}),
      ln(["DNC"],"[b]Climactic Flourish[/b] → WS → [b]Reverse Flourish[/b] → WS",{comp:"DNC"})
    ]},
    {label:"",cls:"debuff",boite:1,lines:[
      ln(["RDM"],["[c:light][b]Dia III[/b][/c]","[b]Saboteur[/b], [c:dark][b]Frazzle III[/b][/c], [c:ice][b]Distract III[/b][/c]"])
    ]},
    {label:"[c:dark]Cruel Joke[/c]",cls:"tp",boite:1,note:"[t:petit][[c:bleu][b]AoE 10 y[/b][/c]] [c:violet][b]Haunted[/b][/c] + [c:or][b]ignore les Shadows[/b][/c][/t]",lines:[]},
    {label:"[c:or]Regurgitated Swarm[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:ice][b]Paralysis[/b][/c], [c:or][b]TP RESET[/b][/c][/t]",lines:[]},
    {label:"[c:or]Last Laugh[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]1 cible[/b][/c]] [c:rouge][b]Critical Dmg[/b][/c] + [c:dark][b]Drain[/b][/c], [c:or][b]HATE RESET[/b][/c][/t]",lines:[]},
    {label:"[c:or]Feast of Arrows[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE 10 y[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:ice][b]Bind[/b][/c] + [c:dark][b]Bio[/b][/c][/t]",lines:[]},
    {label:"[c:or]Curtain Call[/c]",cls:"",niv:1,note:"[t:petit][[c:bleu][b]AoE[/b][/c]] [c:rouge][b]Dmg[/b][/c] + [c:dark][b]Bio[/b][/c][/t]",lines:[]}
  ]}
]},
{n:3,sector:"H",boss:"Aita",title:"Secteur H · Aïta",route:"On file directement au boss.",buffs:"Buffs de trajet · sous-sol",cards:[
  {kind:"boss",name:"Boss · Aïta",tag:"à définir",groups:[]}
]},
{n:4,sector:"F",boss:"Gartell",title:"Secteur F · Gartell",route:"On file directement au boss.",buffs:"Buffs de trajet · sous-sol",cards:[
  {kind:"boss",name:"Boss · Gartell",tag:"à définir",groups:[]}
]},
{n:5,sector:"E",boss:"Aminon",soon:true,title:"Aminon · boss final (E)"}
];
// midboss (NM mineurs) — un par secteur
// chemins vers chaque boss (indépendants, un par zone, depuis le hub central)

// ---- zones du sous-sol : chacune a SA carte + son boss/midboss/chemin ----
// zones du rez-de-chaussée : PAS de carte par zone (la carte générale reste entière),
// on filtre juste le contenu affiché. A=Ghatjot, B=Leshonn, C=Skomora, D=Degei.

// ---- intros de la vue d'ensemble (FR / EN) ----
const OVINTRO_TOP_FR='<p><b>Sortie · run linéaire en 4 phases.</b> On suit le <b>mur de droite</b> depuis le Start jusqu\'au dernier boss, en enchaînant Degei → Skomora → Leshonn → Ghatjot. Chaque phase : un <b>farm</b> (pop des coffres) puis le <b>boss</b>.</p><p class="ovi-tip">Clique ton job dans <b>Mon rôle</b> (ou <b>Solo</b> pour ne voir que tes actions), choisis la <b>comp</b> en haut, puis descends le long du rail.</p>';
const OVINTRO_TOP_EN='<p><b>Sortie · linear run, 4 phases.</b> Follow the <b>right wall</b> from Start to the last boss: Degei → Skomora → Leshonn → Ghatjot. Each phase: a <b>farm</b> (pop the chests) then the <b>boss</b>.</p><p class="ovi-tip">Click your job in <b>My role</b> (or <b>Solo</b> to see only your actions), pick the <b>comp</b> at the top, then scroll down the rail.</p>';
const OVINTRO_BOT_FR='<p><b>Sous-sol · secteurs E → H.</b> 4 boss majeurs : Dhartok (E), Triboulex (G), Aïta (H), Gartell (F), puis <b>Aminon</b> en boss final.</p><p class="ovi-tip">🚧 Strat en cours d\'écriture — on la complète run après run. La carte et le placement des points arrivent bientôt.</p>';
const OVINTRO_BOT_EN='<p><b>Basement · sectors E → H.</b> Four major NMs: Dhartok (E), Triboulex (G), Aita (H), Gartell (F), then <b>Aminon</b> as the final boss.</p><p class="ovi-tip">🚧 Strategy is being written — filled in run after run. Map and point placement coming soon.</p>';

// ---- CARTES ----
// Une carte est un MODULE autonome : son fond, ses marqueurs, ses tracés, ses
// annotations. Elle ne sait rien de la stratégie qui s'en sert — et deux
// chapitres, ou deux strats différentes, peuvent pointer la même. C'est ce qui
// permet d'en dessiner une puis de la réutiliser ailleurs.
// Les tableaux ci-dessous sont ceux que l'atelier Carte réécrit ; la carte ne
// fait que les rassembler sous un nom.
const CARTES={
 "Sortie · rez-de-chaussée":{
  fond:"img/cartes/map.webp",
  trace:"17.7,42.4 23.6,42.4 23.6,51.5 26.7,51.6 26.7,60.9 23.6,61.0 23.7,73.4 35.9,73.4 36.0,70.8 39.1,70.3 39.6,67.3 45.3,67.3 45.4,73.4 64.1,73.4 64.2,70.4 73.4,70.4 73.5,73.5 85.9,73.5 85.9,61.0 82.9,60.9 82.8,57.9 79.7,57.8 79.7,51.6 86.0,51.5 86.0,33.4 82.9,32.9 82.9,23.5 86.0,23.4 85.9,11.2 73.6,11.2 73.5,14.3 70.4,14.3 70.3,17.1 64.1,17.1 64.0,11.1 45.5,11.1 45.4,14.2 36.0,14.2 35.9,10.9 20.4,10.9 20.4,8.3",
  depart:{"x":17.7,"y":42.4,"l":"S"}, departNom:"Start · Device",
  bosses:[
   {name:'Ghatjot',n:4,el:'fire', x:13.4,y:7.1, nx:20.4,ny:7.9, label:'<span style="color:#ff8f6a">Ghatjot</span>'},
   {name:'Leshonn',n:3,el:'blue', x:95,y:7.1, nx:89.1,ny:7.9, label:'<span style="color:#5bd6ef">Leshonn</span>'},
   {name:'Degei',n:1,el:'gray', x:20,y:83.3, nx:20.4,ny:76.7, label:'Degei'},
   {name:'Skomora',n:2,el:'green', x:88.8,y:83.5, nx:89.1,ny:76.7, label:'<span style="color:#8affc0">Skomora</span>'},
  ],
  packs:[
   {name:'Acuex', el:'red', x:29.9,y:54.7, q:'', ph:1, lp:'top', label:'<c><span style="color:#fd7777">Acuex</span>\n<c>X12'},
   {name:'Fomor', el:'gray', x:26.9,y:68.1, q:'', ph:1, label:'<c><u>Fomors</u>\n<c>WHM X5\n<c>BLM X5\n<c>RDM X5'},
   {name:'Ghost', el:'green', x:67.4,y:67.4, q:'X12', ph:2, label:'<c><u><span style="color:#1eff00">Ghost</span></u>\n<c>X12'},
   {name:'Umbril', el:'blue', x:79.8,y:29.8, q:'X12', ph:3, label:'<c><u><span style="color:#009dff">Umbril</span></u>\n<c>X12'},
  ],
  mids:[
  ],
  routes:[
   {n:1, el:'red', c1:'#949494', a:1, fs:0.5, points:'17.3,42.3 23.7,42.3 23.7,46.5 23.7,51.5 26.7,51.6 26.7,60.9 23.6,60.8 23.6,76.6 20.5,76.6'},
   {n:2, el:'red', c1:'#49a300', a:1, fs:0.51, points:'24.7,73.6 26.8,73.1 30.9,73.6 36.1,73.5 36.1,70.4 39.1,70.4 39.1,67.3 45.5,67.3 45.5,73.6 64.1,73.5 64.1,70.3 70.4,70.3 73.5,70.4 73.5,73.5 89.2,73.6 89.2,76.7'},
   {n:3, el:'red', c1:'#005fdb', a:1, fs:0.5, points:'86.3,72.7 85.5,71 86,66 86,61.1 83,61.1 83,57.9 79.8,58 79.8,51.6 86.1,51.6 86.1,46.4 86.1,38.2 86.1,33 83,33 83,23.6 86,23.6 86.1,8 89.2,8'},
   {n:4, el:'red', c1:'#c70000', a:1, fs:0.5, points:'85.1,11 83.2,11.6 78.5,11.1 73.5,11.2 73.5,14.3 70.4,14.3 70.4,17.4 64.1,17.3 64.1,11.1 50.7,11.1 45.4,11.1 45.5,14.3 36.1,14.2 36.1,11.1 20.4,11 20.4,8'},
  ],
  texts:[
  ],
  shapes:[
  ],
  icones:[
  ],
  zones:[{"sector":"A","n":4,"mid":"Obdella"},{"sector":"B","n":3,"mid":"Porxie"},{"sector":"C","n":2,"mid":"Bhoot"},{"sector":"D","n":1,"mid":"Deleterious"}],
  roster:{"boss":["Degei","Skomora","Leshonn","Ghatjot"],"mid":["Obdella","Porxie","Bhoot","Deleterious"],"pack":["Acuex","Fomor","Ghost","Umbril"]}
 },
 "Sortie · sous-sol":{
  fond:"img/cartes/map-basement.webp",
  trace:"",
  depart:null, departNom:"",
  bosses:[
   {name:'Dhartok',n:1,el:'red', x:27.7,y:22.2, nx:28,ny:27.9, lp:'top', label:'Dhartok'},
   {name:'Triboulex',n:2,el:'green', x:74.8,y:83.5, nx:75,ny:75, label:'Triboulex'},
   {name:'Aita',n:3,el:'gray', x:28.1,y:83, nx:28.1,ny:74.9, label:'Aïta'},
   {name:'Gartell',n:4,el:'blue', x:83.6,y:27.5, nx:74.9,ny:28, lp:'right', label:'Gartell'},
   {name:'Aminon',n:5,el:'dark', x:13.5,y:51.5, nx:20.2,ny:51.5, lp:'left', label:'Aminon'},
  ],
  packs:[
  ],
  mids:[
   {name:'Botulus', el:'earth', x:22.3,y:38.8, lp:'left', label:'Botulus'},
   {name:'Ixion', el:'thunder', x:51.4,y:22.7, lp:'top', label:'Ixion'},
   {name:'Naraka', el:'ice', x:80.3,y:58.4, lp:'right', label:'Naraka'},
   {name:'Tulittia', el:'dark', x:51.6,y:80.5, label:'Tulittia'},
  ],
  routes:[
   {n:1, el:'earth', fs:0.5, points:'51.5,45.7 51.5,39 45.3,39 45.3,36 42.3,36 38.5,42.1 32.8,42.1 32.8,35.8 26.6,35.9 26.6,30.9 28,27.9'},
   {n:2, el:'ice', a:1, fs:0.5, points:'51.5,57.2 51.5,64.1 57.8,64.1 57.8,67.1 60.4,67.1 64.7,60.9 70.4,60.9 70.4,67.1 76.6,67.1 76.6,72 75,75'},
   {n:3, el:'dark', fs:0.5, points:'45.8,51.7 38.9,51.7 38.9,57.8 36,57.8 36,60.5 42.2,64.8 42.2,70.3 36,70.3 36,76.5 30.9,76.5 28.1,74.9'},
   {n:4, el:'thunder', fs:0.5, points:'57.2,51.6 64.2,51.6 64.2,45.3 67.1,45.3 67.1,42.6 60.9,38.2 60.9,32.8 67.1,32.8 67.1,26.5 72.1,26.5 74.9,28.1'},
  ],
  texts:[
  ],
  shapes:[
  ],
  icones:[
  ],
  zones:[{"sector":"E","map":"img/cartes/map-e.webp","n":1,"mid":"Botulus"},{"sector":"F","map":"img/cartes/map-f.webp","n":4,"mid":"Ixion"},{"sector":"G","map":"img/cartes/map-g.webp","n":2,"mid":"Naraka"},{"sector":"H","map":"img/cartes/map-h.webp","n":3,"mid":"Tulittia"}],
  roster:{"boss":["Dhartok","Triboulex","Aita","Gartell","Aminon"],"mid":["Botulus","Ixion","Naraka","Tulittia"],"pack":["Slime","Slug","Flan"]}
 }
};

// ---- CHAPITRES de la strat ----
// Un chapitre ne CONTIENT plus sa carte : il la DÉSIGNE par son nom. Le socle
// (sortie-map-core.js) projette ensuite les champs de la carte sur le chapitre,
// par référence — tout ce qui lisait f.bosses ou f.map continue de marcher.
const FLOORS=[
 {id:"top", fr:"Rez-de-chaussée", en:"Top Floor", sub:"A–D",
  carte:"Sortie · rez-de-chaussée",
  introFr:"<p><b>Sortie · run linéaire en 4 phases.</b> On suit le <b>mur de droite</b> depuis le Start jusqu'au dernier boss, en enchaînant Degei → Skomora → Leshonn → Ghatjot. Chaque phase : un <b>farm</b> (pop des coffres) puis le <b>boss</b>.</p><p class=\"ovi-tip\">Clique ton job dans <b>Mon rôle</b> (ou <b>Solo</b> pour ne voir que tes actions), choisis la <b>comp</b> en haut, puis descends le long du rail.</p>", introEn:"<p><b>Sortie · linear run, 4 phases.</b> Follow the <b>right wall</b> from Start to the last boss: Degei → Skomora → Leshonn → Ghatjot. Each phase: a <b>farm</b> (pop the chests) then the <b>boss</b>.</p><p class=\"ovi-tip\">Click your job in <b>My role</b> (or <b>Solo</b> to see only your actions), pick the <b>comp</b> at the top, then scroll down the rail.</p>",
  phases:PHASES, phasesNom:"PHASES"},
 {id:"bottom", fr:"Sous-sol", en:"Basement", sub:"E–H",
  carte:"Sortie · sous-sol",
  introFr:"<p><b>Sous-sol · secteurs E → H.</b> 4 boss majeurs : Dhartok (E), Triboulex (G), Aïta (H), Gartell (F), puis <b>Aminon</b> en boss final.</p><p class=\"ovi-tip\">🚧 Strat en cours d'écriture — on la complète run après run. La carte et le placement des points arrivent bientôt.</p>", introEn:"<p><b>Basement · sectors E → H.</b> Four major NMs: Dhartok (E), Triboulex (G), Aita (H), Gartell (F), then <b>Aminon</b> as the final boss.</p><p class=\"ovi-tip\">🚧 Strategy is being written — filled in run after run. Map and point placement coming soon.</p>",
  phases:PHASES_B, phasesNom:"PHASES_B"}
];
