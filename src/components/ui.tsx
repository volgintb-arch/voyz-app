// Базовые элементы Voyz: заголовок секции, чипс, кнопка, кружок-иконка, «читать полностью», сердце, кольцо индекса.
import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Icon, type IconName } from '@/components/icon';
import { toast, useApp } from '@/store/app-store';
import { color, motion, spacing, type } from '@/theme/tokens';

export function SectionHeader({ title, more, onMore, light, left }: { title: string; more?: string; onMore?: () => void; light?: boolean; left?: boolean }) {
  const alignLeft = left || (!!more && title.length > 11);
  return (
    <View style={[styles.secHead, alignLeft && { justifyContent: 'space-between' }]}>
      <Text style={[styles.hSec, { color: light ? color.paper : color.black }, alignLeft && { textAlign: 'left', flexShrink: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      {more ? (
        <Pressable onPress={onMore} hitSlop={10} style={!alignLeft && styles.moreAbs} accessibilityRole="button">
          <Text style={styles.more}>{more}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, icon, on, onPress, small, tone = 'mist', count }: { label: string; icon?: IconName; on?: boolean; onPress?: () => void; small?: boolean; tone?: 'mist' | 'white' | 'lime'; count?: number }) {
  const bg = on ? color.black : tone === 'white' ? color.paper : tone === 'lime' ? color.lime : color.mist;
  const fg = on ? color.lime : color.black;
  const body = (
    <>
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.chipText, small && { fontSize: 13 }, { color: on ? color.lime : color.black }]}>{label}</Text>
      {count != null ? <Text style={[styles.chipText, { color: on ? color.lime : color.muted }]}>{count}</Text> : null}
    </>
  );
  if (!onPress) return <View style={[styles.chip, small && styles.chipSm, { backgroundColor: bg }]}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [styles.chip, small && styles.chipSm, { backgroundColor: bg }, pressed && { transform: [{ scale: 0.96 }] }]}>
      {body}
    </Pressable>
  );
}

export function Button({ label, onPress, tone = 'lime', icon, style, disabled }: { label: string; onPress?: () => void; tone?: 'lime' | 'grey' | 'black' | 'outline'; icon?: IconName; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const bg = { lime: color.lime, grey: color.mist, black: color.ink2, outline: 'transparent' }[tone];
  const fg = tone === 'black' ? color.paper : color.black;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { backgroundColor: bg }, tone === 'outline' && styles.btnOutline, pressed && { transform: [{ scale: 0.97 }] }, disabled && { opacity: 0.5 }, style]}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconBubble({ name, size = 38, bg = color.lime, fg = color.black }: { name: IconName; size?: number; bg?: string; fg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.5} color={fg} strokeWidth={2} />
    </View>
  );
}

export function ReadMore({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" style={styles.readmore}>
      <Text style={[styles.readmoreText, light && { color: color.mutedOnDark }]}>{label}</Text>
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <Icon name="chev" size={14} color={light ? color.mutedOnDark : color.black} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

/** Сердце: pop ×1.28 на пружине, тактильный отклик и тост. */
export function HeartButton({ id, size = 22, tint = color.paper, style, onDark = true }: { id: string; size?: number; tint?: string; style?: StyleProp<ViewStyle>; onDark?: boolean }) {
  const saved = useApp((s) => s.saved.includes(id));
  const toggle = useApp((s) => s.toggleSaved);
  const reduce = useReducedMotion();
  const sc = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }), [sc]);
  const on = (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
    // сердце лежит внутри карточки-ссылки: в вебе клик иначе всплывёт и откроет место
    e?.stopPropagation?.();
    e?.preventDefault?.();
    const added = toggle(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toast(added ? 'Сохранили в избранное' : 'Убрали из избранного', 'heart');
    if (!reduce) sc.set(withSequence(withTiming(1.28, { duration: 140 }), withSpring(1, motion.spring)));
  };
  const fill = saved ? (onDark ? color.lime : color.black) : 'none';
  const stroke = saved ? (onDark ? color.lime : color.black) : tint;
  return (
    <Pressable onPress={on} hitSlop={8} accessibilityRole="button" accessibilityLabel={saved ? 'Убрать из избранного' : 'В избранное'} style={style}>
      <Animated.View style={st}>
        <Icon name="heart" size={size} color={stroke} fill={fill} />
      </Animated.View>
    </Pressable>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Кольцо индекса полноты 0–100; заполняется при появлении (1.2 с). */
export function IndexRing({ value, size = 42, stroke = 5, animate = false, label, dark }: { value: number; size?: number; stroke?: number; animate?: boolean; label?: ReactNode; dark?: boolean }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const reduce = useReducedMotion();
  const p = useSharedValue(animate && !reduce ? 0 : value / 100);
  useEffect(() => {
    if (animate && !reduce) p.set(withTiming(value / 100, { duration: 1200, easing: motion.easeStandard }));
  }, [animate, reduce, value, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }), [C]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={dark ? '#2a2a2a' : '#ECECE6'} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={dark ? color.lime : color.black}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${C} ${C}`}
          strokeLinecap="round"
          animatedProps={props}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ?? <Text style={{ fontFamily: 'Mulish_800ExtraBold', fontSize: size * 0.29, color: dark ? color.paper : color.black }}>{value}</Text>}
    </View>
  );
}

export const Section = ({ children, style, id }: { children: ReactNode; style?: StyleProp<ViewStyle>; id?: string }) => (
  <View style={[{ paddingHorizontal: spacing.screenGutter, paddingTop: spacing.sectionGap }, style]} nativeID={id}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  secHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 18 },
  hSec: { ...type.sectionTitle, lineHeight: 26 },
  moreAbs: { position: 'absolute', right: 0, bottom: 2 },
  more: { ...type.caption, fontFamily: 'Mulish_500Medium', color: color.muted, paddingLeft: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 15, borderRadius: 999, alignSelf: 'flex-start' },
  chipSm: { height: 32, paddingHorizontal: 12 },
  chipText: { fontFamily: 'Mulish_500Medium', fontSize: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 999, alignSelf: 'stretch' },
  btnOutline: { borderWidth: 1.5, borderColor: color.line },
  btnText: { fontFamily: 'Mulish_500Medium', fontSize: 16 },
  readmore: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, alignSelf: 'flex-start' },
  readmoreText: { fontFamily: 'Mulish_700Bold', fontSize: 14, color: color.black },
});
