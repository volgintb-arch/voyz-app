"""
Схема полей базы мест Voyz, проверки и сборка places.json — общая часть для форматов Excel.
Рабочий формат книги — «одна карточка = один лист»: tools/places_cards.py (export / check / import / roundtrip).

Этот модуль также умеет плоский формат (лист places + листы-списки), удобный для массовых правок и выгрузок:
  python tools/places_xlsx.py export|check|import|roundtrip [файл.xlsx]
"""

import json
import math
import os
import re
import sys
from datetime import date

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PLACES = os.path.join(ROOT, 'assets/data/places.json')
TR_RU = os.path.join(ROOT, 'translations/ru')
TR_EN = os.path.join(ROOT, 'translations/en')
DEFAULT_XLSX = os.path.join(ROOT, 'data/voyz-places.xlsx')
HEAD = 2  # строк заголовка: ключи + подписи

# ---------------------------------------------------------------- схема листа places
# (ключ, путь в JSON или спец-тип, подпись, ширина, обязательное)
PLACE_COLS = [
    ('id', ('id',), 'ID места (kg-…, alt-…)', 14, True),
    ('country', ('c',), 'Страна (kg / alt)', 9, True),
    ('publish', None, 'Публикация', 13, True),
    ('status', ('status',), 'Статус проверки', 18, True),
    ('name', ('name',), 'Название', 26, True),
    ('full', ('full',), 'Полное название', 30, False),
    ('cat', ('cat',), 'Категория (подробно, подпись)', 22, True),
    ('cat_code', None, 'Группа категории — код из списка', 14, True),
    ('reg', ('reg',), 'Регион', 22, True),
    ('dist', ('dist',), 'Район', 20, False),
    ('lat', None, 'Широта', 10, True),
    ('lon', None, 'Долгота', 10, True),
    ('elev', ('elev',), 'Высота', 18, False),
    ('near', ('near',), 'Ближайший пункт', 30, False),
    ('short', ('short',), 'Коротко (1–2 предложения)', 40, True),
    ('desc', ('desc',), 'Описание', 50, True),
    ('guide', ('guide',), 'Почему стоит приехать / текст аудиогида', 50, True),
    ('see', ('see',), 'Что посмотреть', 40, False),
    ('skip', ('skip',), 'Кому не стоит', 40, False),
    ('months', None, 'Месяцы сезона (1;2;…12)', 16, True),
    ('month_scores', None, 'Оценка месяцев (JSON: месяц → 2 лучшее, 1 подходит), напр. {"6":1,"7":2}', 30, False),
    ('diff_code', None, 'Сложность — код 1–5 (1 очень лёгкая … 5 очень сложная)', 10, True),
    ('acc_code', None, 'Доступ — код из списка', 14, True),
    ('s_onsite', ('s', 'onsite'), 'Время на месте (коротко)', 14, False),
    ('s_entry', ('s', 'entry'), 'Вход (коротко)', 18, False),
    ('net_code', None, 'Связь на месте — код (yes / partial / no / unknown)', 12, False),
    ('diff', ('diff',), 'Сложность (подробно)', 36, False),
    ('when', ('when',), 'Когда ехать (подробно)', 36, False),
    ('hours', ('hours',), 'Часы работы', 30, False),
    ('daytime', ('daytime',), 'Лучшее время суток', 30, False),
    ('how', ('how',), 'Как добраться (кратко)', 40, False),
    ('needcar', ('needcar',), 'Нужна ли машина', 30, False),
    ('self', ('self',), 'Самостоятельно / с гидом', 30, False),
    ('roadtype', ('roadtype',), 'Тип дороги', 30, False),
    ('traveltime', ('traveltime',), 'Время в пути', 30, False),
    ('stay', ('stay',), 'Ночлег (кратко)', 36, False),
    ('net', ('net',), 'Связь (подробно)', 30, False),
    ('entry', ('entry',), 'Вход (подробно)', 30, False),
    ('transfer', ('transfer',), 'Трансфер', 30, False),
    ('bring', ('bring',), 'Что взять', 30, False),
    ('warn', ('warn',), 'Важно / предупреждения', 36, False),
    ('food', ('food',), 'Еда (кратко)', 30, False),
    ('reviews', ('reviews',), 'Что говорят путешественники', 36, False),
    ('rating_v', None, 'Рейтинг', 8, False),
    ('rating_n', None, 'Кол-во оценок', 10, False),
    ('rating_src', None, 'Источник рейтинга', 12, False),
    ('p_sum', ('p', 'sum'), 'Дорога: сводка', 36, False),
    ('p_season', ('p', 'season'), 'Сезон (подробно)', 36, False),
    ('p_permits', ('p', 'permits'), 'Разрешения', 30, False),
    ('p_access', ('p', 'access'), 'Доступность (дети, пожилые…)', 30, False),
    ('budget_economy', ('p', 'budget', 'economy'), 'Бюджет: эконом', 30, False),
    ('budget_comfort', ('p', 'budget', 'comfort'), 'Бюджет: комфорт', 30, False),
    ('budget_year', ('p', 'budget', 'year'), 'Бюджет: год цен', 10, False),
    ('camping', ('p', 'onsite', 'camping'), 'Кемпинг', 30, False),
    ('photo_spots', ('p', 'onsite', 'photo_spots'), 'Точки для фото', 30, False),
] + [
    (f'svc_{k}', ('p', 'svc', k), f'Сервис: {v}', 24, False)
    for k, v in [('toilets', 'туалеты'), ('water', 'вода'), ('shop', 'магазин'), ('atm', 'банкомат'),
                 ('fuel', 'АЗС'), ('mobile', 'связь'), ('medical', 'медпомощь'), ('rescue', 'спасатели')]
] + [
    ('gaps', None, 'Чего не хватает в данных (каждое с новой строки)', 36, False),
    ('flags', None, 'Противоречия источников (каждое с новой строки)', 36, False),
    ('checked', ('checked',), 'Как проверено', 36, False),
    ('note', ('note',), 'Заметка редакции', 36, False),
    ('idx', ('idx',), 'Индекс полноты 0–100', 9, False),
    ('rich', ('rich',), 'Насыщенность', 8, False),
    ('conf', ('conf',), 'Достоверность', 8, False),
    ('prac', ('prac',), 'Практичность', 8, False),
    ('rank', ('rank',), 'Место в рейтинге', 8, False),
    ('top', None, 'В топе (да/нет)', 8, False),
    ('tags', None, 'Теги (через ;)', 30, False),
    ('en_reviewed', None, 'Перевод EN проверен (да/нет)', 10, False),
    ('updated_at', None, 'Изменено (дата)', 12, False),
    ('updated_by', None, 'Кто изменил', 14, False),
]
CALC_COLS = [
    ('calc_photos', 'photos', 'Фото, шт.'),
    ('calc_routes', 'routes', 'Подъездов, шт.'),
    ('calc_stays', 'stays', 'Ночлег, шт.'),
    ('calc_open_tickets', None, 'Открытых тикетов'),
]

