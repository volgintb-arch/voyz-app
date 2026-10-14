// Остановка маршрута: долгое нажатие и перетаскивание меняют порядок (drag & drop на Reanimated),
// кнопки ↑/↓ — то же для VoiceOver/TalkBack и тех, кому неудобно тянуть.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { photoSource } from '@/data/places';
import type { Place } from '@/data/types';
import { catIcon } from '@/lib/icon-rules';
import { color } from '@/theme/tokens';
import { tr } from '@/i18n';

export const ROW_H = 86;

interface Props {
  place: Place;
  n: number;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

export function StopRow({ place, n, index, count, onMove, onRemove }: Props) {
  const dy = useSharedValue(0);
  const active = useSharedValue(0);
  const buzz = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const drag = Gesture.Pan()
    .activateAfterLongPress(280)
    .onStart(() => {
      active.set(1);
      runOnJS(buzz)();
    })
    .onUpdate((e) => {
      dy.set(e.translationY);
    })
    .onEnd((e) => {
      const to = Math.max(0, Math.min(count - 1, index + Math.round(e.translationY / ROW_H)));
      active.set(0);
      dy.set(withSpring(0, { damping: 18, stiffness: 220 }));
      if (to !== index) runOnJS(onMove)(index, to);
    });

  const st = useAnimatedStyle(
    () => ({
      transform: [{ translateY: dy.value }, { scale: active.value ? 1.03 : 1 }],
      zIndex: active.value ? 10 : 0,
      shadowOpacity: active.value ? 0.25 : 0,
    }),
    [dy, active],
  );
  const src = photoSource(place);

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[styles.stop, st]}>
        <Pressable onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })} style={styles.main} accessibilityRole="button" accessibilityLabel={`${n}. ${place.name}`} accessibilityHint={tr('Удерживайте и тяните, чтобы поменять порядок')}>
          <View style={[styles.num, index === count - 1 && { backgroundColor: color.lime }]}>
            <Text style={[styles.numT, index === count - 1 && { color: color.black }]}>{n}</Text>
          </View>
          {src ? (
            <Image source={src} style={styles.th} contentFit="cover" />
          ) : (
            <View style={[styles.th, { backgroundColor: '#E4EBDA', alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name={catIcon(place.cat)} size={20} color="#9aa08f" />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.t} numberOfLines={2}>
              {place.name}
            </Text>
            <Text style={styles.s} numberOfLines={1}>
              {place.s.acc} · {place.s.onsite || place.s.diff}
            </Text>
          </View>
        </Pressable>
        <View style={styles.ctl}>
          <Pressable onPress={() => onMove(index, index - 1)} disabled={index === 0} hitSlop={4} style={[styles.mv, index === 0 && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={tr('Выше')}>
            <Icon name="up" size={16} />
          </Pressable>
          <Pressable onPress={() => onMove(index, index + 1)} disabled={index === count - 1} hitSlop={4} style={[styles.mv, index === count - 1 && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={tr('Ниже')}>
            <Icon name="down" size={16} />
          </Pressable>
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={`Убрать ${place.name} из маршрута`}>
          <Icon name="close" size={18} color="#999" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stop: {
    height: ROW_H - 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 6,
    borderRadius: 20,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, minWidth: 0 },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.black, alignItems: 'center', justifyContent: 'center' },
  numT: { fontFamily: 'Mulish_800ExtraBold', fontSize: 12, color: color.lime },
  th: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden' },
  t: { fontFamily: 'Mulish_700Bold', fontSize: 14.5, lineHeight: 18, color: color.black },
  s: { fontFamily: 'Mulish_400Regular', fontSize: 12, color: color.muted, marginTop: 2 },
  ctl: { gap: 2 },
  mv: { width: 30, height: 26, borderRadius: 8, backgroundColor: color.mist, alignItems: 'center', justifyContent: 'center' },
});
