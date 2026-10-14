// Работа с текстами карточек — порт helpers из reference/prototype_src/app.js.
// Правило данных: тексты не переписываем и не «улучшаем», только режем и выделяем.

/** Обрезка по слову с многоточием. */
export const cut = (s: string | undefined | null, n: number) => {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
};

/** Разбивка на предложения (не режем внутри «т. е.» и сокращений перед строчной буквой). */
export const sentences = (t: string | undefined | null) =>
  String(t ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+(?=[А-ЯЁA-Z«"(0-9])/)
    .filter(Boolean);

/** Первые n предложений — короткая версия для страницы (полная — в ридере). */
export const lead = (t: string | undefined | null, n = 2) => sentences(t).slice(0, n).join(' ');

/** Первое предложение без скобок — для «Главного» и превью в списках. */
export const firstClause = (t: string | undefined | null, n = 90) => cut((sentences(t)[0] ?? '').replace(/\s*\([^)]*\)/g, ''), n);

export const paragraphs = (t: string | undefined | null) => String(t ?? '').split(/\n+/).map((x) => x.trim()).filter(Boolean);

/** Расстояние по прямой, км (гаверсинус). Точки — [lat, lon]. */
export function haversine(a: readonly [number, number], b: readonly [number, number]) {
  const p = Math.PI / 180;
  const x = Math.sin(((b[0] - a[0]) * p) / 2) ** 2 + Math.cos(a[0] * p) * Math.cos(b[0] * p) * Math.sin(((b[1] - a[1]) * p) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

export const fmtKm = (k: number) => (k < 10 ? k.toFixed(1).replace('.', ',') : Math.round(k).toLocaleString('ru-RU'));

export const fmtH = (h: number) => {
  const H = Math.floor(h);
  const M = Math.round(((h - H) * 60) / 5) * 5;
  return H ? `${H} ч${M ? ` ${M} мин` : ''}` : `${M} мин`;
};

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Телефон и ссылка из свободного поля «контакт». */
export const findTel = (s: string | undefined) => (String(s ?? '').match(/\+?\d[\d\s()-]{8,}\d/) ?? [])[0];
export const findUrl = (s: string | undefined) => (String(s ?? '').match(/https?:\/\/\S+/) ?? [])[0];
export const telHref = (t: string) => `tel:${t.replace(/[^\d+]/g, '')}`;

// ---------- разметка «богатого» текста: числа с единицами жирным, ссылки и телефоны кликабельны ----------
export type RichSeg = { t: string; kind?: 'num' | 'url' | 'tel' };

const NUMRX =
  /((?:≈|~|около |до |от )?\d[\d\s.,]*(?:\s?[–—-]\s?\d[\d\s.,]*)?\s?(?:км|м(?![а-яё])|ч(?![а-яё])|час[а-яё]*|мин[а-яё]*|сом[а-яё]*|руб[а-яё]*|₽|\$|°C|%|дн[а-яё]*|ноч[а-яё]*|чел[а-яё]*))/gi;
const LINKRX = /(https?:\/\/[^\s<)»,;]+[^\s<)».,;:])|(\+(?:7|996)[\d\s()-]{9,16}\d)/g;

export function richSegments(text: string, withNumbers = true): RichSeg[] {
  const out: RichSeg[] = [];
  const pushPlain = (s: string) => {
    if (!s) return;
    if (!withNumbers) return void out.push({ t: s });
    let last = 0;
    for (const m of s.matchAll(NUMRX)) {
      if (m.index! > last) out.push({ t: s.slice(last, m.index) });
      out.push({ t: m[0], kind: 'num' });
      last = m.index! + m[0].length;
    }
    if (last < s.length) out.push({ t: s.slice(last) });
  };
  let last = 0;
  for (const m of String(text ?? '').matchAll(LINKRX)) {
    pushPlain(text.slice(last, m.index));
    out.push({ t: m[0], kind: m[1] ? 'url' : 'tel' });
    last = m.index! + m[0].length;
  }
  pushPlain(String(text ?? '').slice(last));
  return out;
}

/** Короткая подпись ссылки: без протокола и www, до 38 символов. */
export const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 38) + (u.length > 46 ? '…' : '');
