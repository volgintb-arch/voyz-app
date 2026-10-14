// Переключатель страны в шапке (.seg): лаймовый «ползунок» переезжает на пружине, страна меняется после анимации.
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';

import type { CountryCode } from '@/data/types';
import { toast, useApp } from '@/store/app-store';
import { useFilters } from '@/store/filters';
import { color, motion, type } from '@/theme/tokens';

const ITEMS: [CountryCode, string, string][] = [
  ['kg', 'Кыргызстан', 'Кыргызстан'],
  ['alt', 'Алтай', 'Россия · Алтай'],
];

export function CountrySegment() {
  const country = useApp((s) => s.country);
  const setCountry = useApp((s) => s.setCountry);
  const clearFilters = useFilters((s) => s.clear);
  const reduce = useReducedMotion();
  const [sel, setSel] = useState(country);
  const [boxes, setBoxes] = useState<Partial<Record<CountryCode, LayoutRectangle>>>({});
  const box = sel ? boxes[sel] : undefined;

  const knob = useAnimatedStyle(() => {
    if (!box) return { opacity: 0 };
    const anim = reduce ? (v: number) => withTiming(v, { duration: motion.reducedCrossfade }) : (v: number) => withSpring(v, motion.spring);
    return { opacity: 1, width: anim(box.width), transform: [{ translateX: anim(box.x) }] };
  }, [box, reduce]);

  return (
    <View style={styles.seg} accessibilityRole="radiogroup">
      <Animated.View style={[styles.knob, knob]} />
      {ITEMS.map(([c, label, full]) => {
        const on = c === sel;
        return (
          <Pressable
            key={c}
            onLayout={(e) => {
              const l = e.nativeEvent.layout;
              setBoxes((b) => ({ ...b, [c]: l }));
            }}
            onPress={() => {
              if (on) return;
              Haptics.selectionAsync();
              setSel(c);
              // как в прототипе: сначала доезжает ползунок, потом перестраивается экран
              setTimeout(() => {
                clearFilters();
                setCountry(c);
                toast(full, 'globe');
              }, 380);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            hitSlop={6}
            style={styles.item}>
            <Text style={[styles.text, { color: on ? color.black : color.mutedOnDark }]} maxFontSizeMultiplier={1.3}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 3, borderRadius: 999, borderWidth: 1, borderColor: '#2b2b2b', backgroundColor: '#111' },
  knob: { position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: 999, backgroundColor: color.lime },
  item: { paddingHorizontal: 13, minHeight: 32, borderRadius: 999, justifyContent: 'center' },
  text: { ...type.caption, fontFamily: 'Mulish_600SemiBold' },
});
