// Ширина приложения. На телефоне — экран целиком; в вебе на широком мониторе приложение — колонка
// ширины телефона по центру (иначе карточки и карты растягиваются на 1920 px).
import { Platform, useWindowDimensions } from 'react-native';

export const APP_MAX_W = 480;

export function useAppSize() {
  const { width, height } = useWindowDimensions();
  return { width: Platform.OS === 'web' ? Math.min(width, APP_MAX_W) : width, height };
}
