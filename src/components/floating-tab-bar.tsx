// Плавающий таб-бар: чёрная «пилюля» 68 px, лаймовый индикатор едет к активному табу на пружине.
// Liquid Glass (expo-glass-effect) подключим на шаге навигации — см. docs/06_LIQUID_GLASS.md.
import * as Haptics from 'expo-haptics';
import type { Tabs } from 'expo-router';
import { Compass, Ellipsis, Map, Route, type LucideIcon } from 'lucide-react-native';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/store/app-store';
import { color, elevation, motion, type } from '@/theme/tokens';

const ICONS: Record<string, LucideIcon> = { index: Compass, map: Map, trip: Route, more: Ellipsis };
const BAR_PAD = 6;

// expo-router держит react-navigation внутри себя и не экспортирует BottomTabBarProps — берём тип из самих Tabs
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const tripCount = useApp((s) => s.trip.length);
  const tabW = (width - BAR_PAD * 2) / state.routes.length;

  const indicator = useAnimatedStyle(() => ({
    width: tabW,
    transform: [
      {
        translateX: reduce
          ? withTiming(state.index * tabW, { duration: motion.reducedCrossfade })
          : withSpring(state.index * tabW, motion.spring),
      },
    ],
    // без явных зависимостей стиль не пересчитается, когда бар узнает свою ширину после onLayout
  }), [state.index, tabW, reduce]);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[styles.bar, elevation.tabbar]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 && <Animated.View style={[styles.indicator, indicator]} />}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const Icon = ICONS[route.name] ?? Compass;
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
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.tab}>
              <View>
                <Icon size={22} color={tint} strokeWidth={1.8} />
                {route.name === 'trip' && tripCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tripCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  bar: { height: 68, borderRadius: 34, backgroundColor: 'rgba(14,14,14,.94)', flexDirection: 'row', padding: BAR_PAD },
  indicator: { position: 'absolute', top: BAR_PAD, bottom: BAR_PAD, left: BAR_PAD, borderRadius: 28, backgroundColor: color.lime },
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
