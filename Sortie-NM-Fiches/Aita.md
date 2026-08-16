# Aita

> **Sortie NM — Adversary**
> Zone : Outer Ra'Kaznar (U) — Battlefield: Sortie
> *Version renforcée de Degei (Lv.145)*

---

## Identité

| | |
|---|---|
| **Type** | Unclassified |
| **Famille** | Humanoid |
| **Job** | Rune Fencer |
| **Sub Job** | Dark Knight |
| **Classe** | Sortie NM |
| **Niveau** | 145 |
| **Comportement** | Agressif |
| **HP** | ? |
| **DEF** | ? |
| **EVA** | 1 613 |
| **INT** | 494 |
| **MND** | 427 |
| **Trait** | **Cumulative WS Resistance** (mur de résistance aux WS répétées) |
| **Titre** | *Aita Abnegater* |
| **Accès** | Nécessite un **Ra'Kaznar Shard #H** (le *Diaphanous Gadget #H* correspondant doit avoir été trouvé auparavant dans Sortie) |

---

## Résistances

### Physique

| Physical | Magical | Breath | Slashing | Blunt | H2H | Piercing | Ranged |
|---|---|---|---|---|---|---|---|
| 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |

### Élémentaire (base)

| Fire | Wind | Thunder | Light | Ice | Earth | Water | Dark |
|---|---|---|---|---|---|---|---|
| 5/70% | 5/70% | 5/70% | 5% | 5/70% | 5/70% | 5/70% | 5% |

| Geomancy |
|---|
| 50% |

### Résistances dynamiques

