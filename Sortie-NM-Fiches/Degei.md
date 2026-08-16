# Degei

> **Sortie NM — Adversary**
> Zone : Outer Ra'Kaznar (U) — Battlefield: Sortie

---

## Identité

| | |
|---|---|
| **Type** | Unclassified |
| **Famille** | Humanoid |
| **Job** | Rune Fencer |
| **Sub Job** | Dark Knight |
| **Classe** | Sortie NM |
| **Niveau** | 135 |
| **Comportement** | Agressif |
| **DEF** | ? |
| **EVA** | 1 249 |
| **Accès** | Nécessite un **Ra'Kaznar Shard #D** (le *Diaphanous Gadget #D* correspondant doit avoir été trouvé auparavant dans Sortie) |

---

## Résistances

### Physique

| Physical | Magical | Breath | Slashing | Blunt | H2H | Piercing | Ranged |
|---|---|---|---|---|---|---|---|
| 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |

### Élémentaire

| Fire | Wind | Thunder | Light | Ice | Earth | Water | Dark |
|---|---|---|---|---|---|---|---|
| 5/70% | 5/70% | 5/70% | 5% | 5/70% | 5/70% | 5/70% | 5% |

*A : Absorbe · S : Susceptible · R : Résiste*
*100% = le monstre subit les dégâts complets. Un palier de 50% ou moins garantit un résist du sort.*

---

## Mécanique principale — Changement de faiblesse élémentaire

Degei **change sa faiblesse élémentaire** en fonction du TP move qu'il vient d'utiliser.
Il faut le **proc** avec l'élément opposé (magie ou skillchain) :

| TP move utilisé | Élément du move | Proc à faire |
|---|---|---|
| **Flaming Kick** | Fire | **Water** (dégâts eau) |
| **Flashflood** | Water | **Thunder** (dégâts foudre) |
| **Icy Grasp** | Ice | **Fire** (dégâts feu) |
| **Eroding Flesh** | Earth | **Wind** (dégâts vent) |
| **Fulminous Smash** | Thunder | **Earth** (dégâts terre) |

**Points clés :**

- N'importe quelle magie appropriée déclenche le proc — même une **Threnody** ou de la **magie élémentaire d'un subjob**.
- Le soigner avec le **mauvais élément** le heal, et semble **retarder Vivisection d'environ 30 secondes** au-delà de sa fenêtre normale de 3 minutes. *(à vérifier)*
- Il **gagne de la Damage Resistance tous les 30 secondes** passés sans être proc après un changement d'élément (≈ −5% DT par palier, pourcentage exact inconnu).
- Cette réduction de dégâts est **conservée** même s'il change à nouveau d'élément.

---

## Enrage

- **Après 3 minutes de combat**, Degei enrage : il ne prend plus que **1/4 des dégâts** et n'utilise plus que **Vivisection**.
- La rage **n'est pas retirée** en le faisant remonter à 100% HP.

---

## Vivisection

- Semble être utilisée **toutes les 3 minutes**, déclenchée en soignant Degei (mauvaise magie élémentaire ou mauvais skillchain) sans réussir le proc à temps.
- Plus le heal est important, plus il faut de procs pour empêcher Vivisection. 
- **Après Vivisection** : il conserve la réduction de dégâts accumulée et **n'a plus aucune faiblesse**. Il faut lui redonner du TP rapidement pour qu'il réutilise un des 5 moves ci-dessus. *(à vérifier)*
- **En cas de wipe puis recover**, le **premier move** utilisé par Degei sera **Vivisection**.

---

## Bonnes pratiques

- Les **mauvais skillchains soignent Degei**. En melee zerg, il vaut mieux **éviter totalement les skillchains** pour supprimer le risque de wipe accidentel.
- Garder un caster dédié au proc avec les 5 éléments de contre.
- Ne jamais laisser passer 30 secondes sans proc après un changement d'élément.

---

## Abilities

