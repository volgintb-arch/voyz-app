// Шторка фильтров: месяц, категория, сложность, доступ, «есть маршрутка», «только с фото». Живой счётчик в кнопке.
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button, Chip } from '@/components/ui';
import { catGroup, filterPlaces, placesOf, type Filters } from '@/data/places';
import { ACCESS, type AccessCode } from '@/data/codes';
import type { CountryCode } from '@/data/types';
import { color, spacing } from '@/theme/tokens';
import { dataLabel, tr } from '@/i18n';

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const DIFFS: [number, string][] = [
  [1, 'Очень лёгкая'],
  [2, 'Лёгкая'],
  [3, 'Средняя'],
  [4, 'Сложная'],
  [5, 'Очень сложная'],
];

interface Props {
  visible: boolean;
  country: CountryCode;
  value: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}

export function FilterSheet({ visible, country, value, onApply, onClose }: Props) {
  // родитель меняет key при каждом открытии — локальный черновик фильтров начинается с текущих
  const [f, setF] = useState<Filters>(value);

  const { cats, accs } = useMemo(() => {
    const L = placesOf(country);
    return { cats: [...new Set(L.map((p) => catGroup(p)))], accs: [...new Set(L.map((p) => p.content?.access).filter((a): a is AccessCode => !!a && a in ACCESS))] };
  }, [country]);

  const count = useMemo(() => filterPlaces(country, f).length, [country, f]);
  const toggle = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: s[k] === v ? undefined : v }));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={tr('Фильтры')}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label={tr('Сбросить')} tone="grey" style={{ flex: 1 }} onPress={() => setF({ q: f.q })} />
          <Button label={tr('Показать {n}', { n: count })} style={{ flex: 1 }} onPress={() => onApply(f)} />
        </View>
      }>
      <Group title={tr('Когда едете')}>
        {MONTHS_SHORT.map((m, i) => (
          <Chip key={m} small label={tr(m)} on={f.month === i + 1} onPress={() => toggle('month', i + 1)} />
        ))}
      </Group>
      <Group title={tr('Что ищете')}>
        {cats.map((c) => (
          <Chip key={c} small label={tr(c)} on={f.cat === c} onPress={() => toggle('cat', c)} />
        ))}
      </Group>
      <Group title={tr('Сложность')}>
        {DIFFS.map(([k, l]) => (
          <Chip key={k} small label={tr(l)} on={f.diff === k} onPress={() => toggle('diff', k)} />
        ))}
      </Group>
      <Group title={tr('Как добраться')}>
        {accs.map((a) => (
          <Chip key={a} small label={dataLabel(ACCESS[a])} on={f.acc === a} onPress={() => toggle('acc', a)} />
        ))}
        <Chip small label={tr('Есть маршрутка или автобус')} on={!!f.nocar} onPress={() => toggle('nocar', true)} />
      </Group>
      <Group title={tr('Ещё')}>
        <Chip small label={tr('Только с фото')} on={!!f.photo} onPress={() => toggle('photo', true)} />
      </Group>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.gt}>{title}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  gt: { fontFamily: 'Mulish_700Bold', fontSize: 15, color: color.black, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.chipGap - 2 },
});
