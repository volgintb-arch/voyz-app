// Перевод интерфейса. Ключ — сама русская фраза: код читается как раньше, а если перевода нет,
// показывается русский текст, а не пустота. Тексты мест (описания, советы) — на русском:
// их не переводим машинно без проверки (правило данных: ничего не выдумываем).
import { getLocales } from 'expo-localization';
import { useApp } from '@/store/app-store';

import { EN } from './en';

export type Lang = 'ru' | 'en';
export type Params = Record<string, string | number>;

const RU_FAMILY = ['ru', 'ky', 'kk', 'uz', 'be', 'uk', 'tg'];

/** Язык телефона: русский для стран, где его понимают, иначе английский. */
export function deviceLang(): Lang {
  try {
    const code = getLocales()[0]?.languageCode ?? 'ru';
    return RU_FAMILY.includes(code) ? 'ru' : 'en';
  } catch {
    return 'ru';
  }
}

const fill = (s: string, p?: Params) => (p ? s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? `{${k}}`)) : s);

export function translate(lang: Lang, ru: string, p?: Params) {
  return fill(lang === 'en' ? (EN[ru] ?? ru) : ru, p);
}

export const currentLang = (): Lang => useApp.getState().lang ?? deviceLang();

/** Вне компонентов (тосты в обработчиках, сборка ридеров). */
export const tr = (ru: string, p?: Params) => translate(currentLang(), ru, p);

/** В компонентах: перерисовка при смене языка. */
export function useT() {
  const stored = useApp((s) => s.lang);
  const lang = stored ?? deviceLang();
  const t = (ru: string, p?: Params) => translate(lang, ru, p);
  return { t, lang };
}

/** Склонение: русские три формы; английский — единственное/множественное. */
export function plural(lang: Lang, n: number, one: string, few: string, many: string, enOne?: string, enMany?: string) {
  if (lang === 'en') return n === 1 ? (enOne ?? EN[one] ?? one) : (enMany ?? EN[many] ?? many);
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ---------- короткие значения из данных (плитки, чипсы) ----------
const MONTH_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** «Май – окт» → «May – Oct»; «Круглый год» → «All year». */
export function tWhen(lang: Lang, s: string) {
  if (lang === 'ru' || !s) return s;
  if (EN[s]) return EN[s];
  return s.replace(/[А-Яа-яЁё]+/g, (w) => {
    const i = MONTH_RU.findIndex((m) => m.toLowerCase() === w.toLowerCase());
    return i >= 0 ? MONTH_EN[i] : w;
  });
}

const UNITS: [RegExp, string][] = [
  [/туда-обратно/g, 'round trip'],
  [/в одну(?: сторону)?/g, 'one way'],
  [/весь день/g, 'full day'],
  [/полдня/g, 'half a day'],
  [/радиально/g, 'out and back'],
  [/^день/g, 'day'],
  [/(\d)\s?дн(?:я|ей)/g, '$1 days'],
  [/(\d)\s?день/g, '$1 day'],
  [/(\d)\s?мин/g, '$1 min'],
  [/(\d)\s?ч(?![а-яё])/g, '$1 h'],
  [/подъёма/g, 'up'],
  [/вверх/g, 'up'],
  [/полный/g, 'full'],
  [/около /g, 'about '],
  [/от /g, 'from '],
  [/до /g, 'to '],
  [/ с музеем/g, ' with museum'],
  [/ до площади/g, ' to the square'],
];
/** Время на месте: переводим единицы, числа не трогаем. */
export function tDuration(lang: Lang, s: string) {
  if (lang === 'ru' || !s) return s;
  // в данных значения пишутся с заглавной («Полдня», «До 10 ч») — сравниваем без учёта регистра
  let out = s.charAt(0).toLowerCase() + s.slice(1);
  for (const [re, en] of UNITS) out = out.replace(re, en);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Сложность, доступ, регион, вход и прочие короткие значения — по словарю, иначе как есть. */
export const tData = (lang: Lang, s: string) => (lang === 'en' && s ? (EN[s] ?? tDuration(lang, s)) : s);

// ---------- короткие помощники по текущему языку (экраны перемонтируются при смене языка) ----------
const MONTHS_IN_RU = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

/** «в октябре» / «in October» — без предлога, только слово. */
export const monthIn = (m0: number) => tr(MONTHS_IN_RU[m0]);
export const pl = (n: number, one: string, few: string, many: string) => plural(currentLang(), n, one, few, many);
export const dataLabel = (s: string) => tData(currentLang(), s);
export const whenLabel = (s: string) => tWhen(currentLang(), s);

/** Подпись сезона из номеров месяцев: «Круглый год», «Май – окт», «Ноя – апр, июл – сен». */
export function seasonText(months: number[]) {
  const set = new Set(months.filter((m) => m >= 1 && m <= 12));
  if (!set.size) return '';
  if (set.size === 12) return tr('Круглый год');
  const names = currentLang() === 'en' ? MONTH_EN : MONTH_RU;
  // начала отрезков — месяцы, перед которыми (по кругу) месяц не в сезоне
  const starts = [...set].filter((m) => !set.has(((m + 10) % 12) + 1)).sort((a, b) => a - b);
  const parts = starts.map((a) => {
    let b = a;
    while (set.has((b % 12) + 1)) b = (b % 12) + 1;
    return a === b ? names[a - 1] : `${names[a - 1]} – ${names[b - 1]}`;
  });
  const s = parts.join(', ');
  // как в макете: заглавная только первая буква
  return currentLang() === 'en' ? s : s.charAt(0) + s.slice(1).toLowerCase();
}
export const durationLabel = (s: string) => tDuration(currentLang(), s);
export const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(currentLang() === 'en' ? 'en-GB' : 'ru-RU');
