// Схема assets/data/places.json — см. docs/04_DATA_MODEL.md.
// В places.json координаты [lat, lon]; в geo.json — [lon, lat].

export type LatLng = [number, number];
export type CountryCode = 'kg' | 'alt';

export interface Photo {
  f: string; // 960 px, путь вида 'img/photo-….jpg'
  t: string; // 420 px (файла может не быть — тогда берём f)
  w: number;
  h: number;
  cap: string;
  by: string;
  lic: string;
  page: string;
}

export interface Approach {
  title: string;
  from: string;
  route: string;
  km: string;
  time: string;
  surface: string;
  vehicle: string;
  season: string;
  last: string; // последние АЗС и магазины
  parking: { d: string; price: string };
  trail: { d: string };
  haz: string;
  rec: boolean;
  src: string;
  rt: null | {
    hub: string;
    hc: LatLng; // город-старт
    road: LatLng[] | null; // путь по графу дорог (обзорный)
    rkm: number | null;
    pc: LatLng | null; // парковка
    tc: LatLng | null; // начало тропы
  };
}

export interface Hike {
  name: string;
  route: string;
  km: string;
  gain_m: string;
  time: string;
  difficulty: string;
  marked: string;
  track: string;
  src: string;
}

type Svc = 'toilets' | 'water' | 'shop' | 'atm' | 'fuel' | 'mobile' | 'medical' | 'rescue';

export interface Place {
  id: string;
  c: CountryCode;
  name: string;
  full: string;
  cat: string;
  reg: string;
  dist: string;
  near: string;
  ll: LatLng | null;
  elev: string;
  short: string;
  desc: string;
  guide: string; // «Почему стоит приехать» и текст аудиогида
  see: string;
  skip: string;
  diff: string;
  when: string;
  hours: string;
  daytime: string;
  how: string;
  needcar: string;
  self: string;
  roadtype: string;
  traveltime: string;
  stay: string;
  net: string;
  entry: string;
  transfer: string;
  bring: string;
  warn: string;
  food: string;
  reviews: string;
  m: number[]; // месяцы сезона 1..12
  s: { diff: string; acc: string; onsite: string; entry: string; net: string }; // подписи плашек; сезон строится из m (seasonLabel)
  rating: { v: string; n: string; src: string } | null;
  idx: number;
  rich: number;
  conf: number;
  prac: number;
  rank: number | null;
  top: number | null;
  note: string;
  flags: string[];
  fixes: { f: string; n: string; u: string }[];
  checked: string;
  status: string;
  photos: Photo[];
  /** Необязательные редакционные данные карточки. */
  content?: {
    /** Оценка месяцев: номер месяца (1–12) → 2 «лучшее время», 1 «подходит»; месяца нет — не сезон. */
    monthScores?: Record<string, number>;
    /** Сложность 1–5 (подписи — src/data/codes.ts). */
    difficulty?: number;
    /** Доступ: any-car | crossover | 4x4 | on-foot | by-water. */
    access?: string;
    /** Группа категории: lakes, waterfalls, canyons, … (src/data/codes.ts). */
    category?: string;
    /** Связь на месте: yes | partial | no | unknown. */
    net?: string;
  };
  plinks: { cap: string; url: string; by: string }[];
  videos: { t: string; u: string; ch: string; y: string }[];
  nearby: { id: string; name: string; km: number }[];
  p: {
    sum: string;
    apps: Approach[]; // рекомендованный вариант — первый
    transport: { mode: string; provider: string; from: string; details: string; price: string; year: string; contact: string; src: string }[];
    onsite: { hikes?: Hike[]; horses?: unknown[]; other?: { activity: string; details: string }[] };
    stays: { name: string; type: string; where: string; season: string; price: string; year: string; contact: string; src: string }[];
    food: { name: string; where: string; details: string; src: string }[];
    rent: { what: string; where: string; price: string; src: string }[];
    svc: Partial<Record<Svc, string>>;
    iti: { title: string; plan: string }[];
    season: string;
    budget: { economy?: string; comfort?: string; year?: string };
    permits: string;
    access: string;
    gaps: string[];
    src: { url: string; title: string }[];
  };
  src: { url: string; title: string; used_for: string }[];
}

export interface PlacesFile {
  meta: {
    countries: Record<CountryCode, { name: string; count: number; top: number }>;
    built: string;
    count: number;
  };
  places: Place[];
}
