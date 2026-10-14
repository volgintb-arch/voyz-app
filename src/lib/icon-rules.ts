// Какая иконка у категории, вида доступа, транспорта и вещи «взять с собой» — правила прототипа.
import type { IconName } from '@/components/icon';

export function catIcon(cat: string): IconName {
  const c = (cat || '').toLowerCase();
  if (/водопад/.test(c)) return 'fall';
  if (/озер|водохр|озёр/.test(c)) return 'waves';
  if (/каньон/.test(c)) return 'canyon';
  if (/перевал|дорог/.test(c)) return 'pass';
  if (/ледник/.test(c)) return 'glacier';
  if (/пещер/.test(c)) return 'cave';
  if (/источник/.test(c)) return 'hot';
  if (/лес|парк/.test(c)) return 'tree';
  if (/музей|мавзол|храм|мечеть|городищ|археол|петрогл|истор|культур|памятник|священ/.test(c)) return 'landmark';
  if (/гора|ущель|долин|плато|панорам|урочищ|хижин|лагер/.test(c)) return 'mountain';
  return 'compass';
}

export function accIcon(a: string): IconName {
  if (/воде/.test(a)) return 'boat';
  if (/4×4|Кроссовер/.test(a)) return 'jeep';
  if (/пешком/i.test(a)) return 'walk';
  if (/Верхом/.test(a)) return 'horse';
  return 'car';
}

export function modeIcon(mode: string): IconName {
  const m = (mode || '').toLowerCase();
  if (/маршрут|автобус|минивэн/.test(m)) return 'bus';
  if (/поезд|электрич/.test(m)) return 'train';
  if (/самол|авиа/.test(m)) return 'plane';
  if (/вертол/.test(m)) return 'heli';
  if (/лодк|катер|теплох|паром/.test(m)) return 'boat';
  if (/лошад|конн|кон/.test(m)) return 'horse';
  if (/вело/.test(m)) return 'bike';
  if (/канат/.test(m)) return 'cable';
  if (/пеш|трек/.test(m)) return 'walk';
  if (/газ-66|уаз|4x4|внедор/.test(m)) return 'jeep';
  if (/тур|экскурс/.test(m)) return 'tour';
  return 'car';
}

export function bringIcon(item: string): IconName {
  const t = item.toLowerCase();
  if (/вод/.test(t)) return 'drop';
  if (/обув|ботин|кроссов/.test(t)) return 'boot';
  if (/налич|сом|руб|деньг/.test(t)) return 'wallet';
  if (/крем|очк|панам|головн|солнц/.test(t)) return 'sun';
  if (/ветров|куртк|тёпл|тепл|флис|дожд|пуховк|шапк/.test(t)) return 'jacket';
  if (/репел|клещ|комар/.test(t)) return 'bug';
  if (/паспорт|пропуск|документ/.test(t)) return 'id';
  if (/фонар/.test(t)) return 'flash';
  if (/аптеч|лекарств/.test(t)) return 'med';
  if (/телефон|заряд|power|пауэр|повербанк|батар/.test(t)) return 'battery';
  if (/еда|перекус|продукт/.test(t)) return 'food';
  return 'check';
}

/** Сервисы на месте: ключ данных → иконка и подпись. */
export const SERVICES: [key: 'toilets' | 'water' | 'shop' | 'atm' | 'fuel' | 'mobile' | 'medical' | 'rescue', icon: IconName, label: string][] = [
  ['toilets', 'toilet', 'Туалет'],
  ['water', 'drop', 'Вода'],
  ['shop', 'shop', 'Магазин'],
  ['atm', 'atm', 'Банкомат'],
  ['fuel', 'fuel', 'Заправка'],
  ['mobile', 'signal', 'Связь'],
  ['medical', 'med', 'Медицина'],
  ['rescue', 'sos', 'Спасатели'],
];
