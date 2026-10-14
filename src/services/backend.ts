// Слой работы с сервером. Контракт описан в docs/08_BACKEND.md, схема БД — supabase/schema.sql.
// Реализация — обычный REST в стиле PostgREST (Supabase из коробки); другой сервер — поменять только этот файл.
import { useApp, type Report } from '@/store/app-store';

import { backendEnabled, config } from './config';

export interface ReviewInput {
  placeId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  visitedAt?: string; // ISO, когда был на месте
  author?: string; // имя для подписи (необязательно)
  photos?: string[]; // ссылки на загруженные фото (загрузка — на стороне сервера/хранилища)
}

export interface Review extends ReviewInput {
  id: string;
  createdAt: string;
}

const headers = () => ({
  'Content-Type': 'application/json',
  apikey: config.apiKey,
  Authorization: `Bearer ${config.apiKey}`,
  Prefer: 'return=minimal',
});

async function post(path: string, body: unknown) {
  const res = await fetch(`${config.apiUrl}/${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
}

/** Отправить накопленные отметки «Заметили изменения?». Без сервера или без сети — тихо остаются в очереди. */
export async function flushReports(): Promise<number> {
  if (!backendEnabled()) return 0;
  const { reports, markReportsSent } = useApp.getState();
  const pending = reports.filter((r) => !r.sent);
  if (!pending.length) return 0;
  try {
    await post(
      'reports',
      pending.map((r: Report) => ({ client_id: r.cid, place_id: r.id, tags: r.tags, created_at: r.at, app_version: '1.0.0' })),
    );
    markReportsSent(pending.map((r) => r.cid));
    return pending.length;
  } catch {
    return 0; // сеть или сервер недоступны — попробуем позже
  }
}

/** Отзыв уходит на модерацию; в приложении показываются только одобренные. */
export async function submitReview(r: ReviewInput): Promise<void> {
  if (!backendEnabled()) throw new Error('backend-disabled');
  await post('reviews', { place_id: r.placeId, rating: r.rating, text: r.text, visited_at: r.visitedAt, author: r.author, photos: r.photos ?? [] });
}

/** Одобренные отзывы о месте (новые сверху). Без сервера — пустой список. */
export async function fetchReviews(placeId: string): Promise<Review[]> {
  if (!backendEnabled()) return [];
  const res = await fetch(`${config.apiUrl}/reviews?place_id=eq.${encodeURIComponent(placeId)}&status=eq.approved&order=created_at.desc&limit=50`, { headers: headers() });
  if (!res.ok) return [];
  const rows: { id: string; place_id: string; rating: number; text: string; visited_at?: string; author?: string; photos?: string[]; created_at: string }[] = await res.json();
  return rows.map((x) => ({
    id: x.id,
    placeId: x.place_id,
    rating: x.rating as Review['rating'],
    text: x.text,
    visitedAt: x.visited_at,
    author: x.author,
    photos: x.photos,
    createdAt: x.created_at,
  }));
}
