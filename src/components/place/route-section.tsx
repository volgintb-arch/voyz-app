// «Как добраться»: сводка, варианты подъезда, карта маршрута (прорисовка 1.6 с, FAB «+»), чипсы,
// таймлайн шагов, опасности, кнопки навигаторов с координатой парковки, источник, транспорт.
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { FinishMark, RouteMark } from '@/components/map/markers';
import type { MapPoint } from '@/components/map/types';
import { useDrawProgress } from '@/components/map/use-draw';
import { VoyzMap } from '@/components/map/voyz-map';
import { RichText } from '@/components/rich-text';
import { Chip, ReadMore, SectionHeader } from '@/components/ui';
import type { Approach, LatLng, Place } from '@/data/types';
import { HUB_LABELS } from '@/geo/geo-data';
import { sliceLine, type MapLine } from '@/geo/map-style';
import { accIcon, modeIcon } from '@/lib/icon-rules';
import { NAVIGATORS, openNavigator } from '@/lib/navigators';
import { cut, findTel, findUrl, haversine, lead, shortUrl, telHref } from '@/lib/text';
import { toast, useApp } from '@/store/app-store';
import { color, motion, spacing, type } from '@/theme/tokens';

const dest = (p: Place, a?: Approach): LatLng | null => (a?.rt && (a.rt.pc || a.rt.tc)) || p.ll;

export function RouteSection({ place, onReadHow }: { place: Place; onReadHow: () => void }) {
  const apps = place.p.apps || [];
  const [ai, setAi] = useState(0);
  const a = apps[ai];

  return (
    <View style={styles.sec}>
      <SectionHeader title="Как добраться" />
      {place.p.sum ? <RichText style={styles.lead2}>{lead(place.p.sum, 2)}</RichText> : null}
      {apps.length > 1 ? (
        <FlatList
          horizontal
          data={apps}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.screenGutter, marginBottom: 14 }}
          contentContainerStyle={{ paddingHorizontal: spacing.screenGutter, gap: 8 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setAi(index);
              }}
              style={[styles.app, index === ai && styles.appOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === ai }}>
              {item.rec ? <Text style={styles.rec}>Рекомендуем</Text> : null}
              <Text style={[styles.appT, index === ai && { color: color.lime }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.appS, index === ai && { color: color.mutedOnDark }]} numberOfLines={1}>
                {cut(item.time, 40) || cut(item.km, 40)}
              </Text>
            </Pressable>
          )}
        />
      ) : null}

      {place.ll ? <RouteMap place={place} a={a} ai={ai} /> : null}

      {a ? (
        <Animated.View key={ai} entering={FadeIn.duration(260)}>
          <ApproachBody place={place} a={a} />
        </Animated.View>
      ) : (
        <RichText style={styles.lead2}>{lead(place.how, 3)}</RichText>
      )}
      <ReadMore label="Как добраться — подробно" onPress={onReadHow} />
      <Transport place={place} />
    </View>
  );
}

