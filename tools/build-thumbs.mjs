// Миниатюры фото для списков и карты: у части фото в наборе нет t_…-файла, и в списках грузилось полное фото.
// Делаем недостающие: ширина 420 px, JPEG ~62 %. Существующие миниатюры не трогаем.
// Запуск: node tools/build-thumbs.mjs && npm run gen:media
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact'); // приходит с Expo (@expo/image-utils), отдельная зависимость не нужна

const root = resolve(import.meta.dirname, '..');
const img = join(root, 'assets/img');
const { places } = JSON.parse(readFileSync(join(root, 'assets/data/places.json'), 'utf8'));
const strip = (s) => s.replace(/^img\//, '');

const W = 420;
let made = 0;
let before = 0;
let after = 0;
for (const p of places)
  for (const ph of p.photos) {
    const src = join(img, strip(ph.f));
    const dst = join(img, strip(ph.t));
    if (existsSync(dst) || !existsSync(src)) continue;
    const im = await Jimp.read(src);
    if (im.bitmap.width > W) im.resize(W, Jimp.AUTO);
    await im.quality(62).writeAsync(dst);
    before += statSync(src).size;
    after += statSync(dst).size;
    made++;
  }
console.log(`миниатюр: ${made}; полные фото ${(before / 1e6).toFixed(1)} МБ → миниатюры ${(after / 1e6).toFixed(1)} МБ`);
