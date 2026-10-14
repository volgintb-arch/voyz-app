# Бэкенд и аналитика — что подготовлено и как подключить

Приложение не зависит от сервера: без него всё работает, а отметки «Заметили изменения?» копятся в очереди на телефоне. Подключение — это переменные окружения и, для аналитики, одна строка с SDK.

## Что уже есть в коде

| Файл | Что делает |
|---|---|
| `src/services/config.ts` | Читает `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_KEY`, `EXPO_PUBLIC_ANALYTICS`, `EXPO_PUBLIC_ANALYTICS_KEY` |
| `src/services/backend.ts` | `flushReports()` — отправка очереди отметок; `flushReviews()` — отправка своих отзывов из очереди (`submitReview()`, с `client_id` против дублей); `fetchReviews(placeId)` — одобренные отзывы |
| `src/store/app-store.ts` | Очередь отметок `reports` с `cid` (повтор не создаёт дубль) и флагом `sent`; хранится в MMKV |
| `src/app/_layout.tsx` | Очередь уходит при запуске и при возвращении в приложение; после новой отметки — сразу |
| `src/services/analytics.ts` | `track(name, params)` — типизированный словарь событий; адаптеры `none` / `console`; место для AppMetrica |
| `supabase/schema.sql` | Таблицы `reports`, `reviews` (модерация), `events`; защита RLS: только добавление, читать — одобренное |
| `.env.example` | Шаблон переменных |

## Подключить Supabase (рекомендуемый вариант, бесплатно)

1. supabase.com → New project.
2. SQL Editor → вставить `supabase/schema.sql` → Run.
3. Project Settings → API: скопировать **Project URL** и **anon public** ключ.
4. В корне проекта: `cp .env.example .env`, заполнить:
   ```
   EXPO_PUBLIC_API_URL=https://<project>.supabase.co/rest/v1
   EXPO_PUBLIC_API_KEY=<anon key>
   ```
5. Для веб-версии на GitHub Pages: Settings → Secrets and variables → Actions → **Variables** — добавить те же переменные (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_KEY`, при необходимости `EXPO_PUBLIC_ANALYTICS*`). Сборка в `.github/workflows/pages.yml` уже их читает.
6. Перезапустить `npm start` / пересобрать. Очередь отметок отправится сама.

**Модерация отзывов:** Table Editor → `reviews` → поменять `status` на `approved`. В приложении показываются только одобренные.

**Другой сервер.** Контракт — REST в стиле PostgREST: `POST /reports` (массив), `POST /reviews`, `GET /reviews?place_id=eq.<id>&status=eq.approved`. Заголовки `apikey` и `Authorization: Bearer <key>`. Если API другое — поменять только `src/services/backend.ts`.

## Подключить аналитику

**AppMetrica:**
1. `npx expo install @appmetrica/react-native-analytics` (или актуальный пакет SDK) и config-плагин, если требуется.
2. В `src/app/_layout.tsx` при запуске: `AppMetrica.activate({ apiKey: config.analyticsKey })`, затем
   `setAnalyticsSender((name, params) => AppMetrica.reportEvent(name, params))`.
3. `.env`: `EXPO_PUBLIC_ANALYTICS=appmetrica`, `EXPO_PUBLIC_ANALYTICS_KEY=<ключ>`.

**Без отдельного сервиса:** отправлять события в таблицу `events` того же Supabase — `setAnalyticsSender((name, params) => fetch(`${config.apiUrl}/events`, …))`.

## События (уже расставлены)

| Событие | Когда | Параметры |
|---|---|---|
| `place_open` | открыли карточку | `place_id` |
| `route_variant_select` | выбрали вариант подъезда | `place_id`, `variant` |
| `nav_open` | открыли навигатор | `place_id`, `provider` (yandex / dgis / google / other) |
| `save` | сердце | `place_id`, `on` |
| `trip_add` | добавили / убрали из маршрута | `place_id`, `on` |
| `audio_play` | запустили аудиогид (первый раз за показ) | `place_id` |
| `change_report` | отправили «Заметили изменения?» | `place_id`, `tags` |
| `filter_apply` | применили фильтры | `filters`, `results` |
| `visited_mark` | «Я здесь был» | `place_id`, `on` |
| `review_submit` | написали отзыв | `place_id`, `rating` |
| `country_mark` | отметили страну на карте мира | `iso`, `on` |
| `share` | поделились | `kind` (place / travel_map / app), `place_id` |
| `offline_download` | скачали офлайн | `kind` (media / map), `country` |
| `country_select`, `language_select` | сменили страну / язык | `country` / `lang` |

## Отзывы в интерфейсе

Ничего — интерфейс готов (`src/components/place/reviews-block.tsx`). Без сервера человек видит только свои отзывы со статусом «сохранён на телефоне»; после подключения они уйдут на модерацию сами, а в карточке появятся одобренные отзывы и средняя оценка. Если таблица `reviews` уже создана по старой схеме — добавить колонки: `alter table reviews add column client_id text unique, add column lang text;`.
