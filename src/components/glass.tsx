// Liquid Glass для слоя навигации (docs/06_LIQUID_GLASS.md).
// iOS 26 — системное стекло expo-glass-effect; иначе — BlurView; при «Понижении прозрачности» — сплошной фон.
import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';

const nativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', setReduce);
    return () => sub?.remove();
  }, []);
  return reduce;
}

export interface GlassProps extends ViewProps {
  tint?: string; // цвет тинта, например rgba(14,14,14,.74)
  clear?: boolean; // вариант clear — для кнопок над фото
  interactive?: boolean;
  dark?: boolean; // тёмное стекло (над чёрным или фото)
}

export function Glass({ tint, clear, interactive, dark, style, children, ...rest }: GlassProps) {
  const reduce = useReduceTransparency();
  if (nativeGlass && !reduce) {
    return (
      <GlassView
        glassEffectStyle={clear ? 'clear' : 'regular'}
        tintColor={tint}
        isInteractive={interactive}
        colorScheme={dark ? 'dark' : 'light'}
        style={style}
        {...rest}>
        {children}
      </GlassView>
    );
  }
  if (reduce) {
    return (
      <View style={[style, { backgroundColor: dark ? '#141414' : '#FFFFFF' }]} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <View style={[style, styles.clip]} {...rest}>
      <BlurView intensity={clear ? 30 : 50} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tint ?? (dark ? 'rgba(14,14,14,.55)' : 'rgba(255,255,255,.45)') },
          styles.rim,
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

/** Объединяет соседние стёкла (кнопки «поделиться» и «сердце») — только на iOS 26, иначе обычный View. */
export function GlassGroup({ spacing = 8, style, children, ...rest }: ViewProps & { spacing?: number }) {
  if (nativeGlass) {
    return (
      <GlassContainer spacing={spacing} style={style} {...rest}>
        {children}
      </GlassContainer>
    );
  }
  return (
    <View style={[{ flexDirection: 'row', gap: spacing }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  rim: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,.22)', borderRadius: 999 },
});