# ---------------------------------------------------------------- дочерние листы
# (лист, подпись, путь к списку в месте, [(ключ, подпись, ширина)])
CHILD = [
    ('photos', 'Фото', ('photos',), [('f', 'Файл (img/…)', 30), ('t', 'Миниатюра (img/t_…)', 30), ('w', 'Ширина', 8), ('h', 'Высота', 8),
                                     ('cap', 'Подпись', 40), ('by', 'Автор', 22), ('lic', 'Лицензия', 14), ('page', 'Страница-источник', 40)]),
    ('routes', 'Подъезды', ('p', 'apps'), [
        ('rec', 'Рекомендован (да/нет)', 10), ('title', 'Название варианта', 36), ('from', 'Откуда', 20), ('route', 'Маршрут', 40),
        ('km', 'Км', 10), ('time', 'Время', 14), ('surface', 'Покрытие', 24), ('vehicle', 'Машина', 18), ('season', 'Сезон', 18),
        ('last', 'Последние АЗС/магазины', 30), ('parking_d', 'Парковка', 30), ('parking_price', 'Парковка: цена', 16),
        ('trail_d', 'Тропа от парковки', 30), ('haz', 'Опасности', 30), ('src', 'Источник', 30),
        ('hub', 'Город-старт', 14), ('hub_lat', 'Старт: широта', 10), ('hub_lon', 'Старт: долгота', 10), ('rkm', 'Км по графу дорог', 10),
        ('parking_lat', 'Парковка: широта', 10), ('parking_lon', 'Парковка: долгота', 10), ('trail_lat', 'Тропа: широта', 10), ('trail_lon', 'Тропа: долгота', 10),
        ('road', 'Геометрия дороги (JSON, генерируется)', 20)]),
    ('hikes', 'Тропы', ('p', 'onsite', 'hikes'), [('name', 'Название', 30), ('route', 'Маршрут', 40), ('km', 'Км', 10), ('gain_m', 'Набор, м', 10),
                                                  ('time', 'Время', 14), ('difficulty', 'Сложность', 16), ('marked', 'Маркировка', 20), ('track', 'Трек (ссылка)', 30), ('src', 'Источник', 30)]),
    ('stays', 'Ночлег', ('p', 'stays'), [('name', 'Название', 28), ('type', 'Тип', 16), ('where', 'Где', 24), ('season', 'Сезон', 16), ('price', 'Цена', 24),
                                        ('year', 'Год цены', 8), ('contact', 'Контакт', 24), ('src', 'Источник', 30)]),
    ('food', 'Еда', ('p', 'food'), [('name', 'Название', 28), ('where', 'Где', 24), ('details', 'Подробно', 40), ('src', 'Источник', 30)]),
    ('transport', 'Транспорт и туры', ('p', 'transport'), [('mode', 'Вид', 20), ('provider', 'Перевозчик', 24), ('from', 'Откуда', 20), ('details', 'Подробно', 40),
                                                          ('price', 'Цена', 20), ('year', 'Год цены', 8), ('contact', 'Контакт', 24), ('src', 'Источник', 30)]),
    ('rent', 'Прокат', ('p', 'rent'), [('what', 'Что', 30), ('where', 'Где', 30), ('price', 'Цена', 24), ('src', 'Источник', 30)]),
    ('horses', 'Конные прогулки', ('p', 'onsite', 'horses'), [('where', 'Где', 30), ('price', 'Цена', 24), ('guide', 'Гид', 16), ('notes', 'Заметки', 36), ('src', 'Источник', 30)]),
    ('activities', 'Активности на месте', ('p', 'onsite', 'other'), [('activity', 'Активность', 24), ('details', 'Подробно', 40), ('price', 'Цена', 20), ('src', 'Источник', 30)]),
    ('itinerary', 'Готовые планы', ('p', 'iti'), [('title', 'Название плана', 30), ('plan', 'План', 70)]),
    ('nearby', 'Рядом', ('nearby',), [('id', 'ID соседнего места', 14), ('name', 'Название', 28), ('km', 'Км', 8)]),
    ('videos', 'Видео', ('videos',), [('t', 'Заголовок', 40), ('u', 'Ссылка', 40), ('ch', 'Канал', 20), ('y', 'Год', 8)]),
    ('photo_links', 'Фото-ссылки (внешние)', ('plinks',), [('cap', 'Подпись', 36), ('url', 'Ссылка', 40), ('by', 'Автор', 20)]),
    ('fixes', 'Журнал правок', ('fixes',), [('f', 'Поле', 22), ('n', 'Что изменено', 50), ('u', 'Источник', 36)]),
    ('sources', 'Источники карточки', ('src',), [('url', 'Ссылка', 40), ('title', 'Название', 30), ('used_for', 'Для чего', 36)]),
    ('sources_practical', 'Источники практики', ('p', 'src'), [('url', 'Ссылка', 40), ('title', 'Название', 30), ('used_for', 'Для чего', 36)]),
]

YES, NO = 'да', 'нет'

# коды карточки (зеркало src/data/codes.ts): код → подпись плашки
DIFFICULTY = {1: 'Очень лёгкая', 2: 'Лёгкая', 3: 'Средняя', 4: 'Сложная', 5: 'Очень сложная'}
ACCESS = {'any-car': 'На любой машине', 'crossover': 'Кроссовер', '4x4': 'Нужен 4×4', 'on-foot': 'Только пешком', 'by-water': 'По воде'}
NET = {'yes': 'Связь есть', 'partial': 'Связь местами', 'no': 'Связи нет', 'unknown': 'Не подтверждено'}
CATEGORY = {'lakes': 'Озёра', 'waterfalls': 'Водопады', 'canyons': 'Каньоны', 'gorges': 'Ущелья', 'passes': 'Перевалы и дороги', 'valleys': 'Долины и панорамы',
            'mountains': 'Горы и ледники', 'parks': 'Парки', 'springs': 'Источники и курорты', 'culture': 'История и культура', 'caves': 'Пещеры', 'other': 'Другое'}
PUBLISH = ['опубликовано', 'черновик', 'скрыто']
TICKET_TYPES = ['Новое место', 'Дозаполнить данные', 'Проверить факты', 'Уточнить координаты', 'Фото', 'Перевод EN', 'Отзыв/жалоба', 'Другое']
TICKET_STATUS = ['открыт', 'в работе', 'на проверке', 'готово', 'отклонён']
PRIORITY = ['высокий', 'средний', 'низкий']

