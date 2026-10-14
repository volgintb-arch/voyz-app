// «Мои путешествия»: отмеченные места («Я здесь был»), процент страны, категории, постер для соцсетей.
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RowPlaceCard } from '@/components/place-cards';
import { Button, Chip, IconBubble } from '@/components/ui';
import { VoyzLogo } from '@/components/voyz-logo';
import { catLabel, catShort, getPlace, meta, placesOf } from '@/data/places';
import type { CountryCode, Place } from '@/data/types';
import { shareViewAsImage } from '@/lib/share-image';
import { toast, useApp } from '@/store/app-store';
import { color, type } from '@/theme/tokens';
import { dateLabel, pl, tr } from '@/i18n';

import { TravelMap } from './travel-map';

const POSTER_W = 335;

export function PassportPane() {
  const visited = useApp((s) => s.visited);
  const current = useApp((s) => s.country) ?? 'kg';
  const [country, setCountry] = useState<CountryCode>(current);
  const poster = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const ids = new Set(Object.keys(visited));
    const all = placesOf(country);
    const mine = all.filter((p) => ids.has(p.id));
    const cats = new Map<string, number>();
    mine.forEach((p) => cats.set(catShort(p.cat), (cats.get(catShort(p.cat)) ?? 0) + 1));
    const byCountry = (['kg', 'alt'] as CountryCode[]).map((c) => ({ c, n: placesOf(c).filter((p) => ids.has(p.id)).length }));
    const list = Object.entries(visited)
      .map(([id, at]) => ({ p: getPlace(id), at }))
      .filter((x): x is { p: Place; at: string } => !!x.p && x.p.c === country)
      .sort((a, b) => b.at.localeCompare(a.at));
    return { ids, total: all.length, n: mine.length, pct: all.length ? Math.round((mine.length / all.length) * 100) : 0, cats: [...cats].sort((a, b) => b[1] - a[1]).slice(0, 4), byCountry, list };
  }, [visited, country]);

  const share = async () => {
    setBusy(true);
    try {
      const ok = await shareViewAsImage(poster, `voyz-${country}-${stats.n}`, tr('Моя карта путешествий — Voyz'));
      if (!ok) toast(tr('Не удалось поделиться'), 'share');
    } catch {
      toast(tr('Не удалось подготовить картинку'), 'share');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {stats.byCountry.map(({ c, n }) => (
          <Chip key={c} small label={`${tr(meta.countries[c].name)} · ${n}`} on={c === country} onPress={() => setCountry(c)} />
        ))}
      </View>

      {/* постер — именно этот блок уходит картинкой в соцсети */}
      <View ref={poster} collapsable={false} style={styles.poster}>
        <View style={styles.posterTop}>
          <VoyzLogo width={78} />
          <Text style={styles.posterKicker}>{tr('Моя карта путешествий')}</Text>
        </View>
        <Text style={styles.posterTitle}>{tr(meta.countries[country].name)}</Text>
        <View style={styles.mapBox}>
          <TravelMap country={country} visited={stats.ids} width={POSTER_W - 32} height={220} />
        </View>
        <View style={styles.bigRow}>
          <View>
            <Text style={styles.big}>{stats.n}</Text>
            <Text style={styles.bigL}>{tr('{n} мест из {total}', { n: pl(stats.n, 'место', 'места', 'мест'), total: stats.total })}</Text>
          </View>
          <View style={styles.pctRing}>
            <Text style={styles.pct}>{stats.pct}%</Text>
            <Text style={styles.pctL}>{tr('страны')}</Text>
          </View>
        </View>
        {stats.cats.length ? (
          <View style={styles.cats}>
            {stats.cats.map(([k, n]) => (
              <Text key={k} style={styles.cat}>
                {tr(k)} · {n}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.posterFoot}>{tr('voyz · Больше, чем просто поездки')}</Text>
      </View>

      <Button label={busy ? tr('Готовим картинку…') : tr('Поделиться картой')} icon="share" disabled={busy} onPress={share} style={{ marginTop: 14 }} />

      {stats.list.length ? (
        <View style={{ gap: 10, marginTop: 22 }}>
          <Text style={styles.h}>{tr('Где вы были')}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { width: POSTER_W, alignSelf: 'center', backgroundColor: color.black, borderRadius: 28, padding: 16, overflow: 'hidden' },
  posterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  posterKicker: { fontFamily: 'Mulish_600SemiBold', fontSize: 12, color: color.mutedOnDark },
  posterTitle: { ...type.screenTitle, fontSize: 28, lineHeight: 30, color: color.paper, marginTop: 14 },
  mapBox: { marginTop: 10, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0b0d08' },
  bigRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  big: { fontFamily: 'Mulish_800ExtraBold', fontSize: 48, lineHeight: 52, color: color.lime },
  bigL: { fontFamily: 'Mulish_500Medium', fontSize: 14, color: color.paper },
  pctRing: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: 'Mulish_800ExtraBold', fontSize: 20, color: color.paper },
  pctL: { fontFamily: 'Mulish_500Medium', fontSize: 11, color: color.mutedOnDark },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  cat: { fontFamily: 'Mulish_600SemiBold', fontSize: 12, color: color.black, backgroundColor: color.lime, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4 },
  posterFoot: { fontFamily: 'Mulish_500Medium', fontSize: 11, color: color.mutedOnDark, marginTop: 14, textAlign: 'center' },
  h: { fontFamily: 'Mulish_600SemiBold', fontSize: 18, textTransform: 'uppercase', color: color.black },
  empty: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 26 },
  emptyB: { fontFamily: 'Mulish_700Bold', fontSize: 17, color: color.black, marginTop: 14 },
  emptyT: { ...type.caption, fontSize: 14, lineHeight: 20, color: color.muted, textAlign: 'center', marginTop: 6 },
});
