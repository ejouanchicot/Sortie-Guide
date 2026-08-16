/* ============================================================
   serveur.mjs — servir le site pendant les tests
   ------------------------------------------------------------
   `python -m http.server` faisait le travail, mais sa file d'attente
   déborde à trois navigateurs : au-delà il refuse les connexions et
   des tests tombent sans qu'aucune panne n'existe. C'était lui, le
   plafond du parallélisme — pas le processeur.

   Celui-ci sert les mêmes fichiers sans cette limite. Node est déjà
   là de toute façon, c'est lui qui lance les tests.

   Il ne remplace PAS `python -m http.server 8137` pour travailler à
   la main : garde celui que tu veux dans ton terminal, le lanceur
   s'en sert s'il le trouve debout.

     node tests/serveur.mjs [port]
   ============================================================ */
import {createServer} from 'http';
import {createReadStream, statSync} from 'fs';
import {fileURLToPath} from 'url';
import {join, dirname, extname, normalize} from 'path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.argv[2] || 8137;

const TYPES = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.ico':'image/x-icon', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8'
};

createServer((req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if(chemin.endsWith('/')) chemin += 'index.html';
  // on ne sert rien hors du dépôt, même si l'URL remonte avec des « .. »
  const fichier = join(RACINE, normalize(chemin).replace(/^([/\\])+/, ''));
  if(!fichier.startsWith(RACINE)){ res.writeHead(403).end(); return; }
  let st;
  try { st = statSync(fichier); } catch(e) { res.writeHead(404).end('introuvable'); return; }
  if(st.isDirectory()){ res.writeHead(404).end('introuvable'); return; }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(fichier).toLowerCase()] || 'application/octet-stream',
    'Content-Length': st.size,
    'Cache-Control': 'no-store'          // les tests doivent voir le fichier d'aujourd'hui
  });
  createReadStream(fichier).pipe(res);
}).listen(PORT, () => {
  if(process.argv[2] || process.env.SORTIE_SERVEUR_VERBEUX)
    console.log('Site servi sur http://localhost:' + PORT);
});