# стили
F = 'Arial'
KEY_FONT = Font(name=F, size=8, color='8A8A8A')
LBL_FONT = Font(name=F, size=10, bold=True)
CELL_FONT = Font(name=F, size=10)
REQ_FILL = PatternFill('solid', fgColor='FFF2A8')  # обязательное поле
LBL_FILL = PatternFill('solid', fgColor='E9EEE2')
CALC_FILL = PatternFill('solid', fgColor='EDEDED')
TOP = Alignment(vertical='top', wrap_text=False)
THIN = Border(bottom=Side(style='thin', color='B9C4AB'))


def gp(d, path):
    for k in path:
        if not isinstance(d, dict):
            return None
        d = d.get(k)
    return d


def sp(d, path, v):
    for k in path[:-1]:
        d = d.setdefault(k, {})
    d[path[-1]] = v


def yn(v):
    return YES if v else NO


def place_row(p, tags, en_reviewed):
    row = {}
    for key, path, *_ in PLACE_COLS:
        if path:
            row[key] = gp(p, path)
    row['publish'] = p.get('publish', 'опубликовано')
    row['lat'], row['lon'] = (p['ll'] or [None, None])
    row['months'] = ';'.join(str(m) for m in p['m'])
    c = p.get('content') or {}
    row['diff_code'], row['acc_code'], row['net_code'], row['cat_code'] = c.get('difficulty'), c.get('access'), c.get('net'), c.get('category')
    ms = (p.get('content') or {}).get('monthScores')
    row['month_scores'] = json.dumps(ms, ensure_ascii=False, separators=(',', ':')) if ms is not None else None
    r = p.get('rating') or {}
    row['rating_v'], row['rating_n'], row['rating_src'] = r.get('v'), r.get('n'), r.get('src')
    row['gaps'] = '\n'.join(p['p'].get('gaps') or [])
    row['flags'] = '\n'.join(p.get('flags') or [])
    row['top'] = yn(p.get('top'))
    row['tags'] = ';'.join(tags)
    row['en_reviewed'] = yn(en_reviewed)
    row['updated_at'] = p.get('updated_at')
    row['updated_by'] = p.get('updated_by')
    return row


def child_rows(sheet, p, items):
    rows = []
    for n, it in enumerate(items, 1):
        if sheet == 'routes':
            rt = it.get('rt') or {}
            r = {k: it.get(k) for k in ('title', 'from', 'route', 'km', 'time', 'surface', 'vehicle', 'season', 'last', 'haz', 'src')}
            r.update(rec=yn(it.get('rec')), parking_d=gp(it, ('parking', 'd')), parking_price=gp(it, ('parking', 'price')), trail_d=gp(it, ('trail', 'd')))
            if it.get('rt') is not None:
                r.update(hub=rt.get('hub'), rkm=rt.get('rkm'), road=json.dumps(rt['road']) if rt.get('road') is not None else None)
                for pre, k in (('hub', 'hc'), ('parking', 'pc'), ('trail', 'tc')):
                    v = rt.get(k)
                    r[f'{pre}_lat'], r[f'{pre}_lon'] = (v or [None, None])
            r['_rt'] = it.get('rt') is not None
        else:
            r = dict(it)
        r['place_id'], r['pos'] = p['id'], n
        rows.append(r)
    return rows


# ---------------------------------------------------------------- теги (стартовый набор)
CAT_TAGS = [('lakes', 'Озёра', 'Lakes', r'озер|озёр|водохр'), ('waterfalls', 'Водопады', 'Waterfalls', r'водопад'), ('canyons', 'Каньоны', 'Canyons', r'каньон'),
            ('gorges', 'Ущелья', 'Gorges', r'ущель'), ('passes', 'Перевалы и дороги', 'Passes & roads', r'перевал|дорог'),
            ('valleys', 'Долины и панорамы', 'Valleys & views', r'долин|плато|жайлоо|урочищ|панорам'), ('mountains', 'Горы и ледники', 'Mountains & glaciers', r'ледник|гора|хижин|лагер'),
            ('parks', 'Парки и заповедники', 'Parks & reserves', r'парк|заповед|лес'), ('springs', 'Источники и курорты', 'Springs & resorts', r'источник|курорт'),
            ('culture', 'История и культура', 'History & culture', r'музей|мавзол|храм|мечеть|городищ|археол|петрогл|истор|культур|священ|памятник'), ('caves', 'Пещеры', 'Caves', r'пещер')]
ACC_TAGS = {'На любой машине': ('any-car', 'На любой машине', 'Any car'), 'Нужен 4×4': ('4x4', 'Нужен 4×4', '4×4 needed'), 'Кроссовер': ('crossover', 'Кроссовер', 'Crossover'),
            'Только пешком': ('hike-only', 'Только пешком', 'On foot only'), 'По воде': ('by-water', 'По воде', 'By water')}
EXTRA_TAGS = [('top', 'Топ Voyz', 'Voyz top', 'особенное', 'Место из топа подборки'), ('free', 'Бесплатный вход', 'Free entry', 'деньги', 'Вход без платы'),
              ('no-car', 'Без своей машины', 'No car needed', 'доступ', 'Есть общественный транспорт или катер'), ('year-round', 'Круглый год', 'Year-round', 'сезон', 'Сезон — все 12 месяцев'),
              ('hiking', 'Есть тропы', 'Hiking', 'активности', 'Описаны пешие маршруты'), ('horses', 'Конные прогулки', 'Horse riding', 'активности', 'Есть прокат лошадей'),
              ('yurts', 'Ночлег в юрте', 'Yurt stay', 'ночлег', 'Рядом есть юрты/юрт-кемп'), ('easy', 'Лёгкое', 'Easy', 'сложность', 'Сложность: лёгкая'),
              ('medium', 'Среднее', 'Moderate', 'сложность', 'Сложность: средняя'), ('hard', 'Сложное', 'Hard', 'сложность', 'Сложность: высокая')]


def tag_dict():
    rows = [dict(tag_id=t, name_ru=ru, name_en=en, group='категория', description=f'Категория «{ru}» (по полю cat)') for t, ru, en, _ in CAT_TAGS]
    rows += [dict(tag_id=t, name_ru=ru, name_en=en, group='доступ', description=f'Доступ: {ru}') for t, ru, en in ACC_TAGS.values()]
    rows += [dict(tag_id=t, name_ru=ru, name_en=en, group=g, description=d) for t, ru, en, g, d in EXTRA_TAGS]
    return rows


