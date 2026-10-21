// «Карта» (docs/02_UX_SPEC.md → 3) + расширения: мини-фото вместо точек с группировкой, зум кнопками,
// компас, слои («Схема» офлайн / «Подробная» онлайн, рельеф, 3D), онлайн-маршрут «от меня» и ведение.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { CityLabel, FinishMark, MeDot } from '@/components/map/markers';
import { ClusterMarker, PhotoMarker } from '@/components/map/photo-marker';
import type { MapCamera, MapMode, MapPoint, VoyzMapRef } from '@/components/map/types';
import { VoyzMap } from '@/components/map/voyz-map';
import { Sheet } from '@/components/sheet';
import { Button, Chip } from '@/components/ui';
import { catLabel, catGroup, getPlace, photoSource, placesOf } from '@/data/places';
import type { LatLng, Place } from '@/data/types';
import { useClusters } from '@/geo/clusters';
import { HUB_LABELS } from '@/geo/geo-data';
import type { MapLine } from '@/geo/map-style';
import { ONLINE, fmtDist } from '@/geo/online';
import { useNavigation } from '@/geo/use-navigation';
import { catIcon } from '@/lib/icon-rules';
import { fmtH, fmtKm } from '@/lib/text';
import { toast, useApp } from '@/store/app-store';
import { useAppSize } from '@/lib/layout';
import { color, elevation, type } from '@/theme/tokens';
import { dataLabel, tr } from '@/i18n';

const CARD_W = 300;
const GAP = 10;
const PAD = { top: 150, left: 30, right: 70, bottom: 230 };

