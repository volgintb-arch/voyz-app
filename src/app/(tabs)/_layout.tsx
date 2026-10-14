import { Redirect, Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useT } from '@/i18n';
import { useApp } from '@/store/app-store';

export default function TabsLayout() {
  const country = useApp((s) => s.country);
  const { t } = useT();
  // страну ещё не выбрали — сначала онбординг
  if (!country) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('Обзор') }} />
      <Tabs.Screen name="map" options={{ title: t('Карта') }} />
      <Tabs.Screen name="trip" options={{ title: t('Маршрут') }} />
      <Tabs.Screen name="more" options={{ title: t('Ещё') }} />
    </Tabs>
  );
}