| Ability | Y' | Zone | Cible | Type | Élément | Effets / Condition |
|---|---|---|---|---|---|---|
| **Eroding Flesh** | 10' | AoE | Monster | Magical Damage | Earth | Dégâts + Slow |
| **Flaming Kick** | — | Conal | Player | Magical Damage | Fire | Dégâts + Burn |
| **Flashflood** | 10' | AoE | Monster | Magical Damage | Water | Dégâts, Poison, Magic Def. Down, dispel de plusieurs enhancements |
| **Fulminous Smash** | 10' | AoE | Player | Magical Damage | Thunder | Dégâts, Stun, Knockback |
| **Icy Grasp** | — | Conal | Player | Magical Damage | Ice | Dégâts, Paralysis, Terror |
| **Vivisection** | — | AoE | Monster | Magical Damage | — | Dégâts + dispel complet. **Quand il level up.** |

*Zone : 1P, AoE, Gaze, Conal · Cible : Player ou Monster*
*Type : Physical / Magical / Breath / Buff · Élément ou type de dégâts*
*Utsusemi : (#) ombres consommées · **B** ignore les ombres sans les retirer · **R** retire toutes les ombres*

---

## Récompenses

- **2 000 Gallimaufry** (G)
- **Ra'Kaznar Shard H** (G)
- **Ra'Kaznar Sapphire** (VC)
- **Old Case** (C)
- **Old Case +1** (R)

---

## 🔎 Infos complémentaires (recherche communautaire)

### Chiffres

- **HP ≈ 1 350 000** (FFXIclopedia).
- **La résistance aux dégâts monte jusqu'à −90 %** et **ne se réinitialise jamais** en cours de combat. C'est le vrai mur du fight, pas ses TP moves.
- Le proc **ne reset pas le DT déjà accumulé** — il empêche seulement la suite.

### Procs — précisions pratiques

- **Le sort de proc n'a pas besoin d'infliger des dégâts.** Une **Threnody** de BRD suffit — très pratique quand les nukers sont occupés.
- Méthode validée : **n'importe qui capable de lancer un sort T1** lance l'élément de contre. Ex. sur Eroding Flesh → **Aero**.
  > *"Failing this will cause him to build tremendous damage resistance very quickly, so either kill fast or respect the mechanics."*
- **Un proc bleu retarde Vivisection** (durée du délai non quantifiée).
- Aide SCH : **Vidohunir** passe après **Flashflood** ou **Fulminous Smash** ; **Burn** passe après **Flaming Kick** ou **Icy Grasp**.

### Ra'Kaznar Metal (secteur D)

- Effet rapporté : **bloque les status effects de ses TP moves** (Slow, Burn, Paralysis, Accuracy Down…).

### Positionnement & setup

- **Tank & spank**, avec une nuance : *"pull him to a corner before fighting if you're having trouble with the knockback."*
- Chants BRD rapportés sur D : **Honor March, Madrigal, Minuet, Minuet, Aria** + **pianissimo Ballad** sur le PLD.
- Setup burst cité : **RUN / BLU / SCH / WAR / BRD / COR**, avec **Sudden Lunge (BLU)** qui stun efficacement et spam **Savage Blade**. *(source commerciale, à vérifier)*

### Place dans le run

- **Objectif de temps : ≤ 4 minutes.** Repère d'horloge : **53 min restantes** après Degei.
- **C'est sur Degei qu'on sécurise le Seal Vow** pour le garantir sur Aminon.
- **Ordre de run de référence : D → H → A → B → C → G → F → E → Aminon.**
  Raison de commencer par D : *"you want to do your 2HRs on the most difficult bosses. So if you do D first, you should have Soul Voice etc. back to do Aita."*

---

## Sources

- [Consolidation of Sortie NM Info — FFXIAH](https://www.ffxiah.com/forum/topic/57508/consolidation-of-sortie-nm-info)
- [Sortie Release - Info — FFXIAH p.121](https://www.ffxiah.com/forum/topic/56855/sortie-release-info/121/) · [p.147](https://www.ffxiah.com/forum/topic/56855/sortie-release-info/147/)
- [Sortie 9 boss strat — FFXIAH](https://www.ffxiah.com/forum/topic/58100/sortie-9-boss-strat/)
- [Degei — FFXIclopedia](https://ffxiclopedia.fandom.com/wiki/Degei)
- [Sortie Strategies — BG-Wiki](https://www.bg-wiki.com/ffxi/Sortie_Strategies)
- [Sortie: Aminon Community Guide — Forum SE](https://forum.square-enix.com/ffxi/threads/63419)

*Base : page wiki Degei (Sortie NM). La page **Talk:Degei** de BG-Wiki n'a pas pu être consultée automatiquement (403) — à lire manuellement pour les témoignages.*