export default function MapTab() {
  const insets = useSafeAreaInsets();
  const { width } = useAppSize();
  const country = useApp((s) => s.country) ?? 'kg';
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const mapRef = useRef<VoyzMapRef>(null);
  const rail = useRef<FlatList<Place>>(null);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [cam, setCam] = useState<MapCamera>({ zoom: 6, bearing: 0, pitch: 0, center: [0, 0] });
  const [mode, setMode] = useState<MapMode>('scheme');
  const [relief, setRelief] = useState(true);
  const [terrain3d, setTerrain3d] = useState(false);
  const [layers, setLayers] = useState(false);
  const [me, setMe] = useState<LatLng | null>(null);
  const visited = useApp((s) => s.visited);

  const selPlace = sel ? getPlace(sel) : undefined;
  const nav = useNavigation(selPlace?.ll ?? null);
  const ns = nav.state;
  // активный маршрут с уже суженным типом — TypeScript не сужает через вынесенные булевы
  const act = ns.phase === 'preview' || ns.phase === 'driving' ? ns : null;
  const navOn = !!act;
  const driving = act?.phase === 'driving';

  const all = useMemo(() => placesOf(country).filter((p) => p.ll), [country]);
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((p) => m.set(catGroup(p), (m.get(catGroup(p)) ?? 0) + 1));
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k]) => k);
  }, [all]);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return all
      .filter((p) => (cat === 'all' || catGroup(p) === cat) && (!ql || `${p.name} ${p.full} ${p.near}`.toLowerCase().includes(ql)))
      .sort((a, b) => a.ll![1] - b.ll![1]); // запад → восток, как листается карусель
  }, [all, cat, q]);
  const items = useClusters(list, cam.zoom, sel);

  const select = (id: string, scroll: boolean) => {
    if (navOn) nav.stop();
    setSel(id);
    Haptics.selectionAsync();
    const p = getPlace(id);
    if (p?.ll) mapRef.current?.flyTo(p.ll, Math.max(cam.zoom, 8));
    if (scroll) {
      const i = list.findIndex((x) => x.id === id);
      // отступ слева = полэкрана минус полкарточки, поэтому карточка i по центру при смещении i·шаг
      if (i >= 0) rail.current?.scrollToOffset({ offset: i * (CARD_W + GAP), animated: true });
    }
  };

  const onPointPress = (id: string) => {
    if (id.startsWith('c')) {
      const c = items.find((x) => x.id === id);
      if (c?.kind === 'cluster') mapRef.current?.flyTo(c.ll, c.expansionZoom + 0.5);
      return;
    }
    if (getPlace(id)) select(id, true);
  };

  // «Показать на карте» из карточки места: /map?focus=<id>
  useEffect(() => {
    const p = focus ? getPlace(focus) : undefined;
    if (!p?.ll) return;
    const t = setTimeout(() => {
      setSel(p.id);
      mapRef.current?.flyTo(p.ll!, 10);
    }, 300);
    return () => clearTimeout(t);
  }, [focus]);

  // ведение: камера следует за позицией по направлению движения
  useEffect(() => {
    if (ns.phase === 'driving' && ns.pos) mapRef.current?.follow(ns.pos, ns.heading);
    if (ns.phase === 'preview') mapRef.current?.fitTo(ns.route.line, { padding: { ...PAD, top: 120, bottom: 260 } });
    if (ns.phase === 'error') toast(ns.msg, 'route');
  }, [ns]);

  const locate = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return toast(tr('Нет доступа к геопозиции'), 'locate');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const ll: LatLng = [pos.coords.latitude, pos.coords.longitude];
      setMe(ll);
      mapRef.current?.flyTo(ll, 11);
    } catch {
      toast(tr('Не удалось определить место'), 'locate');
    }
  };

  const onCtl = (k: string) => {
    Haptics.selectionAsync();
    if (k === 'in') mapRef.current?.zoomBy(1);
    if (k === 'out') mapRef.current?.zoomBy(-1);
    if (k === 'north') mapRef.current?.resetNorth();
    if (k === 'fit') mapRef.current?.fitTo(list.map((p) => p.ll!), { padding: PAD });
    if (k === 'locate') locate();
    if (k === 'layers') setLayers(true);
  };

  const points: MapPoint[] = [];
  if (mode === 'scheme' && cam.zoom < 9 && !driving)
    for (const [n, la, lo] of HUB_LABELS[country]) points.push({ id: `city:${n}`, ll: [la, lo], z: 0, pressable: false, render: () => <CityLabel name={n} /> });
  for (const it of items)
    points.push(
      it.kind === 'cluster'
        ? { id: it.id, ll: it.ll, z: 3, render: () => <ClusterMarker cover={it.cover} count={it.count} /> }
        : { id: it.id, ll: it.ll, z: it.id === sel ? 10 : 2, render: () => (navOn && it.id === sel ? <FinishMark /> : <PhotoMarker place={it.place} selected={it.id === sel} visited={it.id in visited} />) },
    );
  const pos = ns.phase === 'driving' || ns.phase === 'preview' ? ns.pos : me;
  if (pos && Platform.OS === 'web') points.push({ id: 'me', ll: pos, z: 20, pressable: false, render: () => <MeDot /> });

  const lines: MapLine[] = act ? [{ id: 'nav', kind: 'road', coords: act.route.line }] : [];
  const fitPts = useMemo(() => all.map((p) => p.ll!), [all]);

  return (
    <View style={styles.root}>
      <VoyzMap
        key={country}
        ref={mapRef}
        country={country}
        mode={mode}
        relief={relief}
        terrain3d={terrain3d}
        points={points}
        lines={lines}
        fit={fitPts}
        padding={PAD}
        showUser={!!pos}
        onPointPress={onPointPress}
        onCamera={setCam}
        style={StyleSheet.absoluteFill}
      />

      {act?.phase === 'driving' && act.next ? (
        <View style={[styles.banner, { top: insets.top + 10 }]}>
          <Glass dark tint="rgba(10,10,10,.86)" style={styles.bannerIn}>
            <View style={styles.turn}>
              <Icon name={TURN_ICON[act.next.icon]} size={28} color={color.black} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerD}>{act.nextDist != null ? fmtDist(act.nextDist) : ''}</Text>
              <Text style={styles.bannerT} numberOfLines={2}>
                {act.next.text}
              </Text>
            </View>
          </Glass>
        </View>
      ) : (
        <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
          <Glass tint="rgba(255,255,255,.72)" style={styles.search}>
            <Icon name="search" size={19} color={color.black} />
            <TextInput value={q} onChangeText={setQ} placeholder={tr('Найти на карте')} placeholderTextColor={color.muted} style={styles.input} accessibilityLabel={tr('Найти на карте')} />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel={tr('Очистить')}>
                <Icon name="close" size={18} color={color.muted} />
              </Pressable>
            ) : null}
          </Glass>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
            {[['all', tr('Все'), 'map'] as const, ...cats.map((k) => [k, tr(k), catIcon(k)] as const)].map(([k, label, ic]) => (
              <Pressable key={k} onPress={() => setCat(k)} accessibilityRole="button" accessibilityState={{ selected: cat === k }}>
                <Glass tint={cat === k ? 'rgba(0,0,0,.92)' : 'rgba(255,255,255,.72)'} dark={cat === k} style={styles.chip}>
                  <Icon name={ic as IconName} size={15} color={cat === k ? color.lime : color.black} />
                  <Text style={[styles.chipText, { color: cat === k ? color.lime : color.black }]}>{label}</Text>
                </Glass>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.ctl, { top: insets.top + (driving ? 110 : 124) }]}>
        <Glass tint="rgba(255,255,255,.78)" style={[styles.zoomBox, elevation.floating]}>
          <CtlBtn ic="plus" label={tr('Приблизить')} onPress={() => onCtl('in')} />
          <View style={styles.zoomLine} />
          <CtlBtn ic="minus" label={tr('Отдалить')} onPress={() => onCtl('out')} />
        </Glass>
        {Math.abs(cam.bearing) > 1 || cam.pitch > 5 ? (
          <RoundCtl label={tr('На север')} onPress={() => onCtl('north')}>
            <View style={{ transform: [{ rotate: `${-cam.bearing}deg` }] }}>
              <Icon name="compass" size={22} />
            </View>
          </RoundCtl>
        ) : null}
        <RoundCtl label={tr('Где я')} onPress={() => onCtl('locate')}>
          <Icon name="locate" size={21} />
        </RoundCtl>
        <RoundCtl label={tr('Слои и рельеф')} onPress={() => onCtl('layers')} on={mode === 'detail' || relief || terrain3d}>
          <Icon name="layers" size={21} />
        </RoundCtl>
        {!driving ? (
          <RoundCtl label={tr('Показать всё')} onPress={() => onCtl('fit')}>
            <Icon name="fit" size={21} />
          </RoundCtl>
        ) : null}
      </View>

      {act ? (
        <View style={[styles.navPanel, { bottom: insets.bottom + 96 }, elevation.floating]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle} numberOfLines={1}>
                {selPlace?.name}
              </Text>
              <Text style={styles.navSub}>
                {driving
                  ? tr('Осталось ≈{km} км по прямой', { km: fmtKm(act.leftKm ?? 0) })
                  : tr('≈{km} км · {h} по дорогам', { km: fmtKm(act.route.km), h: fmtH(act.route.min / 60) })}
              </Text>
            </View>
            <Pressable onPress={() => nav.setVoice(!nav.voice)} style={styles.navIcon} accessibilityRole="switch" accessibilityState={{ checked: nav.voice }} accessibilityLabel={tr('Голосовые подсказки')}>
              <Icon name={nav.voice ? 'signal' : 'minus'} size={18} />
            </Pressable>
            <Pressable onPress={nav.stop} style={styles.navIcon} accessibilityRole="button" accessibilityLabel={tr('Закрыть маршрут')}>
              <Icon name="close" size={18} />
            </Pressable>
          </View>
          {!driving ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button label={tr('Поехали')} icon="car" style={{ flex: 1 }} onPress={nav.start} />
              <Button label={tr('Карточка')} tone="grey" style={{ flex: 1 }} onPress={() => sel && router.push({ pathname: '/place/[id]', params: { id: sel } })} />
            </View>
          ) : null}
          <Text style={styles.navNote}>{tr('Онлайн-маршрут OSRM. Для грунтовок сверяйтесь с навигатором и знаками.')}</Text>
        </View>
      ) : (
        <FlatList
          ref={rail}
          horizontal
          data={list}
          keyExtractor={(p) => p.id}
          style={[styles.rail, { bottom: insets.bottom + 96 }]}
          contentContainerStyle={{ paddingHorizontal: (width - CARD_W) / 2, gap: GAP }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + GAP}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: CARD_W + GAP, offset: (CARD_W + GAP) * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP));
            const p = list[Math.max(0, Math.min(list.length - 1, i))];
            if (p && p.id !== sel) select(p.id, false);
          }}
          ListEmptyComponent={
            <View style={[styles.card, { width: width - 40, justifyContent: 'center' }]}>
              <Text style={type.label}>{tr('Ничего не нашли — смените фильтр')}</Text>
            </View>
          }
          renderItem={({ item: p }) => <PeekCard place={p} on={p.id === sel} onPress={() => (p.id === sel ? router.push({ pathname: '/place/[id]', params: { id: p.id } }) : select(p.id, true))} onRoute={nav.preview} loading={nav.state.phase === 'loading' && p.id === sel} />}
        />
      )}

      <Sheet visible={layers} onClose={() => setLayers(false)} title={tr('Слои карты')}>
        <Text style={styles.lt}>{tr('Карта')}</Text>
        <View style={styles.modes}>
          <ModeCard on={mode === 'scheme'} title={tr('Схема')} sub="Встроенная, работает без сети" icon="map" onPress={() => setMode('scheme')} />
          <ModeCard on={mode === 'detail'} title={tr('Подробная')} sub="Сёла, тропы, перевалы — нужен интернет" icon="globe" onPress={() => setMode('detail')} />
        </View>
        <Text style={styles.lt}>{tr('Рельеф')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={tr('Тени гор')} icon="mountain" on={relief} onPress={() => setRelief((r) => !r)} />
          <Chip label={tr('3D-наклон')} icon="pass" on={terrain3d} onPress={() => setTerrain3d((t) => !t)} />
        </View>
        <Text style={styles.ln}>
          {tr('Тени гор встроены в приложение и работают без сети. Подробная карта и 3D-наклон загружаются из интернета.')}
          {'\n'}
          {ONLINE.attribution}
        </Text>
      </Sheet>
    </View>
  );
}

