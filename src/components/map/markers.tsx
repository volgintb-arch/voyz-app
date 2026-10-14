// Маркеры карты по docs/03_DESIGN_SYSTEM.md → «Карта»: место — лаймовый круг с чёрной обводкой 3 px,
// TOP — инверсия; маршрут: S (старт), P (парковка), ★ (место, пульсирует), номера остановок.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { color } from '@/theme/tokens';

export function PlaceDot({ top, selected, small }: { top?: boolean; selected?: boolean; small?: boolean }) {
  const size = small ? 14 : 22;
  const inv = top ? !selected : selected; // выбранный и TOP — инверсные цвета
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, borderWidth: small ? 2 : 3 },
        { backgroundColor: inv ? color.black : color.lime, borderColor: inv ? color.lime : color.black },
        selected && { transform: [{ scale: 1.5 }] },
      ]}
    />
  );
}

export function RouteMark({ kind, label }: { kind: 's' | 'p' | 'n'; label: string }) {
  const bg = kind === 'p' ? color.parking : color.black;
  const fg = kind === 'p' ? color.paper : color.lime;
  const size = kind === 'n' ? 26 : 22;
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.markText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Финиш — место: лаймовый круг со звездой, мягко пульсирует (выключено при Reduce Motion). */
export function FinishMark({ label = '★' }: { label?: string }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!reduce) p.set(withRepeat(withTiming(1, { duration: 2000 }), -1));
  }, [reduce, p]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.9 }] }), [p]);
  return (
    <View style={styles.finWrap}>
      <Animated.View style={[styles.halo, halo]} />
      <View style={styles.fin}>
        <Text style={[styles.markText, { color: color.black, fontSize: 12 }]}>{label}</Text>
      </View>
    </View>
  );
}

export function CityLabel({ name }: { name: string }) {
  return (
    <View style={styles.city}>
      <View style={styles.cityDot} />
      <Text style={styles.cityText}>{name}</Text>
    </View>
  );
}

export function MeDot() {
  return <View style={styles.me} />;
}

const styles = StyleSheet.create({
  dot: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  mark: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: color.paper },
  markText: { fontFamily: 'Mulish_800ExtraBold', fontSize: 11 },
  finWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: color.lime },
  fin: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.lime, borderWidth: 3, borderColor: color.black, alignItems: 'center', justifyContent: 'center' },
  city: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 20 },
  cityDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#2f4a22' },
  cityText: {
    fontFamily: 'Mulish_700Bold',
    fontSize: 11.5,
    color: '#2f4a22',
    textShadowColor: '#fff',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
  me: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.parking, borderWidth: 3, borderColor: color.paper },
});
