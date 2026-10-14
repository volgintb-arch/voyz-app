// Иконка, адаптивная иконка Android, сплэш и фавикон из логотипа VOYZ (пути — prototype WM).
// Запуск: node tools/build-icons.mjs → assets/images/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
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

// ---------- веб: иконки PWA и превью ссылки (public/ → корень сайта) ----------
mkdirSync(join(root, 'public'), { recursive: true });
const pub = (name, w, h, svgBody) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgBody}</svg>`;
  const out = new Resvg(svg, {
    fitTo: { mode: 'width', value: w },
    font: { fontFiles: [mulish('500Medium'), mulish('700Bold')], loadSystemFonts: false, defaultFontFamily: 'Mulish' },
  })
    .render()
    .asPng();
  writeFileSync(join(root, 'public', name), out);
  console.log(`public/${name} ${w}×${h} ${(out.length / 1024).toFixed(0)} КБ`);
};
const mulish = (w) => join(root, `node_modules/@expo-google-fonts/mulish/${w}/Mulish_${w}.ttf`);
const sq = (size, scale) => `<rect width="${size}" height="${size}" fill="#000"/>${vMark(size, scale, LIME)}`;
pub('icon-192.png', 192, 192, sq(192, 0.56));
pub('icon-512.png', 512, 512, sq(512, 0.56));
pub('icon-maskable-512.png', 512, 512, sq(512, 0.4)); // маска Android обрезает края — знак меньше
pub('apple-touch-icon.png', 180, 180, sq(180, 0.56));
// превью для мессенджеров и соцсетей (Open Graph), 1200×630
{
  const W = 1200;
  const k = 560 / 640;
  pub(
    'og.png',
    W,
    630,
    `<rect width="${W}" height="630" fill="#000"/>
     <g transform="translate(80 150) scale(${k})" fill="#fff">${WORD.map((d) => `<path d="${d}"/>`).join('')}</g>
     <rect x="80" y="262" width="120" height="6" rx="3" fill="${LIME}"/>
     <text x="80" y="350" font-family="Mulish" font-weight="700" font-size="54" fill="#fff">Путеводитель по Кыргызстану</text>
     <text x="80" y="415" font-family="Mulish" font-weight="700" font-size="54" fill="#fff">и Алтаю</text>
     <text x="80" y="500" font-family="Mulish" font-weight="500" font-size="30" fill="#A9A9A4">112 мест · как доехать, где ночевать · работает без интернета</text>
     <circle cx="1060" cy="150" r="70" fill="${LIME}"/>
     <g transform="translate(1060 150)">${vMark(0, 0, '#000').replace('<path', '<path transform="translate(-52 -24) scale(0.6)"').replace(/ transform="translate\([^"]*\) scale\([^"]*\)"\/>/, '/>')}</g>`,
  );
}
