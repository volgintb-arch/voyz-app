# Перевод текстов мест Voyz на английский — правила и глоссарий

Файлы: `translations/ru/<id>.json` (источник, генерируется `node tools/i18n-extract.mjs`) →
`translations/en/<id>.json` (перевод). Проверка: `node tools/i18n-check.mjs en <id…>`. Сборка в приложение: `node tools/i18n-build.mjs`.

Статус: черновой перевод сделан ИИ. В приложении у английских описаний стоит пометка «AI translation, not yet reviewed».
Редактор, проверивший место, добавляет его id в `translations/en/_reviewed.json` — пометка у этого места исчезает.

## Формат
- Ровно те же ключи, что в ru-файле. Значение — строка на английском. Никакой кириллицы в результате.
- Сохранять переносы строк, маркеры списков (•, —, 1.), скобки, кавычки-ёлочки → обычные “ ”.
- URL, телефоны, e-mail, координаты, числа, диапазоны, знаки ≈ ~ ± — без изменений.
- Единицы: км → km, м → m, ч → h, мин → min, сом → som, ₽/руб. → ₽ (RUB), $ остаётся. «т. е.» → “i.e.”.
- Даты и месяцы — по-английски (май–июнь → May–June). Годы цен (2024) оставлять.
- Тон: дружелюбный гид, на «you» (в оригинале «ты»). Коротко и ясно, без украшательств. Не добавлять фактов, не выкидывать оговорок про безопасность, цены и сроки.
- Названия собственные — транслитерация, как принято у путешественников; в скобках при первом упоминании можно оставить смысл: «Каньон Сказка» → “Skazka (Fairy Tale) Canyon”.
- Названия организаций/гостиниц/кафе — транслитерация, без перевода (Гостевой дом «Айгуль» → Aigul guesthouse).

## Глоссарий (единообразно во всех местах)
| RU | EN |
|---|---|
| Кыргызстан | Kyrgyzstan |
| Иссык-Куль | Issyk-Kul |
| Бишкек, Каракол, Балыкчи, Чолпон-Ата, Нарын, Ош, Талас, Кочкор | Bishkek, Karakol, Balykchy, Cholpon-Ata, Naryn, Osh, Talas, Kochkor |
| Джети-Огуз | Jeti-Oguz |
| Сон-Куль | Song-Kol (Son-Kul) — первое упоминание “Song-Kol”, далее Song-Kol |
| Ала-Арча | Ala-Archa |
| Алтын-Арашан | Altyn-Arashan |
| Терскей-Ала-Тоо, Кюнгей-Ала-Тоо | Terskey Ala-Too, Kungey Ala-Too |
| жайлоо | jailoo (summer pasture) |
| юрта, юрточный лагерь | yurt, yurt camp |
| маршрутка | marshrutka (minibus) |
| такси, частник | taxi, private driver |
| Алтай, Республика Алтай | Altai, Altai Republic |
| Горно-Алтайск, Барнаул, Бийск | Gorno-Altaysk, Barnaul, Biysk |
| Чуйский тракт | Chuysky Trakt (R256 highway) |
| Телецкое озеро | Lake Teletskoye |
| Катунь, Чуя, Бия | Katun, Chuya, Biya |
| Улаганский перевал, Кату-Ярык | Ulagan Pass, Katu-Yaryk Pass |
| Чике-Таман | Chike-Taman Pass |
| Белуха | Belukha |
| Акташ, Чемал, Онгудай, Кош-Агач, Артыбаш | Aktash, Chemal, Ongudai, Kosh-Agach, Artybash |
| погранзона, пропуск в погранзону | border zone, border-zone permit |
| нацпарк, заповедник | national park, nature reserve (zapovednik) |
| экологический сбор | eco fee |
| внедорожник, полный привод | 4×4 / SUV, 4WD |
| грунтовка, гравийка | dirt road, gravel road |
| асфальт | paved road |
| брод | ford |
| перевал | pass |
| урочище | tract (valley) |
| петроглифы | petroglyphs |
| АЗС | fuel station |
| мобильная связь: Beeline, MegaCom, O! / МТС, Билайн, Мегафон, Теле2 | Beeline, MegaCom, O! / MTS, Beeline, MegaFon, Tele2 |