const TURN_ICON: Record<string, IconName> = { left: 'back', right: 'arrow', straight: 'up', uturn: 'down', arrive: 'flag', depart: 'up', round: 'shuffle' };

// карточка и кнопка маршрута — соседи, а не вложенные кнопки (в вебе <button> внутри <button> недопустим)
function PeekCard({ place: p, on, onPress, onRoute, loading }: { place: Place; on: boolean; onPress: () => void; onRoute: () => void; loading: boolean }) {
  const src = photoSource(p);
  return (
    <View style={[styles.card, elevation.floating, on && { borderColor: color.black }]}>
      <Pressable onPress={onPress} style={styles.cardMain} accessibilityRole="button" accessibilityLabel={on ? tr('Открыть: {name}', { name: p.name }) : p.name}>
        {src ? (
          <Image source={src} style={styles.th} contentFit="cover" />
        ) : (
          <View style={[styles.th, { backgroundColor: '#E4EBDA', alignItems: 'center', justifyContent: 'center' }]}>
            <Icon name={catIcon(p.cat)} size={22} color="#9aa08f" />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {p.name}
          </Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {catLabel(p.cat)} · {dataLabel(p.s.acc)}
          </Text>
        </View>
      </Pressable>
      {on ? (
        <Pressable onPress={onRoute} style={[styles.go, { width: 44, height: 44, borderRadius: 22 }]} accessibilityRole="button" accessibilityLabel={tr('Маршрут от меня')}>
          <Icon name={loading ? 'dot' : 'route'} size={20} strokeWidth={2} />
        </Pressable>
      ) : (
        <Pressable onPress={onPress} style={styles.go} accessibilityLabel={p.name}>
          <Icon name="arrow" size={14} strokeWidth={2.2} />
        </Pressable>
      )}
    </View>
  );
}

function CtlBtn({ ic, label, onPress }: { ic: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.zoomBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={ic} size={21} strokeWidth={2} />
    </Pressable>
  );
}

function RoundCtl({ label, onPress, on, children }: { label: string; onPress: () => void; on?: boolean; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Glass interactive tint={on ? 'rgba(216,252,0,.88)' : 'rgba(255,255,255,.78)'} style={[styles.ctlBtn, elevation.floating]}>
        {children}
      </Glass>
    </Pressable>
  );
}

function ModeCard({ on, title, sub, icon, onPress }: { on: boolean; title: string; sub: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.mode, on && { borderColor: color.black, backgroundColor: color.limeSoft }]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      <Icon name={icon} size={22} />
      <Text style={styles.modeT}>{title}</Text>
      <Text style={styles.modeS}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF1EA' },
  top: { position: 'absolute', left: 14, right: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 999, paddingHorizontal: 18 },
  input: { flex: 1, fontFamily: 'Mulish_400Regular', fontSize: 15.5, color: color.black, height: '100%' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 999 },
  chipText: { fontFamily: 'Mulish_600SemiBold', fontSize: 13 },
  ctl: { position: 'absolute', right: 14, gap: 10, alignItems: 'center' },
  zoomBox: { width: 46, borderRadius: 23, alignItems: 'center' },
  zoomBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  zoomLine: { width: 24, height: 1, backgroundColor: 'rgba(0,0,0,.12)' },
  ctlBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', left: 0, right: 0, flexGrow: 0 },
  card: { width: CARD_W, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.paper, borderRadius: 22, padding: 10, borderWidth: 2, borderColor: 'transparent' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  th: { width: 62, height: 62, borderRadius: 14, overflow: 'hidden' },
  cardTitle: { fontFamily: 'Mulish_700Bold', fontSize: 14.5, lineHeight: 18, color: color.black },
  cardSub: { ...type.caption, fontSize: 12, color: color.muted, marginTop: 2 },
  go: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  banner: { position: 'absolute', left: 14, right: 14 },
  bannerIn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, padding: 14 },
  turn: { width: 52, height: 52, borderRadius: 16, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  bannerD: { fontFamily: 'Mulish_800ExtraBold', fontSize: 24, color: color.lime },
  bannerT: { fontFamily: 'Mulish_600SemiBold', fontSize: 15, lineHeight: 19, color: color.paper },
  navPanel: { position: 'absolute', left: 14, right: 14, backgroundColor: color.paper, borderRadius: 24, padding: 16 },
  navTitle: { fontFamily: 'Mulish_700Bold', fontSize: 16, color: color.black },
  navSub: { fontFamily: 'Mulish_500Medium', fontSize: 13.5, color: color.muted, marginTop: 2 },
  navIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.mist, alignItems: 'center', justifyContent: 'center' },
  navNote: { fontFamily: 'Mulish_400Regular', fontSize: 11.5, color: color.muted, marginTop: 10 },
  lt: { fontFamily: 'Mulish_700Bold', fontSize: 15, color: color.black, marginBottom: 10, marginTop: 4 },
  modes: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  mode: { flex: 1, borderWidth: 1.5, borderColor: color.line, borderRadius: 20, padding: 14, gap: 6 },
  modeT: { fontFamily: 'Mulish_700Bold', fontSize: 15, color: color.black },
  modeS: { fontFamily: 'Mulish_400Regular', fontSize: 12.5, lineHeight: 16, color: color.muted },
  ln: { fontFamily: 'Mulish_400Regular', fontSize: 12, lineHeight: 17, color: color.muted, marginTop: 16 },
});
