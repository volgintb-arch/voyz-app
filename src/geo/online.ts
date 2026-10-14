// Онлайн-сервисы карты. Всё внешнее — в одном месте, чтобы для релиза заменить провайдеров одной правкой.
//
// ВНИМАНИЕ (релиз): публичные демо-сервисы годятся только для разработки.
//  - OSRM demo (router.project-osrm.org) запрещает нагрузку от приложений → свой OSRM/Valhalla или GraphHopper/Mapbox с ключом.
//  - OpenFreeMap и Terrain Tiles (AWS Open Data) бесплатны и без ключа, но для большой аудитории лучше свой CDN/PMTiles.
import type { LatLng } from '@/data/types';
import { currentLang } from '@/i18n';
import { haversine } from '@/lib/text';

export const ONLINE = {
  /** Подробная векторная карта: подписи сёл, тропы, перевалы, здания. */
  vectorStyle: 'https://tiles.openfreemap.org/styles/liberty',
  /** Высоты для отмывки рельефа и 3D: PNG, высота закодирована в цвете (terrarium). */
  terrainTiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  terrainEncoding: 'terrarium' as const,
  terrainMaxZoom: 15,
  /** Маршрутизация по дорогам. */
  routing: 'https://router.project-osrm.org/route/v1/driving',
  attribution: '© OpenStreetMap, OpenFreeMap, Terrain Tiles (AWS), OSRM',
};

export interface Maneuver {
  ll: LatLng; // точка манёвра
  text: string; // «Поверните направо на трассу А-365»
  icon: 'left' | 'right' | 'straight' | 'uturn' | 'arrive' | 'depart' | 'round';
  distM: number; // длина отрезка после манёвра
}

export interface OnlineRoute {
  line: LatLng[];
  km: number;
  min: number;
  steps: Maneuver[];
}

const SIDE: Record<string, string> = {
  left: 'налево',
  right: 'направо',
  'slight left': 'плавно налево',
  'slight right': 'плавно направо',
  'sharp left': 'резко налево',
  'sharp right': 'резко направо',
  straight: 'прямо',
  uturn: 'на разворот',
};

interface OsrmStep {
  name?: string;
  ref?: string;
  distance: number;
  maneuver: { type: string; modifier?: string; location: [number, number]; exit?: number };
}

/** Текст манёвра по-русски из ответа OSRM. */
function maneuverText(s: OsrmStep): Pick<Maneuver, 'text' | 'icon'> {
  const road = [s.ref, s.name].filter(Boolean).join(' · ');
  const on = road ? ` на ${road}` : '';
  const m = s.maneuver;
  const side = SIDE[m.modifier ?? ''] ?? '';
  const icon: Maneuver['icon'] = m.modifier?.includes('left') ? 'left' : m.modifier?.includes('right') ? 'right' : m.modifier === 'uturn' ? 'uturn' : 'straight';
  switch (m.type) {
    case 'depart':
      return { text: `Начните движение${on}`, icon: 'depart' };
    case 'arrive':
      return { text: 'Вы на месте', icon: 'arrive' };
    case 'roundabout':
    case 'rotary':
      return { text: `На кольце — ${m.exit ?? ''}-й съезд${on}`.replace(' — -й', ' —'), icon: 'round' };
    case 'continue':
    case 'new name':
      return { text: `Продолжайте ${side || 'прямо'}${on}`, icon };
    case 'fork':
      return { text: `На развилке держитесь ${side.replace('плавно ', '')}${on}`, icon };
    case 'merge':
      return { text: `Перестройтесь ${side}${on}`, icon };
    case 'end of road':
    case 'turn':
    default:
      return { text: side === 'прямо' ? `Езжайте прямо${on}` : `Поверните ${side}${on}`, icon };
  }
}
/** Текст манёвра на английском (интерфейс в режиме EN). */
function maneuverTextEn(s: OsrmStep): Pick<Maneuver, 'text' | 'icon'> {
  const road = [s.ref, s.name].filter(Boolean).join(' · ');
  const on = road ? ` onto ${road}` : '';
  const m = s.maneuver;
  const side = m.modifier ?? '';
  const icon: Maneuver['icon'] = side.includes('left') ? 'left' : side.includes('right') ? 'right' : side === 'uturn' ? 'uturn' : 'straight';
  switch (m.type) {
    case 'depart':
      return { text: `Head out${on}`, icon: 'depart' };
    case 'arrive':
      return { text: 'You have arrived', icon: 'arrive' };
    case 'roundabout':
    case 'rotary':
      return { text: `At the roundabout take exit ${m.exit ?? ''}${on}`, icon: 'round' };
    case 'continue':
    case 'new name':
      return { text: `Continue ${side || 'straight'}${on}`, icon };
    case 'fork':
      return { text: `Keep ${side.replace('slight ', '')} at the fork${on}`, icon };
    case 'merge':
      return { text: `Merge ${side}${on}`, icon };
    default:
      return { text: side === 'straight' ? `Go straight${on}` : side === 'uturn' ? 'Make a U-turn' : `Turn ${side}${on}`, icon };
  }
}

/** Маршрут по дорогам между двумя точками. Без сети — бросает ошибку (вызывающий показывает тост). */
export async function fetchRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<OnlineRoute> {
  const url = `${ONLINE.routing}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true&language=ru`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`routing ${res.status}`);
  const j = await res.json();
  const r = j.routes?.[0];
  if (!r) throw new Error('no route');
  const steps: Maneuver[] = (r.legs?.[0]?.steps ?? []).map((s: OsrmStep) => ({
    ll: [s.maneuver.location[1], s.maneuver.location[0]] as LatLng,
    distM: s.distance,
    ...(currentLang() === 'en' ? maneuverTextEn(s) : maneuverText(s)),
  }));
  return { line: r.geometry.coordinates.map(([lo, la]: [number, number]) => [la, lo] as LatLng), km: r.distance / 1000, min: r.duration / 60, steps };
}

/** Расстояние от точки до ломаной, м (для «съехали с маршрута» и следующего манёвра). */
export function distToLineM(p: LatLng, line: LatLng[]) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, segDistKm(p, line[i - 1], line[i]));
  return best * 1000;
}
function segDistKm(p: LatLng, a: LatLng, b: LatLng) {
  // в локальной плоской проекции — на коротких отрезках точности хватает
  const k = Math.cos((p[0] * Math.PI) / 180);
  const ax = a[1] * k;
  const bx = b[1] * k;
  const px = p[1] * k;
  const dx = bx - ax;
  const dy = b[0] - a[0];
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (p[0] - a[0]) * dy) / (dx * dx + dy * dy))) : 0;
  return haversine(p, [a[0] + dy * t, (ax + dx * t) / k]);
}

/** Следующий манёвр впереди и расстояние до него. */
export function nextManeuver(pos: LatLng, steps: Maneuver[], passed: number) {
  for (let i = passed; i < steps.length; i++) {
    const d = haversine(pos, steps[i].ll) * 1000;
    if (d > 25 || i === steps.length - 1) return { i, d, step: steps[i] };
  }
  return null;
}

export const fmtDist = (m: number) => {
  const en = currentLang() === 'en';
  if (m >= 1000) {
    const v = (m / 1000).toFixed(m >= 10000 ? 0 : 1);
    return en ? `${v} km` : `${v.replace('.', ',')} км`;
  }
  return `${Math.max(10, Math.round(m / 10) * 10)} ${en ? 'm' : 'м'}`;
};
