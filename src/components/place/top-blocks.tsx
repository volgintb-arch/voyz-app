// Верх карточки под hero: сетка 2×2 в рамке с градиентом, «Почему стоит приехать», «Главное», медиа.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { RichText } from '@/components/rich-text';
import { IconBubble, ReadMore, SectionHeader } from '@/components/ui';
import { photoSource, seasonLabel } from '@/data/places';
import type { Place } from '@/data/types';
import { accIcon } from '@/lib/icon-rules';
import { cut, firstClause, lead, sentences } from '@/lib/text';
import { color, spacing, type } from '@/theme/tokens';
import { dataLabel, durationLabel, tr } from '@/i18n';

export function InfoGrid({ place }: { place: Place }) {
  const onsite: [IconName, string, string] = place.s.onsite ? ['timer', 'Время на месте', durationLabel(place.s.onsite)] : ['wallet', 'Вход', place.s.entry || '—'];
  const items: [IconName, string, string][] = [
    ['checks', 'Сложность', dataLabel(place.s.diff)],
    ['cal', 'Когда', seasonLabel(place)],
    [accIcon(place.s.acc), 'Доступ', dataLabel(place.s.acc)],
    onsite,
  ];
  return (
    // рамка 1.6 px с градиентом лайм → белый → лайм: градиент снаружи, чёрная подложка внутри
    <LinearGradient colors={['rgba(216,252,0,.25)', 'rgba(255,255,255,.18)', 'rgba(216,252,0,.9)']} locations={[0, 0.4, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gridRim}>
      <View style={styles.grid}>
        {items.map(([ic, k, v]) => (
          <View key={k} style={styles.it}>
            <IconBubble name={ic} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.itK}>{tr(k)}</Text>
              <Text style={styles.itV} numberOfLines={2}>
                {v || tr('пока не подтверждено')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

export function WhySection({ place, onRead }: { place: Place; onRead: () => void }) {
  const text = place.guide || place.short;
  return (
    <View style={styles.dark}>
      <SectionHeader title={tr('Почему стоит приехать')} light />
      <RichText style={styles.lead} numStyle={{ color: color.lime }}>
        {lead(text, 3)}
      </RichText>
      {sentences(place.guide).length > 3 ? <ReadMore label={tr('Читать полностью')} onPress={onRead} light /> : null}
    </View>
  );
}

/** «Главное»: до 6 строк «иконка — метка — одна фраза». */
export function KeyFacts({ place }: { place: Place }) {
  const F: [IconName, string, string][] = [];
  const tt = firstClause(place.traveltime, 80);
  if (tt) F.push(['car', 'Дорога', tt]);
  if (place.entry) F.push(['wallet', 'Вход', firstClause(place.entry, 80)]);
  if (place.daytime) F.push(['sun', 'Лучшее время', firstClause(place.daytime, 80)]);
  if (place.net) F.push(['signal', 'Связь', firstClause(place.net, 80)]);
  if (place.stay) F.push(['bed', 'Ночлег', firstClause(place.stay, 80)]);
  if (place.warn) F.push(['warn', 'Осторожно', firstClause(place.warn, 90)]);
  if (!F.length) return null;
  return (
    <View style={styles.kfBox}>
      {F.slice(0, 6).map(([ic, k, v], i) => (
        <View key={k} style={[styles.kf, i > 0 && styles.kfLine]}>
          <View style={styles.kfi}>
            <Icon name={ic} size={17} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kfK}>{tr(k)}</Text>
            <RichText style={styles.kfV}>{v}</RichText>
          </View>
        </View>
      ))}
    </View>
  );
}

const ytId = (u: string) => (String(u).match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) ?? [])[1];

/** Медиа: большая плитка и две маленькие, «+N»; видео — плитка с ▶ и превью YouTube (онлайн). */
export function MediaBlock({ place, onView }: { place: Place; onView: (i: number) => void }) {
  const ph = place.photos;
  const vids = place.videos || [];
  if (!ph.length && !vids.length) return null;
  const tiles: React.ReactNode[] = [];
  ph.slice(0, 3).forEach((x, i) =>
    tiles.push(
      <Pressable key={x.f} onPress={() => onView(i)} style={[styles.tile, i === 0 && ph.length + vids.length > 1 && styles.tileBig]} accessibilityRole="imagebutton" accessibilityLabel={x.cap || place.name}>
        <Image source={photoSource(place, i, i === 0)} style={StyleSheet.absoluteFill} contentFit="cover" />
        {i === 2 && ph.length > 3 ? (
          <View style={styles.more}>
            <Text style={styles.moreT}>+{ph.length - 3}</Text>
          </View>
        ) : null}
      </Pressable>,
    ),
  );
  vids.slice(0, Math.max(0, 3 - tiles.length)).forEach((v) => {
    const id = ytId(v.u);
    tiles.push(
      <Pressable key={v.u} onPress={() => Linking.openURL(v.u)} style={[styles.tile, tiles.length === 0 && styles.tileBig, { backgroundColor: '#111' }]} accessibilityRole="link" accessibilityLabel={tr('Видео: {t}', { t: v.t })}>
        {id ? <Image source={{ uri: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <View style={styles.playBtn}>
          <Icon name="play" size={16} fill={color.black} strokeWidth={0} />
        </View>
        <Text style={styles.vt} numberOfLines={2}>
          {cut(v.t, 60)}
        </Text>
      </Pressable>,
    );
  });
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Медиа')} more={ph.length ? tr('Смотреть все') : undefined} onMore={() => onView(0)} />
      <View style={styles.media}>{tiles}</View>
      {vids.length ? (
        <View style={{ gap: 8, marginTop: 12 }}>
          {vids.slice(0, 4).map((v) => (
            <Pressable key={v.u} onPress={() => Linking.openURL(v.u)} style={styles.vlink} accessibilityRole="link">
              <Icon name="play" size={16} />
              <Text style={styles.vlinkT} numberOfLines={1}>
                {cut(v.t, 44)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gridRim: { marginHorizontal: 20, marginTop: 6, borderRadius: 28, padding: 1.6 },
  grid: { borderRadius: 26.4, backgroundColor: '#000', paddingVertical: 20, paddingHorizontal: 18, flexDirection: 'row', flexWrap: 'wrap', rowGap: 20 },
  it: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 11, paddingRight: 6 },
  itK: { fontFamily: 'Mulish_500Medium', fontSize: 16, lineHeight: 18, color: color.paper },
  itV: { ...type.caption, color: color.mutedOnDark, marginTop: 2 },
  dark: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 60 },
  lead: { fontFamily: 'Mulish_400Regular', fontSize: 17.5, lineHeight: 27, color: '#f0f0ea' },
  sec: { paddingHorizontal: spacing.screenGutter, paddingTop: spacing.sectionGap },
  kfBox: { marginHorizontal: spacing.screenGutter, marginTop: 26, borderRadius: 24, backgroundColor: color.mist, overflow: 'hidden' },
  kf: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 13, paddingHorizontal: 14 },
  kfLine: { borderTopWidth: 1, borderTopColor: '#e3e3de' },
  kfi: { width: 32, height: 32, borderRadius: 10, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' },
  kfK: { fontFamily: 'Mulish_700Bold', fontSize: 13, color: color.black },
  kfV: { fontFamily: 'Mulish_400Regular', fontSize: 14, lineHeight: 19, color: '#333', marginTop: 1 },
  media: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, height: 120, borderRadius: 20, overflow: 'hidden', backgroundColor: color.mist },
  tileBig: { width: '100%', height: 200 },
  more: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center' },
  moreT: { fontFamily: 'Mulish_700Bold', fontSize: 22, color: color.paper },
  playBtn: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.9)', alignItems: 'center', justifyContent: 'center' },
  vt: { position: 'absolute', left: 10, right: 10, bottom: 8, fontFamily: 'Mulish_600SemiBold', fontSize: 12, color: color.paper },
  vlink: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: color.mist },
  vlinkT: { fontFamily: 'Mulish_500Medium', fontSize: 13.5, color: color.black, flex: 1 },
});
