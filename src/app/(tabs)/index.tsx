// «Обзор» (docs/02_UX_SPEC.md → 1): шапка с поиском, подборки, категории и сетка «Все места».
// Один FlashList: подборки — в шапке списка, сетка мест (или результаты поиска) — тело, оно виртуализируется.
import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountrySegment } from '@/components/country-segment';
import { FilterSheet } from '@/components/filter-sheet';
import { Icon } from '@/components/icon';
import { BigPlaceCard, MiniPlaceCard, RowPlaceCard } from '@/components/place-cards';
import { Chip, SectionHeader } from '@/components/ui';
import { VoyzLogo } from '@/components/voyz-logo';
import { catShort, filterPlaces, noCar, placesOf, type Filters } from '@/data/places';
import type { Place } from '@/data/types';
import { HUB } from '@/geo/geo-data';
import { catIcon } from '@/lib/icon-rules';
import { haversine } from '@/lib/text';
import { track } from '@/services/analytics';
import { useApp } from '@/store/app-store';
import { hasFilters, useFilters } from '@/store/filters';
import { color, radius, spacing, type } from '@/theme/tokens';
import { dataLabel, monthIn, pl, tr } from '@/i18n';

const byIdx = (a: Place, b: Place) => (b.idx || 0) - (a.idx || 0);

export default function Home() {
  const insets = useSafeAreaInsets();
  const country = useApp((s) => s.country) ?? 'kg';
  const { f, set: setFilters, remove } = useFilters();
  const [q, setQ] = useState(f.q ?? '');
  const [sheet, setSheet] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const openSheet = () => {
    setSheetKey((k) => k + 1);
    setSheet(true);
  };
  const listRef = useRef<React.ComponentRef<typeof FlashList<Place>>>(null);
  const m = new Date().getMonth();

  // поиск с задержкой 160 мс, как в прототипе
  useEffect(() => {
    const t = setTimeout(() => useFilters.getState().patch({ q: q.trim() || undefined }), 160);
    return () => clearTimeout(t);
  }, [q]);
  // фильтры сбросили снаружи (смена страны, крестик на чипсе) — очищаем и поле поиска
  useEffect(() => useFilters.subscribe((s, prev) => prev.f.q && !s.f.q && setQ('')), []);

  const rails = useMemo(() => {
    const L = placesOf(country);
    const hub = HUB[country];
    const cats = new Map<string, number>();
    L.forEach((p) => cats.set(catShort(p.cat), (cats.get(catShort(p.cat)) ?? 0) + 1));
    return {
      all: [...L].sort(byIdx),
      season: filterPlaces(country, { season: true }).slice(0, 10),
      best: [...L].sort(byIdx).slice(0, 5),
      nocar: L.filter(noCar).sort(byIdx).slice(0, 10),
      near: L.filter((p) => p.ll && haversine(p.ll, hub.ll) < 170)
        .sort((a, b) => haversine(a.ll!, hub.ll) - haversine(b.ll!, hub.ll))
        .slice(0, 6),
      cats: [...cats].sort((a, b) => b[1] - a[1]),
      hub,
    };
  }, [country]);

  const filtered = hasFilters(f);
  const results = useMemo(() => (filtered ? filterPlaces(country, f) : rails.all), [filtered, country, f, rails.all]);

  const show = (nf: Filters & { best?: boolean }) => {
    setFilters({ ...nf, q: f.q });
    listRef.current?.scrollToOffset({ offset: 300, animated: true });
  };

  const tagLabel = (k: string, v: unknown) =>
    k === 'q' ? `«${v}»` : k === 'month' ? tr('Сезон: {month}', { month: monthIn((v as number) - 1) }) : k === 'nocar' ? tr('Без машины') : k === 'photo' ? tr('С фото') : k === 'season' ? tr('Сезон сейчас') : k === 'best' ? tr('По полноте') : k === 'diff' ? tr('Сложность: {v}…', { v: String(v) }) : k === 'cat' || k === 'acc' ? dataLabel(tr(String(v))) : String(v);

  const header = (
    <>
      <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
        <View style={styles.topRow}>
          <VoyzLogo width={86} />
          <CountrySegment />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {tr('Куда поедем\nв {month}?', { month: monthIn(m) })}
        </Text>
        <Text style={styles.sub}>
          {tr('{n} {places} · маршруты, ночлег, парковки', { n: rails.all.length, places: pl(rails.all.length, 'место', 'места', 'мест') })}
        </Text>
        <View style={styles.search}>
          <Icon name="search" size={20} color={color.paper} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={tr('Озеро, перевал, село…')}
            placeholderTextColor="#8a8a85"
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={tr('Поиск мест')}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel={tr('Очистить поиск')} style={{ padding: 6 }}>
              <Icon name="close" size={18} color={color.mutedOnDark} />
            </Pressable>
          ) : null}
          <Pressable onPress={openSheet} style={styles.filterBtn} accessibilityRole="button" accessibilityLabel={tr('Фильтры')}>
            <Icon name="filter" size={19} color={color.black} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.sheetTop}>
        {filtered ? (
          <View style={styles.tags}>
            {Object.entries(f).map(([k, v]) => (
              <Pressable key={k} onPress={() => (k === 'q' ? setQ('') : remove(k as keyof typeof f))} style={styles.tagOn} accessibilityRole="button" accessibilityLabel={tr('Убрать фильтр {f}', { f: tagLabel(k, v) })}>
                <Text style={styles.tagText}>{tagLabel(k, v)}</Text>
                <Icon name="close" size={14} color={color.lime} strokeWidth={2.2} />
              </Pressable>
            ))}
            <Text style={styles.counter}>
              {results.length} {pl(results.length, 'место', 'места', 'мест')}
            </Text>
          </View>
        ) : (
          <>
            {rails.season.length > 0 && (
              <View>
                <View style={styles.gutter}>
                  <SectionHeader title={tr('Хорошо в {month}', { month: monthIn(m) })} more={tr('Все')} onMore={() => show({ season: true })} />
                </View>
                <Rail data={rails.season} />
              </View>
            )}
            <FlatList
              horizontal
              data={rails.cats}
              keyExtractor={([k]) => k}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.screenGutter, gap: spacing.chipGap, paddingTop: 26 }}
              renderItem={({ item: [k, n] }) => <Chip label={tr(k)} icon={catIcon(k)} count={n} onPress={() => show({ cat: k })} />}
            />
            <View style={[styles.gutter, { paddingTop: spacing.sectionGap }]}>
              <SectionHeader title={tr('Лучше всего изучено')} more={tr('Все')} onMore={() => show({ best: true })} />
              <Text style={styles.note}>{tr('Индекс — полнота и свежесть проверенных данных')}</Text>
              <View style={{ gap: 10 }}>
                {rails.best.map((p) => (
                  <RowPlaceCard key={p.id} place={p} />
                ))}
              </View>
            </View>
            {rails.nocar.length > 0 && (
              <View style={{ paddingTop: spacing.sectionGap }}>
                <View style={styles.gutter}>
                  <SectionHeader title={tr('Можно без машины')} more={tr('Все')} onMore={() => show({ nocar: true })} />
                </View>
                <Rail data={rails.nocar} />
              </View>
            )}
            {rails.near.length > 0 && (
              <View style={[styles.gutter, { paddingTop: spacing.sectionGap, gap: 10 }]}>
                <SectionHeader title={tr('Недалеко от {hub}', { hub: tr(rails.hub.n) })} />
                {rails.near.map((p) => (
                  <RowPlaceCard key={p.id} place={p} sub={tr('≈{km} км по прямой · {acc}', { km: Math.round(haversine(p.ll!, rails.hub.ll)), acc: dataLabel(p.s.acc) })} />
                ))}
              </View>
            )}
            <View style={[styles.gutter, { paddingTop: spacing.sectionGap }]}>
              <SectionHeader title={tr('Все места')} more={tr('Фильтры')} onMore={openSheet} />
            </View>
          </>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      <FlashList
        ref={listRef}
        data={results}
        numColumns={2}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <View style={[styles.cell, index % 2 ? { paddingLeft: 6 } : { paddingRight: 6 }]}>
            <MiniPlaceCard place={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="search" size={20} color={color.black} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>{tr('Ничего не нашли')}</Text>
            <Text style={styles.emptyText}>{tr('Уберите один из фильтров или поищите по названию села.')}</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: insets.bottom + 110 }} />}
        style={{ backgroundColor: color.black }}
        contentContainerStyle={{ backgroundColor: color.paper }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
      <FilterSheet
        key={sheetKey}
        visible={sheet}
        country={country}
        value={f}
        onClose={() => setSheet(false)}
        onApply={(nf) => {
          setSheet(false);
          track('filter_apply', { filters: Object.keys(nf).filter((k) => nf[k as keyof typeof nf] != null), results: filterPlaces(country, nf).length });
          show(nf);
        }}
      />
    </View>
  );
}

