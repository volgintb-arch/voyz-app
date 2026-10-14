// Генерирует src/data/media.generated.ts — статические require() для фото и аудиогидов.
// Metro подключает в сборку только файлы, названные в require() строкой, поэтому таблицу пишем кодом.
// Запуск: npm run gen:media (после любых изменений в assets/img, assets/audio или places.json).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { places } = JSON.parse(readFileSync(join(root, 'assets/data/places.json'), 'utf8'));
const imgs = new Set(readdirSync(join(root, 'assets/img')));
const mp3 = new Set(readdirSync(join(root, 'assets/audio')).filter((f) => f.endsWith('.mp3')));

// длительности озвучки лежат в прототипе: window.VOYZ_AUDIO = {voice, dur: {id: сек}}
const audioJs = readFileSync(join(root, 'reference/prototype/data/audio.js'), 'utf8');
const { dur } = JSON.parse(audioJs.slice(audioJs.indexOf('{'), audioJs.lastIndexOf('}') + 1));

const strip = (s) => s.replace(/^img\//, '');
const photo = new Map(); // имя файла → путь для require
let noThumb = 0;
for (const p of places)
  for (const ph of p.photos) {
    const f = strip(ph.f);
    const t = strip(ph.t);
    if (!imgs.has(f)) throw new Error(`Нет файла фото ${f} (${p.id})`);
    photo.set(f, f);
    // миниатюры есть не у всех фото — тогда в списках показываем полное
    if (imgs.has(t)) photo.set(t, t);
    else (photo.set(t, f), noThumb++);
  }

const audio = places.filter((p) => mp3.has(`${p.id}.mp3`));
const lines = [
  '// Сгенерировано tools/gen-media.mjs — не редактировать вручную.',
  'import type { ImageSourcePropType } from \'react-native\';',
  '',
  'export const photoSources: Record<string, ImageSourcePropType> = {',
  ...[...photo].map(([k, v]) => `  '${k}': require('../../assets/img/${v}'),`),
  '};',
  '',
  'export const audioSources: Record<string, number> = {',
  ...audio.map((p) => `  '${p.id}': require('../../assets/audio/${p.id}.mp3'),`),
  '};',
  '',
  '/** Длительность аудиогида, секунды. */',
  'export const audioDuration: Record<string, number> = {',
  ...audio.filter((p) => dur[p.id]).map((p) => `  '${p.id}': ${dur[p.id]},`),
  '};',
  '',
];
writeFileSync(join(root, 'src/data/media.generated.ts'), lines.join('\n'));
console.log(`Фото: ${photo.size} ключей (без миниатюры: ${noThumb}); аудио: ${audio.length}/${places.length}; длительностей: ${Object.keys(dur).length}`);
