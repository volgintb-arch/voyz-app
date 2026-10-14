// Раздаёт веб-прототип Voyz на http://localhost:8080.
// Фото прототип ищет в img/, а лежат они один раз — в assets/img/.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mounts = [
  ['/img/', join(root, 'assets/img')],
  ['/', join(root, 'reference/prototype')],
];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const port = Number(process.env.PORT) || 8080;

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const [prefix, dir] = mounts.find(([p]) => path.startsWith(p));
  const file = normalize(join(dir, path.slice(prefix.length)));
  // не выпускаем запрос за пределы смонтированной папки
  if (!file.startsWith(dir)) return res.writeHead(403).end();
  try {
    if (!statSync(file).isFile()) throw 0;
  } catch {
    return res.writeHead(404).end('Not found');
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Прототип Voyz: http://localhost:${port}`));
