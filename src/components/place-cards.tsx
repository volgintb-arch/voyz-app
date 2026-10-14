// Карточки мест: большая (подборки, .bigcard) и строка (списки, .rowcard).
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ArrowUpRight, MapPin, Mountain, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoShade } from '@/components/photo-shade';
import { locLine, photoSource } from '@/data/places';
import type { Place } from '@/data/types';
import { color, radius, type } from '@/theme/tokens';

function Cover({ place, big, style }: { place: Place; big?: boolean; style: object }) {
  const src = photoSource(place, 0, big);
  if (src) return <Image source={src} style={style} contentFit="cover" transition={150} />;
  // нет фото — не выдумываем, показываем нейтральную плашку с иконкой (позже здесь будет карта места)
  return (
    <View style={[style, styles.noPhoto]}>
      <Mountain size={28} color={color.muted} strokeWidth={1.6} />
    </View>
  );
}

export function BigPlaceCard({ place }: { place: Place }) {
  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <Pressable style={styles.big} accessibilityLabel={place.name}>
        <Cover place={place} big style={StyleSheet.absoluteFill} />
        <PhotoShade from={0.35} />
        {place.rating && (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>{place.rating.v}</Text>
            <Star size={12} color={color.black} fill={color.black} />
          </View>
        )}
        <View style={styles.bigBody}>
          <Text style={styles.bigTitle} numberOfLines={3}>
            {place.name}
          </Text>
          <View style={styles.locRow}>
            <MapPin size={13} color={color.mutedOnDark} strokeWidth={1.8} />
            <Text style={styles.loc}>{locLine(place)}</Text>
          </View>
          <View style={styles.chips}>
            {[place.s.diff, place.s.when, place.s.acc].filter(Boolean).map((t) => (
              <Text key={t} style={styles.chip}>
                {t}
              </Text>
            ))}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export function RowPlaceCard({ place }: { place: Place }) {
  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <Pressable style={styles.row} accessibilityLabel={place.name}>
        <Cover place={place} style={styles.thumb} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {place.name}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {locLine(place)} · {place.s.diff}
          </Text>
        </View>
        <View style={styles.go}>
          <ArrowUpRight size={16} color={color.black} strokeWidth={2} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  noPhoto: { backgroundColor: color.mist, alignItems: 'center', justifyContent: 'center' },
  big: { width: 268, height: 330, borderRadius: radius.card, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#1b1b1b' },
  rating: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,.88)',
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 28,
  },
  ratingText: { ...type.caption, fontFamily: 'Mulish_700Bold', color: color.black },
  bigBody: { padding: 16 },
  bigTitle: { ...type.cardTitle, fontSize: 22, lineHeight: 24, color: color.paper },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  loc: { ...type.caption, color: color.mutedOnDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    ...type.micro,
    color: color.paper,
    backgroundColor: 'rgba(255,255,255,.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.black,
    backgroundColor: color.paper,
  },
  thumb: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden' },
  rowTitle: { ...type.label, color: color.black },
  rowSub: { ...type.caption, color: color.muted, marginTop: 2 },
  go: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
});
