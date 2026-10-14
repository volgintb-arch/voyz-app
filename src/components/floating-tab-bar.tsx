// Плавающий таб-бар: стеклянная капсула 68 px (тёмный тинт), лаймовая «капля»-индикатор переезжает на пружине
// и при переезде «желейно» вытягивается (scaleX 1.28 / scaleY .86 → назад), как moveInd(true) в прототипе.
// Прячем сдвигом, не opacity — иначе системное стекло пропадает (docs/06_LIQUID_GLASS.md).
import * as Haptics from 'expo-haptics';
import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { useApp } from '@/store/app-store';
import { color, elevation, motion, type } from '@/theme/tokens';

const ICONS: Record<string, IconName> = { index: 'home', map: 'map', trip: 'route', more: 'more' };
const BAR_PAD = 6;

// expo-router держит react-navigation внутри себя и не экспортирует BottomTabBarProps — берём тип из самих Tabs
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const tripCount = useApp((s) => s.trip.length);
  const tabW = (width - BAR_PAD * 2) / state.routes.length;
  const x = useSharedValue(0);
  const sx = useSharedValue(1);

  // ширина, при которой индикатор уже стоит на месте: первое положение — сразу, без анимации
  const placedW = useRef(0);
  useEffect(() => {
    if (!tabW) return;
    if (placedW.current !== tabW) {
      x.set(state.index * tabW);
      placedW.current = tabW;
      return;
    }
    if (reduce) {
      x.set(withTiming(state.index * tabW, { duration: motion.reducedCrossfade }));
      return;
    }
    x.set(withSpring(state.index * tabW, motion.spring));
    sx.set(withSequence(withTiming(1.28, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 160 })));
  }, [state.index, tabW, reduce, x, sx]);

  const indicator = useAnimatedStyle(() => ({ width: tabW, transform: [{ translateX: x.value }, { scaleX: sx.value }, { scaleY: 1 - (sx.value - 1) * 0.5 } /* 1.28 → 0.86 */] }), [tabW, state.index]);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <Glass dark interactive tint="rgba(14,14,14,.82)" style={[styles.bar, elevation.tabbar]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 && <Animated.View style={[styles.indicator, indicator]} />}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = descriptors[route.key].options.title ?? route.name;
          const tint = focused ? color.black : color.paper;
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name);
            }
          };
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} style={styles.tab}>
              <View>
                <Icon name={ICONS[route.name] ?? 'dot'} size={22} color={tint} />
                {route.name === 'trip' && tripCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} maxFontSizeMultiplier={1}>
                      {tripCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: tint }]} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  bar: { height: 68, borderRadius: 34, flexDirection: 'row', padding: BAR_PAD },
  indicator: { position: 'absolute', top: BAR_PAD, bottom: BAR_PAD, left: BAR_PAD, borderRadius: 28, backgroundColor: 'rgba(216,252,0,.92)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { ...type.micro },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: color.lime,
    borderWidth: 1.5,
    borderColor: color.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, fontFamily: 'Mulish_800ExtraBold', color: color.black },
});