def auto_tags(p):
    c = (p['cat'] or '').lower()
    t = [tid for tid, _, _, rx in CAT_TAGS if re.search(rx, c)][:1]
    if p['s']['acc'] in ACC_TAGS:
        t.append(ACC_TAGS[p['s']['acc']][0])
    d = (p['s']['diff'] or '').lower()
    t.append('hard' if re.search('сложн|высок', d) else 'medium' if 'средн' in d else 'easy' if 'лёгк' in d or 'легк' in d else None)
    if p.get('top') and p.get('rank'):
        t.append('top')
    if re.match(r'бесплатно|входной платы нет', (p['s']['entry'] or '').lower()):
        t.append('free')
    if any(re.search('маршрут|автобус|поезд|катер|теплоход|паром|минивэн', (x.get('mode') or '').lower()) for x in p['p']['transport']):
        t.append('no-car')
    if len(p['m']) == 12:
        t.append('year-round')
    if p['p']['onsite'].get('hikes'):
        t.append('hiking')
    if p['p']['onsite'].get('horses'):
        t.append('horses')
    if any('юрт' in (s.get('type', '') + s.get('name', '')).lower() for s in p['p']['stays']):
        t.append('yurts')
    return [x for x in t if x]


# ---------------------------------------------------------------- запись книги
def style_header(ws, keys, labels, required=(), widths=None, calc=()):
    for i, (k, lbl) in enumerate(zip(keys, labels), 1):
        a = ws.cell(1, i, k)
        a.font = KEY_FONT
        b = ws.cell(2, i, lbl)
        b.font = LBL_FONT
        b.fill = CALC_FILL if k in calc else REQ_FILL if k in required else LBL_FILL
        b.alignment = Alignment(wrap_text=True, vertical='top')
        b.border = THIN
        if widths:
            ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
    ws.row_dimensions[2].height = 42


def put(ws, r, c, v):
    cell = ws.cell(r, c, v)
    cell.font = CELL_FONT
    cell.alignment = TOP
    return cell


def write_table(ws, keys, labels, rows, widths, required=(), freeze='C3'):
    style_header(ws, keys, labels, required, widths)
    for r, row in enumerate(rows, HEAD + 1):
        for c, k in enumerate(keys, 1):
            put(ws, r, c, row.get(k))
    ws.freeze_panes = freeze
    ws.auto_filter.ref = f'A2:{get_column_letter(len(keys))}{max(HEAD + 1, len(rows) + HEAD)}'


def add_list_validation(ws, col_letter, ref, strict=True, last=2000):
    dv = DataValidation(type='list', formula1=ref, allow_blank=True, showErrorMessage=True,
                        errorStyle='stop' if strict else 'warning', error='Выберите значение из списка (лист lists)', errorTitle='Значение не из справочника')
    ws.add_data_validation(dv)
    dv.add(f'{col_letter}{HEAD + 1}:{col_letter}{last}')


def read_old_sheet(path, name):
    if not os.path.exists(path):
        return None
    wb = load_workbook(path, read_only=True)
    if name not in wb.sheetnames:
        return None
    return list(iter_rows(wb[name]))


