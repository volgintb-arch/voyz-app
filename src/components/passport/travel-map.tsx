// Векторная карта путешествий для постера: силуэт страны из geo.json, озёра, посещённые места — лаймом,
// остальные — едва заметными точками. Без тайлов: снимок всегда чёткий и делается без сети.
import { useMemo } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { placesOf } from '@/data/places';
import type { CountryCode } from '@/data/types';
import { HOME_COUNTRY, geo } from '@/geo/geo-data';
import { color } from '@/theme/tokens';

interface Props {
  country: CountryCode;
  visited: Set<string>;
  width: number;
  height: number;
  dark?: boolean;
}

export function TravelMap({ country, visited, width, height, dark = true }: Props) {
  const { land, lakes, dots } = useMemo(() => {
    const L = placesOf(country).filter((p) => p.ll);
    // кадр — по местам страны с запасом; полигоны за рамкой обрежет сам SVG
    let s = Infinity;
    let n = -Infinity;
    let w = Infinity;
    let e = -Infinity;
    for (const p of L) {
      s = Math.min(s, p.ll![0]);
      n = Math.max(n, p.ll![0]);
      w = Math.min(w, p.ll![1]);
      e = Math.max(e, p.ll![1]);
    }
    const k = Math.cos((((s + n) / 2) * Math.PI) / 180); // равнопромежуточная проекция с поправкой на широту
    const padX = (e - w) * 0.12 + 0.3;
    const padY = (n - s) * 0.12 + 0.3;
    w -= padX;
    e += padX;
    s -= padY;
    n += padY;
    const scale = Math.min(width / ((e - w) * k), height / (n - s));
    const ox = (width - (e - w) * k * scale) / 2;
    const oy = (height - (n - s) * scale) / 2;
    const X = (lo: number) => ox + (lo - w) * k * scale;
    const Y = (la: number) => oy + (n - la) * scale;
    const ring = (r: [number, number][]) => r.map(([lo, la], i) => `${i ? 'L' : 'M'}${X(lo).toFixed(1)},${Y(la).toFixed(1)}`).join('') + 'Z';
    const home = HOME_COUNTRY[country];
    return {
      land: geo.countries.map((c) => ({ home: c.n === home, d: c.r.map(ring).join('') })),
      lakes: geo.lakes.map((rings) => rings.map(ring).join('')),
      dots: L.map((p) => ({ id: p.id, x: X(p.ll![1]), y: Y(p.ll![0]) })),
    };
  }, [country, width, height]);

  const homeFill = dark ? '#2a3319' : color.mapLand;
  const otherFill = dark ? '#121410' : color.mapLandOther;
  return (
    <Svg width={width} height={height}>
      <G>
        {land.map((c, i) => (
          <Path key={i} d={c.d} fill={c.home ? homeFill : otherFill} stroke={dark ? (c.home ? '#7d8f4e' : '#3a4229') : '#b9c4ab'} strokeWidth={c.home ? 1.4 : 0.6} />
        ))}
        {lakes.map((d, i) => (
          <Path key={`l${i}`} d={d} fill={dark ? '#24344a' : color.mapWater} />
        ))}
      </G>
      {dots
        .filter((d) => !visited.has(d.id))
        .map((d) => (
          <Circle key={d.id} cx={d.x} cy={d.y} r={2.2} fill={dark ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.22)'} />
        ))}
      {dots
        .filter((d) => visited.has(d.id))
        .map((d) => (
          <G key={d.id}>
            <Circle cx={d.x} cy={d.y} r={9} fill="rgba(216,252,0,.25)" />
            <Circle cx={d.x} cy={d.y} r={5} fill={color.lime} stroke={color.black} strokeWidth={1.6} />
          </G>
        ))}
    </Svg>
  );
}
