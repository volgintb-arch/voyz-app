(() => {
'use strict';
const D = window.VOYZ_DATA, GEO = window.VOYZ_GEO;
const PL = D.places, BY = {}; PL.forEach(p => BY[p.id] = p);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const NOW = new Date(); const CUR_M = NOW.getMonth() + 1;
const MONTHS = ['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'];
const MSHORT = ['Я','Ф','М','А','М','И','И','А','С','О','Н','Д'];

/* ---------- storage (best effort) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('voyz:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('voyz:' + k, JSON.stringify(v)); } catch (e) {} }
};
const S = {
  country: store.get('country', null),
  saved: new Set(store.get('saved', [])),
  trip: store.get('trip', []),
  tab: 'home', filters: {}, mapOnline: false
};
const persist = () => { store.set('saved', [...S.saved]); store.set('trip', S.trip); store.set('country', S.country); };

/* ---------- icons ---------- */
const IP = {
  back: '<path d="M15 18l-6-6 6-6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/>',
  heart: '<path d="M12 20s-7-4.4-9.2-9A5 5 0 0112 5.6 5 5 0 0121.2 11C19 15.6 12 20 12 20z"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  check: '<path d="M4 12.5l4.5 4.5L20 6.5"/>', checks: '<path d="M2 12.5l4.5 4.5L17 6.5M11 16l1 1L22.5 6.5"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M10 2.5h4"/>',
  boat: '<path d="M3 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M5 14l-1-4h16l-2 4M12 10V3l5 5h-5"/>',
  car: '<path d="M5 16l1.5-5.5A2 2 0 018.4 9h7.2a2 2 0 011.9 1.5L19 16M4 16h16v3H4zM7 19v1.5M17 19v1.5"/><circle cx="7.5" cy="16.5" r=".5"/><circle cx="16.5" cy="16.5" r=".5"/>',
  jeep: '<path d="M3 15V10l3-4h8l2 4h4a1 1 0 011 1v4H3z"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M8 6v4"/>',
  walk: '<circle cx="13" cy="4" r="1.8"/><path d="M10 21l2.5-6-2.5-3 1-4 4 3 3 1M9 12L7 9.5l3-2M14 15l3 6"/>',
  horse: '<path d="M5 21v-6l-2-2 3-6 4-3h2l1 2h2l4 4-1 2-3-1-1 3 2 7M9 21v-4"/>',
  bus: '<rect x="4" y="3.5" width="16" height="14" rx="3"/><path d="M4 11h16M7 21v-3.5M17 21v-3.5"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
  train: '<rect x="5" y="3" width="14" height="14" rx="4"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/>',
  plane: '<path d="M10.5 13.5L3 11l1.5-2 7 1 4.5-5c1-1 3-1.5 3.5-1s0 2.5-1 3.5l-5 4.5 1 7-2 1.5-2.5-7.5-3.5 3V19H6l-.5-2.5L3 16v-1.5h2.5z"/>',
  heli: '<path d="M3 5h16M11 5v3M6 11a5 5 0 015-3h3a4 4 0 014 4v1a2 2 0 01-2 2H9a3 3 0 01-3-3v-1zM6 11H2M10 15v3M16 15v3M7 18h12"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M9 6h3M12 9l2 7"/>',
  cable: '<path d="M2 4l20 5M12 6.5V10M7 10h10a1 1 0 011 1v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a1 1 0 011-1zM6 14h12"/>',
  tour: '<circle cx="9" cy="7" r="3"/><path d="M3 20a6 6 0 0112 0M16 4a3 3 0 010 6M18 14a5 5 0 013 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>', pause: '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  chev: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  home: '<path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 014 19.5z"/>',
  map: '<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  route: '<circle cx="6" cy="18.5" r="2.5"/><circle cx="18" cy="5.5" r="2.5"/><path d="M8.5 18.5H16a3.5 3.5 0 000-7H8a3.5 3.5 0 010-7h7.5"/>',
  more: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  warn: '<path d="M12 4l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  bed: '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 00-3-3h-7v6M7 11.5h.01"/><circle cx="7" cy="11.5" r="1.8"/>',
  tent: '<path d="M2 20h20M12 4L3 20M12 4l9 16M12 4v16M9 20l3-6 3 6"/>',
  food: '<path d="M6 3v8a2 2 0 002 2v8M10 3v8a2 2 0 01-2 2M8 3v6M17 21V3c-2 1-3.5 3.5-3.5 7 0 2 1.5 3 3.5 3"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 14.5h2M6 6l9-3 1.5 3"/>',
  signal: '<path d="M4 20v-3M9 20v-7M14 20v-11M19 20V4"/>', id: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16.5a3.7 3.7 0 017 0M14 10h4M14 13.5h3"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 01-12 0c0-4.1 6-10.5 6-10.5z"/>', boot: '<path d="M5 3h6v8l6 2.5a3 3 0 012 2.8V19H5z"/><path d="M5 15h14M9 7h2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  jacket: '<path d="M8 3l4 3 4-3 4 3-1.5 4L17 9v12H7V9l-1.5 1L4 6zM12 6v15"/>', bug: '<path d="M8 8a4 4 0 018 0M7 10h10v4a5 5 0 01-10 0zM12 10v9M3 13h4M17 13h4M4 7l3 3M20 7l-3 3M4 20l3-3M20 20l-3-3"/>',
  flash: '<path d="M9 2h6l-1 6h4L9 22l2-9H7z"/>', med: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M9 6V4h6v2M12 10v6M9 13h6"/>',
  battery: '<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10.5v3M7 10.5v3M10.5 10.5v3"/>', dot: '<circle cx="12" cy="12" r="3"/>',
  mountain: '<path d="M2 20L9 8l4 6 3-4 6 10z"/><path d="M7.5 11l1.5 1 1.5-1.5"/>', waves: '<path d="M2 8c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0M2 13c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0M2 18c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0"/>',
  fall: '<path d="M4 4h16M7 4v7M12 4v12M17 4v7M5 20c2-1.5 4-1.5 7 0s5 1.5 7 0"/>', canyon: '<path d="M2 20V9l4-2 2 4 2-1v10M22 20V8l-4 2-2 5-2-1v6M10 20c1-2 3-2 4 0"/>',
  pass: '<path d="M2 19l6-9 4 5 3-3 7 7zM12 4v4M10 6h4"/>', landmark: '<path d="M3 21h18M5 21V11M19 21V11M9 21V11M15 21V11M2 11l10-7 10 7z"/>',
  cave: '<path d="M2 20c0-8 4-14 10-14s10 6 10 14z"/><path d="M8 20c0-4 1.5-7 4-7s4 3 4 7"/>', compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  hot: '<path d="M8 14c-2-2 2-4 0-7M12 14c-2-2 2-4 0-7M16 14c-2-2 2-4 0-7M3 17c3 3 15 3 18 0"/>', tree: '<path d="M12 2l6 9h-3l4 6H5l4-6H6zM12 17v5"/>', glacier: '<path d="M2 20l5-9 3 3 4-8 8 14zM7 11l2 4M14 6l1 5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>', locate: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  phone: '<path d="M5 3h3.5l1.8 4.5-2.3 1.4a11 11 0 005.6 5.6l1.4-2.3L19.5 14v3.5A2 2 0 0117.3 19.5 15.5 15.5 0 014.5 6.7 2 2 0 015 3z"/>',
  link: '<path d="M10 14a4 4 0 005.6 0l3-3a4 4 0 00-5.6-5.6l-1 1M14 10a4 4 0 00-5.6 0l-3 3a4 4 0 005.6 5.6l1-1"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', parking: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M9.5 17V7h3.5a3 3 0 010 6H9.5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', toilet: '<path d="M7 3v8M7 11h10a5 5 0 01-5 5h-1l1 5H8l-1-10zM10 3h4"/>', fuel: '<path d="M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12M4 10h10M14 8l3 3v7a1.5 1.5 0 003 0V9l-3-3"/>',
  shop: '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9M10 20v-5h4v5"/>', atm: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/>',
  sos: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  shuffle: '<path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>', sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'
};
const I = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IP[n] || IP.dot}</svg>`;
const WM = (cls = 'wm') => `<svg class="${cls}" viewBox="0 0 645 86" role="img" aria-label="VOYZ"><path d="M3 4h46l40 50 40-50h47l-68 80H70z"/><path d="M206 2h78a40 40 0 010 80h-78a40 40 0 010-80zm6 27a8 8 0 000 16h66a8 8 0 000-16z"/><path d="M325 4h51l23 30 23-30h51l-56 50v30h-37V54z"/><path d="M490 4h150v26l-72 26h72v28H490V58l72-28h-72z"/></svg>`;

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkify = s => esc(s)
  .replace(/(https?:\/\/[^\s<)»,;]+[^\s<)».,;:])/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 38)}${u.length > 46 ? '…' : ''}</a>`)
  .replace(/(\+(?:7|996)[\d\s()-]{9,16}\d)/g, t => `<a href="tel:${t.replace(/[^\d+]/g, '')}">${t}</a>`);
