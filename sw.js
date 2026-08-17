/* ============================================================
   sw.js — le service worker : l'outil marche hors ligne
   ------------------------------------------------------------
   Il ne sert qu'à ça. Aucune synchro, aucun serveur : on met en
   cache la coquille de l'application pour qu'un lead puisse
   ouvrir son atelier dans le train, ou pendant une coupure.

   DEUX LISTES, et c'est le point important. Le guide et l'atelier
   n'ont pas le même public : le linkshell ouvre le GUIDE, sur un
   téléphone, en donjon. Une seule liste lui faisait précharger
   Konva, map-studio et strat-studio — 211 Ko compressés d'outil
   d'écriture qu'il n'ouvrira jamais — pendant que la carte du run,
   elle, se chargeait encore. L'atelier n'entre au cache que quand on
   s'en sert : à l'installation si c'est de lui qu'on vient, sinon au
   premier passage par tools/studio.html.

   RÉSEAU D'ABORD pour le code, mais AVEC UN DÉLAI ; cache d'abord
   pour les polices et les images :
     · le code doit rester frais pendant qu'on développe. Un
       cache-d'abord sec sur les .js et .css oblige à recharger deux
       fois après chaque modification, et fait croire que le travail
       n'a pas été enregistré ;
     · mais « réseau d'abord » tout court, c'est repasser par le
       réseau pour 232 Ko déjà en cache à chaque ouverture. Le repli
       ne jouait que si la connexion était MORTE — une connexion
       lente ne le déclenche pas, fetch() n'échoue pas, il attend.
       D'où le délai : au-delà, on sert ce qu'on a et on rafraîchit
       derrière. En local le réseau répond en quelques millisecondes
       et gagne toujours la course : rien ne change pour qui écrit
       l'outil. En 4G de donjon, la page s'ouvre tout de suite ;
     · les polices et les images ne changent jamais sous le même
       nom : les servir du cache ne coûte aucun risque et évite
       de retélécharger 400 Ko à chaque ouverture.
   Hors ligne, tout retombe sur le cache dans les trois cas.

   ⚠ Monter VERSION à chaque livraison : c'est ce qui purge
     l'ancien cache chez tout le monde.
   ============================================================ */
const VERSION = 'strat-studio-v33';
// Le préfixe sert à la purge : caches.keys() est à l'échelle de l'ORIGINE,
// pas du dossier. Sur ejouanchicot.github.io, tous les dépôts publiés en
// Pages la partagent — sans ce filtre, monter VERSION effaçait le cache des
// autres projets du compte.
const PREFIXE = 'strat-studio-';

/* Ce qu'il faut pour LIRE une strat. Les images (fonds de carte, vignettes,
   icônes) entrent toutes seules à la première visite, par la règle DURABLE. */
const GUIDE = [
  'index.html',
  'js/app.js',
  'js/data.js',
  'js/i18n.js',
  'js/sortie-map-core.js',
  'js/strat-render.js',
  'css/style.css',
  'css/fonts.css',
  // les .woff2 comptaient sur DURABLE, qui ne les prend qu'à la visite
  // SUIVANTE : installer puis partir hors ligne dans la foulée ouvrait le
  // guide en police système.
  'fonts/inter.woff2',
  'fonts/jetbrains-mono.woff2',
  'fonts/space-grotesk.woff2',
  'img/logo.webp',
  'manifest.webmanifest'
];

/* Ce qu'il faut EN PLUS pour en écrire une. Chargé à la première ouverture
   de l'atelier, pas avant. */
const ATELIER = [
  'tools/studio.html',
  'tools/studio.css',
  'tools/studio.js',
  'tools/map-studio.confine.css',
  'tools/strat-studio.css',
  'tools/map-studio.js',
  'tools/strat-studio.js',
  'tools/vendor/konva.min.js',
  'js/data-file.js',
  'js/import-image.js',
  'js/biblio.js',
  'js/minifie.js',
  'js/export-html.js',
  'js/export-texte.js',
  'js/strat-core.js',
  'js/rich-editor.js'
];

// Au-delà, on sert ce qu'on a. Assez long pour qu'un réseau normal gagne,
// assez court pour qu'on ne regarde pas une page blanche en donjon.
const DELAI_RESEAU = 1200;

let atelierGarde = false;   // déclaré ici : install() s'en sert aussi

// addAll échoue en bloc si UN fichier manque : on les prend un par un pour
// qu'un renommage oublié ne prive pas tout le monde du hors-ligne.
async function garde(liste) {
  const c = await caches.open(VERSION);
  await Promise.all(liste.map(u => c.add(u).catch(() => {})));
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await garde(GUIDE);
    /* Et l'atelier si celui qui installe est DÉJÀ dans l'atelier. Sans ça,
       scinder la coquille en deux avait cassé son hors-ligne : le déclencheur
       ci-dessous attend un `fetch`, or à la PREMIÈRE visite le worker n'est pas
       encore aux commandes — l'événement n'arrive jamais. Mesuré : après une
       seule visite, 13 entrées en cache et pas de tools/studio.html ; le lead
       installait l'application, fermait, partait en donjon, et la page ne
       s'ouvrait pas du tout. C'était une régression sur la liste unique, où
       install() prenait tout.
       On regarde donc qui nous a amenés ici plutôt que d'attendre un second
       passage : le lecteur du guide ne paie toujours rien. */
    const ouverts = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});
    if (ouverts.some(c => /\/tools\/studio\.html$/.test(new URL(c.url).pathname))) {
      atelierGarde = true;
      await garde(ATELIER);
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms
      .filter(n => n.startsWith(PREFIXE) && n !== VERSION)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

const DURABLE = /\.(woff2?|png|jpe?g|webp|svg|gif)$/i;

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;   // rien d'externe à mettre en cache

  // premier passage par l'atelier : on prend le reste, en arrière-plan
  if (!atelierGarde && /\/tools\/studio\.html$/.test(u.pathname)) {
    atelierGarde = true;
    e.waitUntil(garde(ATELIER));
  }

  if (DURABLE.test(u.pathname)) {
    // cache d'abord : ces fichiers ne changent pas sous le même nom
    e.respondWith((async () => {
      const hit = await caches.match(r);
      if (hit) return hit;
      const rep = await fetch(r);
      if (rep.ok) (await caches.open(VERSION)).put(r, rep.clone());
      return rep;
    })());
    return;
  }

  // réseau d'abord, mais pas indéfiniment
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const enCache = await cache.match(r);
    const duReseau = fetch(r).then(rep => {
      if (rep.ok) cache.put(r, rep.clone());
      return rep;
    });
    // rien à servir en attendant : on attend le réseau, quoi qu'il arrive
    if (!enCache) return duReseau;
    // le réseau garde la main tant qu'il répond vite — donc toujours en local
    e.waitUntil(duReseau.catch(() => {}));   // qu'il finisse même si on ne l'attend plus
    const gagnant = await Promise.race([
      duReseau.catch(() => null),
      new Promise(ok => setTimeout(() => ok(null), DELAI_RESEAU))
    ]);
    return gagnant || enCache;
  })());
});
