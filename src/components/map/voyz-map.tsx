// Карта на iOS/Android: MapLibre RN 11. Схема — офлайн-стиль из geo.json; подробная — OpenFreeMap (онлайн);
// рельеф — отмывка по тайлам высот; линии — GeoJSON-слой; маркеры — RN-вью (фото, подписи).
import { Camera, GeoJSONSource, Layer, Map, Marker, NativeUserLocation, RasterDEMSource, type CameraRef, type LayerProps } from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { COUNTRY_VIEW, HILLSHADE_PAINT, OVERLAY_LAYERS, OVERLAY_SOURCE, baseStyle, boundsOf, overlayData } from '@/geo/map-style';
import { ONLINE } from '@/geo/online';

import type { MapCamera, VoyzMapProps, VoyzMapRef } from './types';

const ll2 = ([la, lo]: [number, number]): [number, number] => [lo, la];

export const VoyzMap = forwardRef<VoyzMapRef, VoyzMapProps>(function VoyzMap(
  { country, lines = [], points = [], fit, padding, maxZoom = 12, interactive = true, mode = 'scheme', relief, terrain3d, showUser, onPointPress, onCamera, onMapPress, style },
  ref,
) {
  const cam = useRef<CameraRef>(null);
  const view = useRef<MapCamera>({ zoom: 6, bearing: 0, pitch: 0, center: COUNTRY_VIEW[country].center });
  const mapStyle = mode === 'detail' ? ONLINE.vectorStyle : baseStyle(country);
  const data = useMemo(() => overlayData(lines), [lines]);
  const initBounds = fit && boundsOf(fit);
  const cv = COUNTRY_VIEW[country];

  useImperativeHandle(ref, () => ({
    fitTo: (pts, o) => {
      const b = boundsOf(pts);
      if (b) cam.current?.fitBounds(b, { padding: o?.padding ?? padding, duration: o?.animate === false ? 0 : 800 });
    },
    flyTo: (ll, zoom) => cam.current?.flyTo({ center: ll2(ll), zoom: zoom ?? view.current.zoom, duration: 600 }),
    zoomBy: (d) => cam.current?.easeTo({ center: ll2(view.current.center), zoom: view.current.zoom + d, duration: 250 }),
    resetNorth: () => cam.current?.easeTo({ center: ll2(view.current.center), bearing: 0, pitch: terrain3d ? 55 : 0, duration: 300 }),
    follow: (ll, bearing) => cam.current?.easeTo({ center: ll2(ll), zoom: Math.max(view.current.zoom, 15), bearing: bearing ?? view.current.bearing, pitch: 50, duration: 900 }),
  }));

  return (
    <View style={[styles.wrap, style]} pointerEvents={interactive ? 'auto' : 'none'}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        attribution={mode === 'detail'}
        logo={false}
        compass={false}
        scaleBar={false}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={interactive}
        touchPitch={interactive}
        onPress={onMapPress}
        onRegionDidChange={(e) => {
          const v = e.nativeEvent;
          view.current = { zoom: v.zoom, bearing: v.bearing, pitch: v.pitch, center: [v.center[1], v.center[0]] };
          onCamera?.(view.current);
        }}>
        <Camera
          ref={cam}
          maxZoom={Math.max(maxZoom, 17)}
          minZoom={4}
          initialViewState={initBounds ? { bounds: initBounds, padding } : { center: ll2(cv.center), zoom: cv.zoom }}
        />
        {relief ? (
          <RasterDEMSource id="dem" tiles={ONLINE.terrainTiles} encoding={ONLINE.terrainEncoding} tileSize={256} maxzoom={ONLINE.terrainMaxZoom}>
            {/* в схеме отмывка ложится под озёра и дороги; в онлайн-стиле id слоёв чужие — кладём поверх с прозрачностью */}
            <Layer id="hillshade" type="hillshade" beforeId={mode === 'scheme' ? 'lakes' : undefined} paint={HILLSHADE_PAINT} />
          </RasterDEMSource>
        ) : null}
        <GeoJSONSource id={OVERLAY_SOURCE} data={data}>
          {OVERLAY_LAYERS.map((spec) => {
            // слой уже внутри GeoJSONSource — поле source не передаём
            const { source: _s, ...l } = spec as typeof spec & { source?: string };
            return <Layer key={l.id} {...(l as LayerProps)} />;
          })}
        </GeoJSONSource>
        {showUser ? <NativeUserLocation mode="course" /> : null}
        {[...points]
          .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
          .map((p) => (
            <Marker key={p.id} id={p.id} lngLat={ll2(p.ll)} anchor="center" onPress={p.pressable === false ? undefined : () => onPointPress?.(p.id)}>
              {p.render()}
            </Marker>
          ))}
      </Map>
    </View>
  );
});

const styles = StyleSheet.create({ wrap: { overflow: 'hidden', backgroundColor: '#EEF1EA' } });
