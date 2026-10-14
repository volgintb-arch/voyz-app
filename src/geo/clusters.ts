// Группировка мест на мелком масштабе (supercluster): вместо 83 слипшихся фото — кружки с числом,
// которые распадаются на мини-фото при приближении. Считаем в JS, потому что маркеры — RN-вью.
import { useMemo } from 'react';
import Supercluster from 'supercluster';

import type { LatLng, Place } from '@/data/types';

export type ClusterItem =
  | { kind: 'place'; id: string; ll: LatLng; place: Place }
  | { kind: 'cluster'; id: string; ll: LatLng; count: number; expansionZoom: number; cover: Place };

export function useClusters(places: Place[], zoom: number, keepId?: string | null): ClusterItem[] {
  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string }>({ radius: 58, maxZoom: 11, minPoints: 2 });
    sc.load(places.filter((p) => p.ll).map((p) => ({ type: 'Feature', properties: { id: p.id }, geometry: { type: 'Point', coordinates: [p.ll![1], p.ll![0]] } })));
    return sc;
  }, [places]);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  return useMemo(() => {
    const z = Math.floor(zoom);
    const out: ClusterItem[] = [];
    for (const f of index.getClusters([-180, -85, 180, 85], z)) {
      const [lo, la] = f.geometry.coordinates;
      const props = f.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; id?: string };
      if (props.cluster) {
        const leaves = index.getLeaves(props.cluster_id!, Infinity).map((l) => byId.get(l.properties.id)!);
        // выбранное место не прячем в кружок — показываем отдельно
        if (keepId && leaves.some((p) => p.id === keepId)) {
          const sel = byId.get(keepId)!;
          out.push({ kind: 'place', id: sel.id, ll: sel.ll!, place: sel });
        }
        // обложка кружка — самое изученное место группы с фото
        const cover = leaves.filter((p) => p.photos.length).sort((a, b) => (b.idx || 0) - (a.idx || 0))[0] ?? leaves[0];
        out.push({ kind: 'cluster', id: `c${props.cluster_id}`, ll: [la, lo], count: props.point_count!, expansionZoom: Math.min(index.getClusterExpansionZoom(props.cluster_id!), 13), cover });
      } else {
        const p = byId.get(props.id!)!;
        out.push({ kind: 'place', id: p.id, ll: p.ll!, place: p });
      }
    }
    return out;
  }, [index, byId, zoom, keepId]);
}
