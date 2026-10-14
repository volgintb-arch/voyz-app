// Иконка из фирменного набора: линейная, 24 px, обводка 1.8 (docs/03_DESIGN_SYSTEM.md → «Иконки»).
import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

import { color as C } from '@/theme/tokens';

import { ICON_PATHS, type IconName } from './icon-paths';

export type { IconName };

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string; // заливка для «плотных» иконок (play, star)
}

export const Icon = memo(function Icon({ name, size = 20, color = C.black, strokeWidth = 1.8, fill = 'none' }: Props) {
  const xml = `<svg viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] ?? ICON_PATHS.dot}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
});
