# -*- coding: utf-8 -*-
# Confine map-studio.css sous « .ms », le panneau Carte de l'outil unifie.
# Sans ca, ses jetons :root (--line, --dim, --accent, --mono...) ecraseraient
# ceux du guide, dont l'apercu de la strat a besoin dans la meme page.
#
# On ne fait PAS ca a la regex : on parcourt le fichier en suivant les
# accolades, en sautant les commentaires et les chaines. Une premiere version
# a la regex laissait passer un selecteur sur trois.
import io, re

SRC = 'G:/01_Development/Game_Project/Sortie-Guide/tools/map-studio.css'
DST = 'G:/01_Development/Game_Project/Sortie-Guide/tools/studio-map.css'
s = io.open(SRC, encoding='utf-8').read()

# selecteurs qui designent la page entiere -> ils designent le panneau
# .app n'est PAS la racine : c'est un enfant du panneau. Le confondre avec
# lui laissait le vrai <div class="app"> sans mise en page, et la carte
# s'arretait a mi-hauteur.
RACINE = {':root', 'body', 'html', '*'}
# regles a laisser hors du panneau (elles ne stylent rien de visible seules)
IGNORE_HAUTEUR = {'html,body'}

def prefixeUn(sel):
    sel = sel.strip()
    if not sel:
        return sel
    if sel in RACINE:
        return '.ms'
    for r in ('body', 'html'):
        if sel.startswith(r + ':') or sel.startswith(r + '::'):
            return '.ms' + sel[len(r):]
        if sel.startswith(r + ' '):
            return '.ms ' + sel[len(r) + 1:]
    if sel.startswith('::') or sel.startswith(':'):
        return '.ms ' + sel
    return '.ms ' + sel

def prefixe(sels):
    if sels.strip() in IGNORE_HAUTEUR:
        return '.ms'
    return ','.join(prefixeUn(x) for x in sels.split(','))

out = []
i, n = 0, len(s)
sel_debut = 0          # debut du selecteur courant
prof = 0               # profondeur d'accolades
pileAt = []            # est-on dans un @media / @supports ?

while i < n:
    # commentaire : recopie tel quel
    if s.startswith('/*', i):
        j = s.find('*/', i + 2)
        j = n if j < 0 else j + 2
        out.append(s[i:j]); i = j; sel_debut = i; continue
    # chaine : recopie telle quelle
    if s[i] in '"\'':
        q = s[i]; j = i + 1
        while j < n and s[j] != q:
            j += 2 if s[j] == '\\' else 1
        j = min(j + 1, n)
        out.append(s[i:j]); i = j; continue

    if s[i] == '{':
        brut = s[sel_debut:i]
        if prof == 0:
            tete = brut.strip()
            if tete.startswith('@'):
                out.append(brut)              # @media, @keyframes, @font-face…
                pileAt.append(tete.split()[0])
            else:
                blanc = brut[:len(brut) - len(brut.lstrip())]
                out.append(blanc + prefixe(tete))
                pileAt.append(None)
        elif prof == 1 and pileAt and pileAt[-1] in ('@media', '@supports'):
            blanc = brut[:len(brut) - len(brut.lstrip())]
            out.append(blanc + prefixe(brut.strip()))
        else:
            out.append(brut)                  # 0% / to / from d'un @keyframes
        out.append('{'); prof += 1; i += 1; sel_debut = i; continue

    if s[i] == '}':
        out.append(s[sel_debut:i]); out.append('}')
        prof -= 1
        if prof == 0 and pileAt: pileAt.pop()
        i += 1; sel_debut = i; continue

    i += 1

out.append(s[sel_debut:])
res = ''.join(out)

# le panneau n'est pas la page : il est dimensionne par la coque
# le panneau est deja dimensionne par la coque, mais .ms .app en a besoin
res = res.replace('height:100vh', 'height:100%')

entete = (u'/* ============================================================\n'
          u'   studio-map.css \u2014 la feuille de l\u2019\u00e9diteur de carte, confin\u00e9e\n'
          u'   ------------------------------------------------------------\n'
          u'   G\u00c9N\u00c9R\u00c9 depuis map-studio.css : chaque s\u00e9lecteur est pr\u00e9fix\u00e9 par\n'
          u'   \u00ab .ms \u00bb, le panneau Carte de l\u2019outil unifi\u00e9. Sans \u00e7a ses jetons\n'
          u'   de couleur (--line, --dim, --accent, --mono\u2026) \u00e9craseraient ceux\n'
          u'   du guide, dont l\u2019aper\u00e7u de la strat a besoin dans la m\u00eame page.\n'
          u'   \u26a0 Ne pas \u00e9diter ici : modifier map-studio.css et reg\u00e9n\u00e9rer\n'
          u'     (scratchpad/scope-mapcss.py).\n'
          u'   ============================================================ */\n')
res = re.sub(r'^/\*.*?\*/\s*', '', res, count=1, flags=re.S)
io.open(DST, 'w', encoding='utf-8', newline='').write(entete + res)

# controle : plus aucun selecteur de premier niveau hors .ms / @
restants = []
prof = 0; i = 0; sel = 0
while i < len(res):
    if res.startswith('/*', i):
        j = res.find('*/', i + 2); i = (len(res) if j < 0 else j + 2); sel = i; continue
    if res[i] == '{':
        if prof == 0:
            t = res[sel:i].strip()
            if t and not t.startswith('@') and not t.startswith('.ms'):
                restants.append(t[:60])
        prof += 1; i += 1; sel = i; continue
    if res[i] == '}':
        prof -= 1; i += 1; sel = i; continue
    i += 1
print('selecteurs .ms : %d' % res.count('.ms'))
print('selecteurs de premier niveau NON confines : %d' % len(restants))
for r in restants[:12]:
    print('  ' + repr(r))