function RouteMap({ place, a, ai }: { place: Place; a?: Approach; ai: number }) {
  const inTrip = useApp((s) => s.trip.includes(place.id));
  const toggleTrip = useApp((s) => s.toggleTrip);
  const t = useDrawProgress(`${place.id}:${ai}`);

  const { road, rest, fit } = useMemo(() => {
    const rt = a?.rt;
    const pts: LatLng[] = [place.ll!];
    const rest: MapLine[] = [];
    let road: LatLng[] = [];
    if (rt) {
      const end = rt.pc || rt.tc || place.ll!;
      if (rt.road && rt.road.length > 1) {
        road = [rt.hc, ...rt.road];
        rest.push({ id: 'conn', kind: 'approach', coords: [road[road.length - 1], end] });
        pts.push(...road, end);
      } else {
        rest.push({ id: 'conn', kind: 'approach', coords: [rt.hc, end] });
        pts.push(rt.hc, end);
      }
      const trail = [rt.pc, rt.tc, place.ll].filter(Boolean) as LatLng[];
      if (trail.length > 1 && haversine(trail[0], trail[trail.length - 1]) > 0.05) {
        rest.push({ id: 'trail', kind: 'trail', coords: trail });
        pts.push(...trail);
      }
    }
    return { road, rest, fit: pts };
  }, [place, a]);

  const lines: MapLine[] = useMemo(() => [...(road.length ? [{ id: 'road', kind: 'road' as const, coords: sliceLine(road, t) }] : []), ...(t >= 1 ? rest : [])], [road, rest, t]);

  const points: MapPoint[] = [{ id: 'fin', ll: place.ll!, z: 9, render: () => <FinishMark /> }];
  if (a?.rt) {
    const hubKnown = HUB_LABELS[place.c].some((h) => h[0] === a.rt!.hub);
    points.push({ id: 'start', ll: a.rt.hc, z: 5, render: () => <StartWithLabel label={hubKnown ? undefined : a.rt!.hub} /> });
    if (a.rt.pc) points.push({ id: 'park', ll: a.rt.pc, z: 6, render: () => <RouteMark kind="p" label="P" /> });
  }

  const rot = useAnimatedStyle(() => ({ transform: [{ rotate: withSpring(inTrip ? '45deg' : '0deg', motion.spring) }] }), [inTrip]);

  return (
    <View style={styles.routemap}>
      <VoyzMap key={ai} country={place.c} lines={lines} points={points} fit={fit} padding={{ top: 30, left: 30, right: 80, bottom: 60 }} maxZoom={12} style={StyleSheet.absoluteFill} />
      <View style={styles.legend} pointerEvents="none">
        <Legend kind="road" label="по трассе" />
        <Legend kind="dash" label="подъезд" />
        <Legend kind="trail" label="тропа" />
      </View>
      <Pressable
        onPress={() => {
          const added = toggleTrip(place.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast(added ? 'Добавили в маршрут' : 'Убрали из маршрута', 'route');
        }}
        style={styles.fabWrap}
        accessibilityRole="button"
        accessibilityLabel={inTrip ? 'Убрать из маршрута' : 'Добавить в маршрут'}>
        <Glass interactive tint="rgba(216,252,0,.85)" style={styles.fab}>
          <Animated.View style={rot}>
            <Icon name="plus" size={24} strokeWidth={2.2} />
          </Animated.View>
        </Glass>
      </Pressable>
    </View>
  );
}

function StartWithLabel({ label }: { label?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {label ? <Text style={styles.hubLabel}>{label}</Text> : null}
      <RouteMark kind="s" label="S" />
    </View>
  );
}

function Legend({ kind, label }: { kind: 'road' | 'dash' | 'trail'; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {kind === 'road' ? (
        <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: color.black }} />
      ) : kind === 'dash' ? (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          <View style={{ width: 6, height: 3, backgroundColor: color.black }} />
          <View style={{ width: 6, height: 3, backgroundColor: color.black }} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color.trailLine }} />
          ))}
        </View>
      )}
      <Text style={styles.legendT}>{label}</Text>
    </View>
  );
}

