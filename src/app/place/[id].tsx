// Карточка места — главный экран (docs/02_UX_SPEC.md → 2, макет design/reference/voyz_place_card_mockup.jpg).
// Порядок блоков как в прототипе; белый лист наезжает на чёрное; компактная шапка со scroll-spy.
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AudioGuideBar, type AudioGuideRef } from '@/components/audio-guide-bar';
import { Glass, GlassGroup } from '@/components/glass';
import { Icon } from '@/components/icon';
import { HERO_H, Hero } from '@/components/place/hero';
import {
  BringBlock,
  ChangeReport,
  FoodBlock,
  Footer,
  HikesBlock,
  ImportantBlock,
  NearbyBlock,
  SeasonBlock,
  StaysBlock,
  TrustBlock,
  UsefulBlock,
  WantCard,
} from '@/components/place/lower-blocks';
import { PhotoViewer } from '@/components/place/photo-viewer';
import { ReaderSheet } from '@/components/place/reader-sheet';
import { buildReaders, type ReaderKey } from '@/components/place/readers';
import { RouteSection } from '@/components/place/route-section';
import { InfoGrid, KeyFacts, MediaBlock, WhySection } from '@/components/place/top-blocks';
import { HeartButton } from '@/components/ui';
import { audioSeconds, getPlace } from '@/data/places';
import { cut, mmss } from '@/lib/text';
import { placeUrl, shareLink } from '@/lib/web-app';
import { toast } from '@/store/app-store';
import { color, motion, radius } from '@/theme/tokens';
import { currentLang, tr } from '@/i18n';