function Rail({ data }: { data: Place[] }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <BigPlaceCard place={item} />}
      showsHorizontalScrollIndicator={false}
      snapToInterval={250 + spacing.cardGap}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: spacing.screenGutter, gap: spacing.cardGap }}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  top: { paddingHorizontal: spacing.screenGutter, paddingBottom: 64, backgroundColor: color.black },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.screenTitle, color: color.paper, marginTop: 22 },
  sub: { ...type.caption, color: color.mutedOnDark, marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 999, backgroundColor: '#1b1b1b', paddingLeft: 18, paddingRight: 7, marginTop: 18 },
  input: { flex: 1, color: color.paper, fontFamily: 'Mulish_400Regular', fontSize: 15.5, minWidth: 0, height: '100%' },
  filterBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  // белый лист наезжает на чёрную шапку
  sheetTop: { backgroundColor: color.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, marginTop: -34, paddingTop: 30, paddingBottom: 18 },
  gutter: { paddingHorizontal: spacing.screenGutter },
  note: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: -8, marginBottom: 14 },
  cell: { paddingHorizontal: spacing.screenGutter, paddingBottom: 12, backgroundColor: color.paper },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingHorizontal: spacing.screenGutter, paddingTop: 4 },
  tagOn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: color.black },
  tagText: { fontFamily: 'Mulish_500Medium', fontSize: 13.5, color: color.lime },
  counter: { ...type.caption, color: color.muted, marginLeft: 4 },
  empty: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 40, backgroundColor: color.paper },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { ...type.label, fontFamily: 'Mulish_700Bold', color: color.black },
  emptyText: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: 4 },
});
