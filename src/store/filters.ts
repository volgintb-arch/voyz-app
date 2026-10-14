// Фильтры и поиск обзора. Не сохраняются между запусками — как в прототипе.
import { create } from 'zustand';

import type { Filters } from '@/data/places';

interface FiltersState {
  f: Filters & { best?: boolean };
  set: (f: FiltersState['f']) => void;
  patch: (p: Partial<FiltersState['f']>) => void;
  remove: (k: keyof FiltersState['f']) => void;
  clear: () => void;
}

export const useFilters = create<FiltersState>()((set) => ({
  f: {},
  set: (f) => set({ f: clean(f) }),
  patch: (p) => set((s) => ({ f: clean({ ...s.f, ...p }) })),
  remove: (k) =>
    set((s) => {
      const f = { ...s.f };
      delete f[k];
      return { f };
    }),
  clear: () => set({ f: {} }),
}));

const clean = <T extends object>(f: T) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== false)) as T;

export const hasFilters = (f: object) => Object.keys(f).length > 0;
