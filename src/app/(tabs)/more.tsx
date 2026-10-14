// «Ещё» (docs/02_UX_SPEC.md → 5): страна, «Работает без интернета», «Как мы проверяем», «Карта без сети»,
// «Показать приветствие снова», «Предложить место».
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { VoyzLogo } from '@/components/voyz-logo';
import { meta, placesOf } from '@/data/places';
import { WEB_URL, canSaveOffline, saveForOffline, shareLink } from '@/lib/web-app';
import type { CountryCode } from '@/data/types';
import { toast, useApp } from '@/store/app-store';
import { useFilters } from '@/store/filters';
import { color, radius, spacing, type } from '@/theme/tokens';
import { downloadDetailedMap, supportsDetailedOffline } from '@/geo/offline-map';
import { estimateMb } from '@/geo/offline-tiles';
import { currentLang, dateLabel, pl, tr } from '@/i18n';

export default function MoreTab() {
  const insets = useSafeAreaInsets();
  const country = useApp((s) => s.country) ?? 'kg';
  const setCountry = useApp((s) => s.setCountry);
  const reports = useApp((s) => s.reports.length);
  const setLang = useApp((s) => s.setLang);
  const lang = currentLang();
  const L = placesOf(country);
  const withPhoto = L.filter((p) => p.photos.length).length;
  const [offline, setOffline] = useState<{ done: number; total: number } | null>(null);
  const [mapPct, setMapPct] = useState<number | null>(null);
  const offlineMaps = useApp((s) => s.offlineMaps);
  const setOfflineMap = useApp((s) => s.setOfflineMap);

  const saveMap = async () => {
    if (!supportsDetailedOffline()) return toast(tr('Сохранение доступно на опубликованном сайте'), 'map');
    setMapPct(0);
    try {
      await downloadDetailedMap(country, setMapPct);
      setOfflineMap(country);
      setMapPct(100);
      toast(tr('Подробная карта сохранена'), 'map');
    } catch {
      setMapPct(null);
      toast(tr('Не получилось скачать карту — проверьте интернет'), 'map');
    }
  };

  const saveOffline = async () => {
    if (!canSaveOffline()) return toast(tr('Сохранение доступно на опубликованном сайте'), 'download');
    setOffline({ done: 0, total: 1 });
    try {
      await saveForOffline((done, total) => setOffline({ done, total }));
      toast(tr('Сохранили — Voyz работает без интернета'), 'download');
    } catch {
      toast(tr('Не получилось сохранить — проверьте интернет'), 'download');
      setOffline(null);
    }
  };

  const pick = (c: CountryCode) => {
    if (c === country) return;
    useFilters.getState().clear();
    setCountry(c);
    toast(tr(meta.countries[c].name), 'globe');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.black }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 110 }}>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: spacing.screenGutter, paddingBottom: 60 }}>
        <Text style={styles.title} accessibilityRole="header">
          {tr('Ещё')}
        </Text>
        <Text style={styles.sub}>{tr('Настройки, офлайн и как мы проверяем места')}</Text>
      </View>
      <View style={styles.sheet}>
        <View style={styles.list}>
          {(['kg', 'alt'] as CountryCode[]).map((c) => (
            <Row key={c} icon="globe" label={tr(meta.countries[c].name)} onPress={() => pick(c)} right={c === country ? <Icon name="check" size={20} strokeWidth={2.2} /> : <Text style={styles.em}>{tr('{n} мест · {sub}', { n: placesOf(c).length, sub: '' }).replace(' · ', '')}</Text>} />
          ))}
          <View style={styles.langRow}>
            <Icon name="globe" size={20} />
            <Text style={[styles.em, { flex: 1, color: color.black, fontSize: 16, fontFamily: 'Mulish_500Medium' }]}>{tr('Язык')}</Text>
            {(['ru', 'en'] as const).map((l) => (
              <Pressable key={l} onPress={() => setLang(l)} style={[styles.langBtn, lang === l && { backgroundColor: color.black }]} accessibilityRole="radio" accessibilityState={{ checked: lang === l }}>
                <Text style={[styles.langT, lang === l && { color: color.lime }]}>{l === 'ru' ? 'Русский' : 'English'}</Text>
              </Pressable>
            ))}
          </View>
          <Row icon="download" label={tr('Работает без интернета')} right={<Text style={styles.em}>{tr('встроено')}</Text>} />
          {reports ? <Row icon="flag" label={tr('Отметки «Заметили изменения?»')} right={<Text style={styles.em}>{tr('{n} ждут отправки', { n: reports })}</Text>} /> : null}
        </View>

        {Platform.OS === 'web' ? (
          <View style={[styles.method, { marginTop: 20, backgroundColor: color.lime }]}>
            <Text style={styles.methodB}>{tr('Voyz на телефоне — без магазина')}</Text>
            <Text style={styles.methodT}>
              {tr('iPhone: Safari → «Поделиться» → «На экран Домой». Android: Chrome → меню ⋮ → «Установить приложение». Иконка появится на главном экране, Voyz откроется на весь экран.')}
            </Text>
            <Pressable onPress={saveOffline} disabled={!!offline && offline.done < offline.total} style={styles.offBtn} accessibilityRole="button">
              <Icon name="download" size={18} color={color.lime} />
              <Text style={styles.offT}>
                {!offline ? tr('Сохранить для офлайна · ~45 МБ') : offline.done < offline.total ? tr('Сохраняем… {p}%', { p: Math.round((offline.done / offline.total) * 100) }) : tr('Сохранено — работает без интернета ✓')}
              </Text>
            </Pressable>
            <Pressable onPress={async () => (await shareLink('Voyz', 'Voyz — путеводитель по Кыргызстану и Алтаю', WEB_URL + '/')) === 'copied' && toast(tr('Ссылка скопирована'), 'link')} style={[styles.offBtn, { backgroundColor: color.paper, marginTop: 8 }]} accessibilityRole="button">
              <Icon name="share" size={18} />
              <Text style={[styles.offT, { color: color.black }]}>{tr('Поделиться ссылкой на Voyz')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.method, { marginTop: 12, backgroundColor: color.black }]}>
          <Text style={[styles.methodB, { color: color.lime }]}>{tr('Подробная карта без сети')}</Text>
          <Text style={[styles.methodT, { color: color.paper }]}>
            {tr('Сёла, тропы, перевалы и подписи — для всей страны обзорно и подробно вокруг каждого места. Пригодится там, где нет связи.')}
          </Text>
          <Pressable onPress={saveMap} disabled={mapPct != null && mapPct < 100} style={[styles.offBtn, { backgroundColor: color.lime }]} accessibilityRole="button">
            <Icon name="map" size={18} />
            <Text style={[styles.offT, { color: color.black }]}>
              {mapPct != null && mapPct < 100
                ? tr('Скачиваем… {p}%', { p: mapPct })
                : offlineMaps[country]
                  ? tr('Карта скачана {date} · обновить', { date: dateLabel(offlineMaps[country]!) })
                  : tr('Скачать {country} · ~{mb} МБ', { country: tr(meta.countries[country].name), mb: estimateMb(country) })}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.method, { marginTop: 20 }]}>
          <Text style={styles.methodB}>{tr('Как мы проверяем места')}</Text>
          <Text style={styles.methodT}>
            {tr('Каждая карточка — 34 поля: от координат и сезона до парковки, связи и стоимости входа. Мы сверяем данные минимум по двум открытым источникам, отмечаем дату проверки и спорные места. Индекс полноты (0–100) складывается из насыщенности, числа подтверждённых полей и практической части: дорога, ночлег, транспорт. В разделе «{country}» — {n} {places}, у {photos} есть фото.', { country: tr(meta.countries[country].name), n: L.length, places: pl(L.length, 'место', 'места', 'мест'), photos: withPhoto })}
          </Text>
        </View>
        <View style={[styles.method, { marginTop: 12, backgroundColor: color.black }]}>
          <Text style={[styles.methodB, { color: color.lime }]}>{tr('Карта без сети')}</Text>
          <Text style={[styles.methodT, { color: color.paper }]}>
            {tr('Встроенная схема (Natural Earth): основные трассы, реки, озёра и границы. Рельеф гор и маршруты по дорогам тоже работают без интернета. Подробная карта, 3D и маршрут «от меня» — когда есть сеть. Для грунтовок откройте точку в навигаторе — кнопки есть в каждой карточке.')}
          </Text>
        </View>

        <View style={[styles.list, { marginTop: 12 }]}>
          <Row
            icon="sparkle"
            label={tr('Показать приветствие снова')}
            onPress={() => {
              setCountry(null);
              router.replace('/onboarding');
            }}
          />
          <Row icon="plus" label={tr('Предложить новое место')} onPress={() => Linking.openURL('mailto:?subject=' + encodeURIComponent('Voyz — предложить место'))} />
        </View>

        <View style={{ alignItems: 'center', paddingTop: 46 }}>
          <VoyzLogo width={260} fill="#151515" />
          <Text style={styles.foot}>{tr('Больше, чем просто поездки')}</Text>
          <Text style={[styles.em, { marginTop: 6 }]}>{tr('Данные проверены {date}', { date: meta.built.split('-').reverse().join('.') })}</Text>
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
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: color.line },
  langBtn: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: color.mist, justifyContent: 'center' },
  langT: { fontFamily: 'Mulish_600SemiBold', fontSize: 13, color: color.black },
  offBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 999, backgroundColor: color.black, marginTop: 14, paddingHorizontal: 16 },
  offT: { fontFamily: 'Mulish_700Bold', fontSize: 14.5, color: color.lime },
  foot: { fontFamily: 'Mulish_400Regular', fontSize: 15, color: '#222', marginTop: 12 },
});
