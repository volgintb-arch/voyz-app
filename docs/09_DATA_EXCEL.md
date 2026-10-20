# База мест в Excel

`data/voyz-places.xlsx` — рабочая база мест для редакции. Из неё собирается `assets/data/places.json` и английские тексты.

| Команда | Что делает |
|---|---|
| `npm run places:export` | `places.json` + переводы → Excel (тикеты и теги из старого файла сохраняются) |
| `npm run places:check` | проверяет книгу: обязательные поля, формат id, координаты, месяцы, связи `place_id`, файлы фото |
| `npm run places:import` | Excel → `places.json` + `translations/en/*.json` + `_reviewed.json`, затем сборка перевода |

После импорта с новыми фото — `npm run gen:media`; если менялись русские тексты — `node tools/i18n-extract.mjs`.

## Формат для парсера
- строка 1 — ключи колонок, строка 2 — подписи для людей, данные с 3-й строки;
- `places` — одна строка на место (ключ `id`), остальные листы связаны через `place_id`, порядок — `pos`;
- `months`, `tags` — через «;», `gaps`, `flags` — по строке на пункт, да/нет — словами;
- в приложение попадают только места с `publish = опубликовано`;
- колонки `calc_*`, листы `README`, `summary`, `tags`, `tickets`, `lists` — служебные.

Проверка без потерь: `python tools/places_xlsx.py roundtrip` (выгрузка → загрузка → сравнение с `places.json`; сейчас 0 отличий).
