// Содержимое ридеров (шторка 92 %): полные тексты, которые на странице показаны коротко.
// Порт reference/prototype_src/app.js → readers(): та же структура, без HTML.
import type { IconName } from '@/components/icon';
import { pl, tr } from '@/i18n';
import type { Place } from '@/data/types';
import { SERVICES } from '@/lib/icon-rules';
import { firstClause, lead, paragraphs, sentences } from '@/lib/text';

export type ReaderBlock =
  | { h: string }
  | { p: string; small?: boolean }
  | { list: string[] }
  | { svc: [IconName, string, string][] }
  | { links: { title: string; url: string; note?: string }[] };

export interface Reader {
  title: string;
  icon: IconName;
  preview: string;
  blocks: ReaderBlock[];
}

export type ReaderKey = 'guide' | 'about' | 'how' | 'season' | 'warn' | 'stay' | 'svc' | 'horses' | 'other' | 'rent' | 'budget' | 'iti' | 'access' | 'reviews' | 'hikes' | 'src';

const ps = (t: string | undefined) => paragraphs(t).map((p) => ({ p }));

export function uniqueSources(p: Place) {
  const seen = new Set<string>();
  return [...(p.src || []), ...(p.p.src || [])].filter((s) => s?.url && !seen.has(s.url) && seen.add(s.url)) as { url: string; title: string; used_for?: string }[];
}

export function warnText(p: Place) {
  const permits = p.p.permits && !/^(не нужн|not (required|needed))/i.test(p.p.permits) ? tr('Разрешения: {p}', { p: p.p.permits }) : '';
  return [p.warn, permits].filter(Boolean).join(' ');
}

