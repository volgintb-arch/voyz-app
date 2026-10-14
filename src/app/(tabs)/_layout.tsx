import { Redirect, Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useApp } from '@/store/app-store';

export default function TabsLayout() {
  const country = useApp((s) => s.country);
  // страну ещё не выбрали — сначала онбординг
  if (!country) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Обзор' }} />
      <Tabs.Screen name="map" options={{ title: 'Карта' }} />
      <Tabs.Screen name="trip" options={{ title: 'Маршрут' }} />
      <Tabs.Screen name="more" options={{ title: 'Ещё' }} />
    </Tabs>
  );
}
