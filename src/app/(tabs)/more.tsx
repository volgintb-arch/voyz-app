// «Ещё»: избранное и сведения о данных. Остальные пункты — по мере шагов плана.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RowPlaceCard } from '@/components/place-cards';
import { TabStub } from '@/components/tab-stub';
import { getPlace, meta } from '@/data/places';
import { useApp } from '@/store/app-store';
import { color, type } from '@/theme/tokens';

export default function MoreTab() {
  const saved = useApp((s) => s.saved);
  const country = useApp((s) => s.country);

  return (
    <TabStub title="Ещё" sub={`Данные от ${meta.built} · ${meta.count} мест`}>
      <Text style={styles.h}>Избранное</Text>
      {saved.length === 0 ? (
        <Text style={styles.p}>Нажмите ♡ в карточке места, чтобы сохранить его сюда.</Text>
      ) : (
        saved.map((id) => {
          const p = getPlace(id);
          return p ? <RowPlaceCard key={id} place={p} /> : null;
        })
      )}

      <Text style={[styles.h, { marginTop: 18 }]}>Страна</Text>
      <View style={styles.row}>
        <Text style={styles.p}>{country ? meta.countries[country].name : '—'}</Text>
        <Pressable onPress={() => router.push('/onboarding')} accessibilityRole="button" hitSlop={10} style={styles.btn}>
          <Text style={styles.btnText}>Сменить</Text>
        </Pressable>
      </View>
    </TabStub>
  );
}

const styles = StyleSheet.create({
  h: { ...type.cardTitle, color: color.black },
  p: { ...type.body, color: color.muted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: { backgroundColor: color.mist, borderRadius: 999, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  btnText: { ...type.label, color: color.black },
});
