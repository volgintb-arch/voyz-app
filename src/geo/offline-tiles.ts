// Какие тайлы подробной карты нужны стране без сети: обзор всей страны и подробно — вокруг каждого места.
// Сплошная детализация по стране весила бы сотни МБ; в горах подробные тайлы лёгкие (1–3 КБ).
import { placesOf } from '@/data/places';
import type { CountryCode, LatLng } from '@/data/types';

export const OVERVIEW_ZOOM: [number, number] = [5, 10];
export const DETAIL_ZOOM: [number, number] = [11, 14];

const lon2x = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat: number, z: number) =>
  Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);

/** Рамка страны по её местам с запасом: [west, south, east, north]. */
export function countryBounds(c: CountryCode): [number, number, number, number] {
  const pts = placesOf(c)
    .filter((p) => p.ll)
    .map((p) => p.ll!);
  const la = pts.map((p) => p[0]);
  const lo = pts.map((p) => p[1]);
  return [Math.min(...lo) - 0.6, Math.min(...la) - 0.4, Math.max(...lo) + 0.6, Math.max(...la) + 0.4];
}

/** Радиус подробной зоны вокруг места, градусы: на z11–12 шире (подъезды), на z13–14 — сама округа. */
export const detailRadius = (z: number) => (z <= 12 ? 0.12 : 0.06);

export function placePoints(c: CountryCode): LatLng[] {
  return placesOf(c)
    .filter((p) => p.ll)
    .map((p) => p.ll!);
}

/** Список z/x/y для веба. */
export function tileList(c: CountryCode): string[] {
  const set = new Set<string>();
  const [w, s, e, n] = countryBounds(c);
  for (let z = OVERVIEW_ZOOM[0]; z <= OVERVIEW_ZOOM[1]; z++)
    for (let x = lon2x(w, z); x <= lon2x(e, z); x++) for (let y = lat2y(n, z); y <= lat2y(s, z); y++) set.add(`${z}/${x}/${y}`);
  for (const [la, lo] of placePoints(c))
    for (let z = DETAIL_ZOOM[0]; z <= DETAIL_ZOOM[1]; z++) {
      const r = detailRadius(z);
      for (let x = lon2x(lo - r, z); x <= lon2x(lo + r, z); x++) for (let y = lat2y(la + r, z); y <= lat2y(la - r, z); y++) set.add(`${z}/${x}/${y}`);
    }
  return [...set];
}

/** Тайлы растровой тени Natural Earth из стиля liberty (до z6). */
export function shadedReliefList(c: CountryCode): string[] {
  const [w, s, e, n] = countryBounds(c);
  const out: string[] = [];
  for (let z = 5; z <= 6; z++) for (let x = lon2x(w, z); x <= lon2x(e, z); x++) for (let y = lat2y(n, z); y <= lat2y(s, z); y++) out.push(`${z}/${x}/${y}`);
  return out;
}

/** Грубая оценка объёма для подписи на кнопке. */
export const estimateMb = (c: CountryCode) => Math.round((tileList(c).length * 6) / 1024 + 4);