function ApproachBody({ place, a }: { place: Place; a: Approach }) {
  const stats: [IconName, string][] = [];
  if (a.time) stats.push(['timer', cut(a.time, 34)]);
  // «км» проверяем по полной строке: после обрезки его может не остаться
  // «км» дописываем только к голому числу («≈270»), а не к фразе вида «≈270 от Бишкека»
  if (a.km) stats.push(['route', /^[≈~\d\s.,–-]+$/.test(a.km) ? `${a.km.trim()} км` : cut(a.km, 34)]);
  if (a.vehicle) stats.push([accIcon(a.vehicle === 'седан' ? 'car' : a.vehicle), a.vehicle]);

  const steps: { k: 's' | 'p' | 'f' | ''; n: string; b: string; t: string }[] = [];
  steps.push({ k: 's', n: '1', b: `Старт: ${a.rt ? a.rt.hub : a.from || 'город'}`, t: a.from && a.rt && a.from !== a.rt.hub ? a.from : '' });
  steps.push({ k: '', n: '2', b: 'Дорога', t: [a.route, a.surface].filter(Boolean).join('. ') });
  if (a.last) steps.push({ k: '', n: '3', b: 'Последние заправки и магазины', t: a.last });
  if (a.parking && (a.parking.d || a.parking.price)) steps.push({ k: 'p', n: 'P', b: 'Парковка', t: [a.parking.d, a.parking.price && `Цена: ${a.parking.price}`].filter(Boolean).join('. ') });
  if (a.trail?.d) steps.push({ k: '', n: '↟', b: 'Начало тропы', t: a.trail.d });
  steps.push({ k: 'f', n: '★', b: place.name, t: a.season ? `Сезон для этого пути: ${a.season}` : '' });
  const d = dest(place, a);

  return (
    <View>
      <Text style={styles.routeTitle}>{a.title}</Text>
      <View style={styles.stats}>
        {stats.map(([ic, t]) => (
          <Chip key={t} small icon={ic} label={t} />
        ))}
      </View>
      <View style={{ marginTop: 18 }}>
        {steps.map((s, i) => (
          <Step key={i} {...s} last={i === steps.length - 1} />
        ))}
      </View>
      {a.haz ? (
        <View style={styles.haz}>
          <Icon name="warn" size={18} color="#6b7d00" />
          <RichText style={styles.hazT}>{a.haz}</RichText>
        </View>
      ) : null}
      {d ? (
        <>
          <Text style={styles.navH}>Открыть в навигаторе</Text>
          <View style={styles.navs}>
            {NAVIGATORS.map((n) => (
              <Pressable
                key={n.id}
                onPress={async () => {
                  if (!(await openNavigator(n.id, d, place.name))) toast('Не удалось открыть навигатор', 'map');
                }}
                style={({ pressed }) => [styles.nav, pressed && { backgroundColor: color.mist }]}
                accessibilityRole="link"
                accessibilityLabel={`Маршрут в ${n.name}`}>
                <View style={[styles.navBadge, { backgroundColor: n.bg }]}>
                  <Text style={[styles.navBadgeT, { color: n.fg }]}>{n.badge}</Text>
                </View>
                <Text style={styles.navT} numberOfLines={1}>
                  {n.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.small}>
            {a.rt && (a.rt.pc || a.rt.tc) ? 'Точка — парковка или начало тропы' : 'Точка — координаты места'}: {d[0].toFixed(5)}, {d[1].toFixed(5)}
          </Text>
        </>
      ) : null}
      {a.src ? <RichText style={styles.small}>{`Источник: ${a.src}`}</RichText> : null}
    </View>
  );
}

function Step({ k, n, b, t, last }: { k: string; n: string; b: string; t: string; last: boolean }) {
  const [open, setOpen] = useState(false);
  const long = t.length > 140;
  const bg = k === 'p' ? color.parking : k === 'f' ? color.lime : k === 's' ? color.black : color.paper;
  const fg = k === 'p' ? color.paper : k === 'f' ? color.black : k === 's' ? color.lime : color.black;
  return (
    <Pressable onPress={() => long && setOpen((o) => !o)} disabled={!long} style={{ paddingLeft: 44, paddingBottom: 18 }} accessibilityRole={long ? 'button' : undefined}>
      {!last ? <View style={styles.stepLine} /> : null}
      <View style={[styles.stepN, { backgroundColor: bg, borderColor: k ? bg : color.black }]}>
        <Text style={[styles.stepNT, { color: fg }]}>{n}</Text>
      </View>
      <Text style={styles.stepB}>{b}</Text>
      {t ? (
        <RichText style={styles.stepT} numberOfLines={long && !open ? 3 : undefined}>
          {t}
        </RichText>
      ) : null}
      {long ? <Text style={styles.more2}>{open ? 'свернуть' : 'ещё'}</Text> : null}
    </Pressable>
  );
}

function Transport({ place }: { place: Place }) {
  const T = place.p.transport || [];
  if (!T.length) return null;
  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 }}>
        <Text style={{ fontFamily: 'Mulish_600SemiBold', fontSize: 18, color: color.black }}>Транспорт и перевозчики</Text>
        <Text style={[styles.small, { marginLeft: 'auto', marginTop: 0 }]}>{T.length}</Text>
      </View>
      <FlatList
        horizontal
        data={T}
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.screenGutter }}
        contentContainerStyle={{ paddingHorizontal: spacing.screenGutter, gap: 10 }}
        renderItem={({ item: t }) => {
          const ct = String(t.contact || '');
          const tel = findTel(ct);
          const url = findUrl(ct) || (/^https?:/.test(t.src || '') ? t.src : '');
          return (
            <View style={styles.tcard}>
              <View style={styles.tile}>
                <Icon name={modeIcon(t.mode)} size={30} color={color.lime} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.tcardB} numberOfLines={2}>
                  {t.provider || t.mode}
                </Text>
                <Text style={styles.tcardS} numberOfLines={1}>
                  {t.mode}
                  {t.from ? ` · ${t.from}` : ''}
                </Text>
                <Text style={styles.tcardP} numberOfLines={3}>
                  {cut(t.price, 70) || cut(t.details, 70)}
                </Text>
                {tel ? (
                  <Pressable onPress={() => Linking.openURL(telHref(tel))} style={[styles.act, { backgroundColor: color.lime }]} accessibilityRole="link" accessibilityLabel={`Позвонить ${tel}`}>
                    <Text style={styles.actT}>Связаться</Text>
                  </Pressable>
                ) : url ? (
                  <Pressable onPress={() => Linking.openURL(url)} style={[styles.act, { backgroundColor: color.mist }]} accessibilityRole="link" accessibilityLabel={shortUrl(url)}>
                    <Text style={styles.actT}>{/^https?:/.test(ct) ? 'Сайт' : 'Источник'}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sec: { paddingHorizontal: spacing.screenGutter, paddingTop: spacing.sectionGap },
  lead2: { fontFamily: 'Mulish_400Regular', fontSize: 16, lineHeight: 24.8, color: '#262624', marginBottom: 14 },
  app: { maxWidth: 250, borderWidth: 1.5, borderColor: color.line, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 13 },
  appOn: { backgroundColor: color.black, borderColor: color.black },
  rec: { alignSelf: 'flex-start', fontFamily: 'Mulish_800ExtraBold', fontSize: 10, color: color.black, backgroundColor: color.lime, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, marginBottom: 5 },
  appT: { fontFamily: 'Mulish_700Bold', fontSize: 13.5, lineHeight: 17, color: color.black },
  appS: { fontFamily: 'Mulish_400Regular', fontSize: 12, color: color.muted, marginTop: 3 },
  routemap: { height: 300, borderRadius: 24, overflow: 'hidden', marginBottom: 16, backgroundColor: color.mapLand },
  legend: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(255,255,255,.88)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, gap: 4 },
  legendT: { fontFamily: 'Mulish_600SemiBold', fontSize: 11, color: color.black },
  fabWrap: { position: 'absolute', right: 14, bottom: 14 },
  fab: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  hubLabel: { fontFamily: 'Mulish_700Bold', fontSize: 11, color: '#2f4a22', marginBottom: 2, textShadowColor: '#fff', textShadowRadius: 3 },
  routeTitle: { fontFamily: 'Mulish_700Bold', fontSize: 17, color: color.black, marginBottom: 10 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepLine: { position: 'absolute', left: 14, top: 30, bottom: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#cfd6c5' },
  stepN: { position: 'absolute', left: 0, top: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepNT: { fontFamily: 'Mulish_800ExtraBold', fontSize: 12 },
  stepB: { fontFamily: 'Mulish_700Bold', fontSize: 15, color: color.black, paddingTop: 5 },
  stepT: { fontFamily: 'Mulish_400Regular', fontSize: 14, lineHeight: 20, color: '#333', marginTop: 4 },
  more2: { fontFamily: 'Mulish_700Bold', fontSize: 13, color: color.black, marginTop: 4 },
  haz: { flexDirection: 'row', gap: 10, backgroundColor: '#F7F9EE', borderRadius: 16, padding: 14, marginTop: 6 },
  hazT: { flex: 1, fontFamily: 'Mulish_400Regular', fontSize: 13.5, lineHeight: 19.5, color: '#262624' },
  navH: { fontFamily: 'Mulish_700Bold', fontSize: 15, color: color.black, marginTop: 20, marginBottom: 10 },
  navs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nav: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 46, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: color.line, paddingHorizontal: 12 },
  navBadge: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  navBadgeT: { fontFamily: 'Mulish_800ExtraBold', fontSize: 11 },
  navT: { fontFamily: 'Mulish_600SemiBold', fontSize: 13.5, color: color.black, flex: 1 },
  small: { ...type.caption, fontSize: 12.5, color: color.muted, marginTop: 8 },
  tcard: { width: 260, flexDirection: 'row', gap: 12, borderWidth: 1.5, borderColor: color.line, borderRadius: 22, padding: 12, backgroundColor: color.paper },
  tile: { width: 70, height: 96, borderRadius: 16, backgroundColor: '#0f1205', alignItems: 'center', justifyContent: 'center' },
  tcardB: { fontFamily: 'Mulish_700Bold', fontSize: 14.5, lineHeight: 18, color: color.black },
  tcardS: { fontFamily: 'Mulish_400Regular', fontSize: 12, color: color.muted, marginTop: 2 },
  tcardP: { fontFamily: 'Mulish_500Medium', fontSize: 12.5, lineHeight: 16, color: '#333', marginTop: 4, flex: 1 },
  act: { alignSelf: 'flex-start', height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', marginTop: 6 },
  actT: { fontFamily: 'Mulish_700Bold', fontSize: 12.5, color: color.black },
});
