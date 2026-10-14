// Офлайн-маршрутизация по графу дорог Natural Earth (assets/data/geo.json).
// Порт reference/prototype_src/app.js → nearestNode / roadRoute: Дейкстра на двоичной куче.
import { haversine } from '@/lib/text';
import type { LatLng } from '@/data/types';

import { geo } from './geo-data';

interface Graph {
  n: [number, number][]; // узлы [lon, lat]
  adj: [number, number][][]; // соседи [узел, км]
}

let graph: Graph | null = null;
function getGraph(): Graph {
  if (graph) return graph;
  const { n, e } = geo.graph;
  const adj: [number, number][][] = n.map(() => []);
  for (const [i, j, w] of e) {
    adj[i].push([j, w]);
    adj[j].push([i, w]);
  }
  return (graph = { n, adj });
}

/** Ближайший к точке узел графа, у которого есть рёбра. Возвращает [индекс, км до него]. */
export function nearestNode(ll: LatLng): [number, number] {
  const G = getGraph();
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < G.n.length; i++) {
    if (!G.adj[i].length) continue;
    const d = haversine(ll, [G.n[i][1], G.n[i][0]]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return [best, bd];
}

export interface RoadRoute {
  km: number;
  line: LatLng[];
  approx: boolean; // true — граф не помог, линия по прямой и км — оценка
}

/** Маршрут по дорогам между двумя точками [lat, lon]. */
export function roadRoute(a: LatLng, b: LatLng): RoadRoute {
  const G = getGraph();
  const [s, ds] = nearestNode(a);
  const [t, dt] = nearestNode(b);
  const direct = haversine(a, b);
  if (ds > 40 || dt > 40 || direct < 4) return { km: direct * 1.25, line: [a, b], approx: true };

  const dist = new Float64Array(G.n.length).fill(Infinity);
  const prev = new Int32Array(G.n.length).fill(-1);
  dist[s] = 0;
  const heap: [number, number][] = [[0, s]];
  const push = (x: [number, number]) => {
    heap.push(x);
    let i = heap.length - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  while (heap.length) {
    const [d, u] = pop();
    if (u === t) break;
    if (d > dist[u]) continue;
    for (const [v, w] of G.adj[u]) {
      const nd = d + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        push([nd, v]);
      }
    }
  }

  if (!isFinite(dist[t]) || dist[t] > direct * 4 + 50) return { km: direct * 1.3, line: [a, b], approx: true };
  const path: LatLng[] = [];
  for (let u = t; u !== -1; u = prev[u]) path.push([G.n[u][1], G.n[u][0]]);
  path.reverse();
  return { km: dist[t] + ds * 1.2 + dt * 1.2, line: [a, ...path, b], approx: false };
}

export const AVG_SPEED_KMH = 52;
