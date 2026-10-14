// Deep links во внешние навигаторы и звонки (шаг 7 плана). Точка — парковка, начало тропы или само место.
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import type { LatLng } from '@/data/types';

export interface Navigator {
  id: 'yandex' | 'dgis' | 'google' | 'other';
  name: string;
  badge: string;
  bg: string;
  fg: string;
}

export const NAVIGATORS: Navigator[] = [
  { id: 'yandex', name: 'Яндекс Карты', badge: 'Я', bg: '#FC3F1D', fg: '#fff' },
  { id: 'dgis', name: '2ГИС', badge: '2', bg: '#19AA1E', fg: '#fff' },
  { id: 'google', name: 'Google Maps', badge: 'G', bg: '#4285F4', fg: '#fff' },
  { id: 'other', name: 'Другое приложение', badge: '◎', bg: '#000', fg: '#D8FC00' },
];

/** Сначала пробуем приложение (если установлено), иначе — веб-версию, она сама предложит открыть приложение. */
export async function openNavigator(id: Navigator['id'], [lat, lon]: LatLng, name: string) {
  const urls: Record<Navigator['id'], string[]> = {
    yandex: [`yandexmaps://maps.yandex.ru/?rtext=~${lat},${lon}&rtt=auto`, `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`],
    dgis: [`dgis://2gis.ru/routeSearch/rsType/car/to/${lon},${lat}`, `https://2gis.ru/routeSearch/rsType/car/to/${lon},${lat}`],
    google: [
      Platform.OS === 'ios' ? `comgooglemaps://?daddr=${lat},${lon}&directionsmode=driving` : `google.navigation:q=${lat},${lon}`,
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    ],
    // «Другое приложение»: на Android — системный выбор (geo:), на iOS — Apple Карты
    other: [Platform.OS === 'ios' ? `maps://?daddr=${lat},${lon}&q=${encodeURIComponent(name)}` : `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(name)})`, `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`],
  };
  for (const u of urls[id]) {
    try {
      if (Platform.OS === 'web' && !u.startsWith('http')) continue;
      await Linking.openURL(u);
      return true;
    } catch {
      // приложения нет — пробуем следующий вариант
    }
  }
  return false;
}
