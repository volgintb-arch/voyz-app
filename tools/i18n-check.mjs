// Проверка перевода: те же ключи, что в translations/ru, и нигде не осталось кириллицы.
// Запуск: node tools/i18n-check.mjs [en] [id ...]   (без id — все места)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const [lang = 'en', ...ids] = process.argv.slice(2);
const list = ids.length ? ids : readdirSync(join(root, 'translations/ru')).map((f) => f.replace(/\.json$/, ''));
let bad = 0;
let done = 0;
for (const id of list) {
  const ru = JSON.parse(readFileSync(join(root, 'translations/ru', `${id}.json`), 'utf8'));
  const file = join(root, 'translations', lang, `${id}.json`);
  if (!existsSync(file)) {
    console.log(`${id}: нет перевода`);
    bad++;
    continue;
  }
  let tr;
  try {
    tr = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`${id}: битый JSON — ${e.message}`);
    bad++;
    continue;
  }
  const missing = Object.keys(ru).filter((k) => typeof tr[k] !== 'string' || !tr[k].trim());
  const extra = Object.keys(tr).filter((k) => !(k in ru));
  const cyr = Object.keys(tr).filter((k) => /[а-яё]/i.test(tr[k] ?? ''));
  if (missing.length || extra.length || cyr.length) {
    bad++;
    console.log(`${id}: нет ключей ${missing.length}${missing.length ? ` (${missing.slice(0, 5).join(', ')})` : ''}; лишних ${extra.length}; с кириллицей ${cyr.length}${cyr.length ? ` (${cyr.slice(0, 5).join(', ')})` : ''}`);
  } else done++;
}
console.log(`готово ${done} из ${list.length}${bad ? `, с проблемами ${bad}` : ''}`);
process.exit(bad ? 1 : 0);
