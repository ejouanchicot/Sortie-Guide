# -*- coding: utf-8 -*-
# Confine map-studio.css sous « .ms », le panneau Carte de l'outil unifie.
# Sans ca, ses jetons :root (--line, --dim, --accent, --mono...) ecraseraient
# ceux du guide, dont l'apercu de la strat a besoin dans la meme page.
#
# On ne fait PAS ca a la regex : on parcourt le fichier en suivant les
# accolades. Une premiere version a la regex laissait passer un selecteur sur
# trois.
#
# -- CE QUI A CASSE, ET POURQUOI ------------------------------
# La deuxieme version sautait bien les commentaires et les chaines, mais elle
# les RECOPIAIT AU VOL en repartant de leur fin. Tout ce qui les precedait
# depuis le dernier point de reprise etait donc perdu. Dans :
#
#     :root{color-scheme:dark;/* palette */
#       --line:...;}
#
# « color-scheme:dark; » disparaissait, et avec lui --bg et --s1..--s4, dont
# douze regles dependaient : le fond du selecteur de carte devenait
# transparent, donc blanc. Une chaine, elle, etait recopiee DEUX fois.
#
# La version ci-dessous ne recopie plus rien au vol. Elle repere d'abord les
# zones « neutres » (commentaires et chaines), puis parcourt le fichier sans
# jamais reagir a une accolade qui s'y trouve. Le texte sort donc d'un seul
# tenant, et seuls les SELECTEURS sont reecrits.
#
# Un commentaire entre deux regles doit rester ou il est, et non se retrouver
# colle au selecteur suivant : « /* titre */ .a » deviendrait « .ms /* titre
# */ .a », c'est-a-dire un descendant de .ms — pas la meme chose. On separe
# donc l'en-tete (blancs et commentaires) du selecteur lui-meme.
import io

SRC = 'G:/01_Development/Game_Project/Sortie-Guide/tools/map-studio.css'
DST = 'G:/01_Development/Game_Project/Sortie-Guide/tools/studio-map.css'

# selecteurs qui designent la page entiere -> ils designent le panneau
# .app n'est PAS la racine : c'est un enfant du panneau. Le confondre avec
# lui laissait le vrai <div class="app"> sans mise en page, et la carte
# s'arretait a mi-hauteur.
RACINE = {':root', 'body', 'html', '*'}
# regles a laisser hors du panneau (elles ne stylent rien de visible seules)
IGNORE_HAUTEUR = {'html,body'}

GUILLEMETS = '"' + "'"
ANTISLASH = '\\'


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
    return '.ms ' + sel


def prefixe(sels):
    if sels.strip() in IGNORE_HAUTEUR:
        return '.ms'
    return ','.join(prefixeUn(x) for x in sels.split(','))


# ---- 1. les zones ou une accolade ne veut rien dire ----
def zonesNeutres(css):
    N = len(css)
    m = bytearray(N)
    k = 0
    while k < N:
        if css.startswith('/*', k):
            j = css.find('*/', k + 2)
            j = N if j < 0 else j + 2
            for q in range(k, j):
                m[q] = 1
            k = j
            continue
        if css[k] in GUILLEMETS:
            g, j = css[k], k + 1
            while j < N and css[j] != g:
                j += 2 if css[j] == ANTISLASH else 1
            j = min(j + 1, N)
            for q in range(k, j):
                m[q] = 1
            k = j
            continue
        k += 1
    return m


# ---- 2. separer l'en-tete du selecteur ----
# Rend (ce qui precede et doit rester tel quel, le selecteur a reecrire).
def coupeTete(brut):
    k = 0
    while k < len(brut):
        if brut[k].isspace():
            k += 1
            continue
        if brut.startswith('/*', k):
            f = brut.find('*/', k + 2)
            if f < 0:
                break
            k = f + 2
            continue
        break
    return brut[:k], brut[k:]