const SECTIONS: [string, string][] = [
  ['ov', 'Обзор'],
  ['route', 'Дорога'],
  ['imp', 'Важно'],
  ['stay', 'Ночлег'],
  ['site', 'На месте'],
  ['src', 'Проверка'],
  // подписи переводятся при выводе: tr(n)
];

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = getPlace(id);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const scroll = useRef<Animated.ScrollView>(null);
  const nav = useRef<ScrollView>(null);
  const audio = useRef<AudioGuideRef>(null);
  const y = useSharedValue(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [reader, setReader] = useState<ReaderKey | null>(null);
  const [ui, setUi] = useState({ compact: false, light: false, on: 'ov', trust: false });
  // y якоря внутри своего контейнера; отступ белого листа прибавляем при чтении —
  // onLayout детей приходит раньше, чем у самого листа, и whiteTop в этот момент ещё 0
  const whiteTop = useRef(0);
  const anchors = useRef<Record<string, { y: number; white: boolean }>>({});
  const anchorY = (k: string) => {
    const a = anchors.current[k];
    return a ? a.y + (a.white ? whiteTop.current : 0) : undefined;
  };
  const readers = useMemo(() => (place ? buildReaders(place) : {}), [place]);

  // scroll-spy и смена темы шапки — пересчёт на JS только когда что-то поменялось
  const onY = (v: number) => {
    let on = 'ov';
    for (const [k] of SECTIONS) {
      const ay = anchorY(k);
      if (ay != null && ay - 140 <= v) on = k;
    }
    const next = { compact: v > HERO_H - 90, light: v > whiteTop.current - 60, on, trust: ui.trust || (anchorY('src') ?? Infinity) < v + height - 80 };
    if (next.compact !== ui.compact || next.light !== ui.light || next.on !== ui.on || next.trust !== ui.trust) {
      if (next.on !== ui.on) {
        const i = SECTIONS.findIndex(([k]) => k === next.on);
        nav.current?.scrollTo({ x: Math.max(0, i * 78 - 60), animated: true });
      }
      setUi(next);
    }
  };
  const handler = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    runOnJS(onY)(e.contentOffset.y);
  });

  const compactStyle = useAnimatedStyle(() => ({ transform: [{ translateY: withTiming(ui.compact ? 0 : -160, { duration: reduce ? 0 : 350, easing: motion.easeStandard }) }] }), [ui.compact, reduce]);

  if (!place) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 60, alignItems: 'center' }]}>
        <Text style={{ fontFamily: 'Mulish_600SemiBold', fontSize: 16, color: color.paper }}>{tr('Место не найдено')}</Text>
      </View>
    );
  }

  // обработчики событий layout (не создаются через вызов в рендере — так их понимает React Compiler)
  const setAnchor = (k: string, e: LayoutChangeEvent, inWhite = true) => {
    anchors.current = { ...anchors.current, [k]: { y: e.nativeEvent.layout.y, white: inWhite } };
  };
  const setWhiteTop = (e: LayoutChangeEvent) => {
    whiteTop.current = e.nativeEvent.layout.y;
  };
  const jump = (k: string) => {
    const top = anchorY(k);
    if (top != null) scroll.current?.scrollTo({ y: Math.max(0, top - 110), animated: !reduce });
  };
  // ссылка на веб-версию — откроется у любого получателя, даже без установленного приложения
  const share = async () => {
    const r = await shareLink(place.name, `${place.name} — ${cut(place.short, 140)}`, placeUrl(place.id));
    if (r === 'copied') toast(tr('Ссылка скопирована'), 'link');
  };
  const secs = audioSeconds(place.id);
  const r = reader ? readers[reader] ?? null : null;

  return (
    <View style={styles.root}>
      <StatusBar style={ui.light ? 'dark' : 'light'} />
      <Animated.ScrollView ref={scroll} onScroll={handler} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reduce ? FadeIn.duration(motion.reducedCrossfade) : FadeIn.duration(motion.sharedElement)}>
          <Hero place={place} scrollY={y} onPhoto={setViewer} onMapThumb={() => jump('route')} />
        </Animated.View>
        <InfoGrid place={place} />
        {currentLang() === 'en' ? (
          <View style={styles.langNote}>
            <Icon name="info" size={16} color={color.lime} />
            <Text style={styles.langNoteT}>{tr('Описание места пока на русском')}</Text>
          </View>
        ) : null}
        <View onLayout={(e) => setAnchor('ov', e, false)}>
          <WhySection place={place} onRead={() => setReader('guide')} />
        </View>

        <View style={styles.white} onLayout={setWhiteTop}>
          <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
            <AudioGuideBar ref={audio} placeId={place.id} title={place.name} text={place.guide} />
          </View>
          <KeyFacts place={place} />
          <MediaBlock place={place} onView={setViewer} />
          <View onLayout={(e) => setAnchor('route', e)}>
            <RouteSection place={place} onReadHow={() => setReader('how')} />
          </View>
          <WantCard place={place} />
          <SeasonBlock place={place} onRead={() => setReader('season')} />
          <BringBlock place={place} />
          <View onLayout={(e) => setAnchor('imp', e)}>
            <ImportantBlock place={place} onRead={() => setReader('warn')} />
          </View>
          <View onLayout={(e) => setAnchor('stay', e)}>
            <StaysBlock place={place} onRead={() => setReader('stay')} />
            <FoodBlock place={place} />
          </View>
          <View onLayout={(e) => setAnchor('site', e)}>
            <HikesBlock place={place} onRead={() => setReader('hikes')} />
            <UsefulBlock readers={readers} onRead={setReader} />
          </View>
          <NearbyBlock place={place} onMap={() => router.navigate({ pathname: '/map', params: { focus: place.id } })} />
          <View onLayout={(e) => setAnchor('src', e)}>
            <TrustBlock place={place} visible={ui.trust} onRead={() => setReader('src')} />
          </View>
          <ChangeReport place={place} />
          <Footer />
          <View style={{ height: insets.bottom + 40 }} />
        </View>
      </Animated.ScrollView>

      {/* кнопки над hero: назад; поделиться и сердце — одной стеклянной группой */}
      {!ui.compact ? (
        <View style={[styles.topBtns, { top: insets.top + 10 }]} pointerEvents="box-none">
          <RoundGlass onPress={() => router.back()} label={tr('Назад')} icon="back" />
          <GlassGroup spacing={12}>
            <RoundGlass onPress={share} label={tr('Поделиться')} icon="share" />
            <Glass clear dark interactive style={styles.glassBtn}>
              <HeartButton id={place.id} size={22} />
            </Glass>
          </GlassGroup>
        </View>
      ) : null}

      {/* компактная шапка: тёмная над чёрным, светлая над белым */}
      <Animated.View style={[styles.compactWrap, compactStyle]} pointerEvents={ui.compact ? 'auto' : 'none'}>
        <Glass dark={!ui.light} tint={ui.light ? 'rgba(255,255,255,.86)' : 'rgba(10,10,10,.72)'} style={[styles.compact, { paddingTop: insets.top + 6 }]}>
          <View style={styles.compactRow}>
            <Pressable onPress={() => router.back()} style={[styles.smallBtn, { backgroundColor: 'rgba(127,127,127,.18)' }]} accessibilityRole="button" accessibilityLabel={tr('Назад')}>
              <Icon name="back" size={20} color={ui.light ? color.black : color.paper} />
            </Pressable>
            <Text style={[styles.ttl, { color: ui.light ? color.black : color.paper }]} numberOfLines={1}>
              {place.name}
            </Text>
            <View style={[styles.smallBtn, { backgroundColor: 'rgba(127,127,127,.18)' }]}>
              <HeartButton id={place.id} size={20} tint={ui.light ? color.black : color.paper} onDark={!ui.light} />
            </View>
          </View>
          <ScrollView ref={nav} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.secnav}>
            {SECTIONS.map(([k, n]) => (
              <Pressable key={k} onPress={() => jump(k)} style={[styles.navChip, ui.on === k && { backgroundColor: color.lime }]} accessibilityRole="button" accessibilityState={{ selected: ui.on === k }}>
                <Text style={[styles.navChipT, { color: ui.on === k ? color.black : ui.light ? color.black : color.paper }]}>{tr(n)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Glass>
      </Animated.View>

      <PhotoViewer place={place} index={viewer} onClose={() => setViewer(null)} />
      <ReaderSheet
        placeName={place.name}
        reader={r}
        onClose={() => setReader(null)}
        onListen={
          reader === 'guide'
            ? () => {
                setReader(null);
                audio.current?.play();
              }
            : undefined
        }
        listenLabel={secs ? tr('Послушать · {t}', { t: mmss(secs) }) : tr('Послушать')}
      />
    </View>
  );
}

function RoundGlass({ onPress, label, icon }: { onPress: () => void; label: string; icon: 'back' | 'share' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Glass clear dark interactive style={styles.glassBtn}>
        <Icon name={icon} size={22} color={color.paper} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  white: { backgroundColor: color.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, marginTop: -34 },
  langNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#151515' },
  langNoteT: { fontFamily: 'Mulish_500Medium', fontSize: 13, color: color.mutedOnDark, flex: 1 },
  topBtns: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  glassBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  compactWrap: { position: 'absolute', left: 0, right: 0, top: 0 },
  compact: { paddingBottom: 10, borderRadius: 0 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  smallBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ttl: { flex: 1, fontFamily: 'Mulish_700Bold', fontSize: 15 },
  secnav: { gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  navChip: { height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(127,127,127,.16)', justifyContent: 'center' },
  navChipT: { fontFamily: 'Mulish_700Bold', fontSize: 12.5 },
});
