// Экран «Куда едем?» — выбор страны. Эталон: reference/prototype_src/app.js → onboarding().
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoShade } from '@/components/photo-shade';
import { VoyzLogo } from '@/components/voyz-logo';
import { getPlace, photoSource, places, placesOf } from '@/data/places';
import type { CountryCode, Place } from '@/data/types';
import { useApp } from '@/store/app-store';
import { color, radius, spacing, type } from '@/theme/tokens';

const withPhoto = (list: readonly Place[]) => list.find((p) => p.photos.length > 0);

const COUNTRIES: { c: CountryCode; title: string; sub: string; cover?: Place }[] = [
  {
    c: 'kg',
    title: 'Кыргызстан',
    sub: 'горы, озёра, каньоны',
    cover: getPlace('kg-skazka') ?? withPhoto(placesOf('kg')),
  },
  {
    c: 'alt',
    title: 'Россия · Алтай',
    sub: 'Чуйский тракт, Телецкое',
    cover: placesOf('alt').find((p) => /Телецк/.test(p.name) && p.photos.length) ?? withPhoto(placesOf('alt')),
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const setCountry = useApp((s) => s.setCountry);

  const choose = (c: CountryCode) => {
    setCountry(c);
    router.replace('/');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 26, paddingBottom: insets.bottom + 26, paddingHorizontal: spacing.screenGutter }}>
      <VoyzLogo width={96} />
      <Text style={styles.h1}>Куда{'\n'}едем?</Text>
      <Text style={styles.lead}>
        {places.length} мест, проверенных по открытым источникам: как доехать, где оставить машину, где ночевать и что важно знать
        заранее.
      </Text>

      {COUNTRIES.map(({ c, title, sub, cover }) => (
        <Pressable
          key={c}
          onPress={() => choose(c)}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${placesOf(c).length} мест`}
          style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}>
          {cover && <Image source={photoSource(cover, 0, true)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />}
          <PhotoShade from={0.45} to="rgba(0,0,0,.75)" />
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSub}>
                {placesOf(c).length} мест · {sub}
              </Text>
            </View>
            <View style={styles.bubble}>
              <ArrowRight size={22} color={color.black} strokeWidth={1.8} />
            </View>
          </View>
        </Pressable>
      ))}

      <Text style={styles.fine}>Страну можно сменить в любой момент</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  h1: { ...type.screenTitle, color: color.paper, fontSize: 40, lineHeight: 41, marginTop: 18 },
  lead: { ...type.body, color: color.mutedOnDark, marginTop: 12, marginBottom: 22 },
  card: { height: 250, borderRadius: radius.card, overflow: 'hidden', marginBottom: 14, justifyContent: 'flex-end', backgroundColor: '#1b1b1b' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 18, gap: 12 },
  cardTitle: { ...type.screenTitle, fontSize: 28, lineHeight: 30, color: color.paper },
  cardSub: { ...type.caption, color: color.paper, opacity: 0.9, marginTop: 4 },
  bubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  fine: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: 8 },
});
