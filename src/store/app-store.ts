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
  /** Язык интерфейса; null — как на телефоне. */
  lang: 'ru' | 'en' | null;
  setLang: (l: 'ru' | 'en' | null) => void;
  saved: string[];
  /** Маршрут — упорядоченный список мест; дни считаются автоматически (см. src/geo/trip.ts). */
  trip: string[];
  /** «Я здесь был»: id места → дата отметки (ISO). Из этого собирается карта путешествий. */
  visited: Record<string, string>;
  /** Очередь отметок «Заметили изменения?» — уйдёт на сервер, когда появится бэкенд и сеть. */
  reports: { id: string; tags: string[]; at: string }[];
  setCountry: (c: CountryCode | null) => void;
  toggleSaved: (id: string) => boolean; // true — добавили
  toggleTrip: (id: string) => boolean; // true — добавили
  setTrip: (ids: string[]) => void;
  toggleVisited: (id: string) => boolean; // true — отметили
  addReport: (id: string, tags: string[]) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      country: null,
      lang: null,
      setLang: (lang) => set({ lang }),
      saved: [],
      trip: [],
      visited: {},
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
      toggleVisited: (id) => {
        const v = { ...get().visited };
        const had = id in v;
        if (had) delete v[id];
        else v[id] = new Date().toISOString();
        set({ visited: v });
        return !had;
      },
      addReport: (id, tags) => set({ reports: [...get().reports, { id, tags, at: new Date().toISOString() }] }),
    }),
    {
      name: 'voyz-app',
      version: 3,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ country, lang, saved, trip, visited, reports }) => ({ country, lang, saved, trip, visited, reports }),
      // v1 хранил маршрут по дням (string[][]) — разворачиваем в плоский список
      migrate: (state, version) => {
        const s = state as Partial<AppState> & { trip?: unknown };
        if (version < 2 && Array.isArray(s.trip)) s.trip = (s.trip as unknown[]).flat().filter((x): x is string => typeof x === 'string');
        if (version < 3 && !s.visited) s.visited = {};
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