| Cas | Rang de résistance |
|---|---|
| **Élément du dernier TP move** (ex. Fire après Flaming Kick) | **150%** |
| **Faiblesse élémentaire actuelle** (l'élément de contre) | **70%** |
| **Tous les autres éléments** | **5%** |

➜ Autrement dit : seul l'élément de contre fait de vrais dégâts, et taper dans l'élément du dernier move est encore pire qu'inutile.

---

## Mécanique principale — Changement de faiblesse élémentaire

Aita **change sa faiblesse élémentaire** selon le TP move qu'il vient d'utiliser :

| TP move utilisé | Élément du move | Proc à faire |
|---|---|---|
| **Flaming Kick** | Fire | **Water** |
| **Flashflood** | Water | **Thunder** |
| **Icy Grasp** | Ice | **Fire** |
| **Eroding Flesh** | Earth | **Wind** |
| **Fulminous Smash** | Thunder | **Earth** |

**Points clés :**

- Contrer avec **n'importe quel dégât magique du bon élément** déclenche le **proc bleu**.
- Même de la **magie élémentaire d'un subjob** fonctionne — **le sort n'a même pas besoin de faire plus de 0 dégât**.

---

## Fetters

À partir du **deuxième** TP move élémentaire utilisé, Aita **invoque des fetters** qui :

- infligent des **dégâts**
- appliquent un **DoT correspondant à l'élément** du move

> Le **nombre de fetters invoqués augmente à mesure que les HP d'Aita descendent.**

---

## Stacks de Damage Taken

- Aita gagne **-5% Damage Taken pour chaque tranche de 30 secondes** passée **sans être proc** après un TP move. *(à vérifier)*
- Exemple : après **Flaming Kick**, il gagne **-5% DT toutes les 30 s** tant qu'aucun sort/skillchain **Water** ne l'a proc.
- Ce **-% DT est conservé pour le reste du combat**.

⚠️ **Le proc ne reset pas le DT déjà accumulé** — il empêche seulement l'accumulation de continuer.

⚠️ **En cas de wipe complet**, le DT accumulé **n'est pas reset**, sauf si vous **quittez la zone de combat, attendez un moment** *(durée inconnue)*, puis **revenez**.

---

## Mécanique principale — Vivisection

| | |
|---|---|
| **Fréquence** | Toutes les **3 minutes** à partir du début du combat |
| **Élément** | **Dark** |
| **Portée** | **20+ yalms** |
| **Effet** | Dégâts + **dispel complet**. Tue généralement tout le monde dans la zone |

### Ce qui fonctionne / ne fonctionne pas

| ✅ Efficace | ❌ Insuffisant |
|---|---|
| **Perfect Defense** | **Elemental Sforzo** — bloque les dégâts mais **le dispel complet passe quand même** |
| **Mana Wall** | **Liement** — idem, le dispel passe |
| Proc **Annuls Damage** (mitigation totale) | Scherzo / Migawari / Earthen Armor seuls *(sauf si les dégâts sont assez réduits — à vérifier)* |
| **Valiance** et autres réductions de magic damage taken | |

### ⭐ Réduire Vivisection avec les procs

> **Réussir correctement les procs bleus réduit les dégâts de Vivisection.**
> Si les dégâts descendent sous un certain seuil, **ses ailes disparaissent**.

Bonus : cela **ralentit aussi la dégradation du seal**.

*Confirmé par Fujito (SE) : « Faire apparaître les points d'exclamation à répétition diminue les dégâts infligés par Vivisection. »*

### Déclencheurs et timer

- **Le timer ne s'arrête pas** en cas de wipe complet. Après 3 minutes à vide, **le premier move d'Aita sera Vivisection**.
- ⚠️ **Vivisection doit toucher une cible pour que le timer se remette à zéro.** Impossible de le bind et de fuir en attendant que le timer passe.
- Vivisection peut aussi être **déclenchée en soignant Aita** avec la magie élémentaire ou le skillchain correspondant au **dernier TP move utilisé**.
- **Vivisection reset la faiblesse élémentaire d'Aita** : il faudra attendre un **nouveau TP move** avant qu'il redevienne vulnérable à un élément.

---

## Abilities

| Ability | Y' | Zone | Cible | Type | Élément | Effets |
|---|---|---|---|---|---|---|
| **Eroding Flesh** | 10' | AoE | Monster | Magical Damage | Earth | Dégâts, Slow, **Physical Defense Down -25%** |
| **Flaming Kick** | — | Conal | Player | Magical Damage | Fire | Dégâts, Plague, **Physical Attack Down -25%** |
| **Flashflood** | 10' | AoE | Monster | Magical Damage | Water | Dégâts, Poison, Magic Defense Down |
| **Fulminous Smash** | 10' | AoE | Player | Magical Damage | Thunder | Dégâts, Stun, **Accuracy Down -100** |
| **Icy Grasp** | — | Conal | Player | Magical Damage | Ice | Dégâts, Paralysis, Magic Attack Down |
| **Vivisection** | — | AoE | Monster | Magical Damage | Dark | Dégâts + **dispel complet**. **Quand il level up** |

*Zone : 1P, AoE, Gaze, Conal · Cible : Player ou Monster*
*Type : Physical / Magical / Breath / Buff · Élément ou type de dégâts*
*Utsusemi : (#) ombres consommées · **B** ignore les ombres sans les retirer · **R** retire toutes les ombres*

---

## Bonnes pratiques

- **Proc le plus tôt et le plus souvent possible** : chaque proc bloque l'accumulation de DT **et** réduit les dégâts de Vivisection **et** ralentit la dégradation du seal. C'est la mécanique centrale du combat.
- **Ne jamais taper dans l'élément du dernier TP move** (résistance 150%) ni soigner Aita avec cet élément.
- Prévoir **Perfect Defense / Mana Wall / proc Annuls Damage** pour chaque Vivisection — **Elemental Sforzo et Liement ne protègent pas du dispel**.
- Après un wipe : **le timer tourne toujours**, le premier move sera Vivisection, et le **DT reste accumulé** (sortir de la zone et revenir pour le reset).
- **Varier les Weapon Skills** — trait **Cumulative WS Resistance**.
- Gérer le **positionnement** face aux fetters, dont le nombre grimpe avec la baisse des HP.

---

## Récompenses

- **10 000 Gallimaufry** (G)
- **Ra'Kaznar Frag. 4** (G)
- **Ra'Kaznar Starstone** (U)
- **Old Case** (C)
- **Old Case +1** (R)

---

## 🔎 Infos complémentaires (recherche communautaire)

### Chiffres

- **HP ≈ 1 600 000**, famille **Tartarian** (FFXIclopedia).
- **Vivisection : ~3 min 05 après le premier TP move**, puis toutes les **~3 min 05**.

### ⭐ Déclaration officielle du dev (Yoji Fujito)

> *"If you deal him damage with an elemental weakness that corresponds to his special attack (for example, by using a water attack if his special ability is fire), then two blue exclamation marks will appear.*
> *Repeatedly causing the exclamation marks to appear in this manner will **decrease the damage dealt by Vivisection**. Note that **if you cause him to absorb elemental damage, the potency of Vivisection will instead increase**, so use caution when attacking.*
> *When Vivisection's damage is brought below a certain threshold, **his wings will disappear and the rate at which your seal's durability decreases will be slowed**, so keeping him in this state will prove vital."*

➜ Point capital non listé dans l'infobox : **absorber du dégât élémentaire AUGMENTE la puissance de Vivisection**.

### ⭐ Timing de proc — l'astuce la plus actionnable

> **Ne pas nuker immédiatement.** *"It does a move, the GEO waits 2~3 seconds then casts the appropriate T1 counter spell."*
> Résultat rapporté : **blue proc à chaque fois, et zéro fetter.**

### Fetters (précisions)

- Spawn **sous 50 % HP** : fetters élémentaires **Zisurru** de son alignement courant, sur des cibles aléatoires ayant de l'enmity.
- **Portée large (au moins 20 yalms)**, DoT **~200/tic**. Retrait via **Panacea**.
- Règle de bascule : **le PLD passe en kite si les fetters virent orange ou dépassent 4**.

### ⭐ C'est un kite fight, pas un tank & spank

> *"Everyone stand way back as the PLD runs in to bait the first TP move… Stay against the walls and basically run corner to corner to ensure you stay far enough that he won't try to fire off any TP moves. This **keeps him elementally locked** and also prevents shitty status effects like Slow."*

- **Il court plus vite que Gartell** → **Bolster** pour un **Indi-Gravity** renforcé ; RDM en **Stymie + Spontaneity → Gravity II**.
- **PLD à 20-25 yalms** pour éviter les TP cleaves. **DNC : Super Jump après 2 WS** pour lâcher l'enmity.
- ⚠️ *"Para can be a bitch to get off if it gets on the PLD."*

### Skillchains

- **Impossible de tenir des SC Light/Dark fiables** à cause de la variété des modes.
- **Un SC de son élément courant déclenche un Vivisection anticipé** (avant les 3 min).

### Ra'Kaznar Metal (secteur H)

- ⚠️ **Effet NON confirmé.** La compilation FFXIAH indique explicitement ne pas avoir l'info et se contente de spéculer qu'il bloque au minimum les status effects des TP moves.

### Solo & temps

- **SCH solo techniquement possible** : *"like a 10-15 minute fight with helix and not worth adding to a solo run outside of bragging rights."* *(témoignage unique)*
- **Objectif de temps groupe : ≤ 6 minutes.** Repère d'horloge : **47 min restantes** après Aita.
- Drops complémentaires listés : **Octahedrite**, **Hexahedrite**.
- Avis communautaire divergent : la réduction de Vivisection est jugée peu rentable en pratique — *"Players trigger weakness (!!) on Aita regularly and it isn't often enough."*

### Note d'actualité

- Les anciennes contraintes liées aux **Prime Weapons Stage 4** (Vivisection forcé à 65-66 % et 32-33 % HP avec reset du timer) **ne s'appliquent plus** : *"the EFGH boss enrages have been removed and Aminon is now a toggle."*

---

## Sources

- [Sortie - Owning a tier 4 Prime weapon punishes players — Forum SE (réponse dev Yoji Fujito)](https://forum.square-enix.com/ffxi/threads/60960-Sortie-Owning-a-tier-4-Prime-weapon-punishes-players)
- [Consolidation of Sortie NM Info — FFXIAH](https://www.ffxiah.com/forum/topic/57508/consolidation-of-sortie-nm-info)
- [Sortie Release - Info — FFXIAH p.109](https://www.ffxiah.com/forum/topic/56855/sortie-release-info/109/) · [p.147](https://www.ffxiah.com/forum/topic/56855/sortie-release-info/147/)
- [Sortie 9 boss strat — FFXIAH](https://www.ffxiah.com/forum/topic/58100/sortie-9-boss-strat/)
- [Sortie basement solo collection — FFXIAH](https://www.ffxiah.com/forum/topic/58001/sortie-basement-solo-collection/2/)
- [Stage 4 Prime Weapon's effect on Sortie — FFXIAH](https://www.ffxiah.com/forum/topic/57383/stage-4-prime-weapons-effect-on-sortie/)
- [Aita — FFXIclopedia](https://ffxiclopedia.fandom.com/wiki/Aita)
- [Sortie: Aminon Community Guide — Forum SE](https://forum.square-enix.com/ffxi/threads/63419)

*Base : page wiki Aita (Sortie NM). La page **Talk:Aita** de BG-Wiki n'a pas pu être consultée automatiquement (403) — à lire manuellement pour les témoignages.*
