import { StyleSheet, Text } from 'react-native';

import { TabStub } from '@/components/tab-stub';
import { color, type } from '@/theme/tokens';

// Карта на MapLibre с офлайн-слоем из assets/data/geo.json — шаг 5 плана.
export default function MapTab() {
  return (
    <TabStub title="Карта" sub="Офлайн-карта страны и все места">
      <Text style={styles.p}>Карта появится на шаге 5: MapLibre, стиль по токенам, дороги и озёра из встроенного geo.json.</Text>
    </TabStub>
  );
}

const styles = StyleSheet.create({ p: { ...type.body, color: color.muted } });
