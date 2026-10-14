// Переключатель страны в шапке (класс .seg в прототипе).
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CountryCode } from '@/data/types';
import { useApp } from '@/store/app-store';
import { color, type } from '@/theme/tokens';

const ITEMS: [CountryCode, string][] = [
  ['kg', 'Кыргызстан'],
  ['alt', 'Алтай'],
];

export function CountrySegment() {
  const country = useApp((s) => s.country);
  const setCountry = useApp((s) => s.setCountry);
  return (
    <View style={styles.seg} accessibilityRole="radiogroup">
      {ITEMS.map(([c, label]) => {
        const on = c === country;
        return (
          <Pressable
            key={c}
            onPress={() => {
              if (on) return;
              Haptics.selectionAsync();
              setCountry(c);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            hitSlop={6}
            style={[styles.item, on && styles.on]}>
            <Text style={[styles.text, { color: on ? color.black : color.mutedOnDark }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 3, borderRadius: 999, borderWidth: 1, borderColor: '#2b2b2b', backgroundColor: '#111' },
  item: { paddingHorizontal: 13, height: 32, borderRadius: 999, justifyContent: 'center' },
  on: { backgroundColor: color.lime },
  text: { ...type.caption, fontFamily: 'Mulish_600SemiBold' },
});
