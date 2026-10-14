// Состояние приложения: страна, избранное, маршрут. Хранится в MMKV и переживает перезапуск.
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { IconName } from '@/components/icon';
import type { CountryCode } from '@/data/types';

const mmkv = createMMKV({ id: 'voyz' });
const mmkvStorage: StateStorage = {
  getItem: (k) => mmkv.getString(k) ?? null,
  setItem: (k, v) => mmkv.set(k, v),
  removeItem: (k) => void mmkv.remove(k),
};

interface AppState {
  country: CountryCode | null; // null — ещё не выбрана, показываем онбординг
  saved: string[];
  /** Маршрут — упорядоченный список мест; дни считаются автоматически (см. src/geo/trip.ts). */
  trip: string[];
  /** Очередь отметок «Заметили изменения?» — уйдёт на сервер, когда появится бэкенд и сеть. */
  reports: { id: string; tags: string[]; at: string }[];
  setCountry: (c: CountryCode | null) => void;
  toggleSaved: (id: string) => boolean; // true — добавили
  toggleTrip: (id: string) => boolean; // true — добавили
  setTrip: (ids: string[]) => void;
  addReport: (id: string, tags: string[]) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      country: null,
      saved: [],
      trip: [],
      reports: [],
      setCountry: (country) => set({ country }),
      toggleSaved: (id) => {
        const has = get().saved.includes(id);
        set({ saved: has ? get().saved.filter((x) => x !== id) : [...get().saved, id] });
        return !has;
      },
      toggleTrip: (id) => {
        const { trip, saved } = get();
        if (trip.includes(id)) {
          set({ trip: trip.filter((x) => x !== id) });
          return false;
        }
        // как в прототипе: место в маршруте попадает и в избранное
        set({ trip: [...trip, id], saved: saved.includes(id) ? saved : [...saved, id] });
        return true;
      },
      setTrip: (trip) => set({ trip }),
      addReport: (id, tags) => set({ reports: [...get().reports, { id, tags, at: new Date().toISOString() }] }),
    }),
    {
      name: 'voyz-app',
      version: 2,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ country, saved, trip, reports }) => ({ country, saved, trip, reports }),
      // v1 хранил маршрут по дням (string[][]) — разворачиваем в плоский список
      migrate: (state, version) => {
        const s = state as Partial<AppState> & { trip?: unknown };
        if (version < 2 && Array.isArray(s.trip)) s.trip = (s.trip as unknown[]).flat().filter((x): x is string => typeof x === 'string');
        return s as AppState;
      },
    },
  ),
);

// ---------- тосты ----------

interface ToastState {
  msg: string | null;
  icon: IconName;
  key: number;
  show: (msg: string, icon?: IconName) => void;
}

export const useToast = create<ToastState>()((set) => ({
  msg: null,
  icon: 'check',
  key: 0,
  show: (msg, icon = 'check') => set((s) => ({ msg, icon, key: s.key + 1 })),
}));

export const toast = (msg: string, icon?: IconName) => useToast.getState().show(msg, icon);
