// Карточки мест: большая (.bigcard 250×330), строка (.rowcard с кольцом индекса), мини (.mini 3:4 для сетки).
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PhotoShade } from '@/components/photo-shade';
import { HeartButton, IndexRing } from '@/components/ui';
import { catLabel, locLabel, photoSource, seasonLabel } from '@/data/places';
import { dataLabel } from '@/i18n';
import type { Place } from '@/data/types';
import { catIcon } from '@/lib/icon-rules';
import { measureWin, setFlight } from '@/lib/photo-flight';
import { color, radius, type } from '@/theme/tokens';

function Cover({ place, big, style, ref }: { place: Place; big?: boolean; style: object; ref?: RefObject<View | null> }) {
  const src = photoSource(place, 0, big);
  if (src)
    return (
      <View ref={ref} style={style} collapsable={false}>
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />
      </View>
    );
  // фото нет — не выдумываем: нейтральная плашка с иконкой категории
  return (
    <View style={[style, styles.noPhoto]}>
      <Icon name={catIcon(place.cat)} size={30} color="#9aa08f" strokeWidth={1.5} />
    </View>
  );
}

// Link asChild передаёт стиль через Slot: он принимает только плоский объект (не функцию и не массив),
// поэтому нажатие — через состояние, а стиль — через StyleSheet.flatten
// photo — ссылка на фото карточки: при нажатии запоминаем его место на экране, и оно «летит» в hero
function PlaceLink({ place, children, style, photo, radius: r }: { place: Place; children: ReactNode; style: object; photo: RefObject<View | null>; radius: number }) {
  const [pressed, setPressed] = useState(false);
  const measure = () =>
    measureWin(photo.current, (x, y, w, h) => {
      if (w) setFlight(place.id, { x, y, w, h, r });
    });
  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <Pressable
        style={StyleSheet.flatten([style, pressed && { transform: [{ scale: 0.98 }] }])}
        onPressIn={() => {
          setPressed(true);
          measure();
        }}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={place.name}>
        {children}
      </Pressable>
    </Link>
  );
}

export function BigPlaceCard({ place }: { place: Place }) {
  const photo = useRef<View>(null);
  return (
    <PlaceLink place={place} style={styles.big} photo={photo} radius={radius.card}>
      <Cover ref={photo} place={place} big style={StyleSheet.absoluteFill} />
      <PhotoShade from={0.35} />
      <View style={styles.bigTop}>
        {place.rating ? (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>{place.rating.v}</Text>
            <Icon name="star" size={13} color={color.black} fill={color.black} />
          </View>
        ) : (
          <View />
        )}
        <HeartButton id={place.id} style={styles.heartBig} />
      </View>
      <View style={styles.bigBody}>
        <Text style={styles.bigTitle} numberOfLines={3}>
          {place.name}
        </Text>
        <View style={styles.locRow}>
          <Icon name="pin" size={14} color={color.mutedOnDark} />
          <Text style={styles.loc}>{locLabel(place)}</Text>
        </View>
        <View style={styles.chips}>
          {[dataLabel(place.s.diff), seasonLabel(place), dataLabel(place.s.acc)].filter(Boolean).map((t) => (
            <Text key={t} style={styles.chip}>
              {t}
            </Text>
          ))}
        </View>
      </View>
    </PlaceLink>
  );
}

export function RowPlaceCard({ place, sub, right }: { place: Place; sub?: string; right?: ReactNode }) {
  const photo = useRef<View>(null);
  return (
    <PlaceLink place={place} style={styles.row} photo={photo} radius={14}>
      <Cover ref={photo} place={place} style={styles.thumb} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {place.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {sub ?? `${catLabel(place.cat)} · ${locLabel(place)}`}
        </Text>
        <View style={styles.go}>
          <Icon name="arrow" size={14} color={color.black} strokeWidth={2.2} />
        </View>
      </View>
      {right ?? (place.idx ? <IndexRing value={place.idx} /> : null)}
    </PlaceLink>
  );
}

export function MiniPlaceCard({ place }: { place: Place }) {
  const photo = useRef<View>(null);
  return (
    <PlaceLink place={place} style={styles.mini} photo={photo} radius={20}>
      <Cover ref={photo} place={place} style={StyleSheet.absoluteFill} />
      <PhotoShade from={0.4} to="rgba(0,0,0,.8)" />
      <HeartButton id={place.id} size={20} style={styles.heartMini} />
      <View style={styles.miniBody}>
        <Text style={styles.miniTitle} numberOfLines={3}>
          {place.name}
        </Text>
        <Text style={styles.miniSub} numberOfLines={1}>
          {dataLabel(place.s.diff)} · {dataLabel(place.s.acc)}
        </Text>
      </View>
    </PlaceLink>
  );
}

const styles = StyleSheet.create({
  noPhoto: { backgroundColor: '#E4EBDA', alignItems: 'center', justifyContent: 'center' },
  big: { width: 250, height: 330, borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#1b1b1b' },
  bigTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  heartBig: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,.28)', alignItems: 'center', justifyContent: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,.9)', borderRadius: 999, paddingHorizontal: 10, height: 28 },
  ratingText: { ...type.caption, fontFamily: 'Mulish_700Bold', color: color.black },
  bigBody: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  bigTitle: { ...type.cardTitle, fontSize: 21, lineHeight: 23, color: color.paper },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  loc: { ...type.caption, color: color.mutedOnDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { ...type.micro, color: color.paper, backgroundColor: 'rgba(255,255,255,.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.black, backgroundColor: color.paper },
  thumb: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden' },
  rowTitle: { fontFamily: 'Mulish_700Bold', fontSize: 15, lineHeight: 19, color: color.black, paddingRight: 30 },
  rowSub: { ...type.caption, fontSize: 12.5, color: color.muted, marginTop: 2, paddingRight: 30 },
  go: { position: 'absolute', right: 0, top: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  mini: { flex: 1, aspectRatio: 3 / 4, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
  heartMini: { position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.28)', alignItems: 'center', justifyContent: 'center' },
  miniBody: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  miniTitle: { fontFamily: 'Mulish_700Bold', fontSize: 14.5, lineHeight: 16, textTransform: 'uppercase', color: color.paper },
  miniSub: { fontSize: 11.5, fontFamily: 'Mulish_500Medium', color: 'rgba(255,255,255,.8)', marginTop: 4 },
});