def export(out):
    data = json.load(open(PLACES, encoding='utf-8'))
    P = data['places']
    reviewed = set(json.load(open(os.path.join(TR_EN, '_reviewed.json'), encoding='utf-8'))) if os.path.exists(os.path.join(TR_EN, '_reviewed.json')) else set()
    old_tickets = read_old_sheet(out, 'tickets')
    old_tags = read_old_sheet(out, 'tags')
    old_place_tags = {r['id']: r.get('tags') for r in (read_old_sheet(out, 'places') or [])}

    wb = Workbook()
    wb.remove(wb.active)
    readme(wb.create_sheet('README'), len(P))
    wb.create_sheet('summary')

    # places
    ws = wb.create_sheet('places')
    keys = [k for k, *_ in PLACE_COLS] + [k for k, *_ in CALC_COLS]
    labels = [c[2] for c in PLACE_COLS] + [c[2] for c in CALC_COLS]
    widths = [c[3] for c in PLACE_COLS] + [11] * len(CALC_COLS)
    req = {c[0] for c in PLACE_COLS if c[4]}
    style_header(ws, keys, labels, req, widths, calc={k for k, *_ in CALC_COLS})
    for r, p in enumerate(P, HEAD + 1):
        tags = (old_place_tags.get(p['id']) or '').split(';') if old_place_tags.get(p['id']) else p.get('tags') or auto_tags(p)
        row = place_row(p, [t for t in tags if t], p['id'] in reviewed)
        for c, k in enumerate(keys, 1):
            if k.startswith('calc_'):
                continue
            put(ws, r, c, row.get(k))
        for j, (k, sheet, _) in enumerate(CALC_COLS):
            c = len(PLACE_COLS) + 1 + j
            f = (f'=COUNTIF({sheet}!$A:$A,$A{r})' if sheet else f'=COUNTIFS(tickets!$C:$C,$A{r},tickets!$F:$F,"<>готово",tickets!$F:$F,"<>отклонён")')
            cell = put(ws, r, c, f)
            cell.fill = CALC_FILL
    ws.freeze_panes = 'F3'
    ws.auto_filter.ref = f'A2:{get_column_letter(len(keys))}{len(P) + HEAD}'
    for c in range(1, len(keys) + 1):
        ws.cell(2, c).comment = None
    ws.cell(2, keys.index('months') + 1).comment = Comment('Номера месяцев через точку с запятой: 5;6;7;8;9', 'Voyz')
    ws.cell(2, keys.index('tags') + 1).comment = Comment('ID тегов из листа tags через «;»', 'Voyz')
    ws.cell(2, keys.index('publish') + 1).comment = Comment('опубликовано — видно в приложении; черновик/скрыто — не попадает в places.json', 'Voyz')

    # дочерние листы
    for sheet, title, path, fields in CHILD:
        rows = []
        for p in P:
            rows += child_rows(sheet, p, gp(p, path) or [])
        ws = wb.create_sheet(sheet)
        keys = ['place_id', 'pos'] + [f[0] for f in fields]
        labels = ['ID места', '№ п/п'] + [f[1] for f in fields]
        widths = [14, 6] + [f[2] for f in fields]
        write_table(ws, keys, labels, rows, widths, required={'place_id', 'pos'})
        if sheet == 'routes':
            # места, где у варианта подъезда нет геометрии вообще (rt = null) — отдельная пометка
            ws.cell(1, len(keys) + 1, 'has_rt').font = KEY_FONT
            lbl = ws.cell(2, len(keys) + 1, 'Есть маршрут на карте (да/нет)')
            lbl.font = LBL_FONT
            lbl.fill = LBL_FILL
            for r, row in enumerate(rows, HEAD + 1):
                put(ws, r, len(keys) + 1, yn(row['_rt']))
        ws.cell(2, 1).comment = Comment('ID места из листа places', 'Voyz')

    # переводы
    ws = wb.create_sheet('translations_en')
    rows = []
    for p in P:
        ru = json.load(open(os.path.join(TR_RU, f"{p['id']}.json"), encoding='utf-8'))
        enf = os.path.join(TR_EN, f"{p['id']}.json")
        en = json.load(open(enf, encoding='utf-8')) if os.path.exists(enf) else {}
        rows += [dict(place_id=p['id'], path=k, ru=v, en=en.get(k)) for k, v in ru.items()]
    write_table(ws, ['place_id', 'path', 'ru', 'en'], ['ID места', 'Поле (путь)', 'Русский (только чтение)', 'English'], rows, [14, 26, 70, 70], required={'en'})

    # теги
    ws = wb.create_sheet('tags')
    trows = old_tags or tag_dict()
    write_table(ws, ['tag_id', 'name_ru', 'name_en', 'group', 'description'], ['ID тега (латиница, дефис)', 'Название RU', 'Название EN', 'Группа', 'Описание'],
                trows, [16, 26, 26, 14, 50], required={'tag_id', 'name_ru'}, freeze='B3')

    # тикеты
    ws = wb.create_sheet('tickets')
    tkeys = ['ticket_id', 'type', 'place_id', 'title', 'details', 'status', 'priority', 'assignee', 'created', 'due', 'source', 'done_at']
    tlabels = ['№ тикета', 'Тип', 'ID места (если есть)', 'Задача', 'Подробности', 'Статус', 'Приоритет', 'Исполнитель', 'Создан', 'Срок', 'Откуда задача', 'Закрыт']
    write_table(ws, tkeys, tlabels, old_tickets or seed_tickets(P, reviewed), [10, 18, 14, 40, 60, 12, 10, 14, 11, 11, 18, 11], required={'ticket_id', 'type', 'title', 'status'}, freeze='D3')

    # справочники
    lists = wb.create_sheet('lists')
    cols = {
        'country': ['kg', 'alt'], 'publish': PUBLISH, 'status': sorted({p['status'] for p in P} | {'Нужна проверка'}),
        'cat': sorted({p['cat'] for p in P}), 'reg': sorted({p['reg'] for p in P}),
        'diff_code': [str(k) for k in DIFFICULTY], 'acc_code': list(ACCESS), 'net_code': list(NET), 'cat_code': list(CATEGORY), 'yes_no': [YES, NO],
        'ticket_type': TICKET_TYPES, 'ticket_status': TICKET_STATUS, 'priority': PRIORITY,
        'license': sorted({ph['lic'] for p in P for ph in p['photos']}), 'stay_type': sorted({s['type'] for p in P for s in p['p']['stays'] if s['type']}),
    }
    for i, (k, vals) in enumerate(cols.items(), 1):
        lists.cell(1, i, k).font = KEY_FONT
        lists.cell(2, i, k).font = LBL_FONT
        lists.column_dimensions[get_column_letter(i)].width = 24
        for r, v in enumerate(vals, 3):
            put(lists, r, i, v)
    ref = {k: f"lists!${get_column_letter(i)}$3:${get_column_letter(i)}${len(v) + 2}" for i, (k, v) in enumerate(cols.items(), 1)}

    ws = wb['places']
    pk = [k for k, *_ in PLACE_COLS]
    L = lambda k: get_column_letter(pk.index(k) + 1)
    add_list_validation(ws, L('country'), ref['country'])
    add_list_validation(ws, L('publish'), ref['publish'])
    add_list_validation(ws, L('status'), ref['status'], strict=False)
    add_list_validation(ws, L('cat'), ref['cat'], strict=False)
    add_list_validation(ws, L('reg'), ref['reg'], strict=False)
    for k in ('diff_code', 'acc_code', 'net_code', 'cat_code'):
        add_list_validation(ws, L(k), ref[k])
    for k in ('top', 'en_reviewed'):
        add_list_validation(ws, L(k), ref['yes_no'])
    for sheet, col in (('photos', 'I'), ):
        add_list_validation(wb[sheet], col, ref['license'], strict=False)
    add_list_validation(wb['routes'], 'C', ref['yes_no'])
    add_list_validation(wb['stays'], 'D', ref['stay_type'], strict=False)
    add_list_validation(wb['tickets'], 'B', ref['ticket_type'])
    add_list_validation(wb['tickets'], 'F', ref['ticket_status'])
    add_list_validation(wb['tickets'], 'G', ref['priority'])

    summary(wb['summary'])
    wb.calculation.fullCalcOnLoad = True  # формулы пересчитает Excel при открытии
    os.makedirs(os.path.dirname(out), exist_ok=True)
    wb.save(out)
    print(f'✓ {os.path.relpath(out, ROOT)}: мест {len(P)}, листов {len(wb.sheetnames)}')


def seed_tickets(P, reviewed):
    rows, n = [], 0
    today = date.today().isoformat()

    def add(**kw):
        nonlocal n
        n += 1
        rows.append(dict(ticket_id=f'T-{n:04d}', status='открыт', created=today, **kw))
    for p in P:
        if p['status'] != 'Проверено':
            add(type='Уточнить координаты', place_id=p['id'], title=f"{p['name']}: {p['status'].lower()}", details='Сверить точку с картой/треком, обновить lat/lon и подъезды', priority='высокий', source='status в данных')
        if not p['photos']:
            add(type='Фото', place_id=p['id'], title=f"{p['name']}: нет свободных фото", details='Найти фото с лицензией CC/своё, добавить в assets/img и лист photos', priority='средний', source='photos пусто')
        if not p['ll']:
            add(type='Уточнить координаты', place_id=p['id'], title=f"{p['name']}: нет координат", details='Место не попадает на карту', priority='высокий', source='ll пусто')
    for p in P:
        if p['id'] not in reviewed:
            add(type='Перевод EN', place_id=p['id'], title=f"{p['name']}: вычитать EN-перевод", details='Лист translations_en; после проверки поставить en_reviewed = да на листе places', priority='низкий', source='черновой перевод ИИ')
    return rows


