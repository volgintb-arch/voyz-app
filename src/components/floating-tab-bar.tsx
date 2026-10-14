// Плавающий таб-бар: стеклянная капсула 68 px (тёмный тинт), лаймовая «капля»-индикатор переезжает на пружине
// и при переезде «желейно» вытягивается (scaleX 1.28 / scaleY .86 → назад), как moveInd(true) в прототипе.
// Прячем сдвигом, не opacity — иначе системное стекло пропадает (docs/06_LIQUID_GLASS.md).
// Капсула общая: её показывают и вкладки, и карточка места (там без активной вкладки). При прокрутке вниз
// экран выставляет tabBarCompact → 1: подписи уходят, капсула становится ниже и уже и не мешает читать.
import * as Haptics from 'expo-haptics';
import { router, type Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, makeMutable, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { useT } from '@/i18n';
import { useApp } from '@/store/app-store';
import { color, elevation, motion, type } from '@/theme/tokens';

const ICONS: Record<string, IconName> = { index: 'home', map: 'map', trip: 'route', more: 'more' };
const BAR_PAD = 6;
const H = 68;
const H_COMPACT = 50;

/** 0 — обычная капсула, 1 — сжатая. Меняет экран по направлению прокрутки (см. useCompactOnScroll). */
export const tabBarCompact: SharedValue<number> = makeMutable(0);

/** Для useAnimatedScrollHandler: вниз — сжать, вверх или у самого верха — развернуть. */
export function compactOnScroll(y: number, prev: SharedValue<number>) {
  'worklet';
  const dy = y - prev.value;
  if (y < 80 || dy < -8) {
    if (tabBarCompact.value !== 0) tabBarCompact.value = withTiming(0, { duration: 220 });
    prev.value = y;
  } else if (dy > 8) {
    if (tabBarCompact.value !== 1) tabBarCompact.value = withTiming(1, { duration: 220 });
    prev.value = y;
  }
}

// expo-router держит react-navigation внутри себя и не экспортирует BottomTabBarProps — берём тип из самих Tabs
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

interface Item {
  key: string;
  name: string;
  label: string;
}

/** Таб-бар навигатора вкладок. */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const items = state.routes.map((r) => ({ key: r.key, name: r.name, label: descriptors[r.key].options.title ?? r.name }));
  return (
    <TabCapsule
      items={items}
      active={state.index}
      onPress={(i) => {
        const route = state.routes[i];
        const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (state.index !== i && !e.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}

const PATHS: Record<string, '/' | '/map' | '/trip' | '/more'> = { index: '/', map: '/map', trip: '/trip', more: '/more' };

/** Таб-бар поверх экранов вне вкладок (карточка места): без активной вкладки, нажатие — переход во вкладку. */
export function StandaloneTabBar() {
  const { t } = useT();
  const items: Item[] = [
    { key: 'index', name: 'index', label: t('Обзор') },
    { key: 'map', name: 'map', label: t('Карта') },
    { key: 'trip', name: 'trip', label: t('Маршрут') },
    { key: 'more', name: 'more', label: t('Ещё') },
  ];
  return <TabCapsule items={items} active={-1} onPress={(i) => router.navigate(PATHS[items[i].name])} />;
}

function TabCapsule({ items, active, onPress }: { items: Item[]; active: number; onPress: (i: number) => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const tripCount = useApp((s) => s.trip.length);
  const tabW = (width - BAR_PAD * 2) / items.length;
  const x = useSharedValue(0);
  const sx = useSharedValue(1);

  // ширина, при которой индикатор уже стоит на месте: первое положение — сразу, без анимации
  const placedW = useRef(0);
  useEffect(() => {
    if (!tabW || active < 0) return;
    if (placedW.current !== tabW) {
      x.set(active * tabW);
      placedW.current = tabW;
      return;
    }
    if (reduce) {
      x.set(withTiming(active * tabW, { duration: motion.reducedCrossfade }));
      return;
    }
    x.set(withSpring(active * tabW, motion.spring));
    sx.set(withSequence(withTiming(1.28, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 160 })));
  }, [active, tabW, reduce, x, sx]);

  // новая вкладка/экран — капсула снова полная
  useEffect(() => {
    tabBarCompact.set(withTiming(0, { duration: 220 }));
  }, [active]);

  const indicator = useAnimatedStyle(() => ({ width: tabW, transform: [{ translateX: x.value }, { scaleX: sx.value }, { scaleY: 1 - (sx.value - 1) * 0.5 } /* 1.28 → 0.86 */] }), [tabW, active]);
  const wrapStyle = useAnimatedStyle(() => ({
    left: interpolate(tabBarCompact.value, [0, 1], [14, 54]),
    right: interpolate(tabBarCompact.value, [0, 1], [14, 54]),
  }));
  const barStyle = useAnimatedStyle(() => ({ height: interpolate(tabBarCompact.value, [0, 1], [H, H_COMPACT]), borderRadius: interpolate(tabBarCompact.value, [0, 1], [H / 2, H_COMPACT / 2]) }));
  const indStyle = useAnimatedStyle(() => ({ borderRadius: interpolate(tabBarCompact.value, [0, 1], [28, 19]) }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - tabBarCompact.value * 1.6, height: interpolate(tabBarCompact.value, [0, 1], [14, 0]), marginTop: interpolate(tabBarCompact.value, [0, 1], [3, 0]) }));

  return (
    <Animated.View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }, wrapStyle]} pointerEvents="box-none">
      <Animated.View style={[styles.barBox, barStyle]}>
        <Glass dark interactive tint="rgba(14,14,14,.82)" style={[styles.bar, elevation.tabbar]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {width > 0 && active >= 0 && <Animated.View style={[styles.indicator, indicator, indStyle]} />}
          {items.map((item, i) => {
            const focused = active === i;
            const tint = focused ? color.black : color.paper;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  if (!focused) Haptics.selectionAsync();
                  onPress(i);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={item.label}
                style={styles.tab}>
                <View>
                  <Icon name={ICONS[item.name] ?? 'dot'} size={22} color={tint} />
                  {item.name === 'trip' && tripCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText} maxFontSizeMultiplier={1}>
                        {tripCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Animated.View style={[styles.labelBox, labelStyle]}>
                  <Text style={[styles.label, { color: tint }]} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </Glass>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  barBox: { overflow: 'visible' },
  bar: { flex: 1, borderRadius: 999, flexDirection: 'row', padding: BAR_PAD },
  indicator: { position: 'absolute', top: BAR_PAD, bottom: BAR_PAD, left: BAR_PAD, borderRadius: 28, backgroundColor: 'rgba(216,252,0,.92)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  labelBox: { overflow: 'hidden', justifyContent: 'center' },
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
