import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { CountryCode, LatLng } from '@/data/types';
import type { MapLine } from '@/geo/map-style';

export interface MapPoint {
  id: string;
  ll: LatLng;
  /** Сам маркер — обычный RN-компонент (фото, подписи — без офлайн-глифов). */
  render: () => ReactElement;
  z?: number; // выше — поверх остальных
  pressable?: boolean;
}

export interface MapPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** scheme — встроенная офлайн-схема; detail — подробная онлайн-карта (OpenFreeMap). */
export type MapMode = 'scheme' | 'detail';

export interface MapCamera {
  zoom: number;
  bearing: number;
  pitch: number;
  center: LatLng;
}

export interface VoyzMapProps {
  country: CountryCode;
  lines?: MapLine[];
  points?: MapPoint[];
  /** Начальный кадр: границы этих точек (иначе — вся страна). */
  fit?: LatLng[];
  padding?: MapPadding;
  maxZoom?: number;
  interactive?: boolean;
  mode?: MapMode;
  relief?: boolean; // отмывка рельефа (онлайн-тайлы высот)
  terrain3d?: boolean; // объёмный рельеф с наклоном (веб; на телефоне — наклон камеры)
  showUser?: boolean; // системная точка «я» (на телефоне)
  onPointPress?: (id: string) => void;
  onCamera?: (c: MapCamera) => void;
  onMapPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface VoyzMapRef {
  fitTo: (points: LatLng[], opts?: { padding?: MapPadding; animate?: boolean; maxZoom?: number }) => void;
  flyTo: (ll: LatLng, zoom?: number) => void;
  zoomBy: (delta: number) => void;
  resetNorth: () => void;
  /** Ведение по маршруту: камера над вами, по направлению движения, с наклоном. */
  follow: (ll: LatLng, bearing?: number) => void;
}
