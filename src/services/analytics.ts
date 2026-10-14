// Аналитика: события из плана v1 (docs/05_ROADMAP.md) уже расставлены по приложению.
// Систему (AppMetrica, Amplitude, своя таблица) подключают в одном месте — функция send ниже.
import { config } from './config';

/** Все события и их параметры — единый словарь, чтобы в отчётах не было разнобоя. */
export type AnalyticsEvent =
  | { name: 'place_open'; params: { place_id: string; from?: string } }
  | { name: 'route_variant_select'; params: { place_id: string; variant: number } }
  | { name: 'nav_open'; params: { place_id: string; provider: 'yandex' | 'dgis' | 'google' | 'other' } }
  | { name: 'save'; params: { place_id: string; on: boolean } }
  | { name: 'trip_add'; params: { place_id: string; on: boolean } }
  | { name: 'audio_play'; params: { place_id: string } }
  | { name: 'change_report'; params: { place_id: string; tags: string[] } }
  | { name: 'filter_apply'; params: { filters: string[]; results: number } }
  | { name: 'visited_mark'; params: { place_id: string; on: boolean } }
  | { name: 'country_mark'; params: { iso: string; on: boolean } }
  | { name: 'share'; params: { kind: 'place' | 'travel_map' | 'app'; place_id?: string } }
  | { name: 'offline_download'; params: { kind: 'media' | 'map'; country?: string } }
  | { name: 'country_select'; params: { country: string } }
  | { name: 'language_select'; params: { lang: string } };

type Sender = (name: string, params: Record<string, unknown>) => void;

const adapters: Record<string, Sender> = {
  none: () => {},
  console: (name, params) => console.log(`[analytics] ${name}`, params),
  // appmetrica: (name, params) => AppMetrica.reportEvent(name, params),  ← подключить SDK и раскомментировать
};

let send: Sender = adapters[config.analytics] ?? adapters.none;

/** Подменить отправку (например, после инициализации SDK с ключом config.analyticsKey). */
export const setAnalyticsSender = (s: Sender) => {
  send = s;
};

export function track<E extends AnalyticsEvent>(name: E['name'], params: Extract<AnalyticsEvent, { name: E['name'] }>['params']) {
  try {
    send(name, params as Record<string, unknown>);
  } catch {
    // аналитика никогда не должна ломать приложение
  }
}
