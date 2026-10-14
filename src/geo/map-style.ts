// Стиль офлайн-карты MapLibre из assets/data/geo.json, оформленный по tokens.color.map*.
// Один и тот же StyleSpecification используют нативная карта (MapLibre RN) и веб (maplibre-gl).
import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

import type { CountryCode, LatLng } from '@/data/types';
import { color } from '@/theme/tokens';

import { HOME_COUNTRY, geo } from './geo-data';

type FC = GeoJSON.FeatureCollection;

const cache = new Map<CountryCode, StyleSpecification>();

export function baseStyle(country: CountryCode): StyleSpecification {
  const hit = cache.get(country);
  if (hit) return hit;
  const home = HOME_COUNTRY[country];
  const countries: FC = {
    type: 'FeatureCollection',
    features: geo.countries.map((c) => ({ type: 'Feature', properties: { home: c.n === home }, geometry: { type: 'Polygon', coordinates: c.r } })),
  };
  const lakes: FC = { type: 'FeatureCollection', features: geo.lakes.map((rings) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings } })) };
  const rivers: FC = { type: 'FeatureCollection', features: geo.rivers.map((c) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } })) };
  const roads: FC = { type: 'FeatureCollection', features: geo.roads.map((r) => ({ type: 'Feature', properties: { major: r.m === 1 }, geometry: { type: 'LineString', coordinates: r.c } })) };

  const style: StyleSpecification = {
    version: 8,
    name: `voyz-${country}`,
    sources: {
      countries: { type: 'geojson', data: countries },
      lakes: { type: 'geojson', data: lakes },
      rivers: { type: 'geojson', data: rivers },
      roads: { type: 'geojson', data: roads },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#EEF1EA' } },
      { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': ['case', ['get', 'home'], color.mapLand, color.mapLandOther] } },
      { id: 'border', type: 'line', source: 'countries', paint: { 'line-color': '#b9c4ab', 'line-width': 1, 'line-dasharray': [4, 4] } },
      { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': color.mapWater, 'fill-outline-color': '#7FB6E6' } },
      { id: 'rivers', type: 'line', source: 'rivers', paint: { 'line-color': color.mapRiver, 'line-width': 1.3 } },
      { id: 'roads-minor', type: 'line', source: 'roads', filter: ['!', ['get', 'major']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color.mapRoadMinor, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.2, 10, 3] } },
      { id: 'roads-major', type: 'line', source: 'roads', filter: ['get', 'major'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color.mapRoadMajor, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 4.5] } },
    ],
  };
  cache.set(country, style);
  return style;
}

// ---------- динамический слой: линии маршрутов ----------
export type LineKind = 'road' | 'approach' | 'trail' | 'approx';
export interface MapLine {
  id: string;
  kind: LineKind;
  coords: LatLng[]; // [lat, lon]
}

export const OVERLAY_SOURCE = 'overlay';

/** Слои линий: белая обводка 8 px + чёрная 4 px по трассе, пунктир 7/7 — подъезд, точки — тропа. */
export const OVERLAY_LAYERS: LayerSpecification[] = [
  {
    id: 'ov-casing',
    type: 'line',
    source: OVERLAY_SOURCE,
    filter: ['in', ['get', 'kind'], ['literal', ['road', 'approx']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#FFFFFF', 'line-width': 8, 'line-opacity': 0.9 },
  },
  {
    id: 'ov-road',
    type: 'line',
    source: OVERLAY_SOURCE,
    filter: ['==', ['get', 'kind'], 'road'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color.routeLine, 'line-width': 4 },
  },
  {
    id: 'ov-dashed',
    type: 'line',
    source: OVERLAY_SOURCE,
    filter: ['in', ['get', 'kind'], ['literal', ['approach', 'approx']]],
    paint: { 'line-color': color.routeLine, 'line-width': 3, 'line-dasharray': [2.3, 2.3] },
  },
  {
    id: 'ov-trail',
    type: 'line',
    source: OVERLAY_SOURCE,
    filter: ['==', ['get', 'kind'], 'trail'],
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': color.trailLine, 'line-width': 4, 'line-dasharray': [0.1, 1.8] },
  },
];

export function overlayData(lines: MapLine[]): FC {
  return {
    type: 'FeatureCollection',
    features: lines
      .filter((l) => l.coords.length > 1)
      .map((l) => ({ type: 'Feature', properties: { kind: l.kind, id: l.id }, geometry: { type: 'LineString', coordinates: l.coords.map(([la, lo]) => [lo, la]) } })),
  };
}

/** Отмывка рельефа: мягкие тени склонов в оливковой гамме Voyz, не спорят с дорогами и маркерами. */
export const HILLSHADE_PAINT = {
  'hillshade-exaggeration': 0.5,
  'hillshade-shadow-color': '#3b4a2f',
  'hillshade-highlight-color': '#ffffff',
  'hillshade-accent-color': '#55663f',
} as const;

/** Границы набора точек [lat, lon] → [west, south, east, north]. */
export function boundsOf(points: LatLng[]): [number, number, number, number] | null {
  if (!points.length) return null;
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [la, lo] of points) {
    w = Math.min(w, lo);
    e = Math.max(e, lo);
    s = Math.min(s, la);
    n = Math.max(n, la);
  }
  // одна точка — расширяем рамку, чтобы не улететь в максимальный зум
  if (e - w < 0.02 && n - s < 0.02) return [w - 0.15, s - 0.1, e + 0.15, n + 0.1];
  return [w, s, e, n];
}

export const COUNTRY_VIEW: Record<CountryCode, { center: LatLng; zoom: number }> = {
  kg: { center: [41.6, 74.6], zoom: 5.6 },
  alt: { center: [51.0, 86.6], zoom: 5.6 },
};

/** Прорисовка линии: обрезаем ломаную по доле длины t ∈ [0, 1]. */
export function sliceLine(coords: LatLng[], t: number): LatLng[] {
  if (t >= 1 || coords.length < 2) return coords;
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let left = total * Math.max(0, t);
  const out: LatLng[] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    if (left >= seg[i - 1]) {
      out.push(coords[i]);
      left -= seg[i - 1];
      continue;
    }
    const k = seg[i - 1] ? left / seg[i - 1] : 0;
    out.push([coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * k, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * k]);
    break;
  }
  return out;
}
