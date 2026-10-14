// Веб-версия как приложение: ссылки на места, регистрация сервис-воркера, «Сохранить для офлайна».
import { Asset } from 'expo-asset';
import { Platform, Share } from 'react-native';

import { audioSources, photoSources } from '@/data/media.generated';
import { RELIEF_IMAGES } from '@/geo/relief.generated';

/** Публичный адрес веб-версии — ссылки, которыми делятся, открываются у всех в браузере. */
export const WEB_URL = 'https://volgintb-arch.github.io/voyz-app';
export const placeUrl = (id: string) => `${WEB_URL}/place/${id}`;

/** «Поделиться»: системное меню; в браузере без него — копируем в буфер. Возвращает 'shared' | 'copied' | 'failed'. */
export async function shareLink(title: string, text: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator;
      if (nav?.share) {
        await nav.share({ title, text, url });
        return 'shared';
      }
      await nav.clipboard.writeText(`${text}\n${url}`);
      return 'copied';
    }
    await Share.share({ title, message: `${text}\n${url}`, url });
    return 'shared';
  } catch {
    return 'failed';
  }
}

export function registerServiceWorker() {
  if (Platform.OS !== 'web' || __DEV__ || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/voyz-app/sw.js', { scope: '/voyz-app/' }).catch(() => {});
}

export const canSaveOffline = () => Platform.OS === 'web' && !__DEV__ && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

/** Скачать в кэш все фото, аудиогиды и рельеф (~45 МБ). onProgress(сделано, всего). */
export async function saveForOffline(onProgress: (done: number, total: number) => void): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const urls = [...Object.values(photoSources), ...Object.values(audioSources), ...Object.values(RELIEF_IMAGES)]
    .map((m) => Asset.fromModule(m as number).uri)
    .filter(Boolean);
  await new Promise<void>((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e: MessageEvent<{ done: number; total: number }>) => {
      onProgress(e.data.done, e.data.total);
      if (e.data.done >= e.data.total) resolve();
    };
    reg.active?.postMessage({ type: 'precache', urls }, [ch.port2]);
  });
}
