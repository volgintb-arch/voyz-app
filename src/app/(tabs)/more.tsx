// «Ещё» (docs/02_UX_SPEC.md → 5): страна, «Работает без интернета», «Как мы проверяем», «Карта без сети»,
// «Показать приветствие снова», «Предложить место».
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { VoyzLogo } from '@/components/voyz-logo';
import { meta, placesOf, plural } from '@/data/places';
import type { CountryCode } from '@/data/types';
import { toast, useApp } from '@/store/app-store';
import { useFilters } from '@/store/filters';
import { color, radius, spacing, type } from '@/theme/tokens';

export default function MoreTab() {
  const insets = useSafeAreaInsets();
  const country = useApp((s) => s.country) ?? 'kg';
  const setCountry = useApp((s) => s.setCountry);
  const reports = useApp((s) => s.reports.length);
  const L = placesOf(country);
  const withPhoto = L.filter((p) => p.photos.length).length;

  const pick = (c: CountryCode) => {
    if (c === country) return;
    useFilters.getState().clear();
    setCountry(c);
    toast(meta.countries[c].name, 'globe');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.black }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 110 }}>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: spacing.screenGutter, paddingBottom: 60 }}>
        <Text style={styles.title} accessibilityRole="header">
          Ещё
        </Text>
        <Text style={styles.sub}>Настройки, офлайн и как мы проверяем места</Text>
      </View>
      <View style={styles.sheet}>
        <View style={styles.list}>
          {(['kg', 'alt'] as CountryCode[]).map((c) => (
            <Row key={c} icon="globe" label={meta.countries[c].name} onPress={() => pick(c)} right={c === country ? <Icon name="check" size={20} strokeWidth={2.2} /> : <Text style={styles.em}>{placesOf(c).length} мест</Text>} />
          ))}
          <Row icon="download" label="Работает без интернета" right={<Text style={styles.em}>встроено</Text>} />
          {reports ? <Row icon="flag" label="Отметки «Заметили изменения?»" right={<Text style={styles.em}>{reports} ждут отправки</Text>} /> : null}
        </View>

        <View style={[styles.method, { marginTop: 20 }]}>
          <Text style={styles.methodB}>Как мы проверяем места</Text>
          <Text style={styles.methodT}>
            Каждая карточка — 34 поля: от координат и сезона до парковки, связи и стоимости входа. Мы сверяем данные минимум по двум открытым источникам, отмечаем дату проверки и спорные места. Индекс полноты (0–100) складывается из насыщенности, числа подтверждённых полей и практической части: дорога, ночлег, транспорт. В разделе «{meta.countries[country].name}» — {L.length} {plural(L.length, 'место', 'места', 'мест')}, у {withPhoto} есть фото.
          </Text>
        </View>
        <View style={[styles.method, { marginTop: 12, backgroundColor: color.black }]}>
          <Text style={[styles.methodB, { color: color.lime }]}>Карта без сети</Text>
          <Text style={[styles.methodT, { color: color.paper }]}>
            Встроенная схема (Natural Earth): основные трассы, реки, озёра и границы. Маршруты по дорогам строятся на телефоне, без интернета. Подробная карта, рельеф и маршрут «от меня» — когда есть сеть. Для грунтовок откройте точку в навигаторе — кнопки есть в каждой карточке.
          </Text>
        </View>

        <View style={[styles.list, { marginTop: 12 }]}>
          <Row
            icon="sparkle"
            label="Показать приветствие снова"
            onPress={() => {
              setCountry(null);
              router.replace('/onboarding');
            }}
          />
          <Row icon="plus" label="Предложить новое место" onPress={() => Linking.openURL('mailto:?subject=' + encodeURIComponent('Voyz — предложить место'))} />
        </View>

        <View style={{ alignItems: 'center', paddingTop: 46 }}>
          <VoyzLogo width={260} fill="#151515" />
          <Text style={styles.foot}>Больше, чем просто поездки</Text>
          <Text style={[styles.em, { marginTop: 6 }]}>Данные проверены {meta.built.split('-').reverse().join('.')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Row({ icon, label, right, onPress }: { icon: IconName; label: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.mist }]} accessibilityRole={onPress ? 'button' : undefined}>
      <Icon name={icon} size={20} />
      <Text style={styles.rowT}>{label}</Text>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.paper },
  sub: { ...type.caption, color: color.mutedOnDark, marginTop: 8 },
  sheet: { flex: 1, backgroundColor: color.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, marginTop: -34, padding: spacing.screenGutter, paddingTop: 22 },
  list: { borderTopWidth: 1, borderTopColor: color.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: color.line },
  rowT: { flex: 1, fontFamily: 'Mulish_500Medium', fontSize: 16, color: color.black },
  em: { fontFamily: 'Mulish_400Regular', fontSize: 13, color: color.muted },
  method: { backgroundColor: color.mist, borderRadius: 24, padding: 18 },
  methodB: { fontFamily: 'Mulish_700Bold', fontSize: 16, color: color.black, marginBottom: 6 },
  methodT: { fontFamily: 'Mulish_400Regular', fontSize: 14.5, lineHeight: 21, color: '#262624' },
  foot: { fontFamily: 'Mulish_400Regular', fontSize: 15, color: '#222', marginTop: 12 },
});
