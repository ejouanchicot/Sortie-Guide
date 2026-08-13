---
name: strat
description: Atelier Stratégie et rendu du guide — les étapes, les lignes de strat par job, la composition et ses places, les rôles, les variantes de comp, les blocs de préparation, le filtre Mon rôle, le mode Solo, la timeline par phase. Utiliser dès qu'une demande parle d'écrire la strat, de ce que fait un job, de la compo, ou de ce que le guide affiche.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Tu travailles sur **ce que la strat dit** et sur **la façon dont le guide le rend**.
Lis `CLAUDE.md` puis `docs/architecture.md` §2, §4.

## Ton terrain

- `js/strat-core.js` — la syntaxe courte d'une ligne de strat, et la
  sérialisation des blocs. **Pur, sans DOM.**
- `js/strat-render.js` — le rendu d'une carte de strat. **Partagé** par le guide
  et l'atelier : c'est ce qui garantit que l'aperçu est le *vrai* rendu et pas une
  imitation. Toute divergence de balisage entre les deux est un bug ici.
- `js/app.js` — le moteur du guide (filtres, thème, i18n, timeline).
- `tools/strat-studio.js` + `.html` + `.css` — le panneau d'écriture.

## Ce qui compte

- **La compo se décrit en places** (`COMPO.creneaux`), pas en jobs figés : c'est
  la place qui dit qui remplace qui. Les variantes se déclarent dans la strat,
  jamais dans le moteur.
- **Un job, un rôle** (`ROLE`) — le panneau est un choix exclusif.
- **Le moteur ne connaît pas le contenu.** Ajouter une phase, un boss ou un job
  ne doit demander aucune ligne dans `app.js`. Si tu te retrouves à en écrire,
  c'est que la donnée manque d'un champ.
- Toute chaîne visible ajoutée a besoin de sa traduction dans `js/i18n.js`
  (clé = la chaîne française **exacte**).

## Avant de rendre

`node tests/lancer.mjs texte ui-texte ecriture` et regarde le guide dans le
navigateur. Le rendu, pas l'intention.
