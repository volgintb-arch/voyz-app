// Маркеры-фото: круглая миниатюра в белой рамке с «хвостиком»; выбранное — лаймовое кольцо и крупнее;
// места TOP — чёрная рамка. Группа — фото самого изученного места и лаймовый счётчик.
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { isTop, photoSource } from '@/data/places';
import type { Place } from '@/data/types';
import { catIcon } from '@/lib/icon-rules';
import { color } from '@/theme/tokens';

export function PhotoMarker({ place, selected, visited }: { place: Place; selected?: boolean; visited?: boolean }) {
  const size = selected ? 58 : 42;
  const src = photoSource(place);
  const ring = selected ? color.lime : isTop(place) ? color.black : color.paper;
  return (
    <View style={{ alignItems: 'center' }} accessibilityLabel={place.name}>
      <View style={[styles.ph, { width: size, height: size, borderRadius: size / 2, borderColor: ring, borderWidth: selected ? 4 : 3 }]}>
        {src ? (
          <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noPh]}>
            <Icon name={catIcon(place.cat)} size={size * 0.45} color={color.black} />
          </View>
        )}
      </View>
      {visited ? (
        <View style={styles.check} accessibilityLabel="Вы здесь были">
          <Icon name="check" size={11} strokeWidth={3} />
        </View>
      ) : null}
      <View style={[styles.tail, { borderTopColor: ring }]} />
      {selected ? (
        <Text style={styles.label} numberOfLines={1}>
          {place.name}
        </Text>
      ) : null}
    </View>
  );
}

export function ClusterMarker({ cover, count }: { cover: Place; count: number }) {
  const src = photoSource(cover);
  return (
    <View style={styles.cl} accessibilityLabel={`${count} мест рядом`}>
      <View style={[styles.ph, { width: 50, height: 50, borderRadius: 25, borderColor: color.paper, borderWidth: 3 }]}>
        {src ? <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[StyleSheet.absoluteFill, styles.noPh]} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,.25)' }]} />
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeT}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ph: { overflow: 'hidden', backgroundColor: '#ddd', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  noPh: { backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  tail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  label: {
    marginTop: 2,
    maxWidth: 160,
    fontFamily: 'Mulish_800ExtraBold',
    fontSize: 11.5,
    color: color.black,
    backgroundColor: color.lime,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  check: { position: 'absolute', top: -3, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: color.lime, borderWidth: 2, borderColor: color.black, alignItems: 'center', justifyContent: 'center' },
  cl: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: color.lime,
    borderWidth: 2,
    borderColor: color.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeT: { fontFamily: 'Mulish_800ExtraBold', fontSize: 12, color: color.black },
});
