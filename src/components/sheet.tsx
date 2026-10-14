// Шторка снизу: выезжает за 420 мс, закрывается свайпом вниз, тапом по фону и кнопкой «назад» на Android.
// Своя реализация на Modal + Reanimated: работает одинаково на iOS, Android и в вебе.
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_MAX_W } from '@/lib/layout';
import { color, motion, type } from '@/theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  tall?: boolean; // ридер — 92 % высоты
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ visible, onClose, title, tall, children, footer }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  // производное состояние: показываем сразу при visible, прячем — после анимации закрытия
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(height);
  const dur = reduce ? motion.reducedCrossfade : motion.sheet;

  useEffect(() => {
    if (visible) {
      y.set(height);
      y.set(withTiming(0, { duration: dur, easing: motion.easeStandard }));
    } else if (mounted) {
      y.set(withTiming(height, { duration: dur * 0.8, easing: motion.easeStandard }, (done) => {
        if (done) runOnJS(setMounted)(false);
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .onChange((e) => {
      y.set(Math.max(0, y.get() + e.changeY));
    })
    .onEnd((e) => {
      if (y.get() > 110 || e.velocityY > 900) runOnJS(onClose)();
      else y.set(withTiming(0, { duration: 220 }));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }), [y]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, y.value / height) }), [y, height]);

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть" />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { maxHeight: height * (tall ? 0.92 : 0.86), paddingBottom: insets.bottom + 18 }, tall && { height: height * 0.92 }, sheetStyle]}
          accessibilityViewIsModal>
          <GestureDetector gesture={pan}>
            <View style={styles.grabZone}>
              <View style={styles.grab} />
              {title ? <Text style={styles.title}>{title}</Text> : null}
            </View>
          </GestureDetector>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>{footer}</View> : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 'auto',
    maxWidth: APP_MAX_W,
    bottom: 0,
    backgroundColor: color.paper,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  grabZone: { paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#ddd', marginBottom: 14 },
  title: { ...type.sectionTitle, fontSize: 22, color: color.black, marginBottom: 14, paddingHorizontal: 20 },
});
