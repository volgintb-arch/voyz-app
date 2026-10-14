// Веб-версия карты (превью и проверка): maplibre-gl с теми же стилями и слоями, что и на телефоне.
// Здесь работает и объёмный рельеф (setTerrain).
import maplibregl, { type GeoJSONSource, type LayerSpecification, type Map as MlMap, type Marker as MlMarker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, StyleSheet, View } from 'react-native';

import { COUNTRY_VIEW, HILLSHADE_PAINT, OVERLAY_LAYERS, OVERLAY_SOURCE, baseStyle, boundsOf, overlayData } from '@/geo/map-style';
import { ONLINE } from '@/geo/online';

import type { MapCamera, VoyzMapProps, VoyzMapRef } from './types';

const ll2 = ([la, lo]: [number, number]): [number, number] => [lo, la];

export const VoyzMap = forwardRef<VoyzMapRef, VoyzMapProps>(function VoyzMap(
  { country, lines = [], points = [], fit, padding, maxZoom = 12, interactive = true, mode = 'scheme', relief, terrain3d, onPointPress, onCamera, onMapPress, style },
  ref,
) {
  const box = useRef<View>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(0); // счётчик загрузок стиля — после смены стиля слои добавляем заново
  const markers = useRef(new globalThis.Map<string, { m: MlMarker; el: HTMLDivElement }>());
  const [els, setEls] = useState<{ id: string; el: HTMLDivElement }[]>([]);
  const pad = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
  // карта, у которой уже было событие load (флаг ready мог остаться от прошлой карты при смене режима)
  const loaded = useRef<MlMap | null>(null);
  // камера сохраняется между пересозданиями карты (смена режима «схема ↔ подробная»)
  const lastCam = useRef<{ country: string; center: [number, number]; zoom: number } | null>(null);
  const cb = useRef({ onCamera, onMapPress, onPointPress });
  useEffect(() => {
    cb.current = { onCamera, onMapPress, onPointPress };
  });

  // создание карты (пересоздаём при смене страны или режима — другой стиль)
  useEffect(() => {
    // свой div с инлайн-размерами: maplibre вешает на контейнер position:relative,
    // и абсолютное позиционирование react-native-web от этого схлопывается в 0 по высоте
    const host = box.current as unknown as HTMLElement;
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    host.prepend(container);
    const keep = lastCam.current?.country === country ? lastCam.current : null;
    const b = !keep && fit ? boundsOf(fit) : null;
    const cv = COUNTRY_VIEW[country];
    const m = new maplibregl.Map({
      container,
      style: (mode === 'detail' ? ONLINE.vectorStyle : baseStyle(country)) as string | maplibregl.StyleSpecification,
      attributionControl: mode === 'detail' ? { compact: true } : false,
      interactive,
      maxZoom: 17,
      minZoom: 4,
      ...(keep ? { center: keep.center, zoom: keep.zoom } : b ? { bounds: b, fitBoundsOptions: { padding: pad, maxZoom } } : { center: ll2(cv.center), zoom: cv.zoom }),
    });
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(host);
    m.on('load', () => {
      // при создании контейнер мог ещё не знать высоту — пересчитываем размер и кадр
      m.resize();
      if (b) m.fitBounds(b, { padding: pad, maxZoom, animate: false });
      m.addSource(OVERLAY_SOURCE, { type: 'geojson', data: overlayData([]) });
      for (const l of OVERLAY_LAYERS) m.addLayer(l as LayerSpecification);
      loaded.current = m;
      setReady((r) => r + 1);
    });
    const emit = () => {
      const c = m.getCenter();
      lastCam.current = { country, center: [c.lng, c.lat], zoom: m.getZoom() };
      const v: MapCamera = { zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch(), center: [c.lat, c.lng] };
      cb.current.onCamera?.(v);
    };
    m.on('moveend', emit);
    m.on('click', (e) => {
      if ((e.originalEvent.target as HTMLElement)?.closest?.('.voyz-marker')) return;
      cb.current.onMapPress?.();
    });
    map.current = m;
    const cur = markers.current;
    return () => {
      cur.forEach(({ m: mk }) => mk.remove());
      cur.clear();
      setEls([]);
      setReady(0);
      ro.disconnect();
      m.remove();
      container.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, interactive, mode]);

  // линии
  useEffect(() => {
    // флаг ready мог остаться от прошлой карты (смена режима) — проверяем сам стиль
    if (!ready || loaded.current !== map.current) return;
    (map.current?.getSource(OVERLAY_SOURCE) as GeoJSONSource | undefined)?.setData(overlayData(lines));
  }, [ready, lines]);

  // рельеф: отмывка и объём
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || loaded.current !== m) return;
    const need = relief || terrain3d;
    if (need && !m.getSource('dem')) {
      m.addSource('dem', { type: 'raster-dem', tiles: ONLINE.terrainTiles, encoding: ONLINE.terrainEncoding, tileSize: 256, maxzoom: ONLINE.terrainMaxZoom });
      // в схеме — под озёра; в онлайн-стиле — под первый слой подписей
      const before = mode === 'scheme' ? 'lakes' : m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      m.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem', paint: HILLSHADE_PAINT } as LayerSpecification, before);
    }
    if (m.getLayer('hillshade')) m.setLayoutProperty('hillshade', 'visibility', relief ? 'visible' : 'none');
    if (terrain3d) {
      m.setTerrain({ source: 'dem', exaggeration: 1.4 });
      m.easeTo({ pitch: 58, duration: 600 });
    } else if (m.getTerrain()) {
      m.setTerrain(null);
      m.easeTo({ pitch: 0, duration: 400 });
    }
  }, [ready, relief, terrain3d, mode]);

  // маркеры: DOM-элементы maplibre, содержимое — React-порталы
  const pointsKey = points.map((p) => `${p.id}@${p.ll[0]},${p.ll[1]}`).join('|');
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || loaded.current !== m) return;
    const want = new Set(points.map((p) => p.id));
    markers.current.forEach((v, id) => {
      if (!want.has(id)) {
        v.m.remove();
        markers.current.delete(id);
      }
    });
    for (const p of points) {
      const have = markers.current.get(p.id);
      if (have) {
        have.m.setLngLat(ll2(p.ll));
        continue;
      }
      const el = document.createElement('div');
      el.className = 'voyz-marker';
      const mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(ll2(p.ll)).addTo(m);
      markers.current.set(p.id, { m: mk, el });
    }
    setEls([...markers.current].map(([id, v]) => ({ id, el: v.el })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pointsKey]);

  useImperativeHandle(ref, () => ({
    fitTo: (pts, o) => {
      const b = boundsOf(pts);
      if (b) map.current?.fitBounds(b, { padding: { ...pad, ...o?.padding }, animate: o?.animate !== false, duration: 800, maxZoom: o?.maxZoom ?? maxZoom });
    },
    flyTo: (ll, zoom) => map.current?.flyTo({ center: ll2(ll), zoom: zoom ?? map.current.getZoom(), duration: 600 }),
    zoomBy: (d) => (d > 0 ? map.current?.zoomIn({ duration: 250 }) : map.current?.zoomOut({ duration: 250 })),
    resetNorth: () => map.current?.easeTo({ bearing: 0, pitch: terrain3d ? 58 : 0, duration: 300 }),
    follow: (ll, bearing) => map.current?.easeTo({ center: ll2(ll), zoom: Math.max(map.current.getZoom(), 15), bearing: bearing ?? map.current.getBearing(), pitch: 50, duration: 900 }),
  }));

  const byId = new globalThis.Map(points.map((p) => [p.id, p]));
  return (
    <View ref={box} style={[styles.wrap, style]}>
      {els.map(({ id, el }) => {
        const p = byId.get(id);
        if (!p) return null;
        el.style.zIndex = String(p.z ?? 0);
        return createPortal(
          <Pressable key={id} onPress={() => cb.current.onPointPress?.(id)} disabled={p.pressable === false}>
            {p.render()}
          </Pressable>,
          el,
          id,
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({ wrap: { overflow: 'hidden', backgroundColor: '#EEF1EA' } });
