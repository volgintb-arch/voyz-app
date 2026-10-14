// Мир для «Моей карты путешествий»: страны Natural Earth 1:110m (assets/data/world.json), проекция и подсчёты.
import raw from '../../assets/data/world.json';

import type { CountryCode, LatLng } from '@/data/types';
import { getPlace } from '@/data/places';

export interface WorldCountry {
  iso: string;
  name: string; // по-русски
  en: string;
  cont: string; // континент по-русски
  r: [number, number][][]; // внешние контуры [lon, lat]
}

export const WORLD: WorldCountry[] = (raw as unknown as { countries: WorldCountry[] }).countries;
export const byIso = new Map(WORLD.map((c) => [c.iso, c]));

/** Сколько стран в мире для процента: 193 члена ООН + Ватикан и Палестина. */
export const WORLD_TOTAL = 195;

/** Страна Voyz → ISO: отметка места автоматически отмечает страну. */
export const VOYZ_ISO: Record<CountryCode, string> = { kg: 'KG', alt: 'RU' };

/** Все посещённые страны: отмеченные вручную + страны мест, где человек был. */
export function visitedIsoSet(manual: string[], visitedPlaces: Record<string, string>): Set<string> {
  const set = new Set(manual);
  for (const id of Object.keys(visitedPlaces)) {
    const p = getPlace(id);
    if (p) set.add(VOYZ_ISO[p.c]);
  }
  return set;
}

export const visitedPlacePoints = (visitedPlaces: Record<string, string>): LatLng[] =>
  Object.keys(visitedPlaces)
    .map((id) => getPlace(id)?.ll)
    .filter((x): x is LatLng => !!x);

// ---------- проекция: равнопромежуточная, без Антарктиды (широты 84° … −56°) ----------
export const LAT_TOP = 84;
export const LAT_BOTTOM = -56;
export const WORLD_ASPECT = 360 / (LAT_TOP - LAT_BOTTOM); // ширина / высота ≈ 2.57

export function projector(width: number) {
  const k = width / 360;
  return {
    height: (LAT_TOP - LAT_BOTTOM) * k,
    x: (lon: number) => (lon + 180) * k,
    y: (lat: number) => (LAT_TOP - lat) * k,
  };
}

const pathCache = new Map<string, string>();
/** SVG-путь страны для заданной ширины карты. */
export function countryPath(c: WorldCountry, width: number) {
  const key = `${c.iso}@${width}`;
  const hit = pathCache.get(key);
  if (hit) return hit;
  const P = projector(width);
  const d = c.r.map((ring) => ring.map(([lo, la], i) => `${i ? 'L' : 'M'}${P.x(lo).toFixed(1)},${P.y(la).toFixed(1)}`).join('') + 'Z').join('');
  pathCache.set(key, d);
  return d;
}

const inRing = (lon: number, lat: number, r: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** Страна под точкой; если промахнулись мимо мелкого острова — ближайшая в радиусе tol градусов. */
export function countryAt(lon: number, lat: number, tol = 2): WorldCountry | null {
  for (const c of WORLD) if (c.r.some((r) => inRing(lon, lat, r))) return c;
  let best: WorldCountry | null = null;
  let bestD = tol * tol;
  for (const c of WORLD)
    for (const r of c.r)
      for (const [x, y] of r) {
        const d = (x - lon) ** 2 + (y - lat) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
  return best;
}
