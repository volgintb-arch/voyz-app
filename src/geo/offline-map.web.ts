// Подробная карта без сети в вебе: сервис-воркер скачивает в отдельный кэш тайлы OpenFreeMap
// (обзор страны + подробно вокруг мест), шрифты подписей (латиница и кириллица) и значки стиля.
import type { CountryCode } from '@/data/types';

import { ONLINE } from './online';
import { shadedReliefList, tileList } from './offline-tiles';

const FONTS = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'];
// латиница, расширенная латиница, кириллица, пунктуация
const GLYPH_RANGES = ['0-255', '256-511', '1024-1279', '8192-8447'];

export async function downloadDetailedMap(c: CountryCode, onProgress: (pct: number) => void): Promise<void> {
  const style = await (await fetch(ONLINE.vectorStyle)).json();
  const tilejsonUrl: string = style.sources.openmaptiles.url;
  const tilejson = await (await fetch(tilejsonUrl)).json();
  const tpl: string = tilejson.tiles[0];
  const sprite: string = typeof style.sprite === 'string' ? style.sprite : style.sprite?.[0]?.url;
  const glyphs: string = style.glyphs;
  const shaded: string | undefined = style.sources.ne2_shaded?.tiles?.[0];

  const urls = [
    ONLINE.vectorStyle,
    tilejsonUrl,
    ...['.json', '.png', '@2x.json', '@2x.png'].map((s) => sprite + s),
    ...FONTS.flatMap((f) => GLYPH_RANGES.map((r) => glyphs.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', r))),
    ...tileList(c).map((zxy) => tpl.replace('{z}/{x}/{y}', zxy)),
    ...(shaded ? shadedReliefList(c).map((zxy) => shaded.replace('{z}/{x}/{y}', zxy)) : []),
  ];

  const reg = await navigator.serviceWorker.ready;
  await new Promise<void>((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e: MessageEvent<{ done: number; total: number }>) => {
      onProgress(Math.round((e.data.done / e.data.total) * 100));
      if (e.data.done >= e.data.total) resolve();
    };
    reg.active?.postMessage({ type: 'precache', cache: 'voyz-tiles', urls }, [ch.port2]);
  });
}

export const supportsDetailedOffline = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !__DEV__;
