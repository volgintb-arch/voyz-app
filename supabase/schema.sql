-- Схема бэкенда Voyz для Supabase (PostgreSQL + PostgREST). Выполнить один раз в SQL Editor проекта.
-- Приложение пишет через публичный ключ anon; защита — Row Level Security:
--   отметки и отзывы можно только ДОБАВЛЯТЬ; читать — только одобренные отзывы; модерация — из панели Supabase.

-- ---------- «Заметили изменения?» ----------
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  client_id   text not null unique,              -- id с телефона: повторная отправка не создаёт дубль
  place_id    text not null,                     -- id места из places.json (kg-skazka, alt-01…)
  tags        text[] not null default '{}',      -- изменилась цена / дорога закрыта / предупреждение / другое
  comment     text check (char_length(comment) <= 2000),
  created_at  timestamptz not null default now(),-- когда человек отметил (с телефона)
  received_at timestamptz not null default now(),
  app_version text,
  status      text not null default 'new' check (status in ('new', 'checked', 'applied', 'rejected'))
);
create index if not exists reports_place_idx on public.reports (place_id, created_at desc);

alter table public.reports enable row level security;
drop policy if exists "anon can insert reports" on public.reports;
create policy "anon can insert reports" on public.reports for insert to anon
  with check (status = 'new' and char_length(place_id) <= 40 and cardinality(tags) <= 10);

-- ---------- отзывы с модерацией ----------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  place_id    text not null,
  rating      smallint not null check (rating between 1 and 5),
  text        text not null check (char_length(text) between 10 and 3000),
  author      text check (char_length(author) <= 60),
  visited_at  date,
  photos      text[] not null default '{}',      -- ссылки на фото в Storage (бакет review-photos)
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);
create index if not exists reviews_place_idx on public.reviews (place_id, status, created_at desc);

alter table public.reviews enable row level security;
drop policy if exists "anon can insert pending reviews" on public.reviews;
create policy "anon can insert pending reviews" on public.reviews for insert to anon
  with check (status = 'pending' and cardinality(photos) <= 6);
drop policy if exists "anyone can read approved reviews" on public.reviews;
create policy "anyone can read approved reviews" on public.reviews for select to anon
  using (status = 'approved');

-- ---------- аналитика (если не AppMetrica): события из src/services/analytics.ts ----------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) <= 40),
  params     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "anon can insert events" on public.events;
create policy "anon can insert events" on public.events for insert to anon with check (true);

-- Модерация: в Table Editor поменять reviews.status на 'approved' или 'rejected'.
-- Фото отзывов: Storage → бакет review-photos (публичное чтение, загрузка — через подписанные ссылки).
