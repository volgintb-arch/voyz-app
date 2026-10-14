// Загрузка мест, индексы и фильтры. Логика — порт reference/prototype_src/app.js
// (catShort, noCar, filterList), чтобы выдача совпадала с прототипом.
import type { ImageSourcePropType } from 'react-native';

import raw from '../../assets/data/places.json';
import { currentLang, dataLabel, tr } from '@/i18n';

import { audioDuration, audioSources, photoSources } from './media.generated';
import type { CountryCode, Place, PlacesFile } from './types';

const data = raw as unknown as PlacesFile;

export const meta = data.meta;
export const places: readonly Place[] = data.places;
const byId = new Map(places.map((p) => [p.id, p]));

export const getPlace = (id: string) => byId.get(id);
export const placesOf = (c: CountryCode) => places.filter((p) => p.c === c);

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

/** Можно добраться без своей машины (есть общественный транспорт или катер). */
export const noCar = (p: Place) =>
  (p.p.transport || []).some((t) => /маршрут|автобус|поезд|катер|теплоход|паром|минивэн/i.test(t.mode || ''));

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
  acc?: string;
  diff?: string; // начало строки в нижнем регистре: 'лёгк', 'средн', 'сложн'
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
        (!f.cat || catShort(p.cat) === f.cat) &&
        (!f.month || (p.m || []).includes(f.month)) &&
        (!f.acc || p.s.acc === f.acc) &&
        (!f.diff || p.s.diff.toLowerCase().startsWith(f.diff)) &&
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
