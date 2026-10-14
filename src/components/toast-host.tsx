// Тост над таб-баром: «Сохранили в избранное», «Добавили в маршрут». Стекло тёмное (docs/06_LIQUID_GLASS.md).
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Icon } from '@/components/icon';
import { useToast } from '@/store/app-store';
import { color, type } from '@/theme/tokens';

export function ToastHost() {
  const { msg, icon, key } = useToast();
  const insets = useSafeAreaInsets();
  const v = useSharedValue(0);

  useEffect(() => {
    if (!msg) return;
    v.set(0);
    v.set(withSequence(withSpring(1, { damping: 14, stiffness: 180 }), withDelay(2000, withTiming(0, { duration: 300 }))));
  }, [key, msg, v]);

  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 30 }] }), [v]);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 100 }, st]} accessibilityLiveRegion="polite">
      <Glass dark tint="rgba(20,20,20,.78)" style={styles.toast}>
        <Icon name={icon} size={18} color={color.lime} />
        <Text style={styles.text} numberOfLines={1}>
          {msg}
        </Text>
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 99 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, paddingHorizontal: 18, height: 46, maxWidth: '90%' },
  text: { ...type.caption, fontSize: 14, color: color.paper },
});