def readme(ws, count):
    lines = [
        ('База мест Voyz', 'h'),
        (f'Выгружено {date.today().isoformat()} из assets/data/places.json · мест: {count}', ''),
        ('', ''),
        ('Как устроена книга', 'h2'),
        ('places — одна строка = одно место. Ключ — id (kg-… для Кыргызстана, alt-… для Алтая). Его нельзя менять у опубликованных мест.', ''),
        ('photos, routes, hikes, stays, food, transport, rent, horses, activities, itinerary, nearby, videos, photo_links, fixes, sources, sources_practical — списки внутри места. Связь по place_id, порядок — колонка pos.', ''),
        ('translations_en — английские тексты мест (поле → русский → английский). Русский столбец только для чтения.', ''),
        ('tags — словарь тегов; в places.tags перечисляются их ID через «;».', ''),
        ('tickets — задачи редакции (новые места, дозаполнение, проверка, фото, перевод). Не попадает в приложение.', ''),
        ('lists — справочники для выпадающих списков. Новое значение добавляйте в конец нужного столбца.', ''),
        ('summary — сводка (формулы, пересчитываются в Excel).', ''),
        ('', ''),
        ('Правила для парсера', 'h2'),
        ('Строка 1 — машинные ключи (не трогать), строка 2 — подписи, данные с 3-й строки. Колонки calc_* — формулы, при импорте игнорируются.', ''),
        ('Пустая ячейка = пустая строка. Списки кодов через «;» (months, tags), списки фраз — каждая с новой строки (gaps, flags). Да/нет — словами «да» / «нет».', ''),
        ('Координаты — десятичные градусы (42.1565, 77.3543). Год цены — число. Км и цены — текстом, как пишет источник («≈8 км», «от 1000 сом»).', ''),
        ('', ''),
        ('Как добавить новое место', 'h2'),
        ('1. Лист places: новая строка внизу. Жёлтые заголовки обязательны. publish = черновик, пока карточка не готова.', ''),
        ('2. Придумайте id: kg-латиница-через-дефис (например kg-ala-kul). Проверьте, что такого нет.', ''),
        ('3. Добавьте строки на листы photos (файлы положить в assets/img), routes (хотя бы один вариант подъезда, rec = да), stays, food и др. — с этим же place_id.', ''),
        ('4. Создайте тикет «Новое место» на листе tickets и ведите статус.', ''),
        ('5. Разработчик запускает: python tools/places_xlsx.py import → npm run gen:media → node tools/i18n-build.mjs. Ошибки импорт покажет с листом и строкой.', ''),
        ('', ''),
        ('Цвета заголовков', 'h2'),
        ('Жёлтый — обязательное поле · зелёный — необязательное · серый — считается формулой (не редактировать).', ''),
        ('Правило данных Voyz: ничего не выдумываем. Нет данных — оставьте пусто и создайте тикет «Дозаполнить данные».', ''),
    ]
    ws.column_dimensions['A'].width = 140
    for r, (t, kind) in enumerate(lines, 1):
        c = ws.cell(r, 1, t)
        c.font = Font(name=F, size=16 if kind == 'h' else 12 if kind == 'h2' else 10, bold=bool(kind))
        c.alignment = Alignment(wrap_text=True, vertical='top')


def summary(ws):
    ws.column_dimensions['A'].width = 40
    ws.column_dimensions['B'].width = 14
    rows = [
        ('Сводка по базе', None, 'h'),
        ('Мест всего', '=COUNTA(places!$A:$A)-2', ''),
        ('  Кыргызстан (kg)', '=COUNTIF(places!$B:$B,"kg")', ''),
        ('  Алтай (alt)', '=COUNTIF(places!$B:$B,"alt")', ''),
        ('Опубликовано', '=COUNTIF(places!$C:$C,"опубликовано")', ''),
        ('Черновиков', '=COUNTIF(places!$C:$C,"черновик")', ''),
        ('Статус «Проверено»', '=COUNTIF(places!$D:$D,"Проверено")', ''),
        ('Без фото', '=SUMPRODUCT((places!$A$3:$A$2000<>"")*(COUNTIF(photos!$A:$A,places!$A$3:$A$2000)=0))', ''),
        ('Фото всего', '=COUNTA(photos!$A:$A)-2', ''),
        ('Перевод EN проверен', '=COUNTIF(places!$' + get_column_letter([k for k, *_ in PLACE_COLS].index('en_reviewed') + 1) + ':$' + get_column_letter([k for k, *_ in PLACE_COLS].index('en_reviewed') + 1) + ',"да")', ''),
        (None, None, ''),
        ('Тикеты', None, 'h2'),
        ('Открыто', '=COUNTIF(tickets!$F:$F,"открыт")', ''),
        ('В работе', '=COUNTIF(tickets!$F:$F,"в работе")', ''),
        ('На проверке', '=COUNTIF(tickets!$F:$F,"на проверке")', ''),
        ('Готово', '=COUNTIF(tickets!$F:$F,"готово")', ''),
        ('Высокий приоритет, не закрыто', '=COUNTIFS(tickets!$G:$G,"высокий",tickets!$F:$F,"<>готово",tickets!$F:$F,"<>отклонён")', ''),
    ]
    for r, (a, b, kind) in enumerate(rows, 1):
        if a is None:
            continue
        c = ws.cell(r, 1, a)
        c.font = Font(name=F, size=14 if kind == 'h' else 11 if kind == 'h2' else 10, bold=bool(kind))
        if b:
            v = ws.cell(r, 2, b)
            v.font = Font(name=F, size=10, bold=True)


# ---------------------------------------------------------------- чтение книги
def iter_rows(ws):
    it = ws.iter_rows(values_only=True)
    keys = next(it)
    next(it)  # подписи
    for row in it:
        if row is None or all(v is None or (isinstance(v, str) and not v.strip()) for v in row):
            continue
        yield {k: v for k, v in zip(keys, row) if k}


def s(v):
    """Ячейка → строка, как в places.json: пусто → '', число из Excel → без «.0»."""
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def num(v):
    if v is None or v == '':
        return None
    if isinstance(v, str):
        v = float(v.replace(',', '.'))
    return int(v) if float(v).is_integer() and not isinstance(v, float) else v


def intn(v):
    if v is None or v == '':
        return None
    return int(float(str(v).replace(',', '.')))


def flt(v):
    """Км и координаты — всегда дробные (Excel хранит 7.0 как 7)."""
    return None if v is None or v == '' else float(str(v).replace(',', '.'))


def fnum(v):
    """Число как есть (int остаётся int); текст «12,5» → 12.5."""
    if v is None or v == '':
        return None
    if isinstance(v, (int, float)):
        return v
    v = float(str(v).replace(',', '.'))
    return int(v) if v.is_integer() else v


def build(path):
    """Плоская книга (лист places + листы-списки) → см. build_tables."""
    wb = load_workbook(path, read_only=True, data_only=False)
    tables = {}
    for name in ['places', 'tags', 'translations_en'] + [c[0] for c in CHILD]:
        if name in wb.sheetnames:
            tables[name] = [dict(r, _where=f'{name}, строка {i}') for i, r in enumerate(iter_rows(wb[name]), HEAD + 1)]
    return build_tables(tables)


