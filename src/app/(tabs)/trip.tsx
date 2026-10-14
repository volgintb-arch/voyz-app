// «Маршрут» (docs/02_UX_SPEC.md → 4): «Маршрут | Избранное». Карта с линиями по дорогам (Дейкстра на geo.json),
// сводка (места, км, дни), часы за рулём (52 км/ч), дни по порогу 6.5 ч, перетаскивание, оптимизация, пример.
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { FinishMark, RouteMark } from '@/components/map/markers';
import type { MapPoint } from '@/components/map/types';
import { useDrawProgress } from '@/components/map/use-draw';
import { VoyzMap } from '@/components/map/voyz-map';
import { RowPlaceCard } from '@/components/place-cards';
import { PassportPane } from '@/components/passport/passport-pane';
import { StopRow } from '@/components/trip/stop-row';
import { Button, Chip, IconBubble } from '@/components/ui';
import { getPlace, meta, plural } from '@/data/places';
import type { LatLng, Place } from '@/data/types';
import type { MapLine } from '@/geo/map-style';
import { sliceLine } from '@/geo/map-style';
import { AVG_SPEED_KMH } from '@/geo/routing';
import { optimizeOrder, planTrip, sampleTrip } from '@/geo/trip';
import { fmtH, fmtKm } from '@/lib/text';
import { toast, useApp } from '@/store/app-store';
import { color, radius, spacing, type } from '@/theme/tokens';

export default function TripTab() {
  const insets = useSafeAreaInsets();
  const country = useApp((s) => s.country) ?? 'kg';
  const trip = useApp((s) => s.trip);
  const saved = useApp((s) => s.saved);
  const [tab, setTab] = useState<'route' | 'saved' | 'been'>('route');
  const beenN = useApp((s) => Object.keys(s.visited).length);
  const plan = useMemo(() => planTrip(trip, country), [trip, country]);
  const savedHere = saved.map(getPlace).filter((p): p is Place => !!p && p.c === country);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.black }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 110 }}>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: spacing.screenGutter, paddingBottom: 60 }}>
        <Text style={styles.title} accessibilityRole="header">
          Мой маршрут
        </Text>
        <Text style={styles.sub}>{meta.countries[country].name} · соберите поездку из сохранённых мест</Text>
      </View>
      <View style={styles.sheet}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          <Chip label={`Маршрут${plan.places.length ? ` ${plan.places.length}` : ''}`} icon="route" on={tab === 'route'} onPress={() => setTab('route')} />
          <Chip label={`Избранное${savedHere.length ? ` ${savedHere.length}` : ''}`} icon="heart" on={tab === 'saved'} onPress={() => setTab('saved')} />
          <Chip label={`Был${beenN ? ` ${beenN}` : ''}`} icon="flag" on={tab === 'been'} onPress={() => setTab('been')} />
        </View>
        {tab === 'route' ? <RoutePane plan={plan} /> : tab === 'saved' ? <SavedPane places={savedHere} /> : <PassportPane />}
      </View>
    </ScrollView>
  );
}

