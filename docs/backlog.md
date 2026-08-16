# Backlog · XI STUDIO

> Feuille de route. On coche au fur et à mesure.
> Une strat s'écrit dans l'atelier (`tools/studio.html`), qui l'enregistre dans `js/data.js`.
> Le guide (`index.html`) ne fait que la rendre.

---

## ✅ L'atelier

- **Deux onglets** : *Carte* (poser les marqueurs, tracer les chemins) et *Stratégie*
  (écrire les lignes job par job).
- **Tout se règle sur la carte** : barre d'armement en haut pour choisir quoi poser,
  carte de réglages qui s'ouvre à côté de l'objet posé et le suit au zoom. L'inspecteur
  de droite ne configure plus rien — il explique.
- **Outils** : marqueur (boss / midboss / pack), texte enrichi, tracé, forme, image, pipette.
- **La Puce** : n'importe quelle annotation peut prendre la forme d'une pastille ronde —
  un numéro d'ordre, une lettre, un mot posé où on veut. C'est une case à cocher dans la
  carte d'édition du texte, pas un outil de plus : rien de nouveau dans `data.js`.
- **Un calque par type de marqueur**, qu'on masque indépendamment.
- **Enregistrement direct dans `data.js`**, bloc par bloc, le même mécanisme pour les deux
  onglets — on choisit le fichier une fois pour tout l'atelier.
- **Bibliothèque de strats** : on garde, on rouvre, on repart d'une ancienne.
- **Import d'une image de fond** depuis le disque.
- **Sortir une strat** : fichier HTML autonome (qui s'ouvre partout, sans réseau) ou
  messages prêts à coller sur Discord.

## ✅ Le guide

- **Étage du haut complet** : Degei → Skomora → Leshonn → Ghatjot (farm + boss).
- **FR / EN** et **thème clair / sombre**, tous deux mémorisés.
- **Comp flex PLD / DNC** : la strat s'adapte, les lignes se filtrent.
- **Mon rôle** + mode **Solo**.
- **Carte d'ensemble** avec trajet animé et pastilles 1→2→3→4.
- **Sélecteur d'étage** haut / sous-sol.
- **Images des mobs** en WebP 256 px — le guide est passé de 732 à 544 Ko.
- **Squelette du sous-sol** (E–H) avec sa carte d'ensemble *et* une carte par secteur.
- **Le guide porte la marque de l'outil** : son onglet et son aperçu Discord annoncent
  la strat *et* « XI STUDIO », et le logo de l'en-tête ramène à l'atelier. Dans un
  fichier exporté, le logo reste mais cesse d'être un lien — il n'y aurait rien au bout.

## ✅ Les fondations

- **Contenu séparé du moteur** : ajouter de la strat = ajouter des données, pas du code.
- **Installable** (PWA) et **utilisable hors ligne** — utile en donjon, sans alt-tab.
- **Des contrôles qui ouvrent vraiment les pages** dans un navigateur, montés d'une commande.
- **Le projet se présente lui-même** : `CLAUDE.md`, `docs/architecture.md`, sept agents.
- Dépôt git propre relié à GitHub Pages.

---

## ✅ Le sous-sol — écrit

Les quatre boss ont leur strat, tirée de `Sortie-NM-Fiches/` et corrigée en
relecture par Eric. `PHASES_B` est passé de 32 à plus de 300 lignes.

- **Dhartok** (E) · **Triboulex** (G) · **Aïta** (H) · **Gartell** (F) — règles,
  procs, tank, buffs, debuffs, DD, et la table des TP moves de chacun.
- **Botulus** et **Naraka**, tuables sur le trajet, gardent leur table.
- Ghatjot et Dhartok sont **le même mob** : une seule table, identique des deux
  côtés. Idem Skomora et Triboulex.

## 🔧 En cours — le sous-sol

- [ ] **Aminon** — boss final, pas commencé. Les fiches ne le couvrent pas ; il a
      son propre guide communautaire chez SE.
- [ ] **La carte du sous-sol** et le placement des points.
- [ ] **Ordre de run à figer** — on suit le mur de droite ; la communauté conseille
      D → H → A → B → C → G → F → E pour avoir les 2h sur Aïta. Pas tranché.

## 📋 Contenu à compléter

- [ ] **Refaire les images des mobs** au propre — mêmes noms (`img/mobs/mob-*.webp`),
      remplacement direct, aucun code à toucher. *(Eric s'en occupe.)*
- [ ] **Variante DNC** là où il manque encore des lignes.
- [ ] **Actions WHM / GEO** manquantes sur certains boss.
- [ ] **Valider les chiffres et les rôles** en conditions réelles — beaucoup
      viennent des fiches, pas encore du terrain.
- [ ] **Les mécaniques marquées « non confirmé »** : le Metal H d'Aïta, le
      mécanisme exact du Metal F de Gartell.

## 💡 Plus tard

- [ ] Impression / export PDF propre.
- [ ] Checklist « pré-run » : buffs, positions de départ.

### Quand il y aura beaucoup plus de mobs

Sortie tient aujourd'hui en 24 vignettes. Au deuxième donjon, et surtout quand
chaque zone aura sa faune complète, `img/mobs/` redeviendra le fouillis qu'on
vient de défaire. Deux choses à savoir avant d'y toucher :

- **La plomberie est déjà prête.** Un cran de plus — `img/mobs/sortie/…`,
  `img/cartes/odyssey/…` — traverse sans rien casser : la reprise des anciens
  chemins laisse passer les chemins profonds, la collecte de l'export les trouve,
  et l'accès au dossier descend cran par cran. Il n'y aura ni migration de code
  ni compatibilité à réécrire : déplacer les fichiers et mettre à jour `data.js`.
- **Ce qui ne suivra pas, c'est la palette.** Le roster est déclaré *par carte*,
  en trois listes (boss / mid / pack). Avec trente créatures sur un étage, la
  barre de pose devient un mur. Les cartes portent déjà des `zones` : le
  prolongement naturel est un roster **par zone**, et une barre qui suit le
  secteur qu'on est en train d'écrire.

Rien de tout ça n'est urgent tant qu'un étage tient en dix créatures. Le jour où
ce n'est plus vrai, c'est la palette qu'il faut reprendre — pas le rangement.

---

## Comment on bosse

1. La strat s'écrit **dans l'atelier**, et s'enregistre — ça écrit directement `js/data.js`.
2. Le moteur et les outils se touchent **à part du contenu** : `git status` avant `data.js`,
   et on committe ce qui y attend **séparément**, avant d'entamer autre chose.
3. Les commits restent **locaux**. Publier est une décision — GitHub Pages suit tout seul.

> Règle d'or : on committe à chaque point stable, avec un message qui dit ce qu'on peut
> refaire ou défaire. C'est ce qui permet de revenir en arrière sans y penser.
