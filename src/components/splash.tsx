// Заставка 1.5 с: логотип VOYZ собирается по буквам, слоган, полоска загрузки; затем уходит в прозрачность.
// При Reduce Motion — короткий кроссфейд без сборки.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { color, motion } from '@/theme/tokens';
import { tr } from '@/i18n';

// буквы логотипа: фрагмент viewBox (x, ширина) и путь — из reference/prototype_src/app.js → WM
const LETTERS: [number, number, string][] = [
  [0, 180, 'M3 4h46l40 50 40-50h47l-68 80H70z'],
  [200, 130, 'M206 2h78a40 40 0 010 80h-78a40 40 0 010-80zm6 27a8 8 0 000 16h66a8 8 0 000-16z'],
  [322, 154, 'M325 4h51l23 30 23-30h51l-56 50v30h-37V54z'],
  [486, 158, 'M490 4h150v26l-72 26h72v28H490V58l72-28h-72z'],
];
const SCALE = 220 / 645;

export function Splash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const out = useSharedValue(1);
  const bar = useSharedValue(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const total = reduce ? 500 : 1500;
    bar.set(withTiming(1, { duration: total, easing: Easing.inOut(Easing.quad) }));
    out.set(
      withDelay(
        total,
        withTiming(0, { duration: reduce ? motion.reducedCrossfade : 500 }, (done) => {
          if (done) {
            runOnJS(setGone)(true);
            runOnJS(onDone)();
          }
        }),
      ),
    );
    // страховка: если анимации стоят (вкладка в фоне, медленное устройство) — убираем заставку по таймеру
    const t = setTimeout(() => {
      setGone(true);
      onDone();
    }, total + 1000);
    return () => clearTimeout(t);
  }, [reduce, bar, out, onDone]);

  const wrap = useAnimatedStyle(() => ({ opacity: out.value, transform: [{ scale: 1 + (1 - out.value) * 0.04 }] }), [out]);
  const barSt = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }), [bar]);
  if (gone) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, wrap]} pointerEvents="none" accessibilityLabel={tr('VOYZ — загрузка')}>
      <View style={styles.logo}>
        {LETTERS.map(([x, w, d], i) => (
          <Letter key={i} i={i} x={x} w={w} d={d} reduce={reduce} />
        ))}
      </View>
      <Text style={styles.tag}>{tr('Больше, чем просто поездки')}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barSt]} />
      </View>
    </Animated.View>
  );
}

function Letter({ i, x, w, d, reduce }: { i: number; x: number; w: number; d: string; reduce: boolean }) {
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) v.set(withDelay(120 + i * 140, withTiming(1, { duration: 420, easing: motion.easeStandard })));
  }, [reduce, v, i]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 18 }, { scale: 0.85 + v.value * 0.15 }] }), [v]);
  return (
    <Animated.View style={st}>
      <Svg width={w * SCALE} height={86 * SCALE} viewBox={`${x} 0 ${w} 86`}>
        <Path d={d} fill={color.paper} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: color.black, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tag: { fontFamily: 'Mulish_500Medium', fontSize: 15, color: color.mutedOnDark, marginTop: 18 },
  track: { width: 120, height: 3, borderRadius: 2, backgroundColor: '#222', marginTop: 28, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: color.lime },
});
