// Иконка, адаптивная иконка Android, сплэш и фавикон из логотипа VOYZ (пути — prototype WM).
// Запуск: node tools/build-icons.mjs → assets/images/*.png
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(import.meta.dirname, '..');
const LIME = '#D8FC00';
const V = 'M3 4h46l40 50 40-50h47l-68 80H70z'; // буква V, bbox x 3–176, y 4–84
const WORD = [V, 'M206 2h78a40 40 0 010 80h-78a40 40 0 010-80zm6 27a8 8 0 000 16h66a8 8 0 000-16z', 'M325 4h51l23 30 23-30h51l-56 50v30h-37V54z', 'M490 4h150v26l-72 26h72v28H490V58l72-28h-72z'];

/** Буква V по центру квадрата size; scale — доля ширины. */
const vMark = (size, scale, fill) => {
  const w = 173;
  const h = 80;
  const k = (size * scale) / w;
  const tx = (size - w * k) / 2 - 3 * k;
  const ty = (size - h * k) / 2 - 4 * k;
  return `<path d="${V}" fill="${fill}" transform="translate(${tx} ${ty}) scale(${k})"/>`;
};
const word = (size, scale, fill) => {
  const w = 640;
  const h = 84;
  const k = (size * scale) / w;
  const tx = (size - w * k) / 2;
  const ty = (size - h * k) / 2;
  return `<g transform="translate(${tx} ${ty}) scale(${k})" fill="${fill}">${WORD.map((d) => `<path d="${d}"/>`).join('')}</g>`;
};

function png(name, size, body, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}${body}</svg>`;
  const out = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(root, 'assets/images', name), out);
  console.log(`${name} ${size}px ${(out.length / 1024).toFixed(0)} КБ`);
}

// iOS / общая иконка: лаймовая V на чёрном (iOS сам скругляет углы)
png('icon.png', 1024, vMark(1024, 0.56, LIME), '#000000');
// Android adaptive: передний план с запасом под маску (безопасная зона ~66%), фон — чёрный
png('android-icon-foreground.png', 1024, vMark(1024, 0.42, LIME));
png('android-icon-background.png', 1024, '', '#000000');
png('android-icon-monochrome.png', 1024, vMark(1024, 0.42, '#FFFFFF'));
// сплэш: белое слово VOYZ (кладётся на чёрный фон из app.json)
png('splash-icon.png', 1024, word(1024, 0.86, '#FFFFFF'));
// фавикон вкладки браузера
png('favicon.png', 96, vMark(96, 0.62, LIME), '#000000');
