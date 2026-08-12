# SORTIE · Guide de run

> 🚧 **Work in progress** — le guide est en cours d'écriture et évolue au fil des runs.
> Certaines phases, chiffres ou rôles peuvent encore changer. Remontez-moi toute erreur !

Guide de stratégie **Sortie** pour **FINAL FANTASY XI**, en 4 phases linéaires
(Degei → Skomora → Leshonn → Ghatjot), pensé pour le linkshell **Nightfallens**.

🔗 **En ligne :** https://ejouanchicot.github.io/Sortie-Guide/

Site **statique** (HTML / CSS / JS séparés) : aucune installation, aucun compte, aucun
serveur — tout tourne dans le navigateur.

## Structure du projet

```
index.html        page principale (structure)
css/style.css     tout le style
js/data.js        CONTENU de la strat (phases, boss, packs, buffs) — c'est ici qu'on édite
js/app.js         MOTEUR : rendu + interactions (rarement touché)
img/              carte + portraits des mobs et boss
og.png            aperçu Discord / réseaux sociaux
```

Les chemins sont **relatifs** : tant que tu gardes cette arborescence, ça marche à la
racine du dépôt comme en local.

## Ce que contient le guide

- **Vue d'ensemble** — la carte du run avec le trajet animé et chaque point d'arrêt
  (packs et boss) placé au bon endroit, coloré par zone.
- **Timeline par phase** — chaque phase sous forme de carte, du farm au boss, dans l'ordre.
- **Filtre « Mon rôle »** — clique ton job pour faire ressortir tes actions ; le mode
  **Solo** masque tout le reste pour ne garder que ta ligne.
- **Bascule FR / EN** — bouton de langue en haut à droite ; le choix est mémorisé.
- **Thème clair / sombre** — bouton ☀/☾ en haut à droite ; le choix est mémorisé.
- **Responsive** — mobile-first, du téléphone à l'écran ultra-wide.
- **Sélecteur de comp** — bascule entre le flex **PLD** et **DNC**, la strat s'adapte.
- **Cartes zoomables** — clic sur une carte pour l'agrandir.
- **Couleurs FFXI** — rôles et éléments codés par couleur, cartes Boss et Farm bien distinctes.

## Publier / mettre à jour

C'est un site **statique** : un simple dépôt GitHub avec **GitHub Pages** activé suffit.

1. Copie **tout le contenu** (`index.html`, `og.png`, `css/`, `js/`, `img/`) à la racine du dépôt.
2. **Settings → Pages** → Source : branche `main`, dossier `/(root)` → *Save*.
3. Pour une nouvelle version, remplace le(s) fichier(s) concerné(s) — l'URL ne change pas.
   (contenu de la strat = `js/data.js`, moteur = `js/app.js`, style = `css/style.css`.)

> Si tu utilises un autre nom de dépôt que `Sortie-Guide`, pense à mettre à jour les URLs
> `og:image` et `og:url` dans le `<head>` de `index.html` (sinon l'aperçu Discord pointe au mauvais endroit).

## Utiliser hors-ligne

Télécharge le dossier complet et ouvre `index.html` dans n'importe quel navigateur : tout
fonctionne en local (seul l'aperçu Discord `og.png` a besoin de l'URL hébergée).

## À faire (roadmap)

- [ ] Valider tous les chiffres / rôles en conditions réelles
- [ ] Détailler la variante en comp **DNC**
- [ ] Compléter les actions **WHM / GEO** manquantes sur certains boss

---

*Outil fan-made non officiel. FINAL FANTASY XI © SQUARE ENIX. Sans affiliation avec Square Enix.*
