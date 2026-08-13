/* ============================================================
   sw.js — le service worker : l'outil marche hors ligne
   ------------------------------------------------------------
   Il ne sert qu'à ça. Aucune synchro, aucun serveur : on met en
   cache la coquille de l'application pour qu'un lead puisse
   ouvrir son atelier dans le train, ou pendant une coupure.

   Stratégie choisie — RÉSEAU D'ABORD pour le code, CACHE D'ABORD
   pour les polices et les images :
     · le code doit rester frais. Un cache-d'abord sur les .js et
       .css oblige à recharger deux fois après chaque modification,
       et fait croire que le travail n'a pas été enregistré ;
     · les polices et les images ne changent jamais sous le même
       nom : les servir du cache ne coûte aucun risque et évite
       de retélécharger 400 Ko à chaque ouverture.
   Hors ligne, tout retombe sur le cache dans les deux cas.

   ⚠ Monter VERSION à chaque livraison : c'est ce qui purge
     l'ancien cache chez tout le monde.
   ============================================================ */
const VERSION = 'strat-studio-v1';
const COQUILLE = [
  'tools/studio.html',
  'tools/studio.css',
  'tools/studio.js',
  'tools/studio-map.css',
  'tools/strat-studio.css',
  'tools/map-studio.js',
  'tools/strat-studio.js',
  'tools/vendor/konva.min.js',
  'css/style.css',
  'css/fonts.css',
  'js/data.js',
  'js/i18n.js',
  'js/sortie-map-core.js',
  'js/data-file.js',
  'js/strat-render.js',
  'js/strat-core.js',
  'js/rich-editor.js',
  'img/logo.webp',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  // addAll échoue en bloc si UN fichier manque : on les prend un par un
  // pour qu'un renommage oublié ne prive pas tout le monde du hors-ligne.
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(COQUILLE.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

const DURABLE = /\.(woff2?|png|jpe?g|webp|svg|gif)$/i;

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;   // rien d'externe à mettre en cache

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

  // réseau d'abord : le code doit rester frais pendant qu'on développe
  e.respondWith((async () => {
    try {
      const rep = await fetch(r);
      if (rep.ok) (await caches.open(VERSION)).put(r, rep.clone());
      return rep;
    } catch (err) {
      const hit = await caches.match(r);
      if (hit) return hit;
      throw err;
    }
  })());
});
