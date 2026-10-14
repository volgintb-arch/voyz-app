// Логотип VOYZ — пути взяты из reference/prototype_src/app.js → WM.
import Svg, { Path } from 'react-native-svg';

import { color } from '@/theme/tokens';

const RATIO = 86 / 645;

export function VoyzLogo({ width = 96, fill = color.paper }: { width?: number; fill?: string }) {
  return (
    <Svg width={width} height={width * RATIO} viewBox="0 0 645 86" accessibilityRole="image" accessibilityLabel="VOYZ">
      <Path fill={fill} d="M3 4h46l40 50 40-50h47l-68 80H70z" />
      <Path fill={fill} d="M206 2h78a40 40 0 010 80h-78a40 40 0 010-80zm6 27a8 8 0 000 16h66a8 8 0 000-16z" />
      <Path fill={fill} d="M325 4h51l23 30 23-30h51l-56 50v30h-37V54z" />
      <Path fill={fill} d="M490 4h150v26l-72 26h72v28H490V58l72-28h-72z" />
    </Svg>
  );
}
