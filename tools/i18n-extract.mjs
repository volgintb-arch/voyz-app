// Тексты мест для перевода: из assets/data/places.json берём только то, что видит путешественник,
// и раскладываем в плоские файлы translations/ru/<id>.json вида { "p.apps.0.route": "…" }.
// Переводчик (человек или ИИ) кладёт translations/<lang>/<id>.json с теми же ключами,
// затем tools/i18n-build.mjs собирает assets/data/places.<lang>.json.
// Запуск: node tools/i18n-extract.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');
const { places } = JSON.parse(readFileSync(join(root, 'assets/data/places.json'), 'utf8'));

// служебные поля и поля-ключи, на которых держится логика (категории, фильтры, сезонность), не переводим
const SKIP_TOP = new Set(['id', 'c', 'cat', 'reg', 's', 'm', 'rating', 'flags', 'fixes', 'checked', 'status', 'note', 'videos', 'plinks', 'nearby', 'idx', 'rich', 'conf', 'prac', 'rank', 'top']);
const SKIP_ANY = new Set(['src', 'rt', 'f', 't', 'by', 'lic', 'page', 'url', 'contact', 'year']);
const CYR = /[а-яё]/i;

export function extract(p) {
  const out = {};
  const walk = (v, path, key) => {
    if (SKIP_ANY.has(key)) return;
    if (typeof v === 'string') {
      if (CYR.test(v)) out[path] = v;
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${i}`, key));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], path ? `${path}.${k}` : k, k);
  };
  for (const k of Object.keys(p)) if (!SKIP_TOP.has(k)) walk(p[k], k, k);
  // из плашек s.* переводится только «Вход» — остальное подписи кодов (src/data/codes.ts) или длительности (durationLabel)
  if (CYR.test(p.s?.entry ?? '')) out['s.entry'] = p.s.entry;
  return out;
}

const dir = join(root, 'translations/ru');
mkdirSync(dir, { recursive: true });
let chars = 0;
for (const p of places) {
  const t = extract(p);
  chars += Object.values(t).reduce((s, x) => s + x.length, 0);
  writeFileSync(join(dir, `${p.id}.json`), JSON.stringify(t, null, 1));
}
console.log(`мест: ${places.length}, знаков: ${chars}`);
