// Nightshade — tiny static server for local play-testing only (not part of the entry).
// Serves game/ at http://localhost:8080 so the game can be played and
// screenshotted in a desktop browser. Node 22, standard library only.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const port = Number(process.argv[2]) || 8080;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(join(root, normalize(urlPath).replace(/^(\.\.[/\\])+/, '')));
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); res.end(); return; }
  const target = file === root ? join(root, 'index.html') : file;
  let stat;
  try { stat = statSync(target); } catch { res.writeHead(404); res.end('not found'); return; }
  if (!stat.isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream' });
  createReadStream(target).pipe(res);
}).listen(port, () => console.log(`Nightshade served at http://localhost:${port}`));
