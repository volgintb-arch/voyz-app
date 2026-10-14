// Расчёт маршрута поездки: отрезки по дорогам, км, часы за рулём и разбивка по дням.
// Порт reference/prototype_src/app.js → renderTrip / optimizeTrip / sampleTrip.
import { getPlace, placesOf } from '@/data/places';
import type { CountryCode, Place } from '@/data/types';
import { haversine } from '@/lib/text';

import { AVG_SPEED_KMH, roadRoute, type RoadRoute } from './routing';

export const DAY_LIMIT_H = 6.5; // больше — переносим на следующий день
export const PER_PLACE_H = 1.5; // примерно столько времени уходит на одно место

export interface TripPlan {
  places: Place[];
  legs: (RoadRoute | null)[]; // legs[i] — путь от places[i] к places[i+1]
  km: number;
  driveH: number;
  days: number[][]; // индексы places по дням
  approx: boolean;
}

const cache = new Map<string, RoadRoute>();
const legBetween = (a: Place, b: Place) => {
  if (!a.ll || !b.ll) return null;
  const k = `${a.id}>${b.id}`;
  let r = cache.get(k);
  if (!r) cache.set(k, (r = roadRoute(a.ll, b.ll)));
  return r;
};

export function planTrip(ids: string[], country: CountryCode): TripPlan {
  const places = ids.map(getPlace).filter((p): p is Place => !!p && p.c === country);
  const legs: (RoadRoute | null)[] = [];
  let km = 0;
  let approx = false;
  for (let i = 1; i < places.length; i++) {
    const r = legBetween(places[i - 1], places[i]);
    legs.push(r);
    if (r) {
      km += r.km;
      approx ||= r.approx;
    }
  }
  const days: number[][] = [];
  let day: number[] = [];
  let acc = 0;
  places.forEach((_, i) => {
    const leg = i ? legs[i - 1] : null;
    const h = leg ? leg.km / AVG_SPEED_KMH : 0;
    if (day.length && acc + h > DAY_LIMIT_H) {
      days.push(day);
      day = [];
      acc = 0;
    }
    acc += h + PER_PLACE_H;
    day.push(i);
  });
  if (day.length) days.push(day);
  return { places, legs, km, driveH: km / AVG_SPEED_KMH, days, approx };
}

/** «Оптимизировать»: жадный ближайший сосед от первой точки. Места других стран не трогаем. */
export function optimizeOrder(ids: string[], country: CountryCode): string[] {
  const mine = ids.filter((id) => {
    const p = getPlace(id);
    return p && p.c === country && p.ll;
  });
  if (mine.length < 3) return ids;
  const other = ids.filter((id) => !mine.includes(id));
  const out = [mine[0]];
  const left = mine.slice(1);
  while (left.length) {
    const last = getPlace(out[out.length - 1])!.ll!;
    let bi = 0;
    let bd = Infinity;
    left.forEach((id, k) => {
      const d = haversine(last, getPlace(id)!.ll!);
      if (d < bd) {
        bd = d;
        bi = k;
      }
    });
    out.push(left.splice(bi, 1)[0]);
  }
  return [...other, ...out];
}

/** «Собрать пример»: 5 лучших мест компактного региона, упорядоченных по ходу движения. */
export function sampleTrip(country: CountryCode): string[] {
  const list = placesOf(country).filter((p) => p.ll);
  const pick =
    country === 'kg'
      ? list.filter((p) => /Иссык/.test(p.reg))
      : list.filter((p) => /Республика Алтай/.test(p.reg) && p.ll![0] < 51.6 && p.ll![0] > 49.8);
  return pick
    .sort((a, b) => (b.idx || 0) - (a.idx || 0))
    .slice(0, 5)
    .sort((a, b) => (country === 'kg' ? a.ll![1] - b.ll![1] : b.ll![0] - a.ll![0]))
    .map((p) => p.id);
}
