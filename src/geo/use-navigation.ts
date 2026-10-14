// Онлайн-маршрут «от меня до места» и ведение: позиция, следующий манёвр, пересчёт при съезде,
// голосовые подсказки синтезом речи (за 500 и 150 м). Полноценная навигация — в v1.
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { LatLng } from '@/data/types';
import { currentLang, tr } from '@/i18n';
import { haversine } from '@/lib/text';

import { distToLineM, fetchRoute, fmtDist, nextManeuver, type Maneuver, type OnlineRoute } from './online';

/** Голос подсказок — на языке интерфейса. */
const voiceLang = () => (currentLang() === 'en' ? 'en-US' : 'ru-RU');

export type NavState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error'; msg: string }
  | { phase: 'preview' | 'driving'; route: OnlineRoute; next?: Maneuver; nextDist?: number; leftKm?: number; pos?: LatLng; heading?: number };

const OFF_ROUTE_M = 80;
const REROUTE_EVERY_MS = 20000;

export function useNavigation(dest: LatLng | null) {
  const [state, setState] = useState<NavState>({ phase: 'idle' });
  const [voice, setVoice] = useState(true);
  const watch = useRef<Location.LocationSubscription | null>(null);
  const passed = useRef(0);
  const spoken = useRef(new Set<string>());
  const lastReroute = useRef(0);
  const route = useRef<OnlineRoute | null>(null);
  const voiceRef = useRef(voice);
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  const stop = useCallback(() => {
    watch.current?.remove();
    watch.current = null;
    Speech.stop();
    route.current = null;
    setState({ phase: 'idle' });
  }, []);
  useEffect(() => stop, [stop]);

  const myPos = async (): Promise<LatLng> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('no-permission');
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return [p.coords.latitude, p.coords.longitude];
  };

  /** Построить маршрут от текущей позиции и показать его (без ведения). */
  const preview = useCallback(async () => {
    if (!dest) return;
    setState({ phase: 'loading' });
    try {
      const from = await myPos();
      const r = await fetchRoute(from, dest);
      route.current = r;
      passed.current = 0;
      spoken.current.clear();
      setState({ phase: 'preview', route: r, pos: from, next: r.steps[1], leftKm: r.km });
    } catch (e) {
      const msg = e instanceof Error && e.message === 'no-permission' ? tr('Нет доступа к геопозиции') : tr('Маршрут онлайн не построился — проверьте интернет');
      setState({ phase: 'error', msg });
    }
  }, [dest]);

  const onPos = useCallback(
    async (pos: LatLng, heading?: number) => {
      const r = route.current;
      if (!r || !dest) return;
      // съехали с маршрута — пересчитываем не чаще раза в 20 с
      if (distToLineM(pos, r.line) > OFF_ROUTE_M && Date.now() - lastReroute.current > REROUTE_EVERY_MS) {
        lastReroute.current = Date.now();
        try {
          const nr = await fetchRoute(pos, dest);
          route.current = nr;
          passed.current = 0;
          spoken.current.clear();
          if (voiceRef.current) Speech.speak(tr('Маршрут перестроен'), { language: voiceLang() });
        } catch {
          // нет сети — продолжаем по старой линии
        }
      }
      const cur = route.current!;
      const nm = nextManeuver(pos, cur.steps, Math.max(1, passed.current));
      if (nm) passed.current = nm.i;
      const left = haversine(pos, dest);
      if (nm && voiceRef.current) {
        for (const at of [500, 150]) {
          const key = `${nm.i}@${at}`;
          if (nm.d <= at && !spoken.current.has(key)) {
            spoken.current.add(key);
            Speech.speak(
              nm.step.icon === 'arrive' ? tr('Вы прибываете на место') : tr('Через {d} {step}', { d: fmtDist(nm.d), step: nm.step.text.toLowerCase() }),
              { language: voiceLang() },
            );
          }
        }
      }
      setState({ phase: 'driving', route: cur, pos, heading, next: nm?.step, nextDist: nm?.d, leftKm: left });
    },
    [dest],
  );

  /** Начать ведение: следим за позицией, камера — за вами. */
  const start = useCallback(async () => {
    if (!route.current) await preview();
    if (!route.current) return;
    watch.current?.remove();
    watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10, timeInterval: 1500 }, (l) =>
      onPos([l.coords.latitude, l.coords.longitude], l.coords.heading ?? undefined),
    );
    if (voiceRef.current) Speech.speak(tr('Поехали'), { language: voiceLang() });
  }, [preview, onPos]);

  return { state, preview, start, stop, voice, setVoice };
}
