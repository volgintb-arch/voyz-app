// Загрузка мест, индексы и фильтры. Логика — порт reference/prototype_src/app.js
// (catShort, noCar, filterList), чтобы выдача совпадала с прототипом.
import type { ImageSourcePropType } from 'react-native';

import raw from '../../assets/data/places.json';
import rawEn from '../../assets/data/places.en.json';
import { currentLang, dataLabel, seasonText, tr } from '@/i18n';

import { CATEGORY } from './codes';

import { audioDuration, audioSources, photoSources } from './media.generated';
import type { CountryCode, Place, PlacesFile } from './types';

const data = raw as unknown as PlacesFile;

export const meta = data.meta;
export const places: readonly Place[] = data.places;
const byId = new Map(places.map((p) => [p.id, p]));

// ---------- перевод текстов мест ----------
// places.en.json — плоские «путь → текст» поверх русских данных (tools/i18n-build.mjs). Поля-ключи логики
// (cat, reg, s, m) не переводятся, поэтому фильтры, категории и сезоны работают одинаково на любом языке.
const EN = rawEn as unknown as { reviewed: string[]; places: Record<string, Record<string, string>> };
const enCache = new Map<string, Place>();

function setPath(obj: unknown, path: string, value: string) {
  const keys = path.split('.');
  let o = obj as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = o?.[keys[i]];
    if (next == null || typeof next !== 'object') return;
    o = next as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  if (o && typeof o[last] === 'string') o[last] = value;
}

function localize(p: Place): Place {
  if (currentLang() !== 'en') return p;
  const t = EN.places[p.id];
  if (!t) return p;
  const hit = enCache.get(p.id);
  if (hit) return hit;
  const c = JSON.parse(JSON.stringify(p)) as Place;
  for (const k of Object.keys(t)) setPath(c, k, t[k]);
  enCache.set(p.id, c);
  return c;
}

/** Тексты места показаны в переводе (а не на русском). */
export const isTranslated = (id: string) => currentLang() === 'en' && !!EN.places[id];
/** Перевод проверен редактором (translations/en/_reviewed.json). */
export const isReviewed = (id: string) => EN.reviewed.includes(id);

export const getPlace = (id: string) => {
  const p = byId.get(id);
  return p && localize(p);
};
export const placesOf = (c: CountryCode) => places.filter((p) => p.c === c).map(localize);

export const MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

/** Склонение: plural(83, 'место', 'места', 'мест') → 'места'. */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Короткая категория для чипсов и подборок. */
export function catShort(cat: string): string {
  const c = (cat || '').toLowerCase();
  if (/водопад/.test(c)) return 'Водопады';
  if (/озер|озёр|водохр/.test(c)) return 'Озёра';
  if (/каньон/.test(c)) return 'Каньоны';
  if (/ущель/.test(c)) return 'Ущелья';
  if (/перевал|дорог/.test(c)) return 'Перевалы и дороги';
  if (/долин|плато|жайлоо|урочищ|панорам/.test(c)) return 'Долины и панорамы';
  if (/ледник|гора|хижин|лагер/.test(c)) return 'Горы и ледники';
  if (/парк|заповед|лес/.test(c)) return 'Парки';
  if (/источник|курорт/.test(c)) return 'Источники и курорты';
  if (/музей|мавзол|храм|мечеть|городищ|археол|петрогл|истор|культур|священ|памятник/.test(c)) return 'История и культура';
  if (/пещер/.test(c)) return 'Пещеры';
  return 'Другое';
}

export type MonthLevel = 0 | 1 | 2; // 0 — не сезон, 1 — подходит, 2 — лучшее время

/**
 * Уровни месяцев из content.monthScores (индекс 0 = январь). null — оценок нет или они пустые/битые:
 * тогда «Когда ехать» показывает сезон по p.m одним цветом, как раньше.
 */
export function monthLevels(p: Place): MonthLevel[] | null {
  const sc = p.content?.monthScores;
  if (!sc || typeof sc !== 'object') return null;
  const levels: MonthLevel[] = Array(12).fill(0);
  let any = false;
  for (const [k, v] of Object.entries(sc)) {
    const m = Number(k);
    if (Number.isInteger(m) && m >= 1 && m <= 12 && (v === 1 || v === 2)) {
      levels[m - 1] = v;
      any = true;
    }
  }
  return any ? levels : null;
}

/** Группа категории места: из кода content.category, иначе — по тексту категории (старые данные). */
export const catGroup = (p: Place): string => (p.content?.category && CATEGORY[p.content.category]) || catShort(p.cat);

/** Подпись сезона для плашек и карточек — строится из месяцев сезона. */
export const seasonLabel = (p: Place) => seasonText(p.m);

/** Можно добраться без своей машины (есть общественный транспорт или катер). */
export const noCar = (p: Place) =>
  ((byId.get(p.id) ?? p).p.transport || []).some((t) => /маршрут|автобус|поезд|катер|теплоход|паром|минивэн/i.test(t.mode || ''));

export const isTop = (p: Place) => !!(p.rank && p.top);

/** Подпись местоположения, как в прототипе: «Чуйская обл.» / «Алтай». */
export const locLine = (p: Place) => (p.c === 'kg' ? (p.reg || '').replace(' область', ' обл.') : p.reg || 'Алтай');

/** Подпись региона и категории на языке интерфейса (данные хранятся по-русски). */
export const locLabel = (p: Place) => dataLabel(locLine(p));
export const catLabel = (cat: string) => (currentLang() === 'en' ? tr(catShort(cat)) : cat);

export interface Filters {
  q?: string;
  cat?: string;
  month?: number;
  acc?: string; // код доступа (content.access)
  diff?: number; // код сложности 1–5 (content.difficulty)
  nocar?: boolean;
  photo?: boolean;
  season?: boolean; // «сезон сейчас»
}

export function filterPlaces(country: CountryCode, f: Filters, now = new Date()): Place[] {
  const q = (f.q || '').toLowerCase();
  const curM = now.getMonth() + 1;
  return placesOf(country)
    .filter(
      (p) =>
        (!q || [p.name, p.full, p.cat, p.reg, p.dist, p.near, p.short].join(' ').toLowerCase().includes(q)) &&
        (!f.cat || catGroup(p) === f.cat) &&
        (!f.month || (p.m || []).includes(f.month)) &&
        (!f.acc || (p.content?.access ?? p.s.acc) === f.acc) &&
        (!f.diff || p.content?.difficulty === f.diff) &&
        (!f.nocar || noCar(p)) &&
        (!f.photo || p.photos.length > 0) &&
        (!f.season || (p.m || []).includes(curM)),
    )
    .sort((a, b) => (b.idx || 0) - (a.idx || 0));
}

// ---------- медиа ----------
const strip = (s: string) => s.replace(/^img\//, '');

/** Фото места: big — 960 px для hero и просмотрщика, иначе миниатюра для списков. */
export function photoSource(p: Place, i = 0, big = false): ImageSourcePropType | undefined {
  const ph = p.photos[i];
  return ph && photoSources[strip(big ? ph.f : ph.t)];
}

export const audioSource = (id: string): number | undefined => audioSources[id];
export const audioSeconds = (id: string): number | undefined => audioDuration[id];
