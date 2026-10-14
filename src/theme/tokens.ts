// Дизайн-токены Voyz. Источник истины — design/tokens.json; при изменениях правим оба файла.
import { Easing } from 'react-native-reanimated';

export const color = {
  lime: '#D8FC00', // главный акцент: CTA, кружки иконок, активный таб
  limeSoft: '#F4FFC2', // кнопка play в аудиоплашке, мягкие заливки
  limeLine: '#EDF7BF', // тонкие обводки лаймовых карточек
  black: '#000000', // hero, тёмные секции, таб-бар, основной текст
  ink2: '#141414', // чёрные кнопки («Отправить»)
  olive: '#242A06', // карточка «Важно»
  paper: '#FFFFFF', // белый лист поверх чёрного hero
  mist: '#F1F1EF', // вторичные кнопки, чипсы, плитки
  line: '#E7E7E2', // разделители
  muted: '#8C8C88', // вторичный текст
  mutedOnDark: '#A9A9A4', // вторичный текст на чёрном
  mapLand: '#DEEAD2',
  mapLandOther: '#E9EEE2',
  mapWater: '#A9D2F3',
  mapRiver: '#8CC0EC',
  mapRoadMajor: '#F2BE5C',
  mapRoadMinor: '#FFFFFF',
  routeLine: '#000000',
  trailLine: '#3F7D00',
  parking: '#1A4DFF',
} as const;

// Имена начертаний совпадают с экспортами @expo-google-fonts/mulish (см. src/app/_layout.tsx).
export const fontFamily = {
  400: 'Mulish_400Regular',
  500: 'Mulish_500Medium',
  600: 'Mulish_600SemiBold',
  700: 'Mulish_700Bold',
  800: 'Mulish_800ExtraBold',
} as const;

type Weight = keyof typeof fontFamily;
const t = (size: number, weight: Weight, lineHeight?: number, upper = false) => ({
  fontSize: size,
  fontFamily: fontFamily[weight],
  ...(lineHeight ? { lineHeight: Math.round(size * lineHeight) } : null),
  ...(upper ? { textTransform: 'uppercase' as const } : null),
});

export const type = {
  heroTitle: t(28, 500, 1.05, true),
  sectionTitle: { ...t(24, 500, 1.1, true), textAlign: 'center' as const },
  screenTitle: t(34, 600, 1.02, true),
  cardTitle: t(20, 600, 1.1, true),
  body: t(15.5, 400, 1.5),
  label: t(16, 500),
  caption: t(13, 400, 1.35),
  micro: t(11.5, 600),
} as const;

export const radius = { hero: 0, sheet: 34, xl: 30, card: 22, media: 20, tile: 16, chip: 999, button: 999 } as const;

export const spacing = { screenGutter: 20, sectionGap: 34, cardGap: 12, chipGap: 9 } as const;

export const elevation = {
  tabbar: { shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  floating: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  fab: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
} as const;

export const motion = {
  easeStandard: Easing.bezier(0.2, 0.8, 0.2, 1),
  spring: { damping: 14, stiffness: 180 },
  push: 460,
  pop: 340,
  sharedElement: 480,
  sheet: 420,
  routeDraw: 1600,
  heartPop: 450,
  tabIndicator: 450,
  reducedCrossfade: 150, // при Reduce Motion: без параллакса и shared element, только кроссфейд
} as const;
