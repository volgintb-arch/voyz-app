// Просмотрщик фото: листание на весь экран, подпись с автором и лицензией, ссылки на фото и видео.
// Modal — системная «назад» на Android закрывает сначала его (docs: правило 8).
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Icon } from '@/components/icon';
import { photoSource } from '@/data/places';
import type { Place } from '@/data/types';
import { cut } from '@/lib/text';
import { APP_MAX_W, useAppSize } from '@/lib/layout';
import { color } from '@/theme/tokens';

export function PhotoViewer({ place, index, onClose }: { place: Place; index: number | null; onClose: () => void }) {
  const { width, height } = useAppSize();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(index ?? 0);
  const links = [
    ...place.plinks.map((l) => ({ ic: 'link' as const, t: l.cap + (l.by ? ` · ${l.by}` : ''), u: l.url })),
    ...place.videos.map((v) => ({ ic: 'play' as const, t: v.t + (v.ch && !/не подтв/.test(v.ch) ? ` · ${v.ch}` : ''), u: v.u })),
  ]
    .filter((x) => x.u)
    .slice(0, 8);
  const ph = place.photos[page];

  return (
    <Modal visible={index != null} transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {place.photos.length ? (
          <FlatList
            horizontal
            pagingEnabled
            data={place.photos}
            initialScrollIndex={index ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(x) => x.f}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ index: i }) => (
              <View style={{ width, height: height * 0.62, justifyContent: 'center', marginTop: insets.top + 70 }}>
                <Image source={photoSource(place, i, true)} style={{ width, height: '100%' }} contentFit="contain" />
              </View>
            )}
          />
        ) : (
          <Text style={[styles.cap, { marginTop: insets.top + 120 }]}>Фото нет — смотрите ссылки ниже</Text>
        )}
        {ph ? (
          <View style={styles.capBox}>
            <Text style={styles.cap}>
              {ph.cap}
              {ph.by ? ` · ${ph.by}` : ''}
              {ph.lic ? ` · ${ph.lic}` : ''}
            </Text>
            {ph.page ? (
              <Pressable onPress={() => Linking.openURL(ph.page)} accessibilityRole="link">
                <Text style={[styles.cap, { textDecorationLine: 'underline', color: color.lime }]}>источник</Text>
              </Pressable>
            ) : null}
            <Text style={styles.count}>
              {page + 1} / {place.photos.length}
            </Text>
          </View>
        ) : null}
        <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: insets.bottom + 16 }}>
          {links.map((l) => (
            <Pressable key={l.u} onPress={() => Linking.openURL(l.u)} style={styles.link} accessibilityRole="link">
              <Icon name={l.ic} size={16} color={color.lime} />
              <Text style={styles.linkT} numberOfLines={1}>
                {cut(l.t, 70)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onClose} style={[styles.x, { top: insets.top + 10 }]} accessibilityRole="button" accessibilityLabel="Закрыть">
          <Glass dark clear style={styles.xb}>
            <Icon name="close" size={22} color={color.paper} />
          </Glass>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: APP_MAX_W, alignSelf: 'center', backgroundColor: '#000' },
  capBox: { paddingHorizontal: 20, paddingVertical: 12, gap: 4 },
  cap: { fontFamily: 'Mulish_400Regular', fontSize: 13, lineHeight: 18, color: '#ddd', textAlign: 'center' },
  count: { fontFamily: 'Mulish_700Bold', fontSize: 12, color: color.mutedOnDark, textAlign: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, borderRadius: 999, paddingHorizontal: 16, backgroundColor: '#161616' },
  linkT: { fontFamily: 'Mulish_500Medium', fontSize: 13.5, color: color.paper, flex: 1 },
  x: { position: 'absolute', right: 16 },
  xb: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
