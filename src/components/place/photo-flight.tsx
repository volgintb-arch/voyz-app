// Слой «полёта»: фото из карточки списка вырастает до hero за motion.sharedElement, затем растворяется,
// открывая настоящий hero под ним (там то же фото — шва не видно).
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { photoSource } from '@/data/places';
import type { Place } from '@/data/types';
import type { FlightRect } from '@/lib/photo-flight';
import { motion } from '@/theme/tokens';

interface Props {
  place: Place;
  from: FlightRect; // в координатах окна
  origin: { x: number; y: number }; // где в окне начинается экран места (в вебе — колонка по центру)
  width: number;
  height: number; // высота hero
}

export function PhotoFlight({ place, from, origin, width, height }: Props) {
  const [done, setDone] = useState(false);
  const t = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    t.set(withTiming(1, { duration: motion.sharedElement, easing: motion.easeStandard }));
    fade.set(
      withDelay(
        motion.sharedElement,
        withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) }, (ok) => {
          if (ok) runOnJS(setDone)(true);
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const x0 = from.x - origin.x;
  const y0 = from.y - origin.y;
  const style = useAnimatedStyle(() => ({
    left: interpolate(t.value, [0, 1], [x0, 0]),
    top: interpolate(t.value, [0, 1], [y0, 0]),
    width: interpolate(t.value, [0, 1], [from.w, width]),
    height: interpolate(t.value, [0, 1], [from.h, height]),
    borderRadius: interpolate(t.value, [0, 1], [from.r, 0]),
    opacity: fade.value,
  }));

  const src = photoSource(place, 0, true);
  if (done || !src) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.photo, style]}>
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" placeholder={photoSource(place, 0)} accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { position: 'absolute', overflow: 'hidden', backgroundColor: '#111' },
});
