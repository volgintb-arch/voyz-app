// Hero карточки: листаемые фото со snap и точками, параллакс ×0.35 и лёгкое увеличение при скролле,
// градиент в чёрный, плашка рейтинга (или «Проверено»), заголовок, локация, мини-карта 62×62.
// Фото нет — hero это карта места (правило данных: ничего не выдумываем).
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { FinishMark } from '@/components/map/markers';
import { VoyzMap } from '@/components/map/voyz-map';
import { PhotoShade } from '@/components/photo-shade';
import { locLine, photoSource } from '@/data/places';
import type { Place } from '@/data/types';
import { color, type } from '@/theme/tokens';

export const HERO_H = 540;

export function Hero({ place, scrollY, onPhoto, onMapThumb }: { place: Place; scrollY: SharedValue<number>; onPhoto: (i: number) => void; onMapThumb: () => void }) {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [page, setPage] = useState(0);
  const photos = place.photos;

  const parallax = useAnimatedStyle(() => {
    if (reduce) return {};
    const y = scrollY.value;
    return { transform: [{ translateY: y > 0 ? y * 0.35 : y }, { scale: 1 + interpolate(Math.max(0, y), [0, 400], [0, 0.2], 'clamp') }] };
  }, [reduce]);

  return (
    <View style={styles.hero}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        {photos.length ? (
          <FlatList
            horizontal
            pagingEnabled
            data={photos}
            keyExtractor={(x) => x.f}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={64}
            renderItem={({ index }) => (
              <Pressable onPress={() => onPhoto(index)} accessibilityRole="imagebutton" accessibilityLabel={photos[index].cap || place.name}>
                <Image source={photoSource(place, index, true)} style={{ width, height: HERO_H }} contentFit="cover" transition={index ? 150 : 300} />
              </Pressable>
            )}
          />
        ) : place.ll ? (
          <VoyzMap country={place.c} fit={[place.ll]} interactive={false} points={[{ id: 'f', ll: place.ll, render: () => <FinishMark /> }]} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#151515' }]} />
        )}
      </Animated.View>
      <HeroShade />
      <View style={styles.info} pointerEvents="box-none">
        <View style={{ flex: 1 }} pointerEvents="box-none">
          <View style={styles.hrow}>
            {place.rating ? (
              <View style={styles.pill}>
                <Text style={styles.pillT}>{place.rating.v} ★</Text>
                <Text style={[styles.pillT, { fontFamily: 'Mulish_500Medium', color: '#555' }]}>{place.rating.src}</Text>
              </View>
            ) : (
              <View style={styles.pill}>
                <Icon name="shield" size={14} />
                <Text style={styles.pillT}>Проверено</Text>
              </View>
            )}
            {photos.length > 1 ? (
              <View style={styles.dots}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
                ))}
              </View>
            ) : null}
          </View>
          <Text style={styles.h1} accessibilityRole="header">
            {place.name}
          </Text>
          <View style={styles.loc}>
            <Icon name="pin" size={15} color={color.mutedOnDark} />
            <Text style={styles.locT}>{place.c === 'kg' ? locLine(place) : place.dist || 'Республика Алтай'}</Text>
          </View>
        </View>
        {place.ll ? (
          <Pressable onPress={onMapThumb} style={styles.thumb} accessibilityRole="button" accessibilityLabel="Как добраться">
            <MiniMap place={place} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function HeroShade() {
  // .hero .shade: лёгкое затемнение сверху под кнопки и плотное снизу в чёрный
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <PhotoShade from={0.48} to="#000" />
      <LinearGradient colors={['rgba(0,0,0,.28)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }} />
    </View>
  );
}

/** Мини-карта: стилизованная схема пути от города до места (порт miniMapSVG). */
function MiniMap({ place }: { place: Place }) {
  const a = place.p.apps.find((x) => x.rt?.road);
  const pts = a?.rt ? [a.rt.hc, ...(a.rt.road ?? []), a.rt.pc || a.rt.tc || place.ll!] : [place.ll!];
  const lats = pts.map((x) => x[0]);
  const lons = pts.map((x) => x[1]);
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons), 0.05);
  const cx = (Math.min(...lons) + Math.max(...lons)) / 2;
  const cy = (Math.min(...lats) + Math.max(...lats)) / 2;
  const X = (lo: number) => 32 + ((lo - cx) / span) * 46;
  const Y = (la: number) => 32 - ((la - cy) / span) * 46;
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[1]).toFixed(1)},${Y(q[0]).toFixed(1)}`).join('');
  const e = pts[pts.length - 1];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 64">
      <Rect width="64" height="64" fill={color.mapLand} />
      <Path d="M0 44 C14 40 22 50 34 46 S54 36 64 40" stroke={color.mapWater} strokeWidth={5} fill="none" />
      <Path d="M-4 20 L70 30" stroke="#fff" strokeWidth={2} />
      {pts.length > 1 ? (
        <>
          <Path d={d} stroke="#000" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
          <Path d={d} stroke="#1d8a34" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      <Circle cx={X(e[1])} cy={Y(e[0])} r={5} fill={color.lime} stroke="#000" strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  hero: { height: HERO_H, overflow: 'hidden', backgroundColor: '#000' },
  info: { position: 'absolute', left: 20, right: 20, bottom: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  hrow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: color.paper },
  pillT: { fontFamily: 'Mulish_600SemiBold', fontSize: 13, color: color.black },
  dots: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.18)', marginLeft: 'auto', marginRight: 40 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.55)' },
  dotOn: { width: 16, backgroundColor: color.paper },
  h1: { ...type.heroTitle, fontSize: 30, lineHeight: 32, color: color.paper },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  locT: { ...type.caption, fontSize: 14, color: color.mutedOnDark },
  thumb: { width: 62, height: 62, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,.85)', backgroundColor: color.mapLand },
});
