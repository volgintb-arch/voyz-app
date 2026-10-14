// Сгенерировано tools/build-relief.mjs — не редактировать вручную.
import type { CountryCode } from '@/data/types';

/** Углы картинки рельефа: [lon, lat] — левый верхний, правый верхний, правый нижний, левый нижний. */
export const RELIEF_COORDS: Record<CountryCode, [number, number][]> = {"kg":[[67.5,44.08758502824516],[81.5625,44.08758502824516],[81.5625,37.718590325588146],[67.5,37.718590325588146]],"alt":[[82.96875,53.33087298301705],[91.40625,53.33087298301705],[91.40625,47.98992166741418],[82.96875,47.98992166741418]]};

export const RELIEF_IMAGES: Record<CountryCode, number> = {
  kg: require('../../assets/relief/kg.png'),
  alt: require('../../assets/relief/alt.png'),
};
