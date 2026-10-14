// Карточка места — пока каркас: hero, заголовок, плитки, аудиогид, «Почему стоит приехать».
// Полный набор блоков по docs/02_UX_SPEC.md, shared element и параллакс — шаг 4 плана.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Heart, MapPin, Mountain, Plus, Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AudioGuideBar } from '@/components/audio-guide-bar';
import { PhotoShade } from '@/components/photo-shade';
import { getPlace, locLine, photoSource } from '@/data/places';
import { inTrip, useApp } from '@/store/app-store';
import { color, radius, spacing, type } from '@/theme/tokens';

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = getPlace(id);
  const insets = useSafeAreaInsets();
  const saved = useApp((s) => s.saved.includes(id));
  const added = useApp((s) => inTrip(s.trip, id));
  const toggleSaved = useApp((s) => s.toggleSaved);
  const addToTrip = useApp((s) => s.addToTrip);

  if (!place) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 60, alignItems: 'center' }]}>
        <Text style={[type.label, { color: color.paper }]}>Место не найдено</Text>
      </View>
    );
  }

  const hero = photoSource(place, 0, true);
  const tiles: [string, string][] = [
    ['Сложность', place.s.diff],
    ['Когда', place.s.when],
    ['Доступ', place.s.acc],
    ['Время на месте', place.s.onsite],
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.hero}>
          {hero ? (
            <Image source={hero} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroEmpty]}>
              <Mountain size={48} color={color.mutedOnDark} strokeWidth={1.4} />
            </View>
          )}
          <PhotoShade from={0.5} to="#000" />
          <View style={styles.heroInfo}>
            {place.rating && (
              <Text style={styles.ratingPill}>
                {place.rating.v} ★ {place.rating.src}
              </Text>
            )}
            <Text style={styles.title}>{place.name}</Text>
            <View style={styles.locRow}>
              <MapPin size={14} color={color.mutedOnDark} strokeWidth={1.8} />
              <Text style={styles.loc}>{locLine(place)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.dark}>
          <View style={styles.grid}>
            {tiles.map(([k, v]) => (
              <View key={k} style={styles.tile}>
                <Text style={styles.tileK}>{k}</Text>
                <Text style={styles.tileV} numberOfLines={2}>
                  {v || 'пока не подтверждено'}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.secTitle}>Почему стоит приехать</Text>
          <Text style={styles.body}>{place.guide || place.short}</Text>
        </View>

        <View style={styles.sheet}>
          <AudioGuideBar placeId={place.id} />
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              addToTrip(place.id);
            }}
            disabled={added}
            accessibilityRole="button"
            style={[styles.tripBtn, added && { opacity: 0.6 }]}>
            {added ? <Check size={20} color={color.black} /> : <Plus size={20} color={color.black} />}
            <Text style={type.label}>{added ? 'Уже в маршруте' : 'Добавить в маршрут'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.topBtns, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Назад" style={styles.round}>
          <ChevronLeft size={24} color={color.paper} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            toggleSaved(place.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Убрать из избранного' : 'В избранное'}
          style={styles.round}>
          <Heart size={22} color={saved ? color.lime : color.paper} fill={saved ? color.lime : 'transparent'} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  hero: { height: 460, justifyContent: 'flex-end' },
  heroEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#151515' },
  heroInfo: { padding: spacing.screenGutter, paddingBottom: 14 },
  ratingPill: {
    alignSelf: 'flex-start',
    ...type.caption,
    fontFamily: 'Mulish_700Bold',
    color: color.black,
    backgroundColor: 'rgba(255,255,255,.88)',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  title: { ...type.heroTitle, color: color.paper },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  loc: { ...type.caption, color: color.mutedOnDark },
  dark: { paddingHorizontal: spacing.screenGutter, paddingBottom: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 28, borderWidth: 1.6, borderColor: color.lime, padding: 8, marginTop: 6 },
  tile: { width: '50%', padding: 10 },
  tileK: { ...type.label, color: color.paper },
  tileV: { ...type.caption, color: color.mutedOnDark, marginTop: 2 },
  secTitle: { ...type.sectionTitle, color: color.paper, marginTop: spacing.sectionGap, marginBottom: 14 },
  body: { ...type.body, color: color.paper },
  sheet: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: -34,
    padding: spacing.screenGutter,
    paddingTop: 24,
    gap: 12,
    minHeight: 300,
  },
  tripBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: color.mist,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topBtns: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,.4)', alignItems: 'center', justifyContent: 'center' },
});
