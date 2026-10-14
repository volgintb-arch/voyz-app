// Состояние приложения: страна, избранное, маршрут. Хранится в MMKV и переживает перезапуск.
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { CountryCode } from '@/data/types';

const mmkv = createMMKV({ id: 'voyz' });
const mmkvStorage: StateStorage = {
  getItem: (k) => mmkv.getString(k) ?? null,
  setItem: (k, v) => mmkv.set(k, v),
  removeItem: (k) => void mmkv.remove(k),
};

/** День маршрута — упорядоченный список id мест. */
export type TripDay = string[];

interface AppState {
  country: CountryCode | null; // null — ещё не выбрана, показываем онбординг
  saved: string[];
  trip: TripDay[];
  setCountry: (c: CountryCode) => void;
  toggleSaved: (id: string) => boolean; // true — добавили
  addToTrip: (id: string, day?: number) => void;
  removeFromTrip: (id: string) => void;
  moveInTrip: (from: { day: number; i: number }, to: { day: number; i: number }) => void;
  addDay: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      country: null,
      saved: [],
      trip: [[]],
      setCountry: (country) => set({ country }),
      toggleSaved: (id) => {
        const has = get().saved.includes(id);
        set({ saved: has ? get().saved.filter((x) => x !== id) : [...get().saved, id] });
        return !has;
      },
      addToTrip: (id, day) =>
        set(({ trip }) => {
          if (trip.some((d) => d.includes(id))) return {};
          const target = day ?? trip.length - 1;
          return { trip: trip.map((d, i) => (i === target ? [...d, id] : d)) };
        }),
      removeFromTrip: (id) => set(({ trip }) => ({ trip: trip.map((d) => d.filter((x) => x !== id)) })),
      moveInTrip: (from, to) =>
        set(({ trip }) => {
          const next = trip.map((d) => [...d]);
          const [id] = next[from.day].splice(from.i, 1);
          if (id) next[to.day].splice(to.i, 0, id);
          return { trip: next };
        }),
      addDay: () => set(({ trip }) => ({ trip: [...trip, []] })),
    }),
    {
      name: 'voyz-app',
      version: 1,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ country, saved, trip }) => ({ country, saved, trip }),
    },
  ),
);

export const inTrip = (trip: TripDay[], id: string) => trip.some((d) => d.includes(id));