const paras = s => String(s || '').split(/\n+/).filter(Boolean).map(t => `<p class="p">${linkify(t)}</p>`).join('');
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };
const firstSent = s => { s = String(s || ''); const m = s.match(/^.{20,220}?[.!?](\s|$)/); return m ? m[0].trim() : cut(s, 200); };
const hv = (a, b) => { const p = Math.PI / 180, x = Math.sin((b[0] - a[0]) * p / 2) ** 2 + Math.cos(a[0] * p) * Math.cos(b[0] * p) * Math.sin((b[1] - a[1]) * p / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const fmtKm = k => k < 10 ? k.toFixed(1).replace('.', ',') : Math.round(k).toLocaleString('ru-RU');
const fmtH = h => { const H = Math.floor(h), M = Math.round((h - H) * 60 / 5) * 5; return H ? `${H} ч${M ? ' ' + M + ' мин' : ''}` : `${M} мин`; };
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const n1 = n % 10; return n > 10 && n < 20 ? c : n1 > 1 && n1 < 5 ? b : n1 === 1 ? a : c; };
const ofC = c => PL.filter(p => p.c === c);
const cur = () => ofC(S.country);
const cname = c => c === 'kg' ? 'Кыргызстан' : 'Алтай';
const HUB = { kg: { n: 'Бишкека', ll: [42.8746, 74.5698] }, alt: { n: 'Горно-Алтайска', ll: [51.958, 85.96] } };
const catIcon = c => { c = (c || '').toLowerCase();
  return /водопад/.test(c) ? 'fall' : /озер|водохр|озёр/.test(c) ? 'waves' : /каньон/.test(c) ? 'canyon' : /перевал|дорог/.test(c) ? 'pass' : /ледник/.test(c) ? 'glacier'
    : /пещер/.test(c) ? 'cave' : /источник/.test(c) ? 'hot' : /лес|парк/.test(c) ? 'tree' : /музей|мавзол|храм|мечеть|городищ|археол|петрогл|истор|культур|памятник|священ/.test(c) ? 'landmark'
    : /гора|ущель|долин|плато|панорам|урочищ|хижин|лагер/.test(c) ? 'mountain' : 'compass'; };
const catShort = c => { c = (c || '').toLowerCase();
  if (/водопад/.test(c)) return 'Водопады'; if (/озер|озёр|водохр/.test(c)) return 'Озёра'; if (/каньон/.test(c)) return 'Каньоны'; if (/ущель/.test(c)) return 'Ущелья';
  if (/перевал|дорог/.test(c)) return 'Перевалы и дороги'; if (/долин|плато|жайлоо|урочищ|панорам/.test(c)) return 'Долины и панорамы'; if (/ледник|гора|хижин|лагер/.test(c)) return 'Горы и ледники';
  if (/парк|заповед|лес/.test(c)) return 'Парки'; if (/источник|курорт/.test(c)) return 'Источники и курорты';
  if (/музей|мавзол|храм|мечеть|городищ|археол|петрогл|истор|культур|священ|памятник/.test(c)) return 'История и культура'; if (/пещер/.test(c)) return 'Пещеры'; return 'Другое'; };
const photo = p => p.photos && p.photos[0];
const ph = (p, cls = 'ph') => `<div class="${cls}"><svg class="cat" viewBox="0 0 24 24">${IP[catIcon(p.cat)]}</svg></div>`;
const img = (p, big) => { const f = photo(p); return f ? `<img src="${big ? f.f : f.t}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : ph(p); };
const locLine = p => p.c === 'kg' ? (p.reg || '').replace(' область', ' обл.') : (p.reg || 'Алтай');
const noCar = p => (p.p.transport || []).some(t => /маршрут|автобус|поезд|катер|теплоход|паром|минивэн/i.test(t.mode || ''));
const isTop = p => p.rank && p.top;
const accIcon = a => /воде/.test(a) ? 'boat' : /4×4|Кроссовер/.test(a) ? 'jeep' : /пешком/i.test(a) ? 'walk' : /Верхом/.test(a) ? 'horse' : 'car';
const modeIcon = m => { m = (m || '').toLowerCase();
  return /маршрут|автобус|минивэн/.test(m) ? 'bus' : /поезд|электрич/.test(m) ? 'train' : /самол|авиа/.test(m) ? 'plane' : /вертол/.test(m) ? 'heli' : /лодк|катер|теплох|паром/.test(m) ? 'boat'
    : /лошад|конн|кон/.test(m) ? 'horse' : /вело/.test(m) ? 'bike' : /канат/.test(m) ? 'cable' : /пеш|трек/.test(m) ? 'walk' : /газ-66|уаз|4x4|внедор/.test(m) ? 'jeep' : /тур|экскурс/.test(m) ? 'tour' : 'car'; };
const bringIcon = t => { t = t.toLowerCase();
  return /вод/.test(t) ? 'drop' : /обув|ботин|кроссов/.test(t) ? 'boot' : /налич|сом|руб|деньг/.test(t) ? 'wallet' : /крем|очк|панам|головн|солнц/.test(t) ? 'sun'
    : /ветров|куртк|тёпл|тепл|флис|дожд|пуховк|шапк/.test(t) ? 'jacket' : /репел|клещ|комар/.test(t) ? 'bug' : /паспорт|пропуск|документ/.test(t) ? 'id' : /фонар/.test(t) ? 'flash'
    : /аптеч|лекарств/.test(t) ? 'med' : /телефон|заряд|power|пауэр|повербанк|батар/.test(t) ? 'battery' : /еда|перекус|продукт/.test(t) ? 'food' : 'check'; };
const dest = (p, a) => (a && a.rt && (a.rt.pc || a.rt.tc)) || p.ll;
const toast = (msg, icon = 'check') => { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; app.appendChild(t); }
  t.innerHTML = I(icon) + esc(msg); t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2300); };
const haptic = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };

/* ---------- favourites / trip ---------- */
function toggleSave(id, btn) {
  if (S.saved.has(id)) { S.saved.delete(id); toast('Убрали из избранного', 'heart'); }
  else { S.saved.add(id); toast('Сохранили в избранное', 'heart'); }
  persist(); haptic(); syncHearts(id); updateBadge();
  if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
}
function syncHearts(id) { $$(`[data-heart="${id}"]`).forEach(b => b.classList.toggle('on', S.saved.has(id))); }
function toggleTrip(id) {
  const i = S.trip.indexOf(id);
  if (i >= 0) { S.trip.splice(i, 1); toast('Убрали из маршрута', 'route'); }
  else { S.trip.push(id); S.saved.add(id); toast('Добавили в маршрут', 'route'); syncHearts(id); }
  persist(); haptic(); updateBadge(); $$(`[data-trip="${id}"]`).forEach(b => b.classList.toggle('on', S.trip.includes(id)));
  if (S.tab === 'trip') renderTrip();
}
const heartBtn = (p, cls = 'heartbtn') => `<button class="${cls} ${S.saved.has(p.id) ? 'on' : ''}" data-heart="${p.id}" aria-label="В избранное">${I('heart')}</button>`;

/* ---------- map base (offline vector) ---------- */
const LL = c => [c[1], c[0]];
const HUBLABELS = { kg: [['Бишкек', 42.8746, 74.5698], ['Каракол', 42.4907, 78.3936], ['Нарын', 41.4287, 75.9911], ['Ош', 40.5283, 72.7985], ['Талас', 42.5228, 72.2428], ['Балыкчи', 42.46, 76.187], ['Чолпон-Ата', 42.649, 77.082], ['Кочкор', 42.215, 75.755], ['Джалал-Абад', 40.9333, 73.0], ['Баткен', 40.062, 70.819], ['Токтогул', 41.875, 72.941], ['Казарман', 41.404, 74.037]],
  alt: [['Горно-Алтайск', 51.958, 85.96], ['Бийск', 52.539, 85.213], ['Барнаул', 53.348, 83.779], ['Чемал', 51.411, 86.004], ['Артыбаш', 51.79, 87.27], ['Онгудай', 50.749, 86.136], ['Акташ', 50.317, 87.607], ['Кош-Агач', 49.992, 88.672], ['Усть-Кокса', 50.27, 85.615], ['Улаган', 50.63, 87.963], ['Турочак', 52.257, 87.124]] };
function baseMap(el, opts = {}) {
  const map = L.map(el, { zoomControl: false, attributionControl: true, preferCanvas: false, zoomSnap: .25, minZoom: 5, maxZoom: 15, ...opts });
  map.attributionControl.setPrefix(''); map.setView(S.country === 'kg' ? [41.6, 74.6] : [51.0, 86.6], 6);
  map.attributionControl.addAttribution('Natural Earth · схема');
  const home = S.country === 'kg' ? 'Киргизия' : 'Россия';
  const cpane = map.createPane('base'); cpane.style.zIndex = 200;
  GEO.countries.forEach(c => L.polygon(c.r.map(r => r.map(LL)), { pane: 'base', stroke: true, color: '#b9c4ab', weight: 1, dashArray: '4 4', fillColor: c.n === home ? '#DEEAD2' : '#E9EEE2', fillOpacity: 1, interactive: false }).addTo(map));
  GEO.lakes.forEach(l => L.polygon(l.map(r => r.map(LL)), { pane: 'base', color: '#7FB6E6', weight: 1, fillColor: '#A9D2F3', fillOpacity: 1, interactive: false }).addTo(map));
  GEO.rivers.forEach(r => L.polyline(r.map(LL), { pane: 'base', color: '#8CC0EC', weight: 1.3, interactive: false }).addTo(map));
  GEO.roads.forEach(r => L.polyline(r.c.map(LL), { pane: 'base', color: r.m ? '#F2BE5C' : '#FFFFFF', weight: r.m ? 2.6 : 1.8, opacity: r.m ? .95 : 1, interactive: false }).addTo(map));
  const lp = map.createPane('labels'); lp.style.zIndex = 450; lp.style.pointerEvents = 'none';
  (HUBLABELS[S.country] || []).forEach(([n, a, b]) => L.marker([a, b], { pane: 'labels', interactive: false, icon: L.divIcon({ className: '', html: `<div class="mlabel hub">● ${n}</div>`, iconSize: [0, 0], iconAnchor: [5, 7] }) }).addTo(map));
  return map;
}
function onlineTiles(map, on) {
  if (on && !map._tiles) {
    map._tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { subdomains: 'abc', maxZoom: 17, attribution: '© OpenStreetMap', opacity: 1 });
    let errs = 0; map._tiles.on('tileerror', () => { if (++errs === 4) toast('Онлайн-карта недоступна — показываем встроенную', 'map'); });
    map._tiles.addTo(map); map._tiles.getContainer().style.zIndex = 300;
  } else if (!on && map._tiles) { map.removeLayer(map._tiles); map._tiles = null; }
}
function animatePath(layer) {
  requestAnimationFrame(() => { const p = layer._path; if (!p) return; const len = p.getTotalLength(); p.style.setProperty('--len', len); p.classList.remove('rline'); void p.getBoundingClientRect(); p.classList.add('rline');
    p.addEventListener('animationend', () => { p.classList.remove('rline'); p.style.removeProperty('--len'); }, { once: true }); });
}
/* ---------- road routing (offline Dijkstra on Natural Earth graph) ---------- */
const GR = (() => { const n = GEO.graph.n, adj = n.map(() => []); GEO.graph.e.forEach(([i, j, w]) => { adj[i].push([j, w]); adj[j].push([i, w]); }); return { n, adj }; })();
function nearestNode(ll) { let b = -1, bd = 1e9; for (let i = 0; i < GR.n.length; i++) { if (!GR.adj[i].length) continue; const d = hv(ll, [GR.n[i][1], GR.n[i][0]]); if (d < bd) { bd = d; b = i; } } return [b, bd]; }
function roadRoute(a, b) {
  const [s, ds] = nearestNode(a), [t, dt] = nearestNode(b); const direct = hv(a, b);
  if (ds > 40 || dt > 40 || direct < 4) return { km: direct * 1.25, line: [a, b], approx: true };
  const dist = new Float64Array(GR.n.length).fill(Infinity), prev = new Int32Array(GR.n.length).fill(-1); dist[s] = 0;
  const heap = [[0, s]]; const push = x => { heap.push(x); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, u] = pop(); if (u === t) break; if (d > dist[u]) continue; for (const [v, w] of GR.adj[u]) { const nd = d + w; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; push([nd, v]); } } }
  if (!isFinite(dist[t]) || dist[t] > direct * 4 + 50) return { km: direct * 1.3, line: [a, b], approx: true };
  const path = []; for (let u = t; u !== -1; u = prev[u]) path.push([GR.n[u][1], GR.n[u][0]]);
  path.reverse(); return { km: dist[t] + ds * 1.2 + dt * 1.2, line: [a, ...path, b], approx: false };
}

/* ---------- splash + onboarding ---------- */
function splash() {
  const s = document.createElement('div'); s.className = 'splash';
  s.innerHTML = `${WM()}<div class="tag">Больше, чем просто поездки</div><div class="bar"><i></i></div>`;
  app.appendChild(s);
  setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 520); if (!S.country) onboarding(); else start(); }, 1500);
}
function onboarding() {
  const o = document.createElement('div'); o.className = 'onb';
  const pic = id => { const p = BY[id]; const f = p && photo(p); return f ? f.f : ''; };
  const kgPic = pic('kg-skazka') || (ofC('kg').find(photo) || {}).photos?.[0]?.f;
  const altPic = (ofC('alt').find(p => /Телецк/.test(p.name)) || ofC('alt').find(photo));
  o.innerHTML = `${WM('wm" style="width:96px;fill:#fff')}
    <h1>Куда<br>едем?</h1>
    <p class="lead">${PL.length} мест, проверенных по открытым источникам: как доехать, где оставить машину, где ночевать и что важно знать заранее.</p>
    <button class="ccard" data-c="kg"><img src="${kgPic}" alt=""><div class="t"><div><b>Кыргызстан</b><span>${ofC('kg').length} мест · горы, озёра, каньоны</span></div><span class="ibub">${I('arrow')}</span></div></button>
    <button class="ccard" data-c="alt"><img src="${altPic ? photo(altPic).f : ''}" alt=""><div class="t"><div><b>Россия · Алтай</b><span>${ofC('alt').length} мест · Чуйский тракт, Телецкое</span></div><span class="ibub">${I('arrow')}</span></div></button>
    <div class="fine">Страну можно сменить в любой момент</div>`;
  app.appendChild(o);
  $$('.ccard', o).forEach(b => b.onclick = () => { S.country = b.dataset.c; persist(); o.style.transition = 'opacity .4s, transform .4s'; o.style.opacity = 0; o.style.transform = 'scale(1.03)'; setTimeout(() => o.remove(), 420); start(); });
}

/* ---------- tabs ---------- */
const TABS = [['home', 'Обзор', 'home'], ['map', 'Карта', 'map'], ['trip', 'Маршрут', 'route'], ['more', 'Ещё', 'more']];
function start() {
  if ($('.tabbar')) { renderAll(); return; }
  TABS.forEach(([id]) => { const v = document.createElement('div'); v.className = 'view tabview' + (id === 'map' ? ' mapview' : ''); v.id = 'v-' + id; v.hidden = id !== 'home'; app.appendChild(v); });
  const tb = document.createElement('nav'); tb.className = 'tabbar'; tb.setAttribute('aria-label', 'Разделы');
  tb.innerHTML = '<span class="ind"></span>' + TABS.map(([id, n, ic]) => `<button data-tab="${id}" class="${id === 'home' ? 'on' : ''}">${I(ic)}<span>${n}</span>${id === 'trip' ? '<em class="badge" hidden></em>' : ''}</button>`).join('');
  app.appendChild(tb);
  $$('button', tb).forEach(b => b.onclick = () => go(b.dataset.tab));
  renderAll(); requestAnimationFrame(() => moveInd()); updateBadge(); wireTabDrag();
}
function renderAll() { renderHome(); if (bigMap) refreshMap(); renderTrip(); renderMore(); }
function moveInd(jelly) { const b = $(`.tabbar button[data-tab="${S.tab}"]`), ind = $('.tabbar .ind'); if (!b || !ind) return; ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px';
  if (jelly && ind.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) ind.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.28,.86)', offset: .35 }, { transform: 'scale(.94,1.06)', offset: .7 }, { transform: 'scale(1,1)' }], { duration: 520, easing: 'ease-out' }); }
function go(tab) {
  if (tab === S.tab) { const v = $('#v-' + tab); v && v.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  S.tab = tab; $$('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); moveInd(true);
  TABS.forEach(([id]) => { const v = $('#v-' + id); v.hidden = id !== tab; });
  const v = $('#v-' + tab); v.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  if (tab === 'map') initMap(); if (tab === 'trip') renderTrip();
  statusDark(tab === 'map');
}
function updateBadge() { const b = $('.tabbar .badge'); if (!b) return; b.hidden = !S.trip.length; b.textContent = S.trip.length; }
function statusDark(on) { const s = $('.statusbar'); s && s.classList.toggle('dark', !!on); }

/* ---------- HOME ---------- */
function bigCard(p) {
  return `<div class="bigcard" role="button" tabindex="0" data-open="${p.id}">${img(p, true)}
    <div class="top">${p.rating ? `<span class="pill">${p.rating.v} ${I('star').replace('class="ic', 'style="width:13px;height:13px;fill:#000" class="ic')}</span>` : '<span></span>'}${heartBtn(p)}</div>
    <div class="bot"><b>${esc(p.name)}</b><div class="loc">${I('pin')}${esc(locLine(p))}</div>
    <div class="meta"><span>${esc(p.s.diff)}</span><span>${esc(p.s.when)}</span><span>${esc(p.s.acc)}</span></div></div></div>`;
}
function rowCard(p, sub) {
  return `<button class="rowcard" data-open="${p.id}"><div class="th">${img(p)}</div><div class="tx"><b>${esc(p.name)}</b><div class="s">${esc(sub || (p.cat + ' · ' + locLine(p)))}</div><span class="arrowdot">${I('arrow')}</span></div>
    ${p.idx ? `<div class="ring" style="--v:${p.idx}" title="Индекс полноты"><i>${p.idx}</i></div>` : ''}</button>`;
}
function miniCard(p) { return `<div class="mini" role="button" tabindex="0" data-open="${p.id}">${img(p)}${heartBtn(p)}<b>${esc(p.name)}</b><span>${esc(p.s.diff)} · ${esc(p.s.acc)}</span></div>`; }
const secHead = (t, more, act) => `<div class="sec-head ${more && t.length > 11 ? 'left' : ''}"><h2 class="h-sec">${t}</h2>${more ? `<button class="more" data-act="${act}">${more}</button>` : ''}</div>`;
function renderHome() {
  const v = $('#v-home'); const L0 = cur(); const c = S.country;
  const season = L0.filter(p => (p.m || []).includes(CUR_M)).sort((a, b) => (b.idx || 0) - (a.idx || 0));
  const best = [...L0].sort((a, b) => (b.idx || 0) - (a.idx || 0)).slice(0, 5);
  const nocar = L0.filter(noCar).sort((a, b) => (b.idx || 0) - (a.idx || 0));
  const near = L0.filter(p => p.ll && hv(p.ll, HUB[c].ll) < 170).sort((a, b) => hv(a.ll, HUB[c].ll) - hv(b.ll, HUB[c].ll));
  const cats = {}; L0.forEach(p => { const k = catShort(p.cat); cats[k] = (cats[k] || 0) + 1; });
  const catList = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  v.innerHTML = `
  <header class="home-top">
    <div class="row">${WM()}<div class="seg" role="tablist"><span class="knob"></span><button data-c="kg" class="${c === 'kg' ? 'on' : ''}">Кыргызстан</button><button data-c="alt" class="${c === 'alt' ? 'on' : ''}">Алтай</button></div></div>
    <h1>Куда поедем<br>в ${MONTHS[CUR_M - 1]}?</h1>
    <p class="sub">${L0.length} ${plural(L0.length, 'место', 'места', 'мест')} · маршруты, ночлег, парковки</p>
    <label class="search">${I('search')}<input id="q" type="search" placeholder="Озеро, перевал, село…" autocomplete="off"><button class="ibub" data-act="filter" aria-label="Фильтры">${I('filter')}</button></label>
  </header>
  <div class="sheet-top" id="homeBody">
    <div id="results"></div>
    <div id="rails">
      ${season.length ? `<section class="sec">${secHead('Хорошо в ' + MONTHS[CUR_M - 1], 'Все', 'season')}<div class="rail">${season.slice(0, 10).map(bigCard).join('')}</div></section>` : ''}
      <section class="sec" style="padding-top:26px"><div class="rail catrail">${catList.map(([k, n]) => `<button class="chip" data-cat="${esc(k)}">${I(catIcon(k))}${esc(k)} <span class="muted">${n}</span></button>`).join('')}</div></section>
      <section class="sec">${secHead('Лучше всего изучено', 'Все', 'best')}<p class="p muted small" style="text-align:center;margin-top:-8px">Индекс — полнота и свежесть проверенных данных</p>${best.map(p => rowCard(p)).join('')}</section>
      ${nocar.length ? `<section class="sec">${secHead('Можно без машины', 'Все', 'nocar')}<div class="rail">${nocar.slice(0, 10).map(bigCard).join('')}</div></section>` : ''}
      ${near.length ? `<section class="sec">${secHead('Недалеко от ' + HUB[c].n)}${near.slice(0, 6).map(p => rowCard(p, `≈${Math.round(hv(p.ll, HUB[c].ll))} км по прямой · ${p.s.acc}`)).join('')}</section>` : ''}
      <section class="sec">${secHead('Все места', 'Фильтры', 'filter')}<div class="gridcards">${L0.map(miniCard).join('')}</div></section>
    </div>
  </div>`;
  // seg knob
  const seg = $('.seg', v), knob = $('.knob', seg); const place = () => { const b = $('button.on', seg); knob.style.left = b.offsetLeft + 'px'; knob.style.width = b.offsetWidth + 'px'; };
  requestAnimationFrame(place);
  $$('button', seg).forEach(b => b.onclick = () => { if (b.dataset.c === S.country) return; $$('button', seg).forEach(x => x.classList.toggle('on', x === b)); place(); haptic(); setTimeout(() => setCountry(b.dataset.c), 380); });
  const q = $('#q', v); let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => showResults({ q: q.value.trim() }), 160); };
  $$('[data-cat]', v).forEach(b => b.onclick = () => showResults({ cat: b.dataset.cat }));
  if (Object.keys(S.filters).length) showResults(S.filters);
}
function setCountry(c) { S.country = c; S.filters = {}; persist(); renderHome(); if (bigMap) refreshMap(true); renderTrip(); renderMore(); toast(c === 'kg' ? 'Кыргызстан' : 'Россия · Алтай', 'globe'); }
function filterList(f) {
  const q = (f.q || '').toLowerCase();
  return cur().filter(p => (!q || (p.name + ' ' + p.full + ' ' + p.cat + ' ' + p.reg + ' ' + p.dist + ' ' + p.near + ' ' + p.short).toLowerCase().includes(q))
    && (!f.cat || catShort(p.cat) === f.cat) && (!f.month || (p.m || []).includes(+f.month)) && (!f.acc || p.s.acc === f.acc)
    && (!f.diff || p.s.diff.toLowerCase().startsWith(f.diff)) && (!f.nocar || noCar(p)) && (!f.photo || photo(p)) && (!f.season || (p.m || []).includes(CUR_M)))
    .sort((a, b) => (b.idx || 0) - (a.idx || 0));
}
function showResults(f) {
  S.filters = Object.fromEntries(Object.entries(f).filter(([, v]) => v)); const box = $('#results'), rails = $('#rails');
  if (!Object.keys(S.filters).length) { box.innerHTML = ''; rails.hidden = false; return; }
  const list = filterList(S.filters); rails.hidden = true;
  const tags = Object.entries(S.filters).map(([k, v]) => `<button class="chip on" data-rm="${k}">${esc(k === 'q' ? '«' + v + '»' : k === 'month' ? 'Сезон: ' + MONTHS[v - 1] : k === 'nocar' ? 'Без машины' : k === 'photo' ? 'С фото' : k === 'season' ? 'Сезон сейчас' : k === 'best' ? 'По полноте' : v)} ${I('close')}</button>`).join('');
  box.innerHTML = `<section class="sec" style="padding-top:22px"><div class="filterbar" style="flex-wrap:wrap">${tags}<span class="counter">${list.length} ${plural(list.length, 'место', 'места', 'мест')}</span></div>
    ${list.length ? `<div class="gridcards">${list.map(miniCard).join('')}</div>` : `<div class="empty"><span class="ibub">${I('search')}</span><b>Ничего не нашли</b>Уберите один из фильтров или поищите по названию села.</div>`}</section>`;
  $$('[data-rm]', box).forEach(b => b.onclick = () => { const nf = { ...S.filters }; delete nf[b.dataset.rm]; if (b.dataset.rm === 'q') $('#q').value = ''; showResults(nf); });
}
function filterSheet() {
  const L0 = cur(); const cats = [...new Set(L0.map(p => catShort(p.cat)))]; const accs = [...new Set(L0.map(p => p.s.acc))];
  const f = { ...S.filters };
  const chip = (k, v, label) => `<button class="chip ${String(f[k]) === String(v) ? 'on' : ''}" data-k="${k}" data-v="${esc(v)}">${esc(label || v)}</button>`;
  const sh = sheet(`<h3>Фильтры</h3>
    <div class="grp"><b>Когда едете</b><div class="chips">${MONTHS.map((m, i) => chip('month', i + 1, ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][i])).join('')}</div></div>
    <div class="grp"><b>Что ищете</b><div class="chips">${cats.map(c => chip('cat', c)).join('')}</div></div>
    <div class="grp"><b>Сложность</b><div class="chips">${chip('diff', 'очень', 'Очень лёгкая')}${chip('diff', 'лёгкая', 'Лёгкая')}${chip('diff', 'средн', 'Средняя')}${chip('diff', 'сложн', 'Сложная')}${chip('diff', 'высок', 'Высокая')}</div></div>
    <div class="grp"><b>Как добраться</b><div class="chips">${accs.map(a => chip('acc', a)).join('')}${chip('nocar', 1, 'Есть маршрутка или автобус')}</div></div>
    <div class="grp"><b>Ещё</b><div class="chips">${chip('photo', 1, 'Только с фото')}</div></div>
    <div style="display:flex;gap:10px;margin-top:8px"><button class="btn grey" data-x="reset">Сбросить</button><button class="btn lime" data-x="ok">Показать</button></div>`);
  const cnt = () => { const n = filterList(f).length; $('[data-x="ok"]', sh).textContent = `Показать ${n}`; };
  $$('[data-k]', sh).forEach(b => b.onclick = () => { const k = b.dataset.k, val = b.dataset.v; if (String(f[k]) === val) delete f[k]; else f[k] = val; $$(`[data-k="${k}"]`, sh).forEach(x => x.classList.toggle('on', String(f[k]) === x.dataset.v)); cnt(); });
  $('[data-x="reset"]', sh).onclick = () => { Object.keys(f).forEach(k => delete f[k]); $$('[data-k]', sh).forEach(x => x.classList.remove('on')); cnt(); };
  $('[data-x="ok"]', sh).onclick = () => { closeSheet(); go('home'); const q = $('#q'); if (q) f.q = q.value.trim(); showResults(f); $('#v-home').scrollTo({ top: 300, behavior: 'smooth' }); };
  cnt();
}

/* ---------- bottom sheet ---------- */
function sheet(html) {
  closeSheet(true); const sc = document.createElement('div'); sc.className = 'scrim'; const sh = document.createElement('div'); sh.className = 'bsheet';
  sh.innerHTML = '<div class="grab"></div>' + html; app.append(sc, sh); requestAnimationFrame(() => { sc.classList.add('show'); sh.classList.add('show'); });
  sc.onclick = () => closeSheet();
  let y0 = null; sh.addEventListener('touchstart', e => { if (sh.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchmove', e => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
  sh.addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null; sh.style.transform = ''; if (dy > 110) closeSheet(); });
  return sh;
}
function closeSheet(now) { const sc = $('.scrim'), sh = $('.bsheet'); if (!sh) return; if (now) { sc && sc.remove(); sh.remove(); return; } sc.classList.remove('show'); sh.classList.remove('show'); setTimeout(() => { sc.remove(); sh.remove(); }, 420); }

/* ---------- global delegation ---------- */
app.addEventListener('click', e => {
  const h = e.target.closest('[data-heart]'); if (h) { e.stopPropagation(); toggleSave(h.dataset.heart, h); return; }
  const tr = e.target.closest('[data-trip]'); if (tr) { e.stopPropagation(); toggleTrip(tr.dataset.trip); return; }
  const a = e.target.closest('[data-act]'); if (a) { const k = a.dataset.act;
    if (k === 'filter') { e.preventDefault(); filterSheet(); } else if (k === 'season') showResults({ season: 1 }); else if (k === 'best') showResults({ best: 1 }); else if (k === 'nocar') showResults({ nocar: 1 });
    if (/season|best|nocar/.test(k)) $('#v-home').scrollTo({ top: 300, behavior: 'smooth' }); return; }
  const o = e.target.closest('[data-open]'); if (o) { openPlace(o.dataset.open, o.querySelector('img')); }
});
app.addEventListener('keydown', e => { if (e.key === 'Enter') { const o = e.target.closest('[data-open]'); if (o) openPlace(o.dataset.open, o.querySelector('img')); } if (e.key === 'Escape') { if ($('.viewer')) $('.viewer').remove(); else if ($('.bsheet')) closeSheet(); else if (STACK.length) back(); } });

/* ---------- MAP TAB ---------- */
let bigMap = null, markers = {}, mapSel = null, mapFilter = 'all';
function initMap() {
  const v = $('#v-map');
  if (bigMap) { setTimeout(() => bigMap.invalidateSize(), 50); return; }
  v.innerHTML = `<div class="bigmap" id="bigmap"></div>
    <div class="maptop"><label class="search">${I('search')}<input id="mq" type="search" placeholder="Найти на карте" autocomplete="off"></label><div class="chips" id="mchips"></div></div>
    <div class="mapctl"><button data-m="fit" aria-label="Показать всё">${I('fit')}</button><button data-m="loc" aria-label="Где я">${I('locate')}</button><button data-m="tiles" aria-label="Онлайн-карта">${I('layers')}</button></div>
    <div class="peek"><div class="rail" id="mrail"></div></div>`;
  bigMap = baseMap($('#bigmap')); refreshMap(true);
  $('#mq').oninput = e => refreshMap(false, e.target.value.trim().toLowerCase());
  $$('.mapctl button', v).forEach(b => b.onclick = () => {
    const m = b.dataset.m;
    if (m === 'fit') fitMap();
    if (m === 'tiles') { S.mapOnline = !S.mapOnline; b.classList.toggle('on', S.mapOnline); onlineTiles(bigMap, S.mapOnline); toast(S.mapOnline ? 'Подробная онлайн-карта' : 'Встроенная карта — работает без сети', 'layers'); }
    if (m === 'loc') { if (!navigator.geolocation) return toast('Геолокация недоступна', 'locate');
      navigator.geolocation.getCurrentPosition(pos => { const ll = [pos.coords.latitude, pos.coords.longitude]; if (bigMap._me) bigMap.removeLayer(bigMap._me); bigMap._me = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#1a4dff', fillOpacity: 1 }).addTo(bigMap); bigMap.flyTo(ll, 9); },
        () => toast('Не удалось определить место', 'locate'), { timeout: 8000 }); }
  });
  let st; $('#mrail').addEventListener('scroll', e => { clearTimeout(st); st = setTimeout(() => { const r = e.target, mid = r.scrollLeft + r.clientWidth / 2; let best = null, bd = 1e9;
    $$('.pcard', r).forEach(c => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = c; } }); if (best && best.dataset.id !== mapSel) selectMarker(best.dataset.id, false); }, 140); }, { passive: true });
}
function fitMap(anim = true) { const pts = cur().filter(p => p.ll).map(p => p.ll); if (!pts.length) return; const o = { paddingTopLeft: [24, 120], paddingBottomRight: [24, 210] }; if (anim) bigMap.flyToBounds(pts, { ...o, duration: .8 }); else bigMap.fitBounds(pts, o); }
function refreshMap(refit, q = '') {
  if (!bigMap) return;
  if (refit && bigMap._country && bigMap._country !== S.country) { const el = $('#bigmap'); bigMap.remove(); bigMap = baseMap(el); markers = {}; if (S.mapOnline) onlineTiles(bigMap, true); }
  bigMap._country = S.country;
  if (!bigMap._zw) { bigMap._zw = 1; const zc = () => { $('#bigmap').dataset.z = bigMap.getZoom() < 7 ? 'lo' : bigMap.getZoom() < 9 ? 'mid' : 'hi'; }; bigMap.on('zoomend', zc); zc(); }
  Object.values(markers).forEach(m => bigMap.removeLayer(m)); markers = {};
  const cats = {}; cur().forEach(p => { const k = catShort(p.cat); cats[k] = (cats[k] || 0) + 1; });
  const ch = $('#mchips'); ch.innerHTML = [['all', 'Все'], ...Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k]) => [k, k])].map(([k, n]) => `<button class="chip ${mapFilter === k ? 'on' : ''}" data-f="${esc(k)}">${k === 'all' ? I('map') : I(catIcon(k))}${esc(n)}</button>`).join('');
  $$('[data-f]', ch).forEach(b => b.onclick = () => { mapFilter = b.dataset.f; refreshMap(false, $('#mq').value.trim().toLowerCase()); });
  const list = cur().filter(p => p.ll && (mapFilter === 'all' || catShort(p.cat) === mapFilter) && (!q || (p.name + ' ' + p.full + ' ' + p.near).toLowerCase().includes(q))).sort((a, b) => b.ll[1] - a.ll[1] < 0 ? 1 : -1);
  list.sort((a, b) => a.ll[1] - b.ll[1]);
  list.forEach(p => { const m = L.marker(p.ll, { icon: L.divIcon({ className: '', html: `<div class="vwrap"><div class="vmark ${isTop(p) ? 'top' : ''}" data-mk="${p.id}"></div></div>`, iconSize: [30, 30], iconAnchor: [15, 15] }), riseOnHover: true, title: p.name });
    m.on('click', () => selectMarker(p.id, true)); m.addTo(bigMap); markers[p.id] = m; });
  $('#mrail').innerHTML = list.map(p => `<button class="pcard" data-id="${p.id}"><div class="th">${img(p)}</div><div class="tx"><b>${esc(p.name)}</b><div class="s">${esc(p.cat)} · ${esc(p.s.acc)}</div><span class="arrowdot">${I('arrow')}</span></div></button>`).join('')
    || `<div class="pcard" style="justify-content:center">Ничего не нашли — смените фильтр</div>`;
  $$('#mrail .pcard').forEach(c => c.onclick = () => { if (c.dataset.id === mapSel) openPlace(c.dataset.id, c.querySelector('img')); else selectMarker(c.dataset.id, true); });
  if (refit) { bigMap.invalidateSize(); fitMap(false); } mapSel = null;
}
function selectMarker(id, scroll) {
  mapSel = id; $$('.vmark').forEach(m => m.classList.toggle('on', m.dataset.mk === id)); $$('#mrail .pcard').forEach(c => c.classList.toggle('on', c.dataset.id === id));
  const p = BY[id]; if (markers[id]) markers[id].setZIndexOffset(1000);
  if (p && p.ll) bigMap.panTo(p.ll, { animate: true, duration: .5 });
  if (scroll) { const c = $(`#mrail .pcard[data-id="${id}"]`); c && c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
  haptic();
}
function showOnMap(id) { closeAllPush(); go('map'); setTimeout(() => { const p = BY[id]; if (p && p.ll) { bigMap.setView(p.ll, 9); selectMarker(id, true); } }, 120); }

