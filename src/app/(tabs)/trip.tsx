// «Маршрут»: пока список добавленных мест по дням. Дейкстра и drag & drop — шаг 6 плана.
import { StyleSheet, Text, View } from 'react-native';

import { RowPlaceCard } from '@/components/place-cards';
import { TabStub } from '@/components/tab-stub';
import { getPlace } from '@/data/places';
import { useApp } from '@/store/app-store';
import { color, type } from '@/theme/tokens';

export default function TripTab() {
  const trip = useApp((s) => s.trip);
  const total = trip.reduce((n, d) => n + d.length, 0);

  return (
    <TabStub title="Маршрут" sub={total ? `${total} в маршруте` : 'Соберите поездку по дням'}>
      {total === 0 ? (
        <Text style={styles.empty}>Пока пусто. Откройте место и нажмите «Добавить в маршрут» — оно появится здесь.</Text>
      ) : (
        trip.map((day, d) => (
          <View key={d} style={{ gap: 10 }}>
            <Text style={styles.day}>День {d + 1}</Text>
            {day.map((id) => {
              const p = getPlace(id);
              return p ? <RowPlaceCard key={id} place={p} /> : null;
            })}
          </View>
        ))
      )}
    </TabStub>
  );
}

const styles = StyleSheet.create({
  empty: { ...type.body, color: color.muted },
  day: { ...type.cardTitle, color: color.black, marginTop: 6 },
});
