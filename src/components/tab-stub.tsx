// Временная шапка для вкладок, которые появятся на следующих шагах плана.
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, spacing, type } from '@/theme/tokens';

export function TabStub({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.black }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 110 }}>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: spacing.screenGutter, paddingBottom: 60 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <View style={styles.sheet}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.paper },
  sub: { ...type.caption, color: color.mutedOnDark, marginTop: 8 },
  sheet: {
    flex: 1,
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: -34,
    padding: spacing.screenGutter,
    paddingTop: 28,
    gap: 10,
  },
});