# ---- 3. le parcours ----
def scope(css):
    neutre = zonesNeutres(css)
    n = len(css)
    out = []
    i = 0
    debut = 0          # debut du texte pas encore ecrit
    prof = 0           # profondeur d'accolades
    pileAt = []        # est-on dans un @media / @supports ?

    while i < n:
        if neutre[i]:
            i += 1
            continue

        if css[i] == '{':
            brut = css[debut:i]
            if prof == 0:
                tete, sel = coupeTete(brut)
                if sel.strip().startswith('@'):
                    out.append(brut)              # @media, @keyframes, @font-face...
                    pileAt.append(sel.strip().split()[0])
                else:
                    out.append(tete + prefixe(sel))
                    pileAt.append(None)
            elif prof == 1 and pileAt and pileAt[-1] in ('@media', '@supports'):
                tete, sel = coupeTete(brut)
                out.append(tete + prefixe(sel))
            else:
                out.append(brut)                  # 0% / to / from d'un @keyframes
            out.append('{')
            prof += 1
            i += 1
            debut = i
            continue

        if css[i] == '}':
            out.append(css[debut:i])              # declarations, commentaires, chaines
            out.append('}')
            prof -= 1
            if prof == 0 and pileAt:
                pileAt.pop()
            i += 1
            debut = i
            continue

        i += 1

    out.append(css[debut:])
    return ''.join(out)


# ---- 4. rien ne doit s'etre perdu en route ----
# La panne precedente etait silencieuse : le fichier sortait plus court, et on
# ne s'en apercevait qu'en voyant un fond blanc des semaines plus tard.
#
# Le controle est exact : prefixer des selecteurs ne touche PAS au contenu des
# blocs. On extrait donc le corps de chaque bloc des deux cotes, et on exige
# qu'ils soient identiques, dans le meme ordre.
def corpsDesBlocs(css):
    m, N = zonesNeutres(css), len(css)
    out, prof, debut, k = [], 0, 0, 0
    while k < N:
        if m[k]:
            k += 1
            continue
        if css[k] == '{':
            prof += 1
            debut = k + 1
        elif css[k] == '}':
            if prof > 0:
                out.append(css[debut:k])
            prof -= 1
        k += 1
    return out


EN_TETE = (u'/* ============================================================\n'
           u'   studio-map.css \u2014 la feuille de l\u2019\u00e9diteur de carte, confin\u00e9e\n'
           u'   ------------------------------------------------------------\n'
           u'   G\u00c9N\u00c9R\u00c9 depuis map-studio.css : chaque s\u00e9lecteur est pr\u00e9fix\u00e9\n'
           u'   par \u00ab .ms \u00bb, le panneau Carte de l\u2019outil unifi\u00e9. Sans \u00e7a ses\n'
           u'   jetons de couleur (--line, --dim, --accent, --mono\u2026)\n'
           u'   \u00e9craseraient ceux du guide, dont l\u2019aper\u00e7u de la strat a besoin\n'
           u'   dans la m\u00eame page.\n'
           u'   \u26a0 Ne pas \u00e9diter ici : modifier map-studio.css et reg\u00e9n\u00e9rer\n'
           u'     (python tools/scope-mapcss.py).\n'
           u'   ============================================================ */\n')

if __name__ == '__main__':
    src = io.open(SRC, encoding='utf-8').read()
    texte = scope(src)

    a, b = corpsDesBlocs(src), corpsDesBlocs(texte)
    assert len(a) == len(b), 'blocs : %d a la source, %d en sortie' % (len(a), len(b))
    for k in range(len(a)):
        assert a[k] == b[k], ('bloc %d altere\n  source : %r\n  sortie : %r'
                              % (k, a[k][:120], b[k][:120]))

    # on retire l'en-tete d'origine, qui parle du fichier source
    corps = texte
    if texte.lstrip().startswith('/*'):
        d = texte.find('*/')
        if d >= 0:
            corps = texte[d + 2:].lstrip('\n')

    io.open(DST, 'w', encoding='utf-8', newline='').write(EN_TETE + corps)
    print('studio-map.css regenere : %d blocs verifies, %d octets'
          % (len(a), len(EN_TETE + corps)))