export function buildReaders(p: Place): Partial<Record<ReaderKey, Reader>> {
  const P = p.p;
  const O = P.onsite || {};
  const R: Partial<Record<ReaderKey, Reader>> = {};

  if (p.guide) R.guide = { title: tr('Почему стоит приехать'), icon: 'mountain', preview: lead(p.guide, 1), blocks: ps(p.guide) };
  if (p.desc)
    R.about = {
      title: tr('Подробнее о месте'),
      icon: 'info',
      preview: lead(p.desc, 1),
      blocks: [
        ...ps(p.desc),
        ...(p.see ? [{ h: tr('Что посмотреть') }, { p: p.see }] : []),
        ...(p.skip ? [{ h: tr('Можно пропустить, если') }, { p: p.skip }] : []),
        ...(p.elev ? [{ h: tr('Высота') }, { p: p.elev }] : []),
      ],
    };
  if (P.sum || p.how)
    R.how = {
      title: tr('Как добраться — подробно'),
      icon: 'route',
      preview: '',
      blocks: [
        ...ps(P.sum),
        ...(p.how ? [{ h: tr('Коротко из карточки') }, { p: p.how }] : []),
        ...(p.roadtype ? [{ h: tr('Дорога') }, { p: p.roadtype }] : []),
        ...(p.traveltime ? [{ h: tr('Время в пути') }, { p: p.traveltime }] : []),
        ...(p.transfer ? [{ h: tr('Трансфер') }, { p: p.transfer }] : []),
      ],
    };
  if (P.season || p.when)
    R.season = {
      title: tr('Когда ехать'),
      icon: 'cal',
      preview: '',
      blocks: [{ p: P.season || p.when }, ...(p.daytime ? [{ h: tr('Лучшее время суток') }, { p: p.daytime }] : []), ...(p.hours ? [{ h: tr('Режим работы') }, { p: p.hours }] : [])],
    };
  const w = warnText(p);
  if (w) R.warn = { title: tr('Важно знать'), icon: 'warn', preview: '', blocks: [{ list: sentences(w) }] };
  if (p.stay) R.stay = { title: tr('Ночлег — подробно'), icon: 'bed', preview: lead(p.stay, 1), blocks: [{ p: p.stay }] };
  const svc = SERVICES.filter(([k]) => P.svc?.[k]);
  if (svc.length) R.svc = { title: tr('Инфраструктура'), icon: 'shop', preview: svc.map((x) => tr(x[2])).join(', '), blocks: [{ svc: svc.map(([k, ic, n]) => [ic, tr(n), P.svc[k]!]) }] };
  const horses = (O.horses || []) as { where?: string; name?: string; details?: string; price?: string; contact?: string }[];
  if (horses.length)
    R.horses = {
      title: tr('Верхом'),
      icon: 'horse',
      preview: `${horses.length} ${pl(horses.length, 'вариант', 'варианта', 'вариантов')}`,
      blocks: horses.flatMap((h) => [{ h: h.where || h.name || tr('Аренда лошадей') }, { p: [h.details, h.price, h.contact].filter(Boolean).join(' · ') }]),
    };
  if ((O.other || []).length)
    R.other = {
      title: tr('Чем ещё заняться'),
      icon: 'sparkle',
      preview: O.other!.map((x) => x.activity).slice(0, 3).join(', '),
      blocks: O.other!.flatMap((h) => [{ h: h.activity }, { p: h.details || '' }]),
    };
  if ((P.rent || []).length)
    R.rent = {
      title: tr('Прокат и снаряжение'),
      icon: 'tent',
      preview: P.rent.map((r) => r.what).slice(0, 2).join(', '),
      blocks: P.rent.flatMap((r) => [{ h: r.what }, { p: [r.where, r.price].filter(Boolean).join(' · ') }]),
    };
  const b = P.budget || {};
  if (b.economy || b.comfort)
    R.budget = {
      title: tr('Бюджет'),
      icon: 'wallet',
      preview: firstClause(b.economy || b.comfort, 60),
      blocks: [...(b.economy ? [{ h: tr('Эконом') }, { p: b.economy }] : []), ...(b.comfort ? [{ h: tr('Комфорт') }, { p: b.comfort }] : []), ...(b.year ? [{ p: tr('Цены: {y}', { y: b.year }), small: true }] : [])],
    };
  if ((P.iti || []).length)
    R.iti = { title: tr('Готовые планы'), icon: 'list', preview: P.iti.map((x) => x.title).slice(0, 2).join(', '), blocks: P.iti.flatMap((x) => [{ h: x.title }, { p: x.plan }]) };
  if (P.access) R.access = { title: tr('Доступность: дети, пожилые, собаки'), icon: 'user', preview: firstClause(P.access, 60), blocks: [{ p: P.access }] };
  if (p.reviews)
    R.reviews = {
      title: tr('Что говорят путешественники'),
      icon: 'star',
      preview: firstClause(p.reviews, 60),
      blocks: [{ p: p.reviews }, { p: tr('Сводка отзывов с открытых платформ, даты указаны в тексте.'), small: true }],
    };
  if ((O.hikes || []).length)
    R.hikes = {
      title: tr('Все тропы'),
      icon: 'walk',
      preview: '',
      blocks: O.hikes!.flatMap((h) => [
        { h: h.name },
        { p: h.route },
        { p: [h.km && `${h.km} км`, h.gain_m && `↑ ${h.gain_m} м`, h.time, h.difficulty, h.marked && tr('маркировка: {m}', { m: h.marked })].filter(Boolean).join(' · '), small: true },
      ]),
    };
  const src = uniqueSources(p);
  R.src = {
    title: tr('Источники и проверка'),
    icon: 'shield',
    preview: `${src.length} ${pl(src.length, 'источник', 'источника', 'источников')}`,
    blocks: [
      ...(p.checked ? [{ p: p.checked }] : []),
      ...(p.flags.length ? [{ h: tr('Спорные моменты') }, { list: p.flags }] : []),
      ...((P.gaps || []).length ? [{ h: tr('Пока не подтверждено') }, { list: P.gaps }] : []),
      { h: tr('Источники') },
      { links: src.map((s) => ({ title: s.title || s.url, url: s.url, note: s.used_for })) },
    ],
  };
  return R;
}