def build_tables(tables):
    """Строки таблиц → (places, translations{id: {path: en}}, reviewed[], errors[], warnings[]).
    tables: {'places': [...], 'photos': [...], …, 'tags': [...], 'translations_en': [...]}; у строки есть '_where' для сообщений."""
    errors, warnings = [], []
    rows = tables.get('places', [])
    ids, out = set(), []
    tag_ids = {r['tag_id'] for r in tables.get('tags', []) if r.get('tag_id')}
    reviewed = []
    for r in rows:
        where = r['_where']
        pid = s(r.get('id')).strip()
        if not re.fullmatch(r'(kg|alt)-[a-z0-9-]+', pid):
            errors.append(f'{where}: id «{pid}» — нужен формат kg-… или alt-… (латиница, цифры, дефис)')
            continue
        if pid in ids:
            errors.append(f'{where}: id {pid} повторяется')
        ids.add(pid)
        for key, _, label, _, req in PLACE_COLS:
            if req and key not in ('lat', 'lon') and not s(r.get(key)).strip():
                errors.append(f'{where} ({pid}): не заполнено обязательное поле «{label}»')
        if s(r.get('country')) not in ('kg', 'alt'):
            errors.append(f'{where}: страна должна быть kg или alt')
        if s(r.get('publish')) not in PUBLISH:
            errors.append(f'{where}: публикация — одно из {PUBLISH}')
        p = {}
        for key, path, *_ in PLACE_COLS:
            if path:
                sp(p, path, s(r.get(key)))
        for k in ('idx', 'rich', 'conf', 'prac', 'rank'):
            p[k] = intn(r.get(k))
        lat, lon = r.get('lat'), r.get('lon')
        if lat in (None, '') and lon in (None, ''):
            p['ll'] = None
            warnings.append(f'{where} ({pid}): нет координат — места не будет на карте')
        else:
            try:
                lat, lon = flt(lat), flt(lon)
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    raise ValueError
                p['ll'] = [lat, lon]
            except ValueError:
                errors.append(f'{where} ({pid}): координаты должны быть числами (42.1565 и 77.3543)')
                p['ll'] = None
        try:
            p['m'] = [int(x) for x in re.split(r'[;,\s]+', s(r.get('months')).strip()) if x]
            if any(not 1 <= m <= 12 for m in p['m']):
                raise ValueError
        except ValueError:
            errors.append(f'{where} ({pid}): месяцы — числа 1…12 через «;»')
            p['m'] = []
        # коды → content.* и подписи плашек s.* (слова берутся из справочника, вручную их не пишут)
        content = {}
        dc = s(r.get('diff_code')).strip()
        if dc not in {str(k) for k in DIFFICULTY}:
            errors.append(f'{where} ({pid}): сложность — код 1…5')
        else:
            content['difficulty'] = int(dc)
        ac = s(r.get('acc_code')).strip()
        if ac not in ACCESS:
            errors.append(f'{where} ({pid}): доступ — один из {list(ACCESS)}')
        else:
            content['access'] = ac
        cc = s(r.get('cat_code')).strip()
        if cc not in CATEGORY:
            errors.append(f'{where} ({pid}): группа категории — один из {list(CATEGORY)}')
        else:
            content['category'] = cc
        nc = s(r.get('net_code')).strip() or 'unknown'
        if nc not in NET:
            errors.append(f'{where} ({pid}): связь — один из {list(NET)}')
            nc = 'unknown'
        content['net'] = nc
        p['s'] = {'diff': DIFFICULTY.get(content.get('difficulty'), ''), 'acc': ACCESS.get(content.get('access'), ''),
                  'onsite': s(r.get('s_onsite')), 'entry': s(r.get('s_entry')), 'net': NET[nc]}
        raw = s(r.get('month_scores')).strip()
        if raw:
            try:
                ms = json.loads(raw)
                if not isinstance(ms, dict) or any(not re.fullmatch(r'(1[0-2]|[1-9])', str(k)) or v not in (1, 2) for k, v in ms.items()):
                    raise ValueError
                content['monthScores'] = {str(k): v for k, v in ms.items()}
                off = [int(k) for k in ms if int(k) not in p['m']]
                if off:
                    warnings.append(f'{where} ({pid}): в оценке есть месяцы вне сезона (months): {off}')
            except ValueError:
                errors.append(f'{where} ({pid}): оценка месяцев — JSON-объект вида {{"6":1,"7":2}}: месяцы 1–12, значения 1 (подходит) или 2 (лучшее время)')
        p['content'] = content
        rv = r.get('rating_v')
        p['rating'] = {'v': s(rv), 'n': s(r.get('rating_n')), 'src': s(r.get('rating_src'))} if s(rv) else None
        p['p']['gaps'] = [x for x in s(r.get('gaps')).split('\n') if x.strip()]
        p['flags'] = [x for x in s(r.get('flags')).split('\n') if x.strip()]
        p['top'] = s(r.get('top')).lower() == YES
        tags = [t.strip() for t in s(r.get('tags')).split(';') if t.strip()]
        for t in tags:
            if tag_ids and t not in tag_ids:
                warnings.append(f'{where} ({pid}): тег «{t}» не найден в листе tags')
        p['tags'] = tags
        if s(r.get('en_reviewed')).lower() == YES:
            reviewed.append(pid)
        if r.get('updated_at'):
            p['updated_at'] = s(r.get('updated_at'))[:10]
        if r.get('updated_by'):
            p['updated_by'] = s(r.get('updated_by'))
        p['publish'] = s(r.get('publish'))
        out.append(p)
    byid = {p['id']: p for p in out}

    # дочерние листы
    for sheet, _, path, fields in CHILD:
        groups = {}
        for i, r in enumerate(tables.get(sheet, [])):
            pid = s(r.get('place_id'))
            if pid not in byid:
                errors.append(f'{r["_where"]}: place_id «{pid}» не найден среди мест')
                continue
            try:
                n = intn(r.get('pos')) or 0
            except ValueError:
                errors.append(f'{r["_where"]}: pos — число')
                n = 0
            groups.setdefault(pid, []).append((n, i, r))
        for pid, p in byid.items():
            items = []
            for n, i, r in sorted(groups.get(pid, []), key=lambda x: (x[0], x[1])):
                if sheet == 'photos':
                    it = {k: s(r.get(k)) for k, *_ in fields}
                    it['w'], it['h'] = intn(r.get('w')) or 0, intn(r.get('h')) or 0
                    if not os.path.exists(os.path.join(ROOT, 'assets', it['f'])):
                        warnings.append(f'{r["_where"]} ({pid}): файла assets/{it["f"]} нет')
                elif sheet == 'routes':
                    it = {k: s(r.get(k)) for k in ('title', 'from', 'route', 'km', 'time', 'surface', 'vehicle', 'season', 'last')}
                    it['parking'] = {'d': s(r.get('parking_d')), 'price': s(r.get('parking_price'))}
                    it['trail'] = {'d': s(r.get('trail_d'))}
                    it['haz'] = s(r.get('haz'))
                    it['rec'] = s(r.get('rec')).lower() == YES
                    it['src'] = s(r.get('src'))
                    if s(r.get('has_rt')).lower() == YES or r.get('hub'):
                        def pt(pre):
                            a, b = r.get(f'{pre}_lat'), r.get(f'{pre}_lon')
                            return [flt(a), flt(b)] if a not in (None, '') and b not in (None, '') else None
                        road = r.get('road')
                        it['rt'] = {'hub': s(r.get('hub')), 'hc': pt('hub'), 'road': json.loads(road) if road else None,
                                    'rkm': fnum(r.get('rkm')), 'pc': pt('parking'), 'tc': pt('trail')}
                    else:
                        it['rt'] = None
                elif sheet == 'nearby':
                    it = {'id': s(r.get('id')), 'name': s(r.get('name')), 'km': flt(r.get('km'))}
                else:
                    it = {k: s(r.get(k)) for k, *_ in fields}
                items.append(it)
            sp(p, path, items)

    # «Рядом» не выдумываем: пусто — предупреждение с подсказкой (python tools/places_xlsx.py nearby <id>)
    for p in out:
        if not p.get('nearby') and p['ll'] and p.get('publish') == 'черновик':
            cand = sorted((hv(p['ll'], q['ll']), q['id']) for q in out if q is not p and q['ll'] and q['c'] == p['c'])[:3]
            warnings.append(f'nearby ({p["id"]}): пусто; ближайшие по прямой: ' + ', '.join(f'{i} ({d:.1f} км)' for d, i in cand))
        if not any(a['rec'] for a in p['p']['apps']) and p['p']['apps']:
            warnings.append(f'routes ({p["id"]}): нет рекомендованного варианта (rec = да)')

    # переводы
    tr = {}
    if True:
        for r in tables.get('translations_en', []):
            pid = s(r.get('place_id'))
            if pid in byid and s(r.get('en')).strip():
                tr.setdefault(pid, {})[s(r.get('path'))] = s(r.get('en'))
    return out, tr, reviewed, errors, warnings


