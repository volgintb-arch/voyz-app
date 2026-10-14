// Собирает переводы мест в assets/data/places.<lang>.json: { reviewed: [id…], places: { id: { "путь": "текст" } } }.
// Берём только места, где перевод полный (те же ключи, что в translations/ru, без кириллицы) — иначе место
// остаётся на русском целиком, без смеси языков. Проверенные редактором id — в translations/<lang>/_reviewed.json.
// Запуск: node tools/i18n-build.mjs [en]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const lang = process.argv[2] ?? 'en';
const dir = join(root, 'translations', lang);
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));

const out = { reviewed: [], places: {} };
const skipped = [];
for (const f of readdirSync(join(root, 'translations/ru'))) {
  const id = f.replace(/\.json$/, '');
  const ru = read(join(root, 'translations/ru', f));
  const file = join(dir, f);
  if (!existsSync(file)) {
    skipped.push(`${id} (нет файла)`);
    continue;
  }
  const tr = read(file);
  const bad = Object.keys(ru).filter((k) => typeof tr[k] !== 'string' || !tr[k].trim() || /[а-яё]/i.test(tr[k]));
  if (bad.length) {
    skipped.push(`${id} (${bad.length} строк не готовы)`);
    continue;
  }
  // «₽ (RUB)» после каждой суммы — лишнее: в тексте и так понятно, что это рубли
  out.places[id] = Object.fromEntries(Object.keys(ru).map((k) => [k, tr[k].replace(/₽\s*\(RUB\)/g, '₽')]));
}
const rev = join(dir, '_reviewed.json');
if (existsSync(rev)) out.reviewed = read(rev).filter((id) => out.places[id]);

writeFileSync(join(root, `assets/data/places.${lang}.json`), JSON.stringify(out));
console.log(`${lang}: переведено ${Object.keys(out.places).length}, проверено редактором ${out.reviewed.length}${skipped.length ? `; пропущено: ${skipped.join(', ')}` : ''}`);