/* ---------- DETAIL ---------- */
const STACK = [];
function openPlace(id, fromImg) {
  const p = BY[id]; if (!p) return;
  if (p.c !== S.country) { S.country = p.c; persist(); renderAll(); }
  const v = document.createElement('div'); v.className = 'view push det'; v.dataset.id = id;
  v.innerHTML = detailHTML(p); app.appendChild(v);
  const prev = STACK.length ? STACK[STACK.length - 1] : $('#v-' + S.tab); prev.classList.add('under');
  STACK.push(v); $('.tabbar').classList.add('hide');
  try { history.pushState({ voyz: STACK.length }, ''); } catch (e) {}
  const f = photo(p);
  if (fromImg && f && fromImg.getBoundingClientRect().width > 40 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    v.classList.add('fade'); const r = fromImg.getBoundingClientRect(), ar = app.getBoundingClientRect(); const fly = document.createElement('img'); fly.src = f.f;
    Object.assign(fly.style, { position: 'absolute', zIndex: 50, left: r.left - ar.left + 'px', top: r.top - ar.top + 'px', width: r.width + 'px', height: r.height + 'px', objectFit: 'cover', borderRadius: '20px', pointerEvents: 'none' });
    app.appendChild(fly); const hero = $('.hero', v);
    fly.animate([{}, { left: '0px', top: '0px', width: ar.width + 'px', height: hero.offsetHeight + 'px', borderRadius: '0px' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).onfinish = () => fly.remove();
  } else v.classList.add('enter');
  statusDark(false); wireDetail(v, p);
}
function back() {
  const v = STACK.pop(); if (!v) return; if (v._audio) stopAudio(v);
  v.classList.remove('enter', 'fade'); v.classList.add('leave');
  const prev = STACK.length ? STACK[STACK.length - 1] : $('#v-' + S.tab); prev.classList.remove('under');
  setTimeout(() => v.remove(), 330);
  if (!STACK.length) { $('.tabbar').classList.remove('hide'); statusDark(S.tab === 'map'); if (S.tab === 'trip') renderTrip(); }
}
function closeAllPush() { while (STACK.length) { const v = STACK.pop(); if (v._audio) stopAudio(v); v.remove(); } $$('.under').forEach(x => x.classList.remove('under')); $('.tabbar').classList.remove('hide'); }
window.addEventListener('popstate', () => { if ($('.viewer')) { $('.viewer').remove(); return; } if ($('.bsheet')) { closeSheet(); return; } if (STACK.length) back(); });

function detailHTML(p) {
  const P = p.p, f = photo(p), apps = P.apps || [];
  const onsite = p.s.onsite ? ['timer', 'Время на месте', p.s.onsite] : ['wallet', 'Вход', p.s.entry || '—'];
  const months = p.m || [];
  return `
  <div class="edgefx"></div><div class="compact-wrap"><div class="compact"><button class="glassbtn" data-back aria-label="Назад">${I('back')}</button><b class="ttl">${esc(p.name)}</b>${heartBtn(p, 'glassbtn')}
    <div class="secnav">${[['ov', 'Обзор'], ['route', 'Дорога'], ['imp', 'Важно'], ['stay', 'Ночлег'], ['site', 'На месте'], ['src', 'Проверка']].map(([k, n]) => `<button data-jump="${k}">${n}</button>`).join('')}</div></div></div>
  <div class="sc">
  <div class="hero">
    ${f ? `<div class="slides">${p.photos.map((x, i) => `<img src="${x.f}" alt="${esc(x.cap || p.name)}" data-view="${i}" ${i ? 'loading="lazy"' : ''}>`).join('')}</div>` : `<div class="mapbg" id="heroMap"></div>`}
    <div class="shade"></div>
    <div class="topbtns"><button class="glassbtn" data-back aria-label="Назад">${I('back')}</button><div style="display:flex;gap:12px"><button class="glassbtn" data-share aria-label="Поделиться">${I('share')}</button>${heartBtn(p, 'glassbtn')}</div></div>
    <div class="hero-info"><div class="l"><div class="hrow">
      ${p.rating ? `<span class="pill">${p.rating.v} ★ <span style="font-weight:500;color:#555">${esc(p.rating.src)}</span></span>` : `<span class="pill">${I('shield').replace('class="ic', 'style="width:14px;height:14px" class="ic')} Проверено</span>`}${p.photos.length > 1 ? `<div class="dots">${p.photos.map((x, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>
      <h1>${esc(p.name)}</h1><div class="loc">${I('pin')}${esc(p.c === 'kg' ? locLine(p) : (p.dist || 'Республика Алтай'))}</div></div>
      ${p.ll ? `<button class="mapthumb" data-jump="route" aria-label="Маршрут">${miniMapSVG(p)}</button>` : ''}</div>
  </div>
  <div class="infogrid">
    <div class="it"><span class="ibub">${I('checks')}</span><div class="tx"><b>Сложность</b><span>${esc(p.s.diff)}</span></div></div>
    <div class="it"><span class="ibub">${I('cal')}</span><div class="tx"><b>Когда</b><span>${esc(p.s.when)}</span></div></div>
    <div class="it"><span class="ibub">${I(accIcon(p.s.acc))}</span><div class="tx"><b>Доступ</b><span>${esc(p.s.acc)}</span></div></div>
    <div class="it"><span class="ibub">${I(onsite[0])}</span><div class="tx"><b>${onsite[1]}</b><span>${esc(onsite[2])}</span></div></div>
  </div>
  <section class="dark-sec dark" id="ov">
    <div class="sec-head"><h2 class="h-sec">Почему стоит приехать</h2></div>
    <div class="leadtxt">${rich(lead(p.guide || p.short, 3))}</div>
    ${sentences(p.guide).length > 3 ? `<button class="readmore light" data-read="guide">Читать полностью ${I('chev')}</button>` : ''}
  </section>
  <div class="white">
    <div style="padding-top:22px"></div>
    ${p.guide ? `<button class="audiobar" data-audio><span class="prog"></span><span class="pl">${I('play')}</span><span class="t">Послушать VOYZ-гид</span><span class="wave"><i></i><i></i><i></i><i></i></span><span class="d">${audioLen(p.guide, p.id)}</span></button>` : ''}
    ${keyFactsHTML(p)}
    ${mediaHTML(p)}
    <section class="sec" id="route">${secHead('Как добраться')}
      ${P.sum ? `<p class="lead2">${rich(lead(P.sum, 2))}</p>` : ''}
      ${apps.length > 1 ? `<div class="apps">${apps.map((a, i) => `<button data-app="${i}" class="${i ? '' : 'on'}">${a.rec ? '<span class="rec">Рекомендуем</span>' : ''}<b>${esc(a.title)}</b><span>${esc(cut(a.time, 40) || cut(a.km, 40))}</span></button>`).join('')}</div>` : ''}
      ${p.ll ? `<div class="routemap"><div id="rmap" style="position:absolute;inset:0"></div>
        <div class="legend"><div><i></i>по трассе</div><div><i class="d"></i>подъезд</div><div><i class="t"></i>тропа</div></div>
        <button class="fab ${S.trip.includes(p.id) ? 'on' : ''}" data-trip="${p.id}" aria-label="Добавить в маршрут">${I('plus')}</button></div>` : ''}
      <div id="appBody">${apps.length ? approachHTML(p, apps[0]) : `<p class="lead2">${rich(lead(p.how, 3))}</p>`}</div>
      <button class="readmore" data-read="how">Как добраться — подробно ${I('chev')}</button>
      ${transportHTML(P.transport)}
    </section>
    <div class="want"><div class="hd"><span class="ibub">${I('mountain')}</span><h3>Хочешь сюда?</h3></div>
      <p>Посмотрите туры и трансферы или добавьте место в свой маршрут.</p>
      <button class="btn lime" data-tours>Туры и трансферы</button><button class="btn grey" data-trip="${p.id}">${S.trip.includes(p.id) ? 'Уже в маршруте ✓' : 'Добавить в маршрут'}</button></div>
    <section class="sec">${secHead('Когда ехать')}
      ${months.length ? `<div class="months">${MSHORT.map((m, i) => `<i class="${months.includes(i + 1) ? 'on' : ''} ${i + 1 === CUR_M ? 'now' : ''}">${m}</i>`).join('')}</div>` : ''}
      <p class="lead2">${rich(lead(P.season || p.when, 1))}</p>
      <button class="readmore" data-read="season">Сезон, время суток, режим работы ${I('chev')}</button>
    </section>
    ${bringHTML(p)}
    ${importantHTML(p)}
    <div id="stay"></div>${staysHTML(P.stays, p)}
    ${foodHTML(p)}
    ${hikesHTML(p) || '<div id="site"></div>'}
    ${usefulHTML(p)}
    ${nearbyHTML(p)}
    ${trustHTML(p)}
    <div class="change"><h3>Заметили изменения?</h3><p>Помогите другим путешественникам — отметьте, что поменялось на месте</p>
      <div class="chips">${['изменилась цена', 'дорога закрыта', 'предупреждение', 'другое'].map(t => `<button class="chip" data-chg>${t}</button>`).join('')}</div><button class="btn black" data-send>Отправить</button></div>
    <div class="footer">${WM()}<p>Больше, чем просто поездки</p></div>
  </div></div>`;
}
function miniMapSVG(p) {
  // tiny stylised map: route from hub to place
  const a = (p.p.apps || []).find(x => x.rt && x.rt.road) || null; let pts = a ? a.rt.road.slice() : [];
  if (a) pts = [a.rt.hc, ...pts, a.rt.pc || a.rt.tc || p.ll]; else pts = [p.ll];
  const lats = pts.map(x => x[0]), lons = pts.map(x => x[1]); let [mi, ma, mo, mx] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const span = Math.max(ma - mi, mx - mo, .05); const cx = (mo + mx) / 2, cy = (mi + ma) / 2;
  const X = lo => 32 + (lo - cx) / span * 46, Y = la => 32 - (la - cy) / span * 46;
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[1]).toFixed(1)},${Y(q[0]).toFixed(1)}`).join('');
  const e = pts[pts.length - 1];
  return `<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#DEEAD2"/><path d="M0 44 C14 40 22 50 34 46 S54 36 64 40" stroke="#A9D2F3" stroke-width="5" fill="none"/><path d="M-4 20 L70 30" stroke="#fff" stroke-width="2"/>
    ${pts.length > 1 ? `<path d="${d}" stroke="#000" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".18"/><path d="${d}" stroke="#1d8a34" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    <circle cx="${X(e[1])}" cy="${Y(e[0])}" r="5" fill="#D8FC00" stroke="#000" stroke-width="2"/></svg>`;
}
const AUD = (window.VOYZ_AUDIO && window.VOYZ_AUDIO.dur) || {};
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const audioLen = (t, id) => AUD[id] ? mmss(AUD[id]) : mmss(Math.round(String(t).split(/\s+/).length / 2.3));
function mediaHTML(p) {
  const ph = p.photos || [], vids = p.videos || [];
  if (!ph.length && !vids.length) return '';
  const tiles = []; const ytid = u => (String(u).match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) || [])[1];
  ph.slice(0, 3).forEach((x, i) => tiles.push(`<button data-view="${i}"><img src="${i ? x.t : x.f}" alt="${esc(x.cap || p.name)}" loading="lazy">${i === 2 && ph.length > 3 ? `<span class="cnt">+${ph.length - 3}</span>` : ''}</button>`));
  vids.slice(0, Math.max(0, 3 - tiles.length)).forEach(vd => { const id = ytid(vd.u);
    tiles.push(`<a class="vtile" href="${esc(vd.u)}" target="_blank" rel="noopener noreferrer">${id ? `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" onerror="this.remove()" style="position:absolute;inset:0">` : ''}<span class="play">${I('play')}</span><span class="vt">${esc(cut(vd.t, 60))}</span></a>`); });
  return `<section class="sec">${secHead('Медиа', 'Смотреть все', 'media')}
    <div class="media" style="${tiles.length === 1 ? 'grid-template-columns:1fr' : ''}">${tiles.join('')}</div>
    ${vids.length ? `<div class="linkrow">${vids.slice(0, 4).map(vd => `<a href="${esc(vd.u)}" target="_blank" rel="noopener noreferrer">${I('play')}${esc(cut(vd.t, 34))}</a>`).join('')}</div>` : ''}</section>`;
}
function approachHTML(p, a) {
  const stats = [a.time && ['timer', cut(a.time, 34)], a.km && ['route', cut(a.km, 30) + (/км/.test(a.km) ? '' : ' км')], a.vehicle && [accIcon(a.vehicle === 'седан' ? 'car' : a.vehicle), a.vehicle]].filter(Boolean);
  const steps = [];
  steps.push(['s', '1', 'Старт: ' + (a.rt ? a.rt.hub : (a.from || 'город')), a.from && a.rt && a.from !== a.rt.hub ? a.from : '']);
  steps.push(['', '2', 'Дорога', [a.route, a.surface].filter(Boolean).join('. ')]);
  if (a.last) steps.push(['', '3', 'Последние заправки и магазины', a.last]);
  if (a.parking && (a.parking.d || a.parking.price)) steps.push(['p', 'P', 'Парковка', [a.parking.d, a.parking.price && 'Цена: ' + a.parking.price].filter(Boolean).join('. ')]);
  if (a.trail && a.trail.d) steps.push(['', '↟', 'Начало тропы', a.trail.d]);
  steps.push(['f', '★', p.name, a.season ? 'Сезон для этого пути: ' + a.season : '']);
  const d = dest(p, a);
  return `<div class="route-title">${esc(a.title)}</div>
    <div class="stats">${stats.map(([ic, t]) => `<span class="chip">${I(ic)}${esc(t)}</span>`).join('')}</div>
    <ol class="steps">${steps.map(([k, n, b, t]) => `<li ${t && t.length > 140 ? 'data-step' : ''}><span class="n ${k}">${n}</span><b>${esc(b)}</b>${t ? `<p class="${t.length > 140 ? 'clamp' : ''}" style="--lines:3">${rich(t)}</p>` : ''}${t && t.length > 140 ? '<span class="more2">ещё</span>' : ''}</li>`).join('')}</ol>
    ${a.haz ? `<div class="haz">${I('warn')}<div>${rich(a.haz)}</div></div>` : ''}
    ${d ? `<div class="sec-head left" style="margin:20px 0 10px"><b style="font-size:15px">Открыть в навигаторе</b></div><div class="navbtns">
      <a href="https://yandex.ru/maps/?rtext=~${d[0]},${d[1]}&rtt=auto" target="_blank" rel="noopener"><span class="lg" style="background:#FC3F1D">Я</span>Яндекс Карты</a>
      <a href="https://2gis.ru/routeSearch/rsType/car/to/${d[1]},${d[0]}" target="_blank" rel="noopener"><span class="lg" style="background:#19AA1E">2</span>2ГИС</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${d[0]},${d[1]}" target="_blank" rel="noopener"><span class="lg" style="background:#4285F4">G</span>Google Maps</a>
      <a href="geo:${d[0]},${d[1]}?q=${d[0]},${d[1]}(${encodeURIComponent(p.name)})"><span class="lg" style="background:#000;color:#D8FC00">◎</span>Другое приложение</a></div>
      <p class="small muted" style="margin:8px 0 0">${a.rt && (a.rt.pc || a.rt.tc) ? 'Точка — парковка или начало тропы' : 'Точка — координаты места'}: ${d[0].toFixed(5)}, ${d[1].toFixed(5)}</p>` : ''}
    ${a.src ? `<p class="small muted" style="margin:8px 0 0">Источник: ${linkify(a.src)}</p>` : ''}`;
}
function transportHTML(T) {
  if (!T || !T.length) return '';
  return `<div class="sec-head left" style="margin:28px 0 12px"><b style="font-size:18px;font-weight:600">Транспорт и перевозчики</b><span class="more">${T.length}</span></div>
  <div class="rail">${T.map(t => { const ct = String(t.contact || ''); const tel = (ct.match(/\+?\d[\d\s()-]{8,}\d/) || [])[0]; const url = (ct.match(/https?:\/\/\S+/) || [])[0] || (/^https?:/.test(t.src || '') ? t.src : '');
    return `<div class="tcard"><div class="tile">${I(modeIcon(t.mode))}</div><div class="tx"><b>${esc(t.provider || t.mode)}</b><div class="s">${esc(t.mode)}${t.from ? ' · ' + esc(t.from) : ''}</div><div class="pr">${esc(cut(t.price, 70) || cut(t.details, 70))}</div>
      ${tel ? `<a class="act" href="tel:${tel.replace(/[^\d+]/g, '')}">Связаться</a>` : url ? `<a class="act ${/^https?:/.test(ct) ? '' : 'g'}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${/^https?:/.test(ct) ? 'Сайт' : 'Источник'}</a>` : ''}</div></div>`; }).join('')}</div>`;
}
function bringHTML(p) {
  const items = String(p.bring || '').split(/[,;]\s+(?![^()]*\))/).map(s => s.replace(/\(.*?\)/g, '').trim()).filter(s => s && s.length < 40).slice(0, 8);
  if (!items.length) return '';
  return `<section class="sec">${secHead('Лучше взять с собой')}<div class="chips">${items.map(t => `<span class="chip">${I(bringIcon(t))}${esc(t.charAt(0).toUpperCase() + t.slice(1))}</span>`).join('')}</div></section>`;
}
function importantHTML(p) {
  const P = p.p; const parts = [];
  if (p.warn) parts.push(p.warn); if (P.permits && !/^не нужн/i.test(P.permits)) parts.push('Разрешения: ' + P.permits);
  if (!parts.length) return '<div id="imp"></div>';
  const items = sentences(parts.join(' '));
  return `<div class="important" id="imp"><h3>${I('warn')}Важно</h3><div class="list">${items.slice(0, 3).map(t => `<p>${rich(cut(t, 160))}</p>`).join('')}</div>${items.length > 3 ? `<button class="readmore light" data-read="warn">Ещё ${items.length - 3} ${plural(items.length - 3, 'пункт', 'пункта', 'пунктов')} ${I('chev')}</button>` : ''}</div>`;
}
function staysHTML(st, p) {
  if (!st || !st.length) return p.stay ? `<section class="sec">${secHead('Где остановиться')}<p class="lead2">${rich(lead(p.stay, 2))}</p><button class="readmore" data-read="stay">Подробнее ${I('chev')}</button></section>` : '';
  return `<section class="sec">${secHead('Где остановиться')}<div class="rail">${st.map(s => { const ct = String(s.contact || ''); const tel = (ct.match(/\+?\d[\d\s()-]{8,}\d/) || [])[0]; const url = (ct.match(/https?:\/\/\S+/) || [])[0] || (/^https?:/.test(s.src || '') ? s.src : '');
    return `<div class="tcard"><div class="tile">${I(/юрт|палат|кемп|лагер/i.test(s.type || '') ? 'tent' : 'bed')}</div><div class="tx"><b>${esc(s.name)}</b><div class="s">${esc(s.type || '')}${s.where ? ' · ' + esc(s.where) : ''}</div><div class="pr">${esc(cut(s.price, 60))}${s.season ? ' · ' + esc(s.season) : ''}</div>
      ${tel ? `<a class="act" href="tel:${tel.replace(/[^\d+]/g, '')}">Связаться</a>` : url ? `<a class="act g" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Подробнее</a>` : ''}</div></div>`; }).join('')}</div>
    ${p.stay ? `<button class="readmore" data-read="stay">Все варианты ночлега ${I('chev')}</button>` : ''}</section>`;
}
function foodHTML(p) {
  const F = p.p.food || []; if (!F.length && !p.food) return '';
  return `<section class="sec">${secHead('Что попробовать')}${p.food ? `<p class="lead2" style="text-align:center">${rich(lead(p.food, 1))}</p>` : ''}
    ${F.length ? `<div class="rail" style="margin-top:6px">${F.map(x => `<div class="foodcard"><b>${esc(x.name)}</b><div class="s">${I('pin').replace('class="ic', 'style="width:12px;height:12px;vertical-align:-1px" class="ic')} ${esc(x.where || '')}</div><p>${linkify(cut(x.details, 160))}</p><span class="arrowdot">${I('food')}</span></div>`).join('')}</div>` : ''}</section>`;
}
function onsiteHTML(p) {
  const O = p.p.onsite || {}, hikes = O.hikes || [], horses = O.horses || [], other = O.other || [], rent = p.p.rent || [], svc = p.p.svc || {};
  if (!hikes.length && !horses.length && !other.length && !rent.length && !Object.keys(svc).length) return '';
  const SV = [['toilets', 'toilet', 'Туалет'], ['water', 'drop', 'Вода'], ['shop', 'shop', 'Магазин'], ['atm', 'atm', 'Банкомат'], ['fuel', 'fuel', 'Заправка'], ['mobile', 'signal', 'Связь'], ['medical', 'med', 'Медицина'], ['rescue', 'sos', 'Спасатели']];
  return `<section class="sec">${secHead('На месте')}
    ${hikes.map(h => `<div class="hike"><b>${esc(h.name)}</b><div class="r">${linkify(h.route)}</div><div class="kv">${h.km ? `<span class="l">${esc(h.km)} км</span>` : ''}${h.gain_m ? `<span>↑ ${esc(h.gain_m)} м</span>` : ''}${h.time ? `<span>${esc(h.time)}</span>` : ''}${h.difficulty ? `<span>${esc(h.difficulty)}</span>` : ''}${h.marked ? `<span>маркировка: ${esc(cut(h.marked, 24))}</span>` : ''}</div></div>`).join('')}
    ${horses.length ? `<div class="sec-head left" style="margin:18px 0 10px"><b style="font-size:16px">${I('horse')} Верхом</b></div>${horses.map(h => `<div class="iti"><b>${esc(h.where || h.name || 'Аренда лошадей')}</b><p>${linkify([h.details, h.price, h.contact].filter(Boolean).join(' · '))}</p></div>`).join('')}` : ''}
    ${other.length ? `<div class="sec-head left" style="margin:18px 0 10px"><b style="font-size:16px">Чем ещё заняться</b></div>${other.map(h => `<div class="iti"><b>${esc(h.activity || h.name)}</b><p>${linkify(h.details || '')}</p></div>`).join('')}` : ''}
    ${rent.length ? `<div class="sec-head left" style="margin:18px 0 10px"><b style="font-size:16px">Прокат и снаряжение</b></div>${rent.map(r => `<div class="iti"><b>${esc(r.what)}</b><p>${linkify([r.where, r.price].filter(Boolean).join(' · '))}</p></div>`).join('')}` : ''}
    ${Object.keys(svc).length ? `<div class="sec-head left" style="margin:18px 0 10px"><b style="font-size:16px">Инфраструктура</b></div><div class="svcgrid">${SV.filter(([k]) => svc[k]).map(([k, ic, n]) => `<div class="svc"><div class="h">${I(ic)}${n}</div>${linkify(cut(svc[k], 120))}</div>`).join('')}</div>` : ''}
    ${p.p.access ? `<div class="haz" style="margin-top:12px">${I('user')}<div><b>Доступность.</b> ${linkify(p.p.access)}</div></div>` : ''}
  </section>`;
}
function budgetHTML(b) { if (!b || (!b.economy && !b.comfort)) return '';
  return `<section class="sec">${secHead('Бюджет')}<div class="budget">${b.economy ? `<div class="b"><b>Эконом</b><p>${linkify(b.economy)}</p></div>` : ''}${b.comfort ? `<div class="b c"><b style="color:var(--lime)">Комфорт</b><p>${linkify(b.comfort)}</p></div>` : ''}</div>${b.year ? `<p class="small muted" style="margin-top:8px">Цены: ${esc(b.year)}</p>` : ''}</section>`; }
function itiHTML(it) { if (!it || !it.length) return ''; return `<section class="sec">${secHead('Готовые планы')}${it.map(x => `<div class="iti"><b>${esc(x.title)}</b><p>${linkify(x.plan)}</p></div>`).join('')}</section>`; }
function nearbyHTML(p) {
  const n = (p.nearby || []).filter(x => BY[x.id]).slice(0, 4); if (!n.length) return '';
  return `<section class="sec">${secHead('Рядом', 'Показать на карте', 'nearmap')}${n.map(x => rowCard(BY[x.id], `≈ ${fmtKm(x.km)} км по прямой · ${BY[x.id].cat}`)).join('')}</section>`;
}
function reviewsHTML(p) {
  if (!p.reviews) return '';
  const plats = [...String(p.reviews).matchAll(/(Google(?: Maps)?|TripAdvisor|Яндекс(?: Карты)?|2ГИС|2GIS|Booking|Tripster)[^:]{0,12}:\s*(\d[,.]\d+)(?:\/5)?,?\s*([\d\s ]*)\s*(оцен\w*|отзыв\w*)?/g)].slice(0, 4);
  const rest = String(p.reviews).replace(/^[^.]*?(\d[,.]\d[^.]*\.\s*)+/, '');
  return `<section class="sec reviews">${secHead('Что говорят путешественники')}
    ${plats.length ? `<div class="plat">${plats.map(m => `<span>${m[2].replace('.', ',')} ★ <em>${esc(m[1].replace(' Maps', '').replace(' Карты', ''))}${m[3] && m[3].trim() ? ' · ' + esc(m[3].trim()) : ''}</em></span>`).join('')}</div>` : ''}
    <div class="exp"><div class="body cl" style="--mh:140px"><blockquote>${linkify(rest || p.reviews)}</blockquote></div><button class="readmore" data-exp>Читать полностью ${I('chev')}</button></div>
    <p class="small muted">Сводка отзывов с открытых платформ, даты — в тексте.</p></section>`;
}
function trustHTML(p) {
  const C = 2 * Math.PI * 38; const idx = p.idx || 0; const src = [...(p.src || []), ...(p.p.src || [])]; const seen = new Set(); const uniq = src.filter(s => s && s.url && !seen.has(s.url) && seen.add(s.url));
  return `<section class="sec" id="src">${secHead('Проверка и источники')}
    <div class="trust"><div class="gauge"><svg viewBox="0 0 86 86"><circle class="bg" cx="43" cy="43" r="38"/><circle class="fg" cx="43" cy="43" r="38" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - idx / 100)}"/></svg><b>${idx}</b></div>
      <div class="bars"><div class="row"><span>Подтверждено полей</span><b>${p.conf || 0}/34</b></div><div class="bar"><i data-w="${(p.conf || 0) / 34 * 100}"></i></div>
      <div class="row"><span>Насыщенность</span><b>${p.rich || 0}/10</b></div><div class="bar"><i data-w="${(p.rich || 0) * 10}"></i></div>
      <div class="row"><span>Практика: дорога, ночлег</span><b>${p.prac || 0}/10</b></div><div class="bar"><i data-w="${(p.prac || 0) * 10}"></i></div></div></div>
    <p class="small muted" style="margin:10px 0 0">Индекс полноты 0–100. ${p.rank ? `№${p.rank} из ${cur().length} в разделе «${cname(p.c)}».` : ''}</p>
    <button class="readmore" data-read="src">Источники, спорные моменты, что не подтверждено ${I('chev')}</button>
  </section>`;
}

/* ---------- readability helpers ---------- */
const NUMRX = /((?:≈|~|около |до |от )?\d[\d\s.,]*(?:\s?[–—-]\s?\d[\d\s.,]*)?\s?(?:км|м(?![а-яё])|ч(?![а-яё])|час[а-яё]*|мин[а-яё]*|сом[а-яё]*|руб[а-яё]*|₽|\$|°C|%|дн[а-яё]*|ноч[а-яё]*|чел[а-яё]*))/gi;
const rich = t => linkify(t).split(/(<a [^>]*>.*?<\/a>)/).map((seg, i) => i % 2 ? seg : seg.replace(NUMRX, '<b class="num">$1</b>')).join('');
const sentences = t => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+(?=[А-ЯЁA-Z«"(0-9])/).filter(Boolean);
const lead = (t, n = 2) => sentences(t).slice(0, n).join(' ');
const richParas = t => String(t || '').split(/\n+/).filter(Boolean).map(x => `<p>${rich(x)}</p>`).join('');
const firstClause = (t, n = 90) => { const x = sentences(t)[0] || ''; return cut(x.replace(/\s*\([^)]*\)/g, ''), n); };
function keyFactsHTML(p) {
  const F = [];
  const tt = firstClause(p.traveltime, 80); if (tt) F.push(['car', 'Дорога', tt]);
  if (p.entry) F.push(['wallet', 'Вход', firstClause(p.entry, 80)]);
  if (p.daytime) F.push(['sun', 'Лучшее время', firstClause(p.daytime, 80)]);
  if (p.net) F.push(['signal', 'Связь', firstClause(p.net, 80)]);
  if (p.stay) F.push(['bed', 'Ночлег', firstClause(p.stay, 80)]);
  if (p.warn) F.push(['warn', 'Осторожно', firstClause(p.warn, 90)]);
  if (!F.length) return '';
  return `<section class="sec" style="padding-top:26px"><div class="keyfacts">${F.slice(0, 6).map(([ic, k, v]) => `<div class="kf"><span class="kfi">${I(ic)}</span><div><b>${k}</b><span>${rich(v)}</span></div></div>`).join('')}</div></section>`;
}
function hikesHTML(p) {
  const H = (p.p.onsite || {}).hikes || []; if (!H.length) return '';
  return `<section class="sec" id="site">${secHead('Прогулки и тропы')}${H.slice(0, 3).map(h => `<div class="hike"><b>${esc(h.name)}</b><div class="r clamp" style="--lines:2">${esc(h.route)}</div><div class="kv">${h.km ? `<span class="l">${esc(h.km)} км</span>` : ''}${h.gain_m ? `<span>↑ ${esc(cut(h.gain_m, 18))} м</span>` : ''}${h.time ? `<span>${esc(cut(h.time, 18))}</span>` : ''}${h.difficulty ? `<span>${esc(h.difficulty)}</span>` : ''}</div></div>`).join('')}
    ${H.length > 3 ? `<button class="readmore" data-read="hikes">Все тропы (${H.length}) ${I('chev')}</button>` : ''}</section>`;
}
const SV = [['toilets', 'toilet', 'Туалет'], ['water', 'drop', 'Вода'], ['shop', 'shop', 'Магазин'], ['atm', 'atm', 'Банкомат'], ['fuel', 'fuel', 'Заправка'], ['mobile', 'signal', 'Связь'], ['medical', 'med', 'Медицина'], ['rescue', 'sos', 'Спасатели']];
function readers(p) {
  const P = p.p, O = P.onsite || {}, R = {};
  const src = [...(p.src || []), ...(P.src || [])]; const seen = new Set(); const uniq = src.filter(x => x && x.url && !seen.has(x.url) && seen.add(x.url));
  if (p.guide) R.guide = ['Почему стоит приехать', 'mountain', lead(p.guide, 1), richParas(p.guide)];
  if (p.desc) R.about = ['Подробнее о месте', 'info', lead(p.desc, 1), richParas(p.desc) + (p.see ? `<h4>Что посмотреть</h4><p>${rich(p.see)}</p>` : '') + (p.skip ? `<h4>Можно пропустить, если</h4><p>${rich(p.skip)}</p>` : '') + (p.elev ? `<h4>Высота</h4><p>${rich(p.elev)}</p>` : '')];
  if (P.sum || p.how) R.how = ['Как добраться — подробно', 'route', '', richParas(P.sum) + (p.how ? `<h4>Коротко из карточки</h4><p>${rich(p.how)}</p>` : '') + (p.roadtype ? `<h4>Дорога</h4><p>${rich(p.roadtype)}</p>` : '') + (p.traveltime ? `<h4>Время в пути</h4><p>${rich(p.traveltime)}</p>` : '') + (p.transfer ? `<h4>Трансфер</h4><p>${rich(p.transfer)}</p>` : '')];
  if (P.season || p.when) R.season = ['Когда ехать', 'cal', '', `<p>${rich(P.season || p.when)}</p>` + (p.daytime ? `<h4>Лучшее время суток</h4><p>${rich(p.daytime)}</p>` : '') + (p.hours ? `<h4>Режим работы</h4><p>${rich(p.hours)}</p>` : '')];
  const warnItems = [p.warn, P.permits && !/^не нужн/i.test(P.permits) ? 'Разрешения: ' + P.permits : ''].filter(Boolean).join(' ');
  if (warnItems) R.warn = ['Важно знать', 'warn', '', `<ul>${sentences(warnItems).map(x => `<li>${rich(x)}</li>`).join('')}</ul>`];
  if (p.stay) R.stay = ['Ночлег — подробно', 'bed', lead(p.stay, 1), `<p>${rich(p.stay)}</p>`];
  if (Object.keys(P.svc || {}).length) R.svc = ['Инфраструктура', 'shop', SV.filter(([k]) => P.svc[k]).map(x => x[2]).join(', '), `<div class="svcgrid">${SV.filter(([k]) => P.svc[k]).map(([k, ic, n]) => `<div class="svc"><div class="h">${I(ic)}${n}</div>${rich(P.svc[k])}</div>`).join('')}</div>`];
  if ((O.horses || []).length) R.horses = ['Верхом', 'horse', `${O.horses.length} ${plural(O.horses.length, 'вариант', 'варианта', 'вариантов')}`, O.horses.map(h => `<h4>${esc(h.where || h.name || 'Аренда лошадей')}</h4><p>${rich([h.details, h.price, h.contact].filter(Boolean).join(' · '))}</p>`).join('')];
  if ((O.other || []).length) R.other = ['Чем ещё заняться', 'sparkle', O.other.map(x => x.activity || x.name).slice(0, 3).join(', '), O.other.map(h => `<h4>${esc(h.activity || h.name)}</h4><p>${rich(h.details || '')}</p>`).join('')];
  if ((P.rent || []).length) R.rent = ['Прокат и снаряжение', 'tent', P.rent.map(r => r.what).slice(0, 2).join(', '), P.rent.map(r => `<h4>${esc(r.what)}</h4><p>${rich([r.where, r.price].filter(Boolean).join(' · '))}</p>`).join('')];
  const b = P.budget || {}; if (b.economy || b.comfort) R.budget = ['Бюджет', 'wallet', firstClause(b.economy || b.comfort, 60), budgetHTML(b).replace(/<section[^>]*>|<\/section>|<div class="sec-head[^]*?<\/div>/, '')];
  if ((P.iti || []).length) R.iti = ['Готовые планы', 'list', P.iti.map(x => x.title).slice(0, 2).join(', '), P.iti.map(x => `<h4>${esc(x.title)}</h4><p>${rich(x.plan)}</p>`).join('')];
  if (P.access) R.access = ['Доступность: дети, пожилые, собаки', 'user', firstClause(P.access, 60), `<p>${rich(P.access)}</p>`];
  if (p.reviews) R.reviews = ['Что говорят путешественники', 'star', firstClause(p.reviews, 60), `<p>${rich(p.reviews)}</p><p class="small muted">Сводка отзывов с открытых платформ, даты указаны в тексте.</p>`];
  if ((O.hikes || []).length) R.hikes = ['Все тропы', 'walk', '', O.hikes.map(h => `<h4>${esc(h.name)}</h4><p>${rich(h.route)}</p><p class="small">${[h.km && h.km + ' км', h.gain_m && '↑ ' + h.gain_m + ' м', h.time, h.difficulty, h.marked && 'маркировка: ' + h.marked].filter(Boolean).map(esc).join(' · ')}</p>`).join('')];
  R.src = ['Источники и проверка', 'shield', `${uniq.length} ${plural(uniq.length, 'источник', 'источника', 'источников')}`, (p.checked ? `<p>${rich(p.checked)}</p>` : '') + (p.flags.length ? `<h4>Спорные моменты</h4><ul>${p.flags.map(x => `<li>${rich(x)}</li>`).join('')}</ul>` : '') + ((P.gaps || []).length ? `<h4>Пока не подтверждено</h4><ul>${P.gaps.map(x => `<li>${rich(x)}</li>`).join('')}</ul>` : '') + `<h4>Источники</h4><div class="srcs">${uniq.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${I('link')}<div>${esc(x.title || x.url)}<span>${esc(x.used_for || x.note || '')}</span></div></a>`).join('')}</div>`];
  return R;
}
function usefulHTML(p) {
  const R = readers(p); const keys = ['about', 'other', 'horses', 'rent', 'svc', 'budget', 'iti', 'access', 'reviews'].filter(k => R[k]);
  if (!keys.length) return '';
  return `<section class="sec">${secHead('Полезное')}<div class="glist">${keys.map(k => `<button class="grow" data-read="${k}"><span class="gi">${I(R[k][1])}</span><span class="gt"><b>${esc(R[k][0])}</b>${R[k][2] ? `<span>${esc(cut(R[k][2], 70))}</span>` : ''}</span>${I('chev')}</button>`).join('')}</div></section>`;
}
function openReader(p, key) {
  const R = readers(p)[key]; if (!R) return;
  const sh = sheet(`<div class="reader"><div class="rk">${esc(p.name)}</div><h3>${esc(R[0])}</h3>${key === 'guide' && AUD[p.id] ? `<button class="chip lime" data-rplay>${I('play')}Послушать · ${audioLen(p.guide, p.id)}</button>` : ''}${R[3]}</div>`);
  sh.classList.add('tall');
  const pb = $('[data-rplay]', sh); if (pb) pb.onclick = () => { closeSheet(); const v = STACK[STACK.length - 1]; v && toggleAudio(v, p); };
}

/* ---------- detail wiring ---------- */
function wireDetail(v, p) {
  const P = p.p; let rmap = null, rlayer = null, ai = 0; const sc = $('.sc', v);
  v.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-back]')) { try { history.back(); } catch (er) { back(); } return; }
    if (t.closest('[data-share]')) { const txt = `${p.name} — ${cut(p.short, 140)}`; if (navigator.share) navigator.share({ title: p.name, text: txt }).catch(() => {}); else { try { navigator.clipboard.writeText(txt); toast('Описание скопировано', 'share'); } catch (er) { toast('Не удалось поделиться', 'share'); } } return; }
    const rd = t.closest('[data-read]'); if (rd) { openReader(p, rd.dataset.read); return; }
    const stp = t.closest('[data-step]'); if (stp && !t.closest('a')) { stp.classList.toggle('open'); return; }
    const ex = t.closest('[data-exp]'); if (ex) { const box = ex.parentElement; box.classList.toggle('open'); ex.firstChild.textContent = box.classList.contains('open') ? 'Свернуть ' : (ex.dataset.label || ex.firstChild.textContent); return; }
    const j = t.closest('[data-jump]'); if (j) { const el = $('#' + j.dataset.jump, v); if (el) sc.scrollTo({ top: el.offsetTop + (el.closest('.white') ? el.closest('.white').offsetTop : 0) - 110, behavior: 'smooth' }); return; }
    const ap = t.closest('[data-app]'); if (ap) { ai = +ap.dataset.app; $$('[data-app]', v).forEach(b => b.classList.toggle('on', b === ap)); const body = $('#appBody', v); body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).onfinish = () => { body.innerHTML = approachHTML(p, P.apps[ai]); body.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' }); }; drawApproach(); haptic(); return; }
    const vw = t.closest('[data-view]'); if (vw) { viewer(p, +vw.dataset.view); return; }
    if (t.closest('[data-act="media"]')) { viewer(p, 0); return; }
    if (t.closest('[data-act="nearmap"]')) { showOnMap(p.id); return; }
    const ab = t.closest('[data-audio]'); if (ab) { if (ab._dragged) { ab._dragged = false; return; } toggleAudio(v, p); return; }
    if (t.closest('[data-tours]')) { toursSheet(p); return; }
    const cg = t.closest('[data-chg]'); if (cg) { cg.classList.toggle('on'); return; }
    if (t.closest('[data-send]')) { const sel = $$('[data-chg].on', v).map(x => x.textContent); if (!sel.length) return toast('Выберите, что изменилось', 'info'); $$('[data-chg]', v).forEach(x => x.classList.remove('on')); toast('Спасибо! Отметка сохранена', 'check'); return; }
  });
  $$('[data-exp]', v).forEach(b => b.dataset.label = b.firstChild.textContent);
  // drag along the audio bar to seek (recorded audio)
  const abar = $('[data-audio]', v); if (abar) { let sx0 = null;
    abar.addEventListener('pointerdown', e => { sx0 = e.clientX; }, { passive: true });
    abar.addEventListener('pointermove', e => { if (sx0 == null || !v._rec || !v._rec.duration || Math.abs(e.clientX - sx0) < 12) return; abar._dragged = true; const r = abar.getBoundingClientRect(); v._rec.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v._rec.duration; }, { passive: true });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => abar.addEventListener(ev, () => { sx0 = null; })); }
  // hero slides dots
  const sl = $('.slides', v); if (sl) sl.addEventListener('scroll', () => { const i = Math.round(sl.scrollLeft / sl.clientWidth); $$('.dots i', v).forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
  if (!photo(p) && p.ll) setTimeout(() => { const hm = baseMap($('#heroMap', v), { dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false, attributionControl: false }); hm.setView(p.ll, 8); L.marker(p.ll, { icon: L.divIcon({ className: '', html: '<div class="rmark f">★</div>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(hm); }, 60);
  // scroll effects
  const hero = $('.hero', v), cw = $('.compact-wrap', v), cpt = $('.compact', v), white = $('.white', v), slides = $('.slides, .mapbg', v);
  const secs = ['ov', 'route', 'stay', 'site', 'imp', 'src'];
  const nav = $('.secnav', v);
  sc.addEventListener('scroll', () => {
    const y = sc.scrollTop; if (slides) slides.style.transform = `translateY(${y * .35}px) scale(${1 + Math.min(y, 400) / 2000})`;
    cw.classList.toggle('show', y > hero.offsetHeight - 90);
    const light = y > white.offsetTop - 60; cpt.classList.toggle('light', light); statusDark(light);
    const ef = $('.edgefx', v); if (ef) { ef.classList.toggle('show', y > hero.offsetHeight - 90); ef.classList.toggle('light', light); ef.classList.toggle('dark', !light); }
    let on = 'ov'; secs.forEach(s => { const el = $('#' + s, v); if (!el) return; const top = el.offsetTop + (el.closest('.white') ? white.offsetTop : 0); if (top - 140 <= y) on = s; });
    $$('.secnav button', v).forEach(b => { const a = b.dataset.jump === on; if (a && !b.classList.contains('on')) nav.scrollTo({ left: b.offsetLeft - 60, behavior: 'smooth' }); b.classList.toggle('on', a); });
  }, { passive: true });
  // lazy route map + trust animation
  const io = new IntersectionObserver(ents => ents.forEach(en => { if (!en.isIntersecting) return; io.unobserve(en.target);
    if (en.target.classList.contains('routemap')) initRouteMap();
    if (en.target.classList.contains('trust')) { $$('.gauge .fg', en.target).forEach(c => c.style.strokeDashoffset = c.dataset.off); $$('.bar i', en.target).forEach(i => i.style.width = i.dataset.w + '%'); } }), { root: sc, rootMargin: '120px' });
  $$('.routemap, .trust', v).forEach(el => io.observe(el));
  function initRouteMap() {
    rmap = baseMap($('#rmap', v), { scrollWheelZoom: false, dragging: true, tap: true }); rmap.setView(p.ll, 8); drawApproach();
  }
  function drawApproach() {
    if (!rmap) return; if (rlayer) rmap.removeLayer(rlayer); rlayer = L.featureGroup().addTo(rmap);
    const a = (P.apps || [])[ai]; const rt = a && a.rt; const pts = [];
    const fin = L.marker(p.ll, { icon: L.divIcon({ className: '', html: '<div class="rmark f">★</div>', iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 900 });
    if (rt) {
      let road = rt.road ? rt.road.slice() : null; const end = rt.pc || rt.tc || p.ll;
      if (road && road.length > 1) { road = [rt.hc, ...road];
        const cas = L.polyline(road, { color: '#fff', weight: 8, opacity: .9, lineCap: 'round', lineJoin: 'round' }).addTo(rlayer);
        const ln = L.polyline(road, { color: '#000', weight: 4, lineCap: 'round', lineJoin: 'round' }).addTo(rlayer); ln._animate = cas._animate = true;
        const conn = L.polyline([road[road.length - 1], end], { color: '#000', weight: 3, dashArray: '7 7' }).addTo(rlayer); pts.push(...road, end);
      } else { L.polyline([rt.hc, end], { color: '#000', weight: 3, dashArray: '7 7' }).addTo(rlayer); pts.push(rt.hc, end); }
      const trail = [rt.pc, rt.tc, p.ll].filter(Boolean); if (trail.length > 1 && hv(trail[0], trail[trail.length - 1]) > .05) { L.polyline(trail, { color: '#3f7d00', weight: 4, dashArray: '1 7', lineCap: 'round' }).addTo(rlayer); pts.push(...trail); }
      L.marker(rt.hc, { icon: L.divIcon({ className: '', html: '<div class="rmark s">S</div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(rlayer); if (!(HUBLABELS[p.c] || []).some(h => h[0] === rt.hub)) rlayer.getLayers().slice(-1)[0].bindTooltip(rt.hub, { permanent: true, direction: 'top', offset: [0, -10], className: 'mlabel' });
      if (rt.pc) L.marker(rt.pc, { icon: L.divIcon({ className: '', html: '<div class="rmark p">P</div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(rlayer);
    }
    fin.addTo(rlayer); pts.push(p.ll);
    rmap.invalidateSize();
    if (pts.length > 1) rmap.fitBounds(pts, { paddingTopLeft: [30, 30], paddingBottomRight: [80, 60], maxZoom: 12 }); else rmap.setView(p.ll, 9);
    clearTimeout(rmap._rf); rmap._rf = setTimeout(() => { rmap.invalidateSize(); if (pts.length > 1) rmap.fitBounds(pts, { paddingTopLeft: [30, 30], paddingBottomRight: [80, 60], maxZoom: 12, animate: false }); }, 450);
    rlayer.eachLayer(l => { if (l._animate) animatePath(l); });
  }
  // edge swipe back
  let sx = null, dx = 0; v.addEventListener('touchstart', e => { const x = e.touches[0].clientX - app.getBoundingClientRect().left; if (x < 26) { sx = e.touches[0].clientX; dx = 0; } }, { passive: true });
  v.addEventListener('touchmove', e => { if (sx == null) return; dx = Math.max(0, e.touches[0].clientX - sx); v.style.transform = `translateX(${dx}px)`; }, { passive: true });
  v.addEventListener('touchend', () => { if (sx == null) return; sx = null; v.style.transition = 'transform .25s'; if (dx > 110) { v.style.transform = 'translateX(100%)'; setTimeout(() => { v.style.transition = ''; try { history.back(); } catch (e) { back(); } }, 200); } else { v.style.transform = ''; setTimeout(() => v.style.transition = '', 260); } });
}
function toursSheet(p) {
  const T = (p.p.transport || []).filter(t => /тур|экскурс|трансфер|водител|гид/i.test(t.mode || '')); const plan = p.p.iti || [];
  sheet(`<h3>Туры и трансферы</h3>${T.length ? T.map(t => { const ct = String(t.contact || ''); const url = (ct.match(/https?:\/\/\S+/) || [])[0] || (/^https?:/.test(t.src || '') ? t.src : ''); const tel = (ct.match(/\+?\d[\d\s()-]{8,}\d/) || [])[0];
    return `<div class="iti"><b>${esc(t.provider || t.mode)}</b><p>${esc(t.mode)} · ${linkify(cut(t.details, 160))}${t.price ? '<br><b>' + esc(t.price) + '</b>' : ''}</p>${tel ? `<a class="chip lime" style="margin-top:8px" href="tel:${tel.replace(/[^\d+]/g, '')}">${I('phone')}Позвонить</a> ` : ''}${url ? `<a class="chip" style="margin-top:8px" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${I('ext')}Открыть</a>` : ''}</div>`; }).join('')
    : `<div class="empty"><span class="ibub">${I('tour')}</span><b>Туров пока не нашли</b>Ниже — как добраться самостоятельно.</div>`}
    <p class="small muted">Цены и наличие уточняйте у организатора — данные из открытых источников.</p>`);
}
function viewer(p, i) {
  const vw = document.createElement('div'); vw.className = 'viewer';
  vw.innerHTML = `<button class="glassbtn x" aria-label="Закрыть">${I('close')}</button><div class="vs">${p.photos.map(x => `<figure><img src="${x.f}" alt="${esc(x.cap)}"><figcaption>${esc(x.cap)}${x.by ? ` · ${esc(x.by)}` : ''}${x.lic ? ` · ${esc(x.lic)}` : ''}${x.page ? ` · <a href="${esc(x.page)}" target="_blank" rel="noopener noreferrer">источник</a>` : ''}</figcaption></figure>`).join('') || '<figure><figcaption>Фото нет — смотрите ссылки ниже</figcaption></figure>'}</div>
    <div class="vl">${[...p.plinks.map(l => ['link', l.cap + (l.by ? ' · ' + l.by : ''), l.url]), ...p.videos.map(x => ['play', x.t + (x.ch && !/не подтв/.test(x.ch) ? ' · ' + x.ch : ''), x.u])].filter(x => x[2]).slice(0, 8).map(([ic, t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${I(ic)}${esc(cut(t, 70))}</a>`).join('')}</div>`;
  app.appendChild(vw); const vs = $('.vs', vw); requestAnimationFrame(() => vs.scrollLeft = vs.clientWidth * i);
  $('.x', vw).onclick = () => vw.remove();
}

/* ---------- audio guide (speech synthesis, chunked + iOS unlock) ---------- */
let VOICES = [];
const loadVoices = () => { try { VOICES = speechSynthesis.getVoices() || []; } catch (e) {} };
try { if (window.speechSynthesis) { loadVoices(); speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', loadVoices) : (speechSynthesis.onvoiceschanged = loadVoices); } } catch (e) {}
const ruVoice = () => { loadVoices(); const ru = VOICES.filter(x => /^ru/i.test(x.lang)); return ru.find(x => /Milena|Милена|Yuri|Google|Irina|Pavel|Svetlana|Dmitry/i.test(x.name)) || ru[0] || null; };
function chunks(t) {
  const out = []; String(t).replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+/).forEach(s => {
    while (s.length > 180) { const cut = s.lastIndexOf(',', 180) > 60 ? s.lastIndexOf(',', 180) + 1 : (s.lastIndexOf(' ', 180) > 60 ? s.lastIndexOf(' ', 180) : 180); out.push(s.slice(0, cut).trim()); s = s.slice(cut).trim(); }
    if (s) out.push(s); });
  return out;
}
let unlockEl = null;
function unlockAudio() { // switches iOS audio session to "playback" so speech is audible
  try { if (!unlockEl) { unlockEl = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='); unlockEl.setAttribute('playsinline', ''); }
    unlockEl.play().catch(() => {}); } catch (e) {}
}
function toggleAudio(v, p) {
  const bar = $('[data-audio]', v); const synth = window.speechSynthesis;
  if (v._rec) { const a = v._rec; if (a.paused) { a.play().catch(() => {}); setPlaying(bar, true); } else { a.pause(); setPlaying(bar, false, true); } return; }
  if (v._audio) { stopAudio(v); return; }
  if (AUD[p.id] && !v._recFailed) return playRecorded(v, p, bar);
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return toast('Этот браузер не умеет озвучивать текст', 'info');
  unlockAudio();
  const parts = chunks(p.guide), total = parts.reduce((a, s) => a + s.length, 0), est = p.guide.split(/\s+/).length / 2.3;
  const voice = ruVoice(); const st = { i: 0, done: 0, started: false, stopped: false }; v._audio = st;
  const prog = $('.prog', bar), dEl = $('.d', bar); const t0 = Date.now();
  const say = () => {
    if (st.stopped) return; if (st.i >= parts.length) return stopAudio(v);
    const u = new SpeechSynthesisUtterance(parts[st.i]); u.lang = 'ru-RU'; u.rate = 1; u.pitch = 1; if (voice) u.voice = voice;
    u.onstart = () => { st.started = true; };
    u.onboundary = e => { prog.style.width = Math.min(100, (st.done + e.charIndex) / total * 100) + '%'; };
    u.onend = () => { st.done += parts[st.i].length; st.i++; prog.style.width = Math.min(100, st.done / total * 100) + '%'; say(); };
    u.onerror = e => { if (st.stopped || e.error === 'interrupted' || e.error === 'canceled') return; stopAudio(v); toast('Не получилось озвучить: ' + (e.error || 'ошибка'), 'info'); };
    st.u = u; synth.speak(u); if (synth.paused) synth.resume();
  };
  if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(say, 120); } else say(); // speak inside the tap gesture (required on iOS)
  v._timer = setInterval(() => { const left = Math.max(0, est - (Date.now() - t0) / 1000); dEl.textContent = `${Math.floor(left / 60)}:${String(Math.round(left % 60)).padStart(2, '0')}`; if (synth.paused && !st.stopped) synth.resume(); }, 500);
  st.watch = setTimeout(() => { if (!st.started && !st.stopped) { stopAudio(v);
    toast(voice || VOICES.length ? 'Звука нет? Выключите беззвучный режим и проверьте громкость' : 'На устройстве нет русского голоса — откройте в Safari или Chrome', 'info'); } }, 3500);
  bar.classList.add('playing'); $('.pl', bar).innerHTML = I('pause'); $('.t', bar).textContent = 'VOYZ-гид рассказывает';
}
function setPlaying(bar, on, paused) { bar.classList.toggle('playing', on); $('.pl', bar).innerHTML = I(on ? 'pause' : 'play'); $('.t', bar).textContent = on ? 'VOYZ-гид рассказывает' : paused ? 'Пауза — нажмите, чтобы продолжить' : 'Послушать VOYZ-гид'; }
function playRecorded(v, p, bar) {
  const a = new Audio('audio/' + p.id + '.mp3'); a.preload = 'auto'; a.setAttribute('playsinline', ''); v._rec = a;
  const prog = $('.prog', bar), dEl = $('.d', bar);
  a.ontimeupdate = () => { const d = a.duration || AUD[p.id]; prog.style.width = Math.min(100, a.currentTime / d * 100) + '%'; dEl.textContent = mmss(Math.max(0, d - a.currentTime)); };
  a.onended = () => stopAudio(v);
  a.onerror = () => { v._rec = null; v._recFailed = true; setPlaying(bar, false); toggleAudio(v, p); };
  a.play().then(() => setPlaying(bar, true)).catch(() => { v._rec = null; v._recFailed = true; setPlaying(bar, false); toggleAudio(v, p); });
  setPlaying(bar, true);
}
function stopAudio(v) {
  if (v._rec) { try { v._rec.pause(); } catch (e) {} v._rec = null; }
  const st = v._audio; if (st) { st.stopped = true; clearTimeout(st.watch); }
  try { speechSynthesis.cancel(); } catch (e) {} clearInterval(v._timer); v._audio = null;
  const bar = $('[data-audio]', v); if (!bar) return; bar.classList.remove('playing'); $('.pl', bar).innerHTML = I('play'); $('.t', bar).textContent = 'Послушать VOYZ-гид'; $('.prog', bar).style.width = '0'; $('.d', bar).textContent = audioLen(BY[v.dataset.id].guide, v.dataset.id);
}

/* ---------- TRIP ---------- */
let tripMap = null, tripMode = 'route';
function renderTrip() {
  const v = $('#v-trip'); if (!v) return;
  const trip = S.trip.map(id => BY[id]).filter(p => p && p.c === S.country); const saved = [...S.saved].map(id => BY[id]).filter(p => p && p.c === S.country);
  const legs = []; let km = 0, approx = false;
  for (let i = 1; i < trip.length; i++) { const a = trip[i - 1].ll, b = trip[i].ll; if (!a || !b) { legs.push(null); continue; } const r = roadRoute(a, b); legs.push(r); km += r.km; approx = approx || r.approx; }
  const drive = km / 52; const days = [];
  let day = [], acc = 0; trip.forEach((p, i) => { const l = i ? legs[i - 1] : null; const h = l ? l.km / 52 : 0; if (day.length && acc + h > 6.5) { days.push(day); day = []; acc = 0; } acc += h + 1.5; day.push(i); }); if (day.length) days.push(day);
  v.innerHTML = `<header class="trip-top"><h1>Мой маршрут</h1><p>${cname(S.country)} · соберите поездку из сохранённых мест</p></header>
  <div class="sheet-top"><section class="sec" style="padding-top:22px">
    <div class="savedtabs"><button class="chip ${tripMode === 'route' ? 'on' : ''}" data-tm="route">${I('route')}Маршрут ${trip.length ? trip.length : ''}</button><button class="chip ${tripMode === 'saved' ? 'on' : ''}" data-tm="saved">${I('heart')}Избранное ${saved.length ? saved.length : ''}</button></div>
    <div id="tripBody">${tripMode === 'route' ? tripRouteHTML(trip, legs, km, drive, days, approx) : savedHTML(saved)}</div>
  </section></div>`;
  $$('[data-tm]', v).forEach(b => b.onclick = () => { tripMode = b.dataset.tm; renderTrip(); });
  $$('[data-mv]', v).forEach(b => b.onclick = e => { e.stopPropagation(); const [id, d] = b.dataset.mv.split(':'); const i = S.trip.indexOf(id), j = i + (+d); if (j < 0 || j >= S.trip.length) return; [S.trip[i], S.trip[j]] = [S.trip[j], S.trip[i]]; persist(); renderTrip(); haptic(); });
  const opt = $('[data-opt]', v); if (opt) opt.onclick = () => { optimizeTrip(); renderTrip(); toast('Порядок оптимизирован по расстоянию', 'shuffle'); };
  const clr = $('[data-clear]', v); if (clr) clr.onclick = () => { S.trip = S.trip.filter(id => BY[id] && BY[id].c !== S.country); persist(); updateBadge(); renderTrip(); };
  const smp = $('[data-sample]', v); if (smp) smp.onclick = () => { sampleTrip(); renderTrip(); toast('Собрали пример маршрута', 'sparkle'); };
  if (tripMode === 'route' && trip.length) setTimeout(() => drawTrip(trip, legs), 30);
}
function tripRouteHTML(trip, legs, km, drive, days, approx) {
  if (!trip.length) return `<div class="empty"><span class="ibub">${I('route')}</span><b>Маршрут пока пуст</b>Нажмите «Добавить в маршрут» в карточке места — мы посчитаем расстояния по дорогам и разобьём поездку на дни.<div style="margin-top:18px"><button class="btn lime" data-sample>${I('sparkle')}Собрать пример</button></div></div>`;
  let html = `<div class="tripmap" id="tmap"></div><div class="tripsum"><div><b>${trip.length}</b><span>${plural(trip.length, 'место', 'места', 'мест')}</span></div><div><b>${km ? '≈' + fmtKm(km) : '—'}</b><span>км по дорогам</span></div><div><b>${days.length}</b><span>${plural(days.length, 'день', 'дня', 'дней')}</span></div></div>
    <p class="small muted" style="margin:4px 0 14px">≈${fmtH(drive)} за рулём без учёта остановок. Расстояния — по схеме основных дорог${approx ? ', часть участков — оценка' : ''}; перед выездом сверяйтесь с навигатором.</p>`;
  days.forEach((d, k) => { html += `<div class="dayhd">День ${k + 1}<i></i></div>`;
    d.forEach(i => { const p = trip[i], l = i ? legs[i - 1] : null;
      if (l && d[0] !== i) html += `<div class="leg">${I('car')}≈${fmtKm(l.km)} км · ${fmtH(l.km / 52)}</div>`;
      if (l && d[0] === i) html += `<div class="leg">${I('car')}переезд ≈${fmtKm(l.km)} км · ${fmtH(l.km / 52)} — с утра</div>`;
      html += `<div class="stop" data-open="${p.id}"><span class="num">${i + 1}</span><div class="th">${img(p)}</div><div class="tx"><b>${esc(p.name)}</b><span>${esc(p.s.acc)} · ${esc(p.s.onsite || p.s.diff)}</span></div><div class="ctl"><button data-mv="${p.id}:-1" aria-label="Выше">${I('up')}</button><button data-mv="${p.id}:1" aria-label="Ниже">${I('down')}</button></div><button data-trip="${p.id}" aria-label="Убрать" style="color:#999;padding:6px">${I('close')}</button></div>`; }); });
  html += `<div style="display:flex;gap:10px;margin-top:14px"><button class="btn grey" data-opt>${I('shuffle')}Оптимизировать</button><button class="btn outline" data-clear>${I('trash')}Очистить</button></div>`;
  return html;
}
function savedHTML(saved) {
  if (!saved.length) return `<div class="empty"><span class="ibub">${I('heart')}</span><b>Здесь будут сохранённые места</b>Нажмите на сердечко в карточке — место появится здесь, даже без интернета.</div>`;
  return saved.map(p => `<div style="position:relative">${rowCard(p)}<button class="chip ${S.trip.includes(p.id) ? 'on' : 'lime'}" data-trip="${p.id}" style="position:absolute;right:62px;bottom:20px;height:28px;font-size:12px">${S.trip.includes(p.id) ? 'В маршруте' : '+ В маршрут'}</button></div>`).join('');
}
function drawTrip(trip, legs) {
  const el = $('#tmap'); if (!el) return; if (tripMap) { tripMap.remove(); tripMap = null; }
  tripMap = baseMap(el, { scrollWheelZoom: false }); const pts = [];
  legs.forEach(l => { if (!l) return; const c = L.polyline(l.line, { color: '#fff', weight: 8, opacity: .9 }).addTo(tripMap); const ln = L.polyline(l.line, { color: '#000', weight: 4, dashArray: l.approx ? '7 7' : null }).addTo(tripMap); if (!l.approx) ln._animate = true; pts.push(...l.line); });
  trip.forEach((p, i) => { if (!p.ll) return; pts.push(p.ll); L.marker(p.ll, { icon: L.divIcon({ className: '', html: `<div class="rmark ${i === trip.length - 1 ? 'f' : 's'}" style="${i === trip.length - 1 ? '' : 'width:26px;height:26px'}">${i + 1}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).on('click', () => openPlace(p.id)).addTo(tripMap); });
  if (pts.length > 1) tripMap.fitBounds(pts, { padding: [30, 30] }); else if (pts.length) tripMap.setView(pts[0], 9);
  tripMap.eachLayer(l => { if (l._animate) animatePath(l); });
}
function optimizeTrip() {
  const ids = S.trip.filter(id => BY[id] && BY[id].c === S.country && BY[id].ll); const other = S.trip.filter(id => !ids.includes(id)); if (ids.length < 3) return;
  const out = [ids[0]], left = ids.slice(1); while (left.length) { const last = BY[out[out.length - 1]].ll; let bi = 0, bd = 1e9; left.forEach((id, k) => { const d = hv(last, BY[id].ll); if (d < bd) { bd = d; bi = k; } }); out.push(left.splice(bi, 1)[0]); }
  S.trip = [...other, ...out]; persist();
}
function sampleTrip() {
  const L0 = cur().filter(p => p.ll);
  let pick;
  if (S.country === 'kg') pick = L0.filter(p => /Иссык/.test(p.reg)).sort((a, b) => (b.idx || 0) - (a.idx || 0)).slice(0, 5);
  else pick = L0.filter(p => /Республика Алтай/.test(p.reg) && p.ll[0] < 51.6 && p.ll[0] > 49.8).sort((a, b) => (b.idx || 0) - (a.idx || 0)).slice(0, 5);
  pick.sort((a, b) => S.country === 'kg' ? a.ll[1] - b.ll[1] : b.ll[0] - a.ll[0]);
  pick.forEach(p => { if (!S.trip.includes(p.id)) S.trip.push(p.id); S.saved.add(p.id); }); persist(); updateBadge();
}

/* ---------- MORE ---------- */
function renderMore() {
  const v = $('#v-more'); if (!v) return; const L0 = cur(); const ph = L0.filter(photo).length;
  v.innerHTML = `<header class="trip-top"><h1>Ещё</h1><p>Настройки, офлайн и как мы проверяем места</p></header>
  <div class="sheet-top"><section class="sec" style="padding-top:22px">
    <div class="more-list">
      <button data-mc="kg">${I('globe')}<span>Кыргызстан</span>${S.country === 'kg' ? I('check') : `<em>${ofC('kg').length} мест</em>`}</button>
      <button data-mc="alt">${I('globe')}<span>Россия · Алтай</span>${S.country === 'alt' ? I('check') : `<em>${ofC('alt').length} мест</em>`}</button>
      <div style="display:flex;gap:14px;align-items:center;padding:16px 4px;border-bottom:1px solid var(--line)">${I('download')}<span style="flex:1">Работает без интернета</span><em class="small muted">встроено</em></div>
    </div>
    <div class="method" style="margin-top:20px"><b>Как мы проверяем места</b>
      Каждая карточка — 34 поля: от координат и сезона до парковки, связи и стоимости входа. Мы сверяем данные минимум по двум открытым источникам, отмечаем дату проверки и спорные места. Индекс полноты (0–100) складывается из насыщенности, числа подтверждённых полей и практической части: дорога, ночлег, транспорт. В разделе «${cname(S.country)}» — ${L0.length} ${plural(L0.length, 'место', 'места', 'мест')}, у ${ph} есть фото.</div>
    <div class="method" style="margin-top:12px;background:#000;color:#fff"><b style="color:var(--lime)">Карта без сети</b>Встроенная схема (Natural Earth): основные трассы, реки, озёра и границы. Маршруты строятся на телефоне, без интернета. Для навигации по грунтовкам откройте точку в навигаторе — кнопки есть в каждой карточке.</div>
    <div class="more-list" style="margin-top:12px">
      <button data-reset>${I('sparkle')}<span>Показать приветствие снова</span></button>
      <a href="mailto:?subject=Voyz%20%E2%80%94%20%D0%BF%D1%80%D0%B5%D0%B4%D0%BB%D0%BE%D0%B6%D0%B8%D1%82%D1%8C%20%D0%BC%D0%B5%D1%81%D1%82%D0%BE">${I('plus')}<span>Предложить новое место</span></a>
    </div>
    <div class="footer">${WM()}<p>Больше, чем просто поездки</p><p class="small muted">Прототип · данные проверены 07–14.10.2026</p></div>
  </section></div>`;
  $$('[data-mc]', v).forEach(b => b.onclick = () => { if (b.dataset.mc !== S.country) setCountry(b.dataset.mc); });
  $('[data-reset]', v).onclick = () => { S.country = null; persist(); closeAllPush(); onboarding(); };
}

/* ---------- liquid glass interaction (iOS 26 feel) ---------- */
const GLASS_SEL = '.glassbtn, .mapctl button, .maptop .search .ibub, .routemap .fab, .heartbtn, .seg button';
app.addEventListener('pointerdown', e => {
  const t = e.target.closest && e.target.closest(GLASS_SEL); if (!t) return;
  t.classList.add('lg-press'); const r = t.getBoundingClientRect();
  let hl = t.querySelector(':scope > .hl'); if (!hl) { hl = document.createElement('i'); hl.className = 'hl'; t.appendChild(hl); if (getComputedStyle(t).position === 'static') t.style.position = 'relative'; t.style.overflow = 'hidden'; }
  hl.style.left = (e.clientX - r.left) + 'px'; hl.style.top = (e.clientY - r.top) + 'px'; hl.classList.add('on');
});
const glassUp = () => $$('.lg-press').forEach(t => { t.classList.remove('lg-press'); const hl = t.querySelector(':scope > .hl'); hl && setTimeout(() => hl.classList.remove('on'), 120); });
['pointerup', 'pointercancel'].forEach(ev => app.addEventListener(ev, glassUp));
// tab bar: press-and-drag moves a magnifying glass lens, release selects the tab under it
function wireTabDrag() {
  const tb = $('.tabbar'), ind = $('.tabbar .ind'); if (!tb || tb._drag) return; tb._drag = 1;
  let active = false, x0 = 0, moved = false;
  tb.addEventListener('pointerdown', e => { active = true; moved = false; x0 = e.clientX; });
  tb.addEventListener('pointermove', e => { if (!active) return; if (!moved && Math.abs(e.clientX - x0) < 6) return;
    moved = true; ind.classList.add('drag'); const r = tb.getBoundingClientRect(); const w = ind.offsetWidth;
    ind.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)'; ind.style.left = Math.max(6, Math.min(r.width - w - 6, e.clientX - r.left - w / 2)) + 'px'; });
  const end = e => { if (!active) return; active = false; ind.classList.remove('drag'); ind.style.transition = '';
    if (!moved) return; const r = tb.getBoundingClientRect(); const x = e.clientX - r.left; let best = null, bd = 1e9;
    $$('button', tb).forEach(b => { const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - x); if (d < bd) { bd = d; best = b; } });
    if (best) { if (best.dataset.tab === S.tab) moveInd(true); else go(best.dataset.tab); } haptic(); };
  tb.addEventListener('pointerup', end); tb.addEventListener('pointercancel', end); tb.addEventListener('pointerleave', end);
  tb.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

/* ---------- boot ---------- */
{ // statusbar is hidden by CSS without the frame; ticking always keeps it right after a resize
  const t = () => { const d = new Date(); const s = $('.statusbar .tm'); if (s) s.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }; t(); setInterval(t, 30000);
}
window.addEventListener('resize', () => { moveInd(); if (bigMap) bigMap.invalidateSize(); });
splash();
window.VOYZ = { openPlace, go, setCountry, S, get map() { return bigMap; } };
})();