def hv(a, b):
    R = 6371
    la1, lo1, la2, lo2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


KEY_ORDER = None


def to_json(places):
    """Порядок ключей — как в исходном places.json (diff в git остаётся читаемым)."""
    ref = json.load(open(PLACES, encoding='utf-8'))['places'][0]
    order = list(ref.keys())
    res = []
    for p in places:
        if p.get('publish', 'опубликовано') != 'опубликовано':
            continue
        q = {k: p[k] for k in order if k in p}
        for k in p:
            if k not in q and k != 'publish':
                q[k] = p[k]
        res.append(q)
    return res


def write_json(path, obj, indent=1):
    """Пишет JSON, только если данные изменились: без шума в git (отступы, дата сборки) при повторном импорте."""
    if os.path.exists(path):
        try:
            if json.load(open(path, encoding='utf-8')) == obj:
                return False
        except ValueError:
            pass
    open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(obj, ensure_ascii=False, indent=indent))
    return True


def do_import(path, write=True):
    places, tr, reviewed, errors, warnings = build(path)
    for w in warnings[:40]:
        print('  ⚠', w)
    if len(warnings) > 40:
        print(f'  … и ещё предупреждений: {len(warnings) - 40}')
    if errors:
        for e in errors:
            print('  ✗', e)
        print(f'✗ ошибок: {len(errors)} — places.json не изменён')
        return False
    pub = to_json(places)
    if not write:
        print(f'✓ проверка пройдена: мест {len(places)} (к публикации {len(pub)}), предупреждений {len(warnings)}')
        return True
    data = json.load(open(PLACES, encoding='utf-8'))
    if data['places'] != pub:  # дату сборки и счётчики меняем, только если места правда изменились
        data['places'] = pub
        data['meta']['count'] = len(pub)
        for c in data['meta']['countries']:
            data['meta']['countries'][c]['count'] = sum(1 for p in pub if p['c'] == c)
        data['meta']['built'] = date.today().isoformat()
    changed = write_json(PLACES, data)
    os.makedirs(TR_EN, exist_ok=True)
    tr_changed = sum(write_json(os.path.join(TR_EN, f'{pid}.json'), m) for pid, m in tr.items())
    write_json(os.path.join(TR_EN, '_reviewed.json'), sorted(reviewed))
    print(f'  places.json {"обновлён" if changed else "без изменений"} · файлов перевода изменено: {tr_changed}')
    print(f'✓ places.json: {len(pub)} мест · переводов EN: {len(tr)} · проверено редактором: {len(reviewed)}')
    print('  дальше: node tools/i18n-extract.mjs (если менялись русские тексты) · npm run gen:media · node tools/i18n-build.mjs')
    return True


def roundtrip():
    import tempfile
    tmp = os.path.join(tempfile.gettempdir(), 'voyz-roundtrip.xlsx')
    export(tmp)
    places, tr, reviewed, errors, _ = build(tmp)
    assert not errors, errors[:5]
    orig = json.load(open(PLACES, encoding='utf-8'))['places']
    got = {p['id']: p for p in to_json(places)}
    diffs = 0
    for o in orig:
        g = dict(got[o['id']])
        g.pop('tags', None)
        if json.dumps(o, ensure_ascii=False, sort_keys=True) != json.dumps(g, ensure_ascii=False, sort_keys=True):
            diffs += 1
            for k in o:
                if json.dumps(o[k], sort_keys=True, ensure_ascii=False) != json.dumps(g.get(k), sort_keys=True, ensure_ascii=False):
                    print('  отличие', o['id'], k, str(o[k])[:120], '→', str(g.get(k))[:120])
                    break
    tr_bad = 0
    for pid in got:
        f = os.path.join(TR_EN, f'{pid}.json')
        if os.path.exists(f) and json.load(open(f, encoding='utf-8')) != tr.get(pid, {}):
            tr_bad += 1
    print(f'roundtrip: мест {len(orig)}, отличий {diffs}; переводов с отличиями {tr_bad}')
    return diffs == 0 and tr_bad == 0


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'export'
    path = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_XLSX
    ok = {'export': lambda: export(path) or True, 'import': lambda: do_import(path), 'check': lambda: do_import(path, write=False), 'roundtrip': roundtrip}[cmd]()
    sys.exit(0 if ok else 1)
