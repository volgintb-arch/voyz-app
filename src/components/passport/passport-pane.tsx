// «Мои путешествия»: карта мира, где человек сам отмечает страны (тап или поиск), места Voyz из «Я здесь был»,
// цифры (страны, процент мира, континенты) и постер для соцсетей.
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RowPlaceCard } from '@/components/place-cards';
import { Sheet } from '@/components/sheet';
import { Button, Chip, IconBubble } from '@/components/ui';
import { Icon } from '@/components/icon';
import { VoyzLogo } from '@/components/voyz-logo';
import { catLabel, getPlace } from '@/data/places';
import type { Place } from '@/data/types';
import { WORLD, WORLD_TOTAL, byIso, visitedIsoSet, visitedPlacePoints, type WorldCountry } from '@/geo/world';
import { useAppSize } from '@/lib/layout';
import { shareViewAsImage } from '@/lib/share-image';
import { track } from '@/services/analytics';
import { toast, useApp } from '@/store/app-store';
import { color, spacing, type } from '@/theme/tokens';
import { dateLabel, pl, tr } from '@/i18n';

import { REGIONS, WorldMap } from './world-map';

const POSTER_W = 335;
const CONTINENTS = Object.keys(REGIONS);

/** Флаг из кода страны: KG → 🇰🇬 (региональные символы Unicode). */
const flag = (iso: string) => (/^[A-Z]{2}$/.test(iso) ? String.fromCodePoint(...[...iso].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : '🏳');

export function PassportPane() {
  const visited = useApp((s) => s.visited);
  const manual = useApp((s) => s.visitedCountries);
  const toggleCountry = useApp((s) => s.toggleCountry);
  const lang = useApp((s) => s.lang);
  const poster = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const w = useAppSize().width - spacing.screenGutter * 2;
  const [region, setRegion] = useState<string | null>(null);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');

  const name = (c: WorldCountry) => (lang === 'en' ? c.en : c.name);

  const stats = useMemo(() => {
    const set = visitedIsoSet(manual, visited);
    const auto = visitedIsoSet([], visited);
    const countries = [...set].map((iso) => byIso.get(iso)).filter((c): c is WorldCountry => !!c);
    const conts = new Set(countries.map((c) => c.cont));
    const list = Object.entries(visited)
      .map(([id, at]) => ({ p: getPlace(id), at }))
      .filter((x): x is { p: Place; at: string } => !!x.p)
      .sort((a, b) => b.at.localeCompare(a.at));
    return {
      set,
      auto,
      countries: countries.sort((a, b) => (lang === 'en' ? a.en : a.name).localeCompare(lang === 'en' ? b.en : b.name)),
      n: set.size,
      pct: Math.round((set.size / WORLD_TOTAL) * 1000) / 10,
      conts: conts.size,
      places: list.length,
      points: visitedPlacePoints(visited),
      list,
    };
  }, [manual, visited, lang]);

  const onCountry = (iso: string) => {
    const c = byIso.get(iso);
    if (!c) return;
    if (stats.auto.has(iso) && !manual.includes(iso)) {
      toast(tr('{name}: здесь отмечены места Voyz', { name: name(c) }), 'flag');
      return;
    }
    const on = toggleCountry(iso);
    toast(on ? tr('{name} — на вашей карте', { name: name(c) }) : tr('{name} убрали с карты', { name: name(c) }), 'flag');
  };

  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = [...WORLD].sort((a, b) => (lang === 'en' ? a.en : a.name).localeCompare(lang === 'en' ? b.en : b.name));
    return s ? all.filter((c) => c.name.toLowerCase().includes(s) || c.en.toLowerCase().includes(s)) : all;
  }, [q, lang]);

  const share = async () => {
    setBusy(true);
    track('share', { kind: 'travel_map' });
    try {
      const ok = await shareViewAsImage(poster, `voyz-world-${stats.n}`, tr('Моя карта путешествий — Voyz'));
      if (!ok) toast(tr('Не удалось поделиться'), 'share');
    } catch {
      toast(tr('Не удалось подготовить картинку'), 'share');
    } finally {
      setBusy(false);
    }
  };

  const mapH = Math.round(w / 1.65);

  return (
    <View>
      {/* цифры */}
      <View style={styles.stats}>
        <Stat value={String(stats.n)} label={pl(stats.n, 'страна', 'страны', 'стран')} />
        <Stat value={`${stats.pct}%`} label={tr('мира')} />
        <Stat value={`${stats.conts}/6`} label={tr('континентов')} />
        <Stat value={String(stats.places)} label={tr('мест Voyz')} />
      </View>

      {/* интерактивная карта */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
        <Chip small label={tr('Весь мир')} on={!region} onPress={() => setRegion(null)} />
        {CONTINENTS.map((c) => (
          <Chip key={c} small label={tr(c)} on={region === c} onPress={() => setRegion(region === c ? null : c)} />
        ))}
      </View>
      <View style={[styles.mapCard, { height: mapH }]}>
        <WorldMap width={w} height={mapH} visited={stats.set} points={stats.points} region={region} onPressCountry={onCountry} />
      </View>
      <Text style={styles.hint}>{tr('Нажмите на страну, чтобы отметить или снять отметку')}</Text>
      <Button label={tr('Найти страну')} icon="search" tone="grey" onPress={() => setSearch(true)} style={{ marginTop: 10 }} />

      {stats.countries.length ? (
        <View style={styles.flags}>
          {stats.countries.map((c) => (
            <Pressable key={c.iso} onPress={() => onCountry(c.iso)} style={styles.flagChip} accessibilityRole="button" accessibilityLabel={name(c)}>
              <Text style={styles.flagTxt}>
                {flag(c.iso)} {name(c)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* постер — именно этот блок уходит картинкой в соцсети */}
      <Text style={[styles.h, { marginTop: 26, marginBottom: 12 }]}>{tr('Постер для соцсетей')}</Text>
      <View ref={poster} collapsable={false} style={styles.poster}>
        <View style={styles.posterTop}>
          <VoyzLogo width={78} />
          <Text style={styles.posterKicker}>{tr('Моя карта путешествий')}</Text>
        </View>
        <View style={styles.posterMap}>
          <WorldMap width={POSTER_W - 32} height={Math.round((POSTER_W - 32) / 1.9)} visited={stats.set} points={stats.points} dark />
        </View>
        <View style={styles.bigRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.big}>{stats.n}</Text>
            <Text style={styles.bigL}>{tr('{word} из {total}', { word: pl(stats.n, 'страна', 'страны', 'стран'), total: WORLD_TOTAL })}</Text>
          </View>
          <View style={styles.pctRing}>
            <Text style={styles.pct}>{stats.pct}%</Text>
            <Text style={styles.pctL}>{tr('мира')}</Text>
          </View>
        </View>
        <View style={styles.posterStats}>
          <Text style={styles.posterStat}>
            {stats.conts} {pl(stats.conts, 'континент', 'континента', 'континентов')}
          </Text>
          <Text style={styles.posterStat}>
            {stats.places} {pl(stats.places, 'место', 'места', 'мест')} Voyz
          </Text>
        </View>
        {stats.countries.length ? (
          <Text style={styles.posterFlags} numberOfLines={3}>
            {stats.countries.map((c) => flag(c.iso)).join(' ')}
          </Text>
        ) : null}
        <Text style={styles.posterFoot}>{tr('voyz · Больше, чем просто поездки')}</Text>
      </View>
      <Button label={busy ? tr('Готовим картинку…') : tr('Поделиться картой')} icon="share" disabled={busy} onPress={share} style={{ marginTop: 14 }} />

      {stats.list.length ? (
        <View style={{ gap: 10, marginTop: 26 }}>
          <Text style={styles.h}>{tr('Места Voyz, где вы были')}</Text>
          {stats.list.map(({ p, at }) => (
            <RowPlaceCard key={p.id} place={p} sub={tr('Отмечено {date} · {cat}', { date: dateLabel(at), cat: catLabel(p.cat) })} />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <IconBubble name="flag" size={48} />
          <Text style={styles.emptyB}>{tr('Отмечайте, где уже были')}</Text>
          <Text style={styles.emptyT}>{tr('Нажмите «Я здесь был» в карточке места — точка появится на вашей карте, и ею можно поделиться.')}</Text>
        </View>
      )}

      <Sheet visible={search} onClose={() => setSearch(false)} title={tr('Где вы были?')} tall>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={color.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder={tr('Страна')} placeholderTextColor={color.muted} style={styles.input} accessibilityLabel={tr('Найти страну')} autoCorrect={false} />
        </View>
        {found.map((c) => {
          const on = stats.set.has(c.iso);
          return (
            <Pressable key={c.iso} onPress={() => onCountry(c.iso)} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Text style={styles.rowFlag}>{flag(c.iso)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{name(c)}</Text>
                <Text style={styles.rowSub}>{tr(c.cont)}</Text>
              </View>
              <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={14} color={color.black} /> : null}</View>
            </Pressable>
          );
        })}
        {!found.length ? <Text style={[styles.rowSub, { paddingVertical: 20, textAlign: 'center' }]}>{tr('Ничего не нашли')}</Text> : null}
      </Sheet>
    </View>
  );
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statV}>{value}</Text>
    <Text style={styles.statL} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: color.mist, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  statV: { fontFamily: 'Mulish_800ExtraBold', fontSize: 20, color: color.black },
  statL: { fontFamily: 'Mulish_500Medium', fontSize: 11.5, color: color.muted, marginTop: 2 },
  mapCard: { marginTop: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: '#EAF2F8' },
  hint: { ...type.caption, fontSize: 12.5, color: color.muted, marginTop: 8, textAlign: 'center' },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  flagChip: { backgroundColor: color.limeSoft, borderColor: color.limeLine, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  flagTxt: { fontFamily: 'Mulish_600SemiBold', fontSize: 13, color: color.black },
  poster: { width: POSTER_W, alignSelf: 'center', backgroundColor: color.black, borderRadius: 28, padding: 16, overflow: 'hidden' },
  posterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  posterKicker: { fontFamily: 'Mulish_600SemiBold', fontSize: 12, color: color.mutedOnDark },
  posterMap: { marginTop: 14, borderRadius: 16, overflow: 'hidden' },
  bigRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  big: { fontFamily: 'Mulish_800ExtraBold', fontSize: 52, lineHeight: 56, color: color.lime },
  bigL: { fontFamily: 'Mulish_500Medium', fontSize: 14, color: color.paper },
  pctRing: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: 'Mulish_800ExtraBold', fontSize: 18, color: color.paper },
  pctL: { fontFamily: 'Mulish_500Medium', fontSize: 11, color: color.mutedOnDark },
  posterStats: { flexDirection: 'row', gap: 6, marginTop: 12 },
  posterStat: { fontFamily: 'Mulish_600SemiBold', fontSize: 12, color: color.black, backgroundColor: color.lime, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4 },
  posterFlags: { fontSize: 18, lineHeight: 26, marginTop: 12, color: color.paper },
  posterFoot: { fontFamily: 'Mulish_500Medium', fontSize: 11, color: color.mutedOnDark, marginTop: 14, textAlign: 'center' },
  h: { fontFamily: 'Mulish_600SemiBold', fontSize: 18, textTransform: 'uppercase', color: color.black },
  empty: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 26 },
  emptyB: { fontFamily: 'Mulish_700Bold', fontSize: 17, color: color.black, marginTop: 14 },
  emptyT: { ...type.caption, fontSize: 14, lineHeight: 20, color: color.muted, textAlign: 'center', marginTop: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.mist, borderRadius: 14, paddingHorizontal: 12, height: 46, marginBottom: 8 },
  input: { flex: 1, fontFamily: 'Mulish_400Regular', fontSize: 15.5, color: color.black, height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  rowFlag: { fontSize: 22, width: 30, textAlign: 'center' },
  rowName: { fontFamily: 'Mulish_600SemiBold', fontSize: 15.5, color: color.black },
  rowSub: { fontFamily: 'Mulish_400Regular', fontSize: 12.5, color: color.muted },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: color.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: color.lime, borderColor: color.lime },
});
