// Ридер: шторка на 92 % высоты, кегль 17/1.62, подзаголовки и списки (docs/02_UX_SPEC.md → «Читаемость»).
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { RichText } from '@/components/rich-text';
import { Sheet } from '@/components/sheet';
import { Chip } from '@/components/ui';
import { color } from '@/theme/tokens';
import { tr } from '@/i18n';

import type { Reader } from './readers';

interface Props {
  placeName: string;
  reader: Reader | null;
  onClose: () => void;
  onListen?: () => void; // для ридера «Почему стоит приехать» — кнопка аудиогида
  listenLabel?: string;
}

export function ReaderSheet({ placeName, reader, onClose, onListen, listenLabel }: Props) {
  return (
    <Sheet visible={!!reader} onClose={onClose} tall>
      {reader ? (
        <View>
          <Text style={styles.kicker}>{placeName}</Text>
          <Text style={styles.title}>{reader.title}</Text>
          {onListen ? (
            <View style={{ marginBottom: 14 }}>
              <Chip label={listenLabel ?? tr('Послушать')} icon="play" tone="lime" onPress={onListen} />
            </View>
          ) : null}
          {reader.blocks.map((b, i) => {
            if ('h' in b) return <Text key={i} style={styles.h}>{b.h}</Text>;
            if ('p' in b)
              return (
                <RichText key={i} style={[styles.p, b.small && styles.small]}>
                  {b.p}
                </RichText>
              );
            if ('list' in b)
              return (
                <View key={i} style={{ gap: 8, marginBottom: 10 }}>
                  {b.list.map((t, k) => (
                    <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
                      <Text style={styles.p}>•</Text>
                      <RichText style={[styles.p, { flex: 1, marginBottom: 0 }]}>{t}</RichText>
                    </View>
                  ))}
                </View>
              );
            if ('svc' in b)
              return (
                <View key={i} style={styles.svcGrid}>
                  {b.svc.map(([ic, n, t]) => (
                    <View key={n} style={styles.svc}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <Icon name={ic} size={16} />
                        <Text style={styles.svcH}>{n}</Text>
                      </View>
                      <RichText style={styles.svcT}>{t}</RichText>
                    </View>
                  ))}
                </View>
              );
            return (
              <View key={i} style={{ gap: 8 }}>
                {b.links.map((l) => (
                  <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={styles.link} accessibilityRole="link">
                    <Icon name="link" size={18} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkT} numberOfLines={2}>
                        {l.title}
                      </Text>
                      {l.note ? <Text style={styles.small}>{l.note}</Text> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: 'Mulish_600SemiBold', fontSize: 13, color: color.muted, textAlign: 'center' },
  title: { fontFamily: 'Mulish_500Medium', fontSize: 24, lineHeight: 28, textTransform: 'uppercase', textAlign: 'center', color: color.black, marginTop: 4, marginBottom: 16 },
  h: { fontFamily: 'Mulish_700Bold', fontSize: 18, color: color.black, marginTop: 14, marginBottom: 6 },
  p: { fontFamily: 'Mulish_400Regular', fontSize: 17, lineHeight: 27.5, color: '#1d1d1b', marginBottom: 12 },
  small: { fontSize: 13.5, lineHeight: 19, color: color.muted },
  svcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  svc: { width: '48%', backgroundColor: color.mist, borderRadius: 16, padding: 12 },
  svcH: { fontFamily: 'Mulish_700Bold', fontSize: 14, color: color.black },
  svcT: { fontFamily: 'Mulish_400Regular', fontSize: 13.5, lineHeight: 19, color: '#333' },
  link: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: color.line },
  linkT: { fontFamily: 'Mulish_600SemiBold', fontSize: 14, color: color.black },
});
