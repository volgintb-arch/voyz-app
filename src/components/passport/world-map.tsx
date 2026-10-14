// Карта мира «Где я был»: страны Natural Earth, посещённые — лаймом, точки мест Voyz поверх.
// Векторная SVG без тайлов: работает офлайн, тап по стране отмечает её, снимок для постера всегда чёткий.
import { memo } from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { LatLng } from '@/data/types';
import { LAT_TOP, WORLD, countryAt, countryPath, projector } from '@/geo/world';
import { color } from '@/theme/tokens';

/** Кадры континентов [запад, юг, восток, север] — для приближения на экране. */
export const REGIONS: Record<string, [number, number, number, number]> = {
  Европа: [-25, 34, 45, 71],
  Азия: [25, -11, 150, 78],
  Африка: [-20, -36, 53, 38],
  'Северная Америка': [-170, 6, -50, 84],
  'Южная Америка': [-83, -56, -33, 13],
  Океания: [110, -48, 180, 0],
};

interface Props {
  width: number;
  height: number;
  visited: Set<string>;
  points?: LatLng[];
  region?: string | null;
  dark?: boolean;
  onPressCountry?: (iso: string) => void;
}

// базовая ширина «полотна» мира в координатах SVG; кадр задаём через viewBox
const BASE = 1000;
const P = projector(BASE);

function viewBoxFor(region: string | null | undefined, width: number, height: number) {
  let x0 = 0;
  let y0 = 0;
  let w = BASE;
  let h = P.height;
  const r = region ? REGIONS[region] : null;
  if (r) {
    x0 = P.x(r[0]);
    y0 = P.y(r[3]);
    w = P.x(r[2]) - x0;
    h = P.y(r[1]) - y0;
  }
  // дотягиваем кадр до пропорций экрана, чтобы карта заполняла рамку без полей
  const want = width / height;
  if (w / h < want) {
    const nw = h * want;
    x0 -= (nw - w) / 2;
    w = nw;
  } else {
    const nh = w / want;
    y0 -= (nh - h) / 2;
    h = nh;
  }
  return { x0, y0, w, h, k: BASE / w };
}

export const WorldMap = memo(function WorldMap({ width, height, visited, points = [], region, dark, onPressCountry }: Props) {
  const vb = viewBoxFor(region, width, height);
  const px = vb.w / width; // сколько единиц viewBox в одном пикселе экрана — толщины не «пухнут» при приближении
  const sea = dark ? '#0b0d08' : '#EAF2F8';
  const land = dark ? '#23271c' : '#DCDDD6';
  const edge = dark ? '#3a4229' : '#FFFFFF';
  const svg = (
    <Svg width={width} height={height} viewBox={`${vb.x0} ${vb.y0} ${vb.w} ${vb.h}`}>
      <Rect x={vb.x0} y={vb.y0} width={vb.w} height={vb.h} fill={sea} />
      <G>
        {WORLD.map((c) => {
          const on = visited.has(c.iso);
          return (
            <Path
              key={c.iso}
              d={countryPath(c, BASE)}
              fill={on ? color.lime : land}
              stroke={on ? (dark ? '#9fbf00' : '#93ab00') : edge}
              strokeWidth={0.6 * px}
            />
          );
        })}
      </G>
      {points.map(([la, lo], i) => (
        <G key={i}>
          <Circle cx={P.x(lo)} cy={P.y(la)} r={5 * px} fill={dark ? 'rgba(216,252,0,.25)' : 'rgba(0,0,0,.12)'} />
          <Circle cx={P.x(lo)} cy={P.y(la)} r={2.4 * px} fill={dark ? color.lime : color.black} stroke={dark ? color.black : color.lime} strokeWidth={0.9 * px} />
        </G>
      ))}
    </Svg>
  );
  if (!onPressCountry) return svg;
  // один обработчик на всю карту: координаты тапа → долгота/широта → страна (мелкие острова — по ближайшей точке)
  return (
    <Pressable
      accessibilityRole="imagebutton"
      onPress={(e) => {
        // в вебе приходит обычный MouseEvent без locationX — считаем от рамки карты
        const ne = e.nativeEvent as { locationX?: number; locationY?: number; clientX?: number; clientY?: number };
        const box = (e.currentTarget as unknown as { getBoundingClientRect?: () => DOMRect }).getBoundingClientRect?.();
        const lx = ne.locationX ?? (box && ne.clientX != null ? ne.clientX - box.left : 0);
        const ly = ne.locationY ?? (box && ne.clientY != null ? ne.clientY - box.top : 0);
        const x = vb.x0 + lx * px;
        const y = vb.y0 + ly * px;
        const c = countryAt((x * 360) / BASE - 180, LAT_TOP - (y * 360) / BASE, 3 * px * (360 / BASE));
        if (c) onPressCountry(c.iso);
      }}
    >
      {svg}
    </Pressable>
  );
});
