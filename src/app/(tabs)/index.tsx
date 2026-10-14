// «Обзор»: шапка с логотипом и страной, подборка по текущему месяцу, места по категориям.
// Поиск, фильтры и «Все места» — шаг 3 плана (docs/05_ROADMAP.md).
import { useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountrySegment } from '@/components/country-segment';
import { BigPlaceCard, RowPlaceCard } from '@/components/place-cards';
import { VoyzLogo } from '@/components/voyz-logo';
import { MONTHS_IN, catShort, filterPlaces, placesOf, plural } from '@/data/places';
import { useApp } from '@/store/app-store';
import { color, radius, spacing, type } from '@/theme/tokens';

export default function Home() {
  const insets = useSafeAreaInsets();
  const country = useApp((s) => s.country) ?? 'kg';
  const month = new Date().getMonth();

  const { all, inSeason, cats } = useMemo(() => {
    const all = placesOf(country);
    const inSeason = filterPlaces(country, { season: true }).slice(0, 10);
    const counts = new Map<string, number>();
    for (const p of all) counts.set(catShort(p.cat), (counts.get(catShort(p.cat)) ?? 0) + 1);
    const cats = [...counts].sort((a, b) => b[1] - a[1]);
    return { all, inSeason, cats };
  }, [country]);

  const best = useMemo(() => filterPlaces(country, {}).slice(0, 8), [country]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
      <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
        <View style={styles.topRow}>
          <VoyzLogo width={86} />
          <CountrySegment />
        </View>
        <Text style={styles.title}>Куда поедем{'\n'}в {MONTHS_IN[month]}?</Text>
        <Text style={styles.sub}>
          {all.length} {plural(all.length, 'место', 'места', 'мест')} · маршруты, ночлег, парковки
        </Text>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.secTitle}>Хорошо в {MONTHS_IN[month]}</Text>
        <FlatList
          horizontal
          data={inSeason}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <BigPlaceCard place={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.screenGutter, gap: spacing.cardGap }}
        />

        <View style={styles.chips}>
          {cats.map(([name, n]) => (
            <View key={name} style={styles.chip}>
              <Text style={styles.chipText}>{name}</Text>
              <Text style={styles.chipCount}>{n}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.secTitle}>Лучше всего изучено</Text>
        <View style={{ paddingHorizontal: spacing.screenGutter, gap: 10 }}>
          {best.map((p) => (
            <RowPlaceCard key={p.id} place={p} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  top: { paddingHorizontal: spacing.screenGutter, paddingBottom: 64 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.screenTitle, color: color.paper, marginTop: 22 },
  sub: { ...type.caption, color: color.mutedOnDark, marginTop: 8 },
  // белый лист наезжает на чёрную шапку
  sheet: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: -34,
    paddingTop: 26,
    minHeight: 600,
  },
  secTitle: { ...type.sectionTitle, color: color.black, marginTop: 8, marginBottom: 16, paddingHorizontal: spacing.screenGutter },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.chipGap, padding: spacing.screenGutter, paddingBottom: 26 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.mist, borderRadius: 999, paddingHorizontal: 14, height: 36 },
  chipText: { ...type.caption, fontFamily: 'Mulish_600SemiBold', color: color.black },
  chipCount: { ...type.caption, color: color.muted },
});
