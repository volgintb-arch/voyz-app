# Модель данных

`data/places.json` → `{ meta, places: Place[] }` — 112 мест (kg: 83, alt: 29). Пример одного места — `data/sample_place.json`.

```ts
type LatLng = [number, number];           // [lat, lon]

interface Place {
  id: string;            // 'kg-skazka', 'alt-01'
  c: 'kg' | 'alt';       // страна
  name: string; full: string; cat: string; reg: string; dist: string; near: string;
  ll: LatLng | null;     // координата места (у одного музея null)
  elev: string; short: string; desc: string; guide: string /* текст «Почему стоит приехать» и аудиогида */;
  see: string; skip: string; diff: string; when: string; hours: string; daytime: string;
  how: string; needcar: string; self: string; roadtype: string; traveltime: string;
  stay: string; net: string; entry: string; transfer: string; bring: string; warn: string; food: string; reviews: string;
  m: number[];           // месяцы сезона 1..12 (разобраны из текста)
  s: {                   // короткие значения для плиток и чипсов
    diff: string;        // 'Лёгкая' | 'Средняя' | 'Сложная' | 'Лёгкая–средняя' | ...
    when: string;        // 'Май – окт' | 'Круглый год'
    acc: string;         // 'На любой машине' | 'Нужен 4×4' | 'Только пешком' | 'По воде' | 'Кроссовер'
    onsite: string; entry: string; net: string;
  };
  rating: { v: string; n: string; src: 'Google' | 'Яндекс' | '2GIS' | 'TripAdvisor' } | null;
  idx: number; rich: number; conf: number; prac: number; rank: number | null; top: number | null;
  note: string; flags: string[]; fixes: { f: string; n: string; u: string }[]; checked: string; status: string;
  photos: { f: string; t: string; w: number; h: number; cap: string; by: string; lic: string; page: string }[]; // f — 960 px, t — 420 px
  plinks: { cap: string; url: string; by: string }[];        // фото ссылками
  videos: { t: string; u: string; ch: string; y: string }[];
  nearby: { id: string; name: string; km: number }[];
  p: {
    sum: string;
    apps: Approach[];                  // варианты подъезда, рекомендованный — первый
    transport: { mode: string; provider: string; from: string; details: string; price: string; year: string; contact: string; src: string }[];
    onsite: { hikes?: Hike[]; horses?: any[]; other?: { activity: string; details: string }[] };
    stays: { name: string; type: string; where: string; season: string; price: string; year: string; contact: string; src: string }[];
    food: { name: string; where: string; details: string; src: string }[];
    rent: { what: string; where: string; price: string; src: string }[];
    svc: Partial<Record<'toilets'|'water'|'shop'|'atm'|'fuel'|'mobile'|'medical'|'rescue', string>>;
    iti: { title: string; plan: string }[];
    season: string; budget: { economy?: string; comfort?: string; year?: string };
    permits: string; access: string; gaps: string[]; src: { url: string; title: string }[];
  };
  src: { url: string; title: string; used_for: string }[];
}

interface Approach {
  title: string; from: string; route: string; km: string; time: string; surface: string; vehicle: string;
  season: string; last: string;                     // последние АЗС и магазины
  parking: { d: string; price: string }; trail: { d: string }; haz: string; rec: boolean; src: string;
  rt: null | {                                      // геометрия схемы маршрута
    hub: string; hc: LatLng;                        // город-старт
    road: LatLng[] | null; rkm: number | null;      // путь по графу дорог Natural Earth (обзорный)
    pc: LatLng | null; tc: LatLng | null;           // парковка, начало тропы
  };
}
interface Hike { name: string; route: string; km: string; gain_m: string; time: string; difficulty: string; marked: string; track: string; src: string }
```

`data/geo.json` — встроенная карта: `countries[{n, r:[ring...]}]`, `lakes`, `rivers`, `roads[{m:0|1, c:[[lon,lat]...]}]`, `graph{n:[[lon,lat]], e:[[i,j,km]]}`. Координаты здесь — **[lon, lat]**, в `places.json` — **[lat, lon]**.

## Правила
- Тексты отдаём как есть, с датами и оговорками («≈», «по отзывам 2024»). Не округлять и не «улучшать».
- Расстояния в карточке берём из текста (`km`, `time`); линию на карте показываем как **схему**. Навигация — через внешние навигаторы.
- Обновление данных: `scripts/export.py` (из исходного каталога) и `scripts/geo_build.py`. В проде — CMS или бэкенд с версией датасета и диффами для офлайн-обновления.
