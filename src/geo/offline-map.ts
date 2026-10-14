// Подробная карта без сети на телефоне: штатные офлайн-пакеты MapLibre для стиля «Подробная».
// Один пакет — обзор страны (z5–12), и маленькие пакеты вокруг каждого места (z13–14).
import { OfflineManager } from '@maplibre/maplibre-react-native';

import type { CountryCode } from '@/data/types';

import { ONLINE } from './online';
import { countryBounds, placePoints } from './offline-tiles';

export async function downloadDetailedMap(c: CountryCode, onProgress: (pct: number) => void): Promise<void> {
  const jobs: { name: string; bounds: [number, number, number, number]; minZoom: number; maxZoom: number }[] = [
    { name: `voyz-${c}-overview`, bounds: countryBounds(c), minZoom: 5, maxZoom: 12 },
    ...placePoints(c).map(([la, lo], i) => ({ name: `voyz-${c}-p${i}`, bounds: [lo - 0.06, la - 0.06, lo + 0.06, la + 0.06] as [number, number, number, number], minZoom: 13, maxZoom: 14 })),
  ];
  const have = new Set((await OfflineManager.getPacks()).map((p) => (p.metadata as { name?: string } | undefined)?.name));
  let done = 0;
  for (const j of jobs) {
    if (!have.has(j.name)) {
      await new Promise<void>((resolve, reject) => {
        OfflineManager.createPack(
          { mapStyle: ONLINE.vectorStyle, bounds: j.bounds, minZoom: j.minZoom, maxZoom: j.maxZoom, metadata: { name: j.name } },
          (_pack, status) => {
            onProgress(Math.round(((done + status.percentage / 100) / jobs.length) * 100));
            if (status.state === 'complete') resolve();
          },
          (_pack, err) => reject(new Error(err.message)),
        ).catch(reject);
      });
    }
    done++;
    onProgress(Math.round((done / jobs.length) * 100));
  }
}

export const supportsDetailedOffline = () => true;