function RoutePane({ plan }: { plan: ReturnType<typeof planTrip> }) {
  const country = useApp((s) => s.country) ?? 'kg';
  const trip = useApp((s) => s.trip);
  const setTrip = useApp((s) => s.setTrip);
  const toggleTrip = useApp((s) => s.toggleTrip);
  const ids = plan.places.map((p) => p.id);
  const t = useDrawProgress(ids.join(','));

  const lines: MapLine[] = useMemo(() => {
    const out: MapLine[] = [];
    plan.legs.forEach((l, i) => l && out.push({ id: `leg${i}`, kind: l.approx ? 'approx' : 'road', coords: l.line }));
    // прорисовка: доля t от всех отрезков по порядку
    const n = out.length;
    return out.flatMap((l, i) => {
      const k = Math.min(1, Math.max(0, t * n - i));
      return k > 0 ? [{ ...l, coords: sliceLine(l.coords, k) }] : [];
    });
  }, [plan, t]);

  if (!plan.places.length) {
    return (
      <View style={styles.empty}>
        <IconBubble name="route" size={48} />
        <Text style={styles.emptyB}>Маршрут пока пуст</Text>
        <Text style={styles.emptyT}>Нажмите «Добавить в маршрут» в карточке места — мы посчитаем расстояния по дорогам и разобьём поездку на дни.</Text>
        <Button
          label="Собрать пример"
          icon="sparkle"
          style={{ marginTop: 18, alignSelf: 'stretch' }}
          onPress={() => {
            const add = sampleTrip(country).filter((id) => !trip.includes(id));
            setTrip([...trip, ...add]);
            const st = useApp.getState();
            add.forEach((id) => !st.saved.includes(id) && st.toggleSaved(id));
            toast('Собрали пример маршрута', 'sparkle');
          }}
        />
      </View>
    );
  }

  // перестановка внутри видимой страны: пересобираем общий список, места других стран остаются на месте
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    const other = trip.filter((id) => !ids.includes(id));
    setTrip([...other, ...next]);
    Haptics.selectionAsync();
  };

  const points: MapPoint[] = plan.places
    .filter((p) => p.ll)
    .map((p, i, arr) => ({ id: p.id, ll: p.ll!, z: i, pressable: false, render: () => (i === arr.length - 1 ? <FinishMark label={String(i + 1)} /> : <RouteMark kind="n" label={String(i + 1)} />) }));
  const fit: LatLng[] = plan.places.filter((p) => p.ll).map((p) => p.ll!);

  return (
    <View>
      <View style={styles.map}>
        <VoyzMap key={ids.join(',')} country={country} lines={lines} points={points} fit={fit} padding={{ top: 30, left: 30, right: 30, bottom: 30 }} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.sum}>
        <Stat v={String(plan.places.length)} l={plural(plan.places.length, 'место', 'места', 'мест')} />
        <Stat v={plan.km ? `≈${fmtKm(plan.km)}` : '—'} l="км по дорогам" />
        <Stat v={String(plan.days.length)} l={plural(plan.days.length, 'день', 'дня', 'дней')} />
      </View>
      <Text style={styles.note}>
        ≈{fmtH(plan.driveH)} за рулём без учёта остановок. Расстояния — по схеме основных дорог{plan.approx ? ', часть участков — оценка' : ''}; перед выездом сверяйтесь с навигатором.
      </Text>

      {plan.days.map((day, d) => (
        <View key={d}>
          <View style={styles.dayHd}>
            <Text style={styles.dayT}>День {d + 1}</Text>
            <View style={styles.dayLine} />
          </View>
          {day.map((i) => {
            const leg = i ? plan.legs[i - 1] : null;
            return (
              <View key={plan.places[i].id}>
                {leg ? (
                  <View style={styles.leg}>
                    <Icon name="car" size={16} color={color.muted} />
                    <Text style={styles.legT}>
                      {day[0] === i ? 'переезд ' : ''}≈{fmtKm(leg.km)} км · {fmtH(leg.km / AVG_SPEED_KMH)}
                      {day[0] === i ? ' — с утра' : ''}
                    </Text>
                  </View>
                ) : null}
                <StopRow
                  place={plan.places[i]}
                  n={i + 1}
                  index={i}
                  count={plan.places.length}
                  onMove={move}
                  onRemove={() => {
                    toggleTrip(plan.places[i].id);
                    toast('Убрали из маршрута', 'route');
                  }}
                />
              </View>
            );
          })}
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button
          label="Оптимизировать"
          icon="shuffle"
          tone="grey"
          style={{ flex: 1 }}
          onPress={() => {
            setTrip(optimizeOrder(trip, country));
            toast('Порядок оптимизирован по расстоянию', 'shuffle');
          }}
        />
        <Button label="Очистить" icon="trash" tone="outline" style={{ flex: 1 }} onPress={() => setTrip(trip.filter((id) => getPlace(id)?.c !== country))} />
      </View>
    </View>
  );
}

function SavedPane({ places }: { places: Place[] }) {
  const trip = useApp((s) => s.trip);
  const toggleTrip = useApp((s) => s.toggleTrip);
  if (!places.length) {
    return (
      <View style={styles.empty}>
        <IconBubble name="heart" size={48} />
        <Text style={styles.emptyB}>Здесь будут сохранённые места</Text>
        <Text style={styles.emptyT}>Нажмите на сердечко в карточке — место появится здесь, даже без интернета.</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {places.map((p) => {
        const inTrip = trip.includes(p.id);
        return (
          <RowPlaceCard
            key={p.id}
            place={p}
            right={
              <Pressable
                onPress={() => {
                  const added = toggleTrip(p.id);
                  toast(added ? 'Добавили в маршрут' : 'Убрали из маршрута', 'route');
                }}
                style={[styles.addBtn, inTrip && { backgroundColor: color.black }]}
                accessibilityRole="button">
                <Text style={[styles.addT, inTrip && { color: color.lime }]}>{inTrip ? 'В маршруте' : '+ В маршрут'}</Text>
              </Pressable>
            }
          />
        );
      })}
    </View>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statV}>{v}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.paper },
  sub: { ...type.caption, color: color.mutedOnDark, marginTop: 8 },
  sheet: { flex: 1, backgroundColor: color.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, marginTop: -34, padding: spacing.screenGutter, paddingTop: 22 },
  map: { height: 260, borderRadius: 24, overflow: 'hidden', marginBottom: 14, backgroundColor: color.mapLand },
  sum: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: color.mist, borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  statV: { fontFamily: 'Mulish_800ExtraBold', fontSize: 20, color: color.black },
  statL: { fontFamily: 'Mulish_500Medium', fontSize: 12, color: color.muted, marginTop: 2 },
  note: { ...type.caption, fontSize: 12.5, color: color.muted, marginTop: 8, marginBottom: 14 },
  dayHd: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 10 },
  dayT: { fontFamily: 'Mulish_600SemiBold', fontSize: 18, textTransform: 'uppercase', color: color.black },
  dayLine: { flex: 1, height: 1, backgroundColor: color.line },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, marginBottom: 8 },
  legT: { fontFamily: 'Mulish_500Medium', fontSize: 12.5, color: color.muted },
  empty: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 30 },
  emptyB: { fontFamily: 'Mulish_700Bold', fontSize: 17, color: color.black, marginTop: 14 },
  emptyT: { ...type.caption, fontSize: 14, lineHeight: 20, color: color.muted, textAlign: 'center', marginTop: 6 },
  addBtn: { height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: color.lime, justifyContent: 'center' },
  addT: { fontFamily: 'Mulish_700Bold', fontSize: 12, color: color.black },
});
