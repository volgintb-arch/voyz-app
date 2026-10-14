// Встроенный рельеф: отмывка гор для каждой страны одной картинкой — работает без сети.
// Источник высот: Terrain Tiles (AWS Open Data, terrarium), уровень z8 (~600 м/пиксель).
// Тени — метод Хорна, солнце с северо-запада (азимут 315°, высота 45°), цвет — оливковая гамма Voyz.
// Запуск: node tools/build-relief.mjs → assets/relief/<страна>.png + src/geo/relief.generated.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';

const root = resolve(import.meta.dirname, '..');
const Z = 8;
const TILE = 256;
const { places } = JSON.parse(readFileSync(join(root, 'assets/data/places.json'), 'utf8'));

const lon2x = (lon) => ((lon + 180) / 360) * 2 ** Z;
const lat2y = (lat) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** Z;
const x2lon = (x) => (x / 2 ** Z) * 360 - 180;
const y2lat = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** Z))) * 180) / Math.PI;

async function tile(x, y) {
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url);
    if (r.ok) return PNG.sync.read(Buffer.from(await r.arrayBuffer()));
  }
  throw new Error(`не скачался ${url}`);
}

async function build(country) {
  const pts = places.filter((p) => p.c === country && p.ll).map((p) => p.ll);
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  // рамка: места страны с запасом ~1.5°, чтобы горы по краям тоже были
  const x0 = Math.floor(lon2x(Math.min(...lons) - 1.5));
  const x1 = Math.floor(lon2x(Math.max(...lons) + 1.5));
  const y0 = Math.floor(lat2y(Math.max(...lats) + 1.2));
  const y1 = Math.floor(lat2y(Math.min(...lats) - 1.2));
  const W = (x1 - x0 + 1) * TILE;
  const H = (y1 - y0 + 1) * TILE;
  const h = new Float32Array(W * H);

  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      const png = await tile(tx, ty);
      for (let py = 0; py < TILE; py++)
        for (let px = 0; px < TILE; px++) {
          const i = (py * TILE + px) * 4;
          const d = png.data;
          h[((ty - y0) * TILE + py) * W + (tx - x0) * TILE + px] = d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
        }
    }

  // Хорн: уклон и экспозиция по окну 3×3; размер пикселя зависит от широты (Меркатор)
  const out = new PNG({ width: W, height: H });
  const az = (315 * Math.PI) / 180;
  const alt = (45 * Math.PI) / 180;
  const Zf = 1.6; // усиление рельефа, чтобы предгорья читались на обзорном масштабе
  // прозрачность ступенями по 12/255: глазу незаметно, а PNG сжимается в разы лучше
  const q = (a) => Math.round((a * 255) / 12) * 12;
  const at = (x, y) => h[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  for (let y = 0; y < H; y++) {
    const lat = y2lat(y0 + y / TILE);
    const cell = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (TILE * 2 ** Z);
    for (let x = 0; x < W; x++) {
      const a = at(x - 1, y - 1), b = at(x, y - 1), c = at(x + 1, y - 1);
      const d = at(x - 1, y), f = at(x + 1, y);
      const g = at(x - 1, y + 1), i2 = at(x, y + 1), k = at(x + 1, y + 1);
      const dzdx = ((c + 2 * f + k) - (a + 2 * d + g)) / (8 * cell);
      const dzdy = ((g + 2 * i2 + k) - (a + 2 * b + c)) / (8 * cell);
      const slope = Math.atan(Zf * Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const shade = Math.max(0, Math.cos(alt) * Math.cos(slope) + Math.sin(alt) * Math.sin(slope) * Math.cos(az - aspect));
      const o = (y * W + x) * 4;
      if (shade < 0.7) {
        // тень — тёмно-оливковая, плотность растёт с крутизной
        out.data[o] = 0x3b;
        out.data[o + 1] = 0x4a;
        out.data[o + 2] = 0x2f;
        out.data[o + 3] = q(Math.min(0.7, (0.7 - shade) * 1.4));
      } else {
        // освещённые склоны — лёгкий белый блик
        out.data[o] = out.data[o + 1] = out.data[o + 2] = 255;
        out.data[o + 3] = q(Math.min(0.3, (shade - 0.7) * 1.1));
      }
    }
  }
  mkdirSync(join(root, 'assets/relief'), { recursive: true });
  const buf = PNG.sync.write(out, { colorType: 6 });
  writeFileSync(join(root, `assets/relief/${country}.png`), buf);
  // углы картинки: левый верхний, правый верхний, правый нижний, левый нижний — [lon, lat]
  const W0 = x2lon(x0), E = x2lon(x1 + 1), N = y2lat(y0), S = y2lat(y1 + 1);
  console.log(`${country}: ${W}×${H}, ${(x1 - x0 + 1) * (y1 - y0 + 1)} тайлов, ${(buf.length / 1048576).toFixed(1)} МБ`);
  return [[W0, N], [E, N], [E, S], [W0, S]];
}

const coords = { kg: await build('kg'), alt: await build('alt') };
writeFileSync(
  join(root, 'src/geo/relief.generated.ts'),
  [
    '// Сгенерировано tools/build-relief.mjs — не редактировать вручную.',
    "import type { CountryCode } from '@/data/types';",
    '',
    '/** Углы картинки рельефа: [lon, lat] — левый верхний, правый верхний, правый нижний, левый нижний. */',
    `export const RELIEF_COORDS: Record<CountryCode, [number, number][]> = ${JSON.stringify(coords)};`,
    '',
    'export const RELIEF_IMAGES: Record<CountryCode, number> = {',
    "  kg: require('../../assets/relief/kg.png'),",
    "  alt: require('../../assets/relief/alt.png'),",
    '};',
    '',
  ].join('\n'),
);
