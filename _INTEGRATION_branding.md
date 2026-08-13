# Brief d'intégration — Marque « FFXI Strat Studio »

Pour **Claude Code** (VS Code). Objectif : brancher la nouvelle identité (nom + logo + favicon +
lockup d'en-tête) dans le site `Sortie-Guide` de façon cohérente, sur les **deux pages**
(`index.html` = le guide, `tools/map-studio.html` = l'éditeur). Eric fournit les images (voir §1).

Palette de référence (déjà celle du projet) : fond navy `#070b12` · cyan `#5bd6ef` · teal `#54d1c4`
· bleu `#4a9eff` · texte clair `#eaf1fb` · texte atténué `#a4b5cf`.

---

## 1. Fichiers fournis par Eric (à placer dans `img/`)

| Fichier | Contenu | Format attendu |
|---|---|---|
| `img/logo-mark.png` | L'icône seule (carte pliée + tracé + cristal), **détourée** | PNG transparent, carré, ≥ 1024×1024 |
| `img/logo-lockup.png` | La bannière « FFXI · STRAT STUDIO » complète, **détourée** | PNG transparent, ~2048×768 |

> Si un fichier manque, **ne pas inventer** : générer d'abord ce qui dépend de l'autre, et
> signaler ce qui reste à fournir.

---

## 2. Étape A — Générer le jeu d'icônes + l'OG image

Script Node (utilise `sharp`). À lancer depuis la racine du projet.

```bash
npm i sharp
node tools/gen-icons.mjs
```

`tools/gen-icons.mjs` :
```js
import sharp from 'sharp';
const NAVY = { r:7, g:11, b:18, alpha:1 };           // #070b12
const MARK = 'img/logo-mark.png';
const LOCK = 'img/logo-lockup.png';

// -- favicons transparents (le SVG reste la source principale, ceux-ci sont des fallbacks) --
await sharp(MARK).resize(32,32,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile('img/favicon-32.png');
await sharp(MARK).resize(16,16,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile('img/favicon-16.png');

// -- icônes d'app : mark centré sur tuile navy (iOS masque les coins tout seul) --
async function tile(size, pad){
  const inner = Math.round(size*(1-pad));
  const m = await sharp(MARK).resize(inner,inner,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).toBuffer();
  return sharp({create:{width:size,height:size,channels:4,background:NAVY}})
    .composite([{input:m,gravity:'center'}]).png().toBuffer();
}
await sharp(await tile(180,.20)).toFile('img/apple-touch-icon.png');   // 180
await sharp(await tile(192,.18)).toFile('img/icon-192.png');
await sharp(await tile(512,.18)).toFile('img/icon-512.png');

// -- og:image 1200×630 : lockup centré sur navy --
const lock = await sharp(LOCK).resize(1040,null,{fit:'inside'}).toBuffer();
await sharp({create:{width:1200,height:630,channels:4,background:NAVY}})
  .composite([{input:lock,gravity:'center'}]).png().toFile('img/og.png');

console.log('OK — favicons, icônes d’app et og.png générés dans img/.');
```

Remplacer aussi `img/favicon.svg` (déjà présent) par la version simplifiée ci-dessous — nette
en 16 px, sans texture ni glow :

`img/favicon.svg` :
```svg
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fe0f0"/><stop offset="1" stop-color="#3f83e6"/></linearGradient>
    <linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff6ff"/><stop offset="1" stop-color="#4a9eff"/></linearGradient>
  </defs>
  <path d="M150 356 L150 214 L196 180 L230 214 L256 196 L282 214 L316 180 L362 214 L362 356 L316 340 L256 356 L196 340 Z" fill="url(#m)" fill-opacity=".18" stroke="url(#m)" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M230 214V338 M282 214V338" stroke="url(#m)" stroke-width="6" stroke-opacity=".4" stroke-linecap="round"/>
  <path d="M188 322 L238 298 L300 306" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="179" y="313" width="18" height="18" rx="3" fill="#0b1422" stroke="#fff" stroke-width="4"/>
  <rect x="229" y="289" width="18" height="18" rx="3" fill="#0b1422" stroke="#fff" stroke-width="4"/>
  <path d="M330 286 l18 20 -18 20 -18 -20 Z" fill="url(#c)" stroke="#eaf7ff" stroke-width="2"/>
</svg>
```

---

## 3. Étape B — Balises `<head>` (icônes, OG, titres, thème)

### 3.1 `index.html`
Actuellement il n'y a **aucune** balise favicon, et le titre/OG parlent de « SORTIE ».

- **Remplacer** ligne 6 :
  ```html
  <title>SORTIE · Guide de run</title>
  ```
  par :
  ```html
  <title>FFXI Strat Studio — Guide Sortie</title>
  ```
- **Remplacer** les métas OG (lignes 9-15) — mettre à jour nom + image :
  ```html
  <meta property="og:site_name" content="FFXI Strat Studio">
  <meta property="og:title" content="FFXI Strat Studio — Guide Sortie">
  <meta property="og:description" content="Éditeur & guides de stratégie FFXI. Guide Sortie : 4 phases, Degei → Skomora → Leshonn → Ghatjot, filtre par rôle et mode Solo.">
  <meta property="og:image" content="https://ejouanchicot.github.io/Sortie-Guide/img/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://ejouanchicot.github.io/Sortie-Guide/">
  ```
- **Remplacer** ligne 17 `theme-color` : `#080a0e` → `#070b12`.
- **Ajouter** juste après la ligne `theme-color`, le bloc favicons :
  ```html
  <link rel="icon" href="img/favicon.svg" type="image/svg+xml">
  <link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="img/favicon-16.png">
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png">
  ```
- **Police du lockup** : dans le `<link ...css2?family=Inter...>` (ligne 21), ajouter Chakra Petch —
  intercaler `Chakra+Petch:wght@300;500;700&` juste après `css2?family=`. Ex :
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;500;700&family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">
  ```

### 3.2 `tools/map-studio.html`
- **Remplacer** ligne 6 `<title>SORTIE · Map Studio</title>` par
  `<title>FFXI Strat Studio</title>`.
- **Remplacer** la ligne 7 (le `<link rel="icon" ... base64 ...>`) par le même bloc favicons que
  ci-dessus.
- **Police** : dans le `<link ...css2?family=Inter...>` (ligne 10), ajouter de même
  `Chakra+Petch:wght@300;500;700&`.

---

## 4. Étape C — Le lockup d'en-tête (texte vivant)

Un seul composant réutilisé sur les deux pages. Le mot est du **vrai texte** (net + responsive) ;
l'icône est un **SVG inline** (indépendant du thème). *Option* : remplacer le `<svg>` par
`<img src="img/logo-mark.png" alt="">` si tu préfères l'icône riche — mais garde le SVG pour la
netteté en petit.

### 4.1 CSS (à ajouter — `css/style.css` pour le guide, et dans le `<style>` de `map-studio.html`)
```css
/* ===== Lockup de marque FFXI Strat Studio ===== */
.ssl{display:inline-flex;align-items:center;gap:var(--ssg,14px);text-decoration:none;line-height:1}
.ssl-mk{width:var(--ssh,48px);height:var(--ssh,48px);flex:none;display:block}
.ssl-mk svg,.ssl-mk img{width:100%;height:100%;display:block}
.ssl-wm{display:flex;flex-direction:column;justify-content:center}
.ssl-top{display:flex;align-items:center;gap:9px}
.ssl-ff{font-family:'Chakra Petch',sans-serif;font-weight:700;color:#5bd6ef;letter-spacing:.4em;text-indent:.4em;font-size:calc(var(--ssh,48px)*.19)}
.ssl-rule{height:1px;flex:1;min-width:34px;background:linear-gradient(90deg,#5bd6ef,transparent);opacity:.6}
.ssl-main{font-family:'Chakra Petch',sans-serif;font-size:calc(var(--ssh,48px)*.5);letter-spacing:.02em;margin:.05em 0 .03em;white-space:nowrap}
.ssl-main .s1{font-weight:300;color:#dbe9f7}
.ssl-main .s2{font-weight:700;background:linear-gradient(180deg,#ffffff,#bfe6f5);-webkit-background-clip:text;background-clip:text;color:transparent}
.ssl-tag{font-family:'Chakra Petch',sans-serif;font-weight:500;color:#a4b5cf;letter-spacing:.32em;text-indent:.32em;font-size:calc(var(--ssh,48px)*.135)}
@media (max-width:820px){ .ssl{--ssh:38px} .ssl-tag{display:none} }
@media (max-width:430px){ .ssl-top{display:none} }
/* thème clair (le guide a un data-theme="light") */
[data-theme="light"] .ssl-main .s1{color:#1c2b3f}
[data-theme="light"] .ssl-main .s2{background:linear-gradient(180deg,#0f2135,#2c78c8);-webkit-background-clip:text;background-clip:text}
[data-theme="light"] .ssl-ff{color:#2c78c8}
[data-theme="light"] .ssl-tag{color:#5a6b82}
```

### 4.2 Markup du lockup (icône SVG inline incluse)
```html
<a class="ssl" href="index.html" aria-label="FFXI Strat Studio — Strategy Map Builder">
  <span class="ssl-mk">
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="sslM" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fe0f0"/><stop offset="1" stop-color="#3f83e6"/></linearGradient>
        <linearGradient id="sslC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff6ff"/><stop offset="1" stop-color="#4a9eff"/></linearGradient>
      </defs>
      <path d="M150 356 L150 214 L196 180 L230 214 L256 196 L282 214 L316 180 L362 214 L362 356 L316 340 L256 356 L196 340 Z" fill="url(#sslM)" fill-opacity=".18" stroke="url(#sslM)" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M230 214V338 M282 214V338" stroke="url(#sslM)" stroke-width="6" stroke-opacity=".4" stroke-linecap="round"/>
      <path d="M188 322 L238 298 L300 306" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="180" y="314" width="16" height="16" rx="3" fill="#0b1422" stroke="#fff" stroke-width="4"/>
      <rect x="230" y="290" width="16" height="16" rx="3" fill="#0b1422" stroke="#fff" stroke-width="4"/>
      <path d="M330 286 l18 20 -18 20 -18 -20 Z" fill="url(#sslC)" stroke="#eaf7ff" stroke-width="2"/>
    </svg>
  </span>
  <span class="ssl-wm">
    <span class="ssl-top"><span class="ssl-ff">FFXI</span><span class="ssl-rule"></span></span>
    <span class="ssl-main"><span class="s1">STRAT</span> <span class="s2">STUDIO</span></span>
    <span class="ssl-tag">STRATEGY MAP BUILDER</span>
  </span>
</a>
```
> ⚠️ Si le lockup apparaît **deux fois dans la même page**, dédupliquer les `id` de gradients
> (`sslM`/`sslC`) ou déplacer les `<defs>` une seule fois — sinon collision d'id.

### 4.3 Où l'insérer

**`index.html`** — dans `<div class="brand"> <div class="btitle">` (lignes 30-32), **remplacer**
uniquement `<h1>SORTIE</h1>` (ligne 32) par le lockup ci-dessus **en retirant la tagline**
(garder la page compacte ; le `<span class="bsub">` juste en dessous décrit déjà la compo) :
- dans ce contexte, mettre `--ssh:44px` sur le `.ssl` (`style="--ssh:44px"`) et **supprimer**
  la ligne `<span class="ssl-tag">…</span>` (la `bsub` fait office de sous-titre).
- adapter/retirer les styles de `h1` devenus inutiles si besoin.

**`tools/map-studio.html`** — **remplacer** tout le bloc `<div class="brand">…</div>` (ligne 460,
l'`<img class="logo" ...>` + `<span class="brandtxt">MAP<b>STUDIO</b></span>`) par le lockup, avec
`--ssh:44px`. Ici on **garde la tagline** (l'éditeur a la place). Les anciennes règles `.brandtxt`
(lignes 428-431) et l'`<img class="logo">` deviennent inutiles → nettoyer.

---

## 5. Étape D — Nettoyage

- Supprimer les anciens assets une fois le remplacement validé : `img/map-studio-logo.webp`,
  `img/map-studio-icon.webp` (et la data-URI base64 de l'ancien favicon dans `map-studio.html`).
  ⚠️ device_bash ne peut pas `rm` : les déplacer dans un sous-dossier `_to_delete/` plutôt.
- Vérifier qu'aucune autre référence à ces fichiers ne subsiste (`grep -r map-studio-logo`).

---

## 6. Checklist de validation

- [ ] Favicon net dans l'onglet (clair **et** sombre) — `favicon.svg` pris en compte.
- [ ] `apple-touch-icon` = mark sur tuile navy, coins masqués proprement sur iOS.
- [ ] Partage (OG) : `img/og.png` 1200×630 s'affiche (tester via un validateur OG).
- [ ] En-tête **guide** : lockup net, `bsub` conservée, responsive (820 → 38px, 430 → sans tag/FFXI).
- [ ] En-tête **éditeur** : lockup avec tagline, plus aucune trace de « MAP STUDIO ».
- [ ] Thème clair du guide : `STRAT STUDIO` reste lisible (dégradé foncé appliqué).
- [ ] Police Chakra Petch bien chargée sur les deux pages (sinon fallback sans-serif propre).
- [ ] Aucune collision d'`id` SVG si le lockup est présent plusieurs fois.

---

## 7. Notes

- **Nom** verrouillé : **FFXI Strat Studio** · tagline *Strategy Map Builder* · content-agnostic
  (couvre Odyssey, Sortie & tout event FFXI).
- Le lockup « texte vivant » est préféré à la bannière PNG pour l'**en-tête** (netteté + responsive) ;
  la bannière PNG (`logo-lockup.png`) sert à l'`og:image` / au partage.
- Réf. visuelle : `header-lockup.html` (maquette du lockup) et `logo-concepts.html` (les pistes)
  sont à la racine du projet.
