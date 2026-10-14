import {
  Mulish_400Regular,
  Mulish_500Medium,
  Mulish_600SemiBold,
  Mulish_700Bold,
  Mulish_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/mulish';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Splash } from '@/components/splash';
import { ToastHost } from '@/components/toast-host';
import { APP_MAX_W } from '@/lib/layout';
import { registerServiceWorker } from '@/lib/web-app';
import { useApp } from '@/store/app-store';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Mulish_400Regular, Mulish_500Medium, Mulish_600SemiBold, Mulish_700Bold, Mulish_800ExtraBold });

  // шрифт не должен блокировать запуск навсегда: через 4 с показываем экран системным шрифтом
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const ready = loaded || !!error || timedOut;
  const [splash, setSplash] = useState(true);
  const lang = useApp((s) => s.lang);
  // веб: сервис-воркер — приложение открывается без сети и ставится на главный экран
  useEffect(registerServiceWorker, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.outer}>
      <View style={styles.column}>
      <StatusBar style="light" />
      <Stack key={lang ?? 'auto'} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.black } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* push: слайд справа, свайп от левого края назад (iOS), системная «назад» на Android */}
        <Stack.Screen name="place/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true, animationDuration: 460 }} />
      </Stack>
      <ToastHost />
      {splash ? <Splash onDone={() => setSplash(false)} /> : null}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#0b0b0b' : color.black, alignItems: 'center' },
  // в вебе — колонка ширины телефона по центру; на телефоне — весь экран
  column: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? APP_MAX_W : undefined, backgroundColor: color.black, overflow: 'hidden' },
});
