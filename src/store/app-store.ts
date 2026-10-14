// Состояние приложения: страна, избранное, маршрут. Хранится в MMKV и переживает перезапуск.
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { IconName } from '@/components/icon';
import { track } from '@/services/analytics';
import type { CountryCode } from '@/data/types';

/** Отметка «Заметили изменения?» в очереди на отправку. */
export interface Report {
  cid: string; // id на клиенте — повторная отправка не создаст дубль
  id: string; // место
  tags: string[];
  at: string;
  sent?: boolean;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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
  /** Скачанная подробная карта: страна → дата. */
  offlineMaps: Partial<Record<CountryCode, string>>;
  setOfflineMap: (c: CountryCode) => void;
  /** Страны, где человек был (ISO 3166-1 alpha-2), — отмечены вручную на карте мира. */
  visitedCountries: string[];
  toggleCountry: (iso: string) => boolean;
  /** «Я здесь был»: id места → дата отметки (ISO). Из этого собирается карта путешествий. */
  visited: Record<string, string>;
  /** Очередь отметок «Заметили изменения?» — уйдёт на сервер, когда появится бэкенд и сеть. */
  reports: Report[];
  markReportsSent: (cids: string[]) => void;
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
      setLang: (lang) => {
        if (lang) track('language_select', { lang });
        set({ lang });
      },
      saved: [],
      trip: [],
      visited: {},
      visitedCountries: [],
      toggleCountry: (iso) => {
        const has = get().visitedCountries.includes(iso);
        set({ visitedCountries: has ? get().visitedCountries.filter((x) => x !== iso) : [...get().visitedCountries, iso] });
        track('country_mark', { iso, on: !has });
        return !has;
      },
      offlineMaps: {},
      setOfflineMap: (c) => set({ offlineMaps: { ...get().offlineMaps, [c]: new Date().toISOString() } }),
      reports: [],
      setCountry: (country) => {
        if (country) track('country_select', { country });
        set({ country });
      },
      toggleSaved: (id) => {
        const has = get().saved.includes(id);
        set({ saved: has ? get().saved.filter((x) => x !== id) : [...get().saved, id] });
        track('save', { place_id: id, on: !has });
        return !has;
      },
      toggleTrip: (id) => {
        const { trip, saved } = get();
        if (trip.includes(id)) {
          set({ trip: trip.filter((x) => x !== id) });
          track('trip_add', { place_id: id, on: false });
          return false;
        }
        track('trip_add', { place_id: id, on: true });
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
        track('visited_mark', { place_id: id, on: !had });
        return !had;
      },
      addReport: (id, tags) => set({ reports: [...get().reports, { cid: newId(), id, tags, at: new Date().toISOString() }] }),
      markReportsSent: (cids) => set({ reports: get().reports.map((r) => (cids.includes(r.cid) ? { ...r, sent: true } : r)) }),
    }),
    {
      name: 'voyz-app',
      version: 5,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ country, lang, saved, trip, visited, visitedCountries, reports, offlineMaps }) => ({ country, lang, saved, trip, visited, visitedCountries, reports, offlineMaps }),
      // v1 хранил маршрут по дням (string[][]) — разворачиваем в плоский список
      migrate: (state, version) => {
        const s = state as Partial<AppState> & { trip?: unknown };
        if (version < 2 && Array.isArray(s.trip)) s.trip = (s.trip as unknown[]).flat().filter((x): x is string => typeof x === 'string');
        if (version < 3 && !s.visited) s.visited = {};
        // v4: у отметки свой id (сервер не примет повтор) и флаг отправки
        if (version < 5 && !s.visitedCountries) s.visitedCountries = [];
        if (version < 4 && Array.isArray(s.reports)) s.reports = (s.reports as Report[]).map((r) => ({ ...r, cid: r.cid ?? newId() }));
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
