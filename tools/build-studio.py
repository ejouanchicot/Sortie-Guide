# -*- coding: utf-8 -*-
# Compose tools/studio.html : une coque, deux panneaux, le corps de chaque
# atelier repris TEL QUEL. Ainsi map-studio.js et strat-studio.js retrouvent
# tous leurs elements par id et n'ont pas une ligne a changer.
import io

T = 'G:/01_Development/Game_Project/Sortie-Guide/tools/'

def corps(p):
    s = io.open(T + p, encoding='utf-8').read()
    d = s.index('<body>') + 6
    return s[d: s.index('<script src=', d)].strip()

MS = corps('map-studio.html')
SS = corps('strat-studio.html')

HTML = u'''<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FFXI Strat Studio — strategy map builder</title>
<link rel="icon" type="image/png" sizes="64x64" href="../img/favicon-64.png">
<link rel="manifest" href="../manifest.webmanifest">
<meta name="theme-color" content="#070b12">
<link rel="apple-touch-icon" href="../img/icon-180.webp">
<meta name="description" content="\u00c9diteur de cartes et de strat\u00e9gies pour Final Fantasy XI \u2014 Odyssey, Sortie et tout autre contenu.">
<meta property="og:title" content="FFXI Strat Studio">
<meta property="og:description" content="Strategy map builder \u2014 plan every run.">
<meta property="og:image" content="https://ejouanchicot.github.io/Sortie-Guide/img/og-studio.webp">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<link rel="preload" href="../fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="../fonts/jetbrains-mono.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../css/fonts.css">
<!-- la feuille du guide : c'est elle qui donne \u00e0 l'aper\u00e7u son rendu R\u00c9EL -->
<link rel="stylesheet" href="../css/style.css">
<link rel="stylesheet" href="studio.css">
<!-- l'atelier carte, confin\u00e9 sous .ms pour que ses jetons n'\u00e9crasent pas
     ceux du guide dont l'aper\u00e7u de la strat a besoin -->
<link rel="stylesheet" href="studio-map.css">
<link rel="stylesheet" href="strat-studio.css">
</head>
<body>
<div class="st-app">

  <header class="st-top">
    <div class="st-brand"><img class="st-logo" src="../img/logo.webp" alt="" width="44" height="44"><span class="st-wm"><span class="tag">FFXI</span><span class="nom"><i>STRAT</i><b>STUDIO</b></span></span></div>
    <span class="st-div"></span>

    <!-- la strat ouverte : le contexte le plus large, avant les ateliers -->
    <div class="st-lib" title="Tes strats vivent dans ce navigateur, pr\u00eates \u00e0 l\u2019ouverture. \u00ab\u00a0Enregistrer\u00a0\u00bb publie celle-ci dans le guide.">
      <svg class="st-lib-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 015.5 4H9v16H5.5A1.5 1.5 0 014 18.5z"/><path d="M9 4h4.5A1.5 1.5 0 0115 5.5v13a1.5 1.5 0 01-1.5 1.5H9"/><path d="M16.6 5.2l2.6.7a1.5 1.5 0 011 1.9l-3.1 11.6"/></svg>
      <span class="st-lib-in">
        <select id="stStratSel" aria-label="Strat ouverte"></select>
        <span class="st-lib-sub" id="stStratInfo"></span>
      </span>
    </div>
    <span class="st-div"></span>

    <!-- les deux ateliers -->
    <div class="st-tabs" id="stTabs" role="tablist">
      <button type="button" class="st-tab" id="stTabMap" role="tab" data-pane="map" aria-selected="false" title="Placer les mobs, les tr\u00e9s et les annotations sur la carte">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 5.2 7.5 3l5 2.2 5-2.2v11.6l-5 2.2-5-2.2-5 2.2z"/><path d="M7.5 3v11.6M12.5 5.2v11.6"/></svg>
        <span>Carte</span><i></i></button>
      <button type="button" class="st-tab" id="stTabStrat" role="tab" data-pane="strat" aria-selected="false" title="\u00c9crire ce que chaque job fait, \u00e9tape par \u00e9tape">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h9l3.5 3.5V17H4z"/><path d="M13 3v3.5h3.5M7 10h6M7 13.2h4"/></svg>
        <span>Strat\u00e9gie</span><i></i></button>
    </div>

    <!-- le chapitre : commun aux deux ateliers, ils parlent du m\u00eame contenu -->
    <div class="st-seg" id="stChap"></div>

    <!-- les commandes de l'atelier actif, d\u00e9plac\u00e9es ici depuis leur panneau -->
    <div class="st-ctx ms" id="stCtxMap"></div>
    <div class="st-ctx" id="stCtxStrat" hidden></div>

    <div class="st-spacer"></div>
    <button class="st-btn" id="stInstall" hidden title="Ajouter l\u2019outil \u00e0 ton bureau. Le navigateur demandera confirmation \u2014 c\u2019est lui qui installe, pas le site.">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>Installer\u2026</button>
    <button class="st-btn" id="stExport" title="Fabriquer un fichier unique qui contient tout : le guide se lit d\u2019un double-clic, et le Studio sait le rouvrir pour reprendre la strat.">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M12 16V3M8 7l4-4 4 4"/></svg>Partager\u2026</button>
    <span class="st-file" id="stFile"></span>
    <span id="stUnsaved" title="Des changements ne sont pas encore sauvegard\u00e9s">non enregistr\u00e9</span>
    <button class="st-btn" id="stReload" title="Repartir de la derni\u00e8re version sauvegard\u00e9e \u2014 les changements en cours sont perdus">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 01-9 9 9 9 0 01-7.5-4M3 12a9 9 0 019-9 9 9 0 017.5 4"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>Recharger</button>
    <button class="st-btn primary" id="stSave" title="Sauvegarder la carte, la strat et sa version anglaise (Ctrl+S)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h7"/></svg>Enregistrer</button>
  </header>

  <div class="st-panes">
    <!-- ── atelier CARTE ── -->
    <div class="st-pane ms" id="stPaneMap">
__MAP__
    </div>
    <!-- ── atelier STRAT\u00c9GIE ── -->
    <div class="st-pane" id="stPaneStrat" hidden>
__STRAT__
    </div>
  </div>

</div>
<input type="file" id="stFichier" accept=".html,text/html" hidden>

<!-- va dans la barre de l'atelier Strat\u00e9gie -->
<button class="st-btn" id="stTexte" title="Rendre la strat en texte, pr\u00eat \u00e0 coller dans un salon Discord \u2014 d\u00e9coup\u00e9 en messages de la bonne taille.">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 013 11.5 8.4 8.4 0 0112 3a8.4 8.4 0 019 8.5z"/></svg>Texte\u2026</button>

<!-- ce qu'on va coller : on le voit avant, on copie message par message -->
<div class="st-modal" id="stTxtWrap" hidden>
  <div class="st-sheet" role="dialog" aria-modal="true" aria-labelledby="stTxtTitre">
    <header class="st-sheethead">
      <div>
        <h2 id="stTxtTitre">Texte pour Discord</h2>
        <p>Ce que tu colles dans le salon. Les jobs ressortent, les messages tiennent dans la limite de Discord.</p>
      </div>
      <button type="button" class="st-x" id="stTxtFermer" aria-label="Fermer">\u2715</button>
    </header>
    <div class="st-txtctl">
      <label>Quoi<select id="stTxtPortee"></select></label>
      <label id="stTxtVarL" hidden>Fa\u00e7on de jouer<select id="stTxtVar"></select></label>
      <label>Pour qui<select id="stTxtJob"></select></label>
    </div>
    <div class="st-txtparts" id="stTxtParts"></div>
    <footer class="st-sheetfoot">
      <span id="stTxtInfo"></span>
      <button type="button" class="st-btn primary" id="stTxtTout">Tout copier</button>
    </footer>
  </div>
</div>

<script src="../js/data.js"></script>
<script src="../js/i18n.js"></script>
<script src="../js/sortie-map-core.js"></script>
<script src="../js/data-file.js"></script>
<script src="../js/biblio.js"></script>
<script src="../js/export-html.js"></script>
<script src="../js/export-texte.js"></script>
<script src="../js/strat-render.js"></script>
<script src="../js/strat-core.js"></script>
<script src="../js/rich-editor.js"></script>
<script src="vendor/konva.min.js"></script>
<script src="map-studio.js"></script>
<script src="strat-studio.js"></script>
<!-- la coque en DERNIER : elle range les commandes des deux ateliers une fois
     qu'ils ont fini de se cabler -->
<script src="studio.js"></script>
</body>
</html>
'''

def indente(txt, n):
    p = ' ' * n
    return '\n'.join(p + l if l.strip() else l for l in txt.split('\n'))

HTML = HTML.replace('__MAP__', indente(MS, 6)).replace('__STRAT__', indente(SS, 6))
io.open(T + 'studio.html', 'w', encoding='utf-8', newline='').write(HTML)
print('tools/studio.html ecrit \u2014 %d lignes' % HTML.count('\n'))
