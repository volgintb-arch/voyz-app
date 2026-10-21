// Коды карточки места (content.*) и их подписи. В данных хранятся коды — фильтры и логика работают по ним;
// слова на плашках берутся отсюда (на английском — через словарь i18n). Тот же справочник — в Excel-базе (лист «Справочники»).

export const DIFFICULTY: Record<number, string> = {
  1: 'Очень лёгкая',
  2: 'Лёгкая',
  3: 'Средняя',
  4: 'Сложная',
  5: 'Очень сложная',
};

export type AccessCode = 'any-car' | 'crossover' | '4x4' | 'on-foot' | 'by-water';
export const ACCESS: Record<AccessCode, string> = {
  'any-car': 'На любой машине',
  crossover: 'Кроссовер',
  '4x4': 'Нужен 4×4',
  'on-foot': 'Только пешком',
  'by-water': 'По воде',
};

export type NetCode = 'yes' | 'partial' | 'no' | 'unknown';
export const NET: Record<NetCode, string> = {
  yes: 'Связь есть',
  partial: 'Связь местами',
  no: 'Связи нет',
  unknown: 'Не подтверждено',
};

/** Группы категорий: код → подпись (подробная категория места остаётся в поле cat). */
export const CATEGORY: Record<string, string> = {
  lakes: 'Озёра',
  waterfalls: 'Водопады',
  canyons: 'Каньоны',
  gorges: 'Ущелья',
  passes: 'Перевалы и дороги',
  valleys: 'Долины и панорамы',
  mountains: 'Горы и ледники',
  parks: 'Парки',
  springs: 'Источники и курорты',
  culture: 'История и культура',
  caves: 'Пещеры',
  other: 'Другое',
};

/** Фильтр «Сложность»: подпись → диапазон кодов. */
export const DIFF_FILTER: [number, string][] = [
  [1, 'Очень лёгкая'],
  [2, 'Лёгкая'],
  [3, 'Средняя'],
  [4, 'Сложная'],
  [5, 'Очень сложная'],
];
